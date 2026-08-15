/**
 * The merchant API surface: registration → onboarding → review → trading.
 *
 * Every merchant mutation in the product goes through here — the public partner
 * form, the merchant's onboarding wizard, the admin review queue, staff and
 * property management, the subscription screen and the channel-connection UI.
 * Each call validates against the domain rules in `merchants.ts`, records an
 * audit entry, and notifies whichever side needs to act next, so approving a
 * merchant updates the admin list, the merchant's status, their checklist, what
 * they may publish and their notification feed in one write.
 *
 * Swapping to a real backend replaces each body with a `fetch`; the signatures,
 * scoping and error kinds are already what the server will expose.
 */

import type { ListParams, Paginated } from "../data/types";
import {
  MERCHANT_PLANS,
  MERCHANT_ROLES,
  REQUIRED_DOCUMENT_TYPES,
  canSubmitApplication,
  canTransitionMerchant,
  canTrade,
  healthTier,
  onboardingProgress,
  planFor,
  toMerchantRef,
  withinLimit,
  type BeneficialOwner,
  type ChannelProvider,
  type ChannelScope,
  type Merchant,
  type MerchantBankAccount,
  type MerchantDocument,
  type MerchantDocumentType,
  type MerchantPerformance,
  type MerchantPlanId,
  type MerchantProperty,
  type MerchantRoleId,
  type MerchantStaff,
  type MerchantStatus,
  type OnboardingProgress,
  type PropertyStatus,
} from "./merchants";
import { catalogueProgress, type CatalogueItem } from "./catalogue";
import {
  SCOPE_NONE,
  SYSTEM_ACTOR,
  delay,
  forbidden,
  invalid,
  notFound,
  notify,
  queryList,
  recordAudit,
  type DomainScope,
} from "./service-kit";
import { getState, mutate, nextId } from "./store";
import { money } from "./money";
import { recordRevenue } from "./revenue";
import type { DomainActor, MerchantRef } from "./types";

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

function findMerchant(id: string): Merchant {
  return getState().merchants.find((m) => m.id === id) ?? notFound("Merchant");
}

/** Read-only merchant lookup used across the domain (bookings, revenue, …). */
export function getMerchant(id: string): Merchant | undefined {
  return getState().merchants.find((m) => m.id === id);
}

/**
 * The booking-time snapshot for a merchant.
 *
 * Everything that used to reach into the `MERCHANTS` constant now comes through
 * here, so a commission renegotiated in the admin screen is the rate the next
 * booking is priced at.
 */
export function merchantRef(id: string): MerchantRef | undefined {
  const merchant = getMerchant(id);
  return merchant ? toMerchantRef(merchant) : undefined;
}

/** Merchants that may currently trade — the only ones a booking may reference. */
export function tradingMerchants(): Merchant[] {
  return getState().merchants.filter(canTrade);
}

function assertScope(scope: DomainScope, merchantId: string): void {
  if (scope.merchantId && scope.merchantId !== merchantId) {
    forbidden("You can only manage your own merchant account.");
  }
}

function touch(merchant: Merchant): void {
  // Keeps the contract and the headline rate from ever disagreeing.
  merchant.contract.commissionRate = merchant.commissionRate;
  merchant.contract.commissionBasis = merchant.commissionBasis;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** What the public "become a partner" form collects. */
export interface RegisterMerchantInput {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  contactName: string;
  contactRole?: string;
  country: string;
  city: string;
  verticals: Merchant["verticals"];
  description?: string;
  website?: string;
}

export type MerchantProfileInput = Partial<
  Pick<
    Merchant,
    | "name"
    | "legalName"
    | "businessType"
    | "registrationNo"
    | "taxId"
    | "foundedYear"
    | "website"
    | "description"
    | "addressLine"
    | "city"
    | "country"
    | "postalCode"
    | "verticals"
    | "contactName"
    | "contactRole"
    | "email"
    | "phone"
    | "supportEmail"
    | "supportPhone"
  >
>;

export interface UploadDocumentInput {
  type: MerchantDocumentType;
  fileName: string;
  sizeKb?: number;
  /** Set when replacing a rejected document. */
  replacesId?: string;
}

export interface BankDetailsInput {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  branch?: string;
  iban?: string;
  swift?: string;
  country: string;
  currency: string;
  method: MerchantBankAccount["method"];
  schedule: MerchantBankAccount["schedule"];
}

export interface StaffInput {
  name: string;
  email: string;
  role: MerchantRoleId;
  propertyIds?: string[];
}

export interface PropertyInput {
  name: string;
  vertical: MerchantProperty["vertical"];
  city: string;
  country: string;
  addressLine: string;
  units: number;
  status?: PropertyStatus;
}

// ---------------------------------------------------------------------------
// Merchant service
// ---------------------------------------------------------------------------

const MERCHANT_FILTERS: Record<string, (row: Merchant, value: string) => boolean> = {
  status: (row, value) => row.status === value,
  country: (row, value) => row.country === value,
  planId: (row, value) => row.subscription.planId === value,
  kycStatus: (row, value) => row.kyc.status === value,
  vertical: (row, value) => row.verticals.includes(value as Merchant["verticals"][number]),
  /** Everything sitting in the review queue. */
  awaitingReview: (row) =>
    row.status === "submitted" || row.status === "under_review",
};

export const merchantService = {
  async list(params: ListParams = {}, scope: DomainScope = SCOPE_NONE): Promise<Paginated<Merchant>> {
    const rows = getState().merchants.filter(
      (m) => !scope.merchantId || m.id === scope.merchantId,
    );
    return delay(
      queryList(rows, {
        params,
        searchFields: (m) => [m.name, m.legalName, m.email, m.contactName, m.country, m.city],
        sortValue: (m, field) => {
          switch (field) {
            case "name":
              return m.name;
            case "status":
              return m.status;
            case "commissionRate":
              return m.commissionRate;
            case "properties":
              return m.properties.length;
            case "createdAt":
              return m.createdAt;
            default:
              return (m as unknown as Record<string, string>)[field];
          }
        },
        filterPredicates: MERCHANT_FILTERS,
        defaultSort: (a, b) => a.name.localeCompare(b.name),
      }),
    );
  },

  /** Every merchant in scope, unpaginated — for pickers and roll-ups. */
  async all(scope: DomainScope = SCOPE_NONE): Promise<Merchant[]> {
    return delay(
      getState().merchants.filter((m) => !scope.merchantId || m.id === scope.merchantId),
      80,
    );
  },

  async get(id: string, scope: DomainScope = SCOPE_NONE): Promise<Merchant> {
    assertScope(scope, id);
    return delay(structuredClone(findMerchant(id)));
  },

  /** Onboarding checklist + progress, computed from the merchant and catalogue. */
  async progress(id: string, catalogue: CatalogueItem[] = []): Promise<OnboardingProgress> {
    const merchant = findMerchant(id);
    return delay(onboardingProgress(merchant, catalogueProgress(catalogue)), 60);
  },

  // --- registration & onboarding ------------------------------------------

  /**
   * Create a merchant application in `draft`. This is the entry point from the
   * public partner form; nothing is verified and nothing may be sold yet.
   */
  async register(input: RegisterMerchantInput, actor: DomainActor = SYSTEM_ACTOR): Promise<Merchant> {
    const name = input.name.trim();
    if (name.length < 2) invalid("Enter your business name.");
    if (!input.email.includes("@")) invalid("Enter a valid contact email.");
    if (input.verticals.length === 0) invalid("Choose at least one product you supply.");
    if (getState().merchants.some((m) => m.email.toLowerCase() === input.email.toLowerCase())) {
      invalid("An application already exists for that email address.");
    }

    const now = new Date().toISOString();
    const id = nextId("mrc");
    const plan = MERCHANT_PLANS.basic;
    const merchant: Merchant = {
      id,
      name,
      slug: slugify(name),
      status: "draft",
      legalName: input.legalName.trim() || name,
      businessType: "private_limited",
      registrationNo: "",
      taxId: "",
      website: input.website,
      description: input.description ?? "",
      addressLine: "",
      city: input.city,
      country: input.country,
      postalCode: "",
      contactName: input.contactName,
      contactRole: input.contactRole ?? "Owner",
      email: input.email,
      phone: input.phone,
      commissionRate: 12,
      commissionBasis: "net",
      currency: "USD",
      verticals: input.verticals,
      kyc: {
        status: "unsubmitted",
        legalName: input.legalName.trim() || name,
        registrationNo: "",
        taxId: "",
        beneficialOwners: [],
      },
      documents: [],
      contract: {
        version: "2026.1",
        commissionRate: 12,
        commissionBasis: "net",
        payoutTermDays: plan.limits.payoutTermDays,
        noticeDays: 30,
        clauses: [
          "Commission is charged on the net sale value of every confirmed booking.",
          "Settlements are paid per the payout term below, net of refunds and adjustments.",
          "Rates and availability supplied to Otithee must match the merchant's own channels.",
          "Cancellations follow the policy attached to each listing; the platform retains an administration share of any cancellation fee.",
          "Either party may terminate with the notice period below; outstanding settlements are paid in full.",
        ],
      },
      subscription: {
        planId: "basic",
        status: "trialing",
        billingCycle: "monthly",
        price: 0,
        startedAt: now,
        renewsAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        autoRenew: true,
      },
      staff: [
        {
          id: nextId("stf"),
          merchantId: id,
          name: input.contactName,
          email: input.email,
          role: "owner",
          propertyIds: [],
          status: "active",
          invitedAt: now,
          acceptedAt: now,
        },
      ],
      properties: [],
      createdAt: now,
    };

    mutate((draft) => draft.merchants.unshift(merchant));
    recordAudit({
      actor,
      action: "create",
      entity: "merchant",
      entityId: id,
      entityLabel: name,
      summary: `Partner application started for ${name}`,
    });
    notify({
      category: "system",
      audience: ["merchant"],
      merchantId: id,
      title: "Welcome to Otithee Partners",
      body: "Finish your onboarding checklist to submit your application for review.",
      href: "/dashboard/onboarding",
      tone: "neutral",
    });
    return delay(structuredClone(merchant));
  },

  async updateProfile(
    id: string,
    input: MerchantProfileInput,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Merchant> {
    assertScope(scope, id);
    if (input.description !== undefined && input.description.trim().length > 0 && input.description.trim().length < 40) {
      invalid("The description needs to be at least 40 characters — it is what customers read first.");
    }
    if (input.verticals && input.verticals.length === 0) {
      invalid("Choose at least one product you supply.");
    }
    if (input.email !== undefined && !input.email.includes("@")) {
      invalid("Enter a valid contact email.");
    }

    const updated = mutate((draft) => {
      const merchant = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      Object.assign(merchant, input);
      if (input.name) merchant.slug = slugify(input.name);
      // The compliance record quotes the profile; keep the copy in step.
      if (input.legalName) merchant.kyc.legalName = input.legalName;
      if (input.registrationNo) merchant.kyc.registrationNo = input.registrationNo;
      if (input.taxId) merchant.kyc.taxId = input.taxId;
      touch(merchant);
      return structuredClone(merchant);
    });

    recordAudit({
      actor,
      action: "update",
      entity: "merchant",
      entityId: id,
      entityLabel: updated.name,
      summary: `Merchant profile updated for ${updated.name}`,
    });
    return delay(updated);
  },

  // --- documents ----------------------------------------------------------

  /**
   * Record a document upload.
   *
   * **No file is stored and nothing is verified** — the prototype captures the
   * metadata a real upload pipeline would return so the review, rejection and
   * re-upload flows are exercisable.
   */
  async uploadDocument(
    id: string,
    input: UploadDocumentInput,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<MerchantDocument> {
    assertScope(scope, id);
    if (!input.fileName.trim()) invalid("Choose a file to upload.");

    const doc = mutate((draft) => {
      const merchant = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      const record: MerchantDocument = {
        id: nextId("doc"),
        merchantId: id,
        type: input.type,
        label: input.fileName,
        fileName: input.fileName,
        fileUrl: `mock://merchant-docs/${id}/${input.type}-${Date.now()}`,
        sizeKb: input.sizeKb ?? 420,
        status: "pending",
        uploadedAt: new Date().toISOString(),
        supersedesId: input.replacesId,
      };
      // A replacement retires the rejected original rather than deleting it —
      // the audit trail has to show what was rejected and what replaced it.
      if (input.replacesId) {
        const previous = merchant.documents.find((d) => d.id === input.replacesId);
        if (previous) previous.status = "rejected";
      }
      merchant.documents.push(record);
      // A re-upload after a knock-back puts KYC back in the queue.
      if (merchant.kyc.status === "rejected") merchant.kyc.status = "submitted";
      return structuredClone(record);
    });

    recordAudit({
      actor,
      action: "create",
      entity: "merchant_document",
      entityId: doc.id,
      entityLabel: doc.label,
      summary: `Document uploaded: ${doc.label}`,
    });
    return delay(doc);
  },

  async removeDocument(
    id: string,
    documentId: string,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Merchant> {
    assertScope(scope, id);
    const updated = mutate((draft) => {
      const merchant = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      if (merchant.status === "under_review") {
        forbidden("Documents cannot be removed while the application is under review.");
      }
      merchant.documents = merchant.documents.filter((d) => d.id !== documentId);
      return structuredClone(merchant);
    });
    recordAudit({
      actor,
      action: "delete",
      entity: "merchant_document",
      entityId: documentId,
      entityLabel: updated.name,
      summary: `Document removed from ${updated.name}`,
    });
    return delay(updated);
  },

  /** Admin: approve or reject one document. */
  async reviewDocument(
    id: string,
    documentId: string,
    decision: { status: "approved" | "rejected"; reason?: string },
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<Merchant> {
    if (decision.status === "rejected" && !decision.reason?.trim()) {
      invalid("Give the merchant a reason so they know what to fix.");
    }
    const updated = mutate((draft) => {
      const merchant = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      const doc = merchant.documents.find((d) => d.id === documentId) ?? notFound("Document");
      doc.status = decision.status;
      doc.rejectionReason = decision.status === "rejected" ? decision.reason : undefined;
      doc.verifiedAt = decision.status === "approved" ? new Date().toISOString() : undefined;
      doc.reviewedBy = actor.name;
      return structuredClone(merchant);
    });

    recordAudit({
      actor,
      action: decision.status === "approved" ? "approve" : "reject",
      entity: "merchant_document",
      entityId: documentId,
      entityLabel: updated.name,
      summary: `Document ${decision.status} for ${updated.name}`,
      to: decision.status,
    });
    notify({
      category: "system",
      audience: ["merchant"],
      merchantId: id,
      title: decision.status === "approved" ? "Document approved" : "Document needs attention",
      body:
        decision.status === "approved"
          ? "One of your compliance documents has been approved."
          : `A document was rejected: ${decision.reason}`,
      href: "/dashboard/onboarding?step=documents",
      tone: decision.status === "approved" ? "success" : "warning",
    });
    return delay(updated);
  },

  // --- KYC ----------------------------------------------------------------

  /** Merchant: declare beneficial owners and submit for compliance review. */
  async submitKyc(
    id: string,
    owners: Omit<BeneficialOwner, "id">[],
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Merchant> {
    assertScope(scope, id);
    if (owners.length === 0) invalid("Declare at least one beneficial owner.");
    const total = owners.reduce((n, o) => n + (o.ownershipPercent || 0), 0);
    if (total > 100) invalid("Declared ownership adds up to more than 100%.");
    if (owners.some((o) => !o.fullName.trim())) invalid("Every owner needs a full name.");

    const updated = mutate((draft) => {
      const merchant = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      merchant.kyc.beneficialOwners = owners.map((o, i) => ({
        ...o,
        id: `${id}_own_${i + 1}`,
      }));
      merchant.kyc.status = "submitted";
      merchant.kyc.submittedAt = new Date().toISOString();
      merchant.kyc.rejectionReason = undefined;
      return structuredClone(merchant);
    });

    recordAudit({
      actor,
      action: "update",
      entity: "merchant_kyc",
      entityId: id,
      entityLabel: updated.name,
      summary: `KYC submitted for ${updated.name}`,
      to: "submitted",
    });
    notify({
      category: "system",
      audience: ["admin"],
      title: "KYC submitted for review",
      body: `${updated.name} submitted beneficial-owner details.`,
      href: `/dashboard/merchants/${id}`,
      tone: "neutral",
    });
    return delay(updated);
  },

  /**
   * Admin: record a compliance decision.
   *
   * This is a **manual, recorded decision** — the prototype performs no identity
   * verification of any kind.
   */
  async decideKyc(
    id: string,
    decision: { status: "verified" | "rejected" | "under_review"; reason?: string },
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<Merchant> {
    if (decision.status === "rejected" && !decision.reason?.trim()) {
      invalid("Give the merchant a reason so they know what to fix.");
    }
    const updated = mutate((draft) => {
      const merchant = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      merchant.kyc.status = decision.status;
      merchant.kyc.reviewedAt = new Date().toISOString();
      merchant.kyc.reviewedBy = actor.name;
      merchant.kyc.rejectionReason = decision.status === "rejected" ? decision.reason : undefined;
      return structuredClone(merchant);
    });

    recordAudit({
      actor,
      action: decision.status === "verified" ? "approve" : "reject",
      entity: "merchant_kyc",
      entityId: id,
      entityLabel: updated.name,
      summary: `KYC ${decision.status} for ${updated.name}`,
      to: decision.status,
    });
    notify({
      category: "system",
      audience: ["merchant"],
      merchantId: id,
      title: decision.status === "verified" ? "Verification complete" : "Verification needs attention",
      body:
        decision.status === "verified"
          ? "Your business has passed compliance review."
          : (decision.reason ?? "Compliance review is ongoing."),
      href: "/dashboard/onboarding?step=kyc",
      tone: decision.status === "verified" ? "success" : "warning",
    });
    return delay(updated);
  },

  // --- contract & payout ---------------------------------------------------

  async acceptContract(
    id: string,
    input: { acceptedBy: string },
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Merchant> {
    assertScope(scope, id);
    if (!input.acceptedBy.trim()) invalid("Type the full name of the authorised signatory.");

    const updated = mutate((draft) => {
      const merchant = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      if (merchant.contract.acceptedAt) {
        forbidden("These terms have already been accepted.");
      }
      merchant.contract.acceptedAt = new Date().toISOString();
      merchant.contract.acceptedBy = input.acceptedBy.trim();
      merchant.contract.acceptedIp = "127.0.0.1";
      return structuredClone(merchant);
    });

    recordAudit({
      actor,
      action: "approve",
      entity: "merchant_contract",
      entityId: id,
      entityLabel: updated.name,
      summary: `Partner agreement ${updated.contract.version} accepted by ${input.acceptedBy}`,
    });
    return delay(updated);
  },

  async saveBankDetails(
    id: string,
    input: BankDetailsInput,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Merchant> {
    assertScope(scope, id);
    const digits = input.accountNumber.replace(/\D/g, "");
    if (!input.accountHolder.trim()) invalid("Enter the account holder's name.");
    if (!input.bankName.trim()) invalid("Enter the bank name.");
    if (digits.length < 6) invalid("Enter a valid account number.");
    if (input.method === "wire" && !input.swift?.trim()) {
      invalid("International wires need a SWIFT/BIC code.");
    }

    const updated = mutate((draft) => {
      const merchant = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      merchant.bank = {
        accountHolder: input.accountHolder.trim(),
        bankName: input.bankName.trim(),
        // Only the last four are ever kept — the prototype never stores a real number.
        accountNumberMasked: `•••• ${digits.slice(-4)}`,
        branch: input.branch,
        iban: input.iban,
        swift: input.swift,
        country: input.country,
        currency: input.currency,
        method: input.method,
        schedule: input.schedule,
        status: "pending",
        addedAt: new Date().toISOString(),
      };
      return structuredClone(merchant);
    });

    recordAudit({
      actor,
      action: "update",
      entity: "merchant_bank",
      entityId: id,
      entityLabel: updated.name,
      summary: `Payout details submitted for ${updated.name}`,
    });
    notify({
      category: "settlement",
      audience: ["admin"],
      title: "Payout details to verify",
      body: `${updated.name} submitted bank details for verification.`,
      href: `/dashboard/merchants/${id}`,
      tone: "neutral",
    });
    return delay(updated);
  },

  /**
   * Admin: record a payout-account decision. **No banking verification is
   * performed** — a real build calls the payout provider's account check.
   */
  async decideBank(
    id: string,
    decision: { status: "verified" | "rejected"; reason?: string },
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<Merchant> {
    if (decision.status === "rejected" && !decision.reason?.trim()) {
      invalid("Give the merchant a reason so they know what to fix.");
    }
    const updated = mutate((draft) => {
      const merchant = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      if (!merchant.bank) notFound("Payout details");
      merchant.bank.status = decision.status;
      merchant.bank.verifiedAt = decision.status === "verified" ? new Date().toISOString() : undefined;
      merchant.bank.rejectionReason = decision.status === "rejected" ? decision.reason : undefined;
      return structuredClone(merchant);
    });

    recordAudit({
      actor,
      action: decision.status === "verified" ? "approve" : "reject",
      entity: "merchant_bank",
      entityId: id,
      entityLabel: updated.name,
      summary: `Payout details ${decision.status} for ${updated.name}`,
      to: decision.status,
    });
    notify({
      category: "settlement",
      audience: ["merchant"],
      merchantId: id,
      title: decision.status === "verified" ? "Payout details verified" : "Payout details rejected",
      body: decision.reason ?? "Your settlements will be paid to this account.",
      href: "/dashboard/onboarding?step=bank",
      tone: decision.status === "verified" ? "success" : "warning",
    });
    return delay(updated);
  },

  // --- application review --------------------------------------------------

  /** Merchant: submit the application. Validated against the same checklist the UI shows. */
  async submitApplication(
    id: string,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Merchant> {
    assertScope(scope, id);
    const merchant = findMerchant(id);
    const check = canSubmitApplication(merchant);
    if (!check.ok) invalid(check.problems.join(" "));

    const updated = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id)!;
      row.status = "submitted";
      row.submittedAt = new Date().toISOString();
      row.reviewNote = undefined;
      if (row.kyc.status === "unsubmitted") row.kyc.status = "submitted";
      for (const doc of row.documents) {
        if (doc.status === "pending") doc.status = "under_review";
      }
      return structuredClone(row);
    });

    recordAudit({
      actor,
      action: "status_change",
      entity: "merchant",
      entityId: id,
      entityLabel: updated.name,
      summary: `${updated.name} submitted their partner application`,
      from: merchant.status,
      to: "submitted",
    });
    notify({
      category: "system",
      audience: ["admin"],
      title: "New merchant application",
      body: `${updated.name} submitted an application for review.`,
      href: `/dashboard/merchants/${id}`,
      tone: "neutral",
    });
    notify({
      category: "system",
      audience: ["merchant"],
      merchantId: id,
      title: "Application submitted",
      body: "We'll review your application and come back to you shortly.",
      href: "/dashboard/onboarding",
      tone: "success",
    });
    return delay(updated);
  },

  /**
   * Admin: move a merchant through the review states.
   *
   * One entry point for `under_review`, `approved`, `rejected`,
   * `action_required` and `suspended`, so the transition table is enforced in
   * exactly one place.
   */
  async setStatus(
    id: string,
    to: MerchantStatus,
    options: { note?: string } = {},
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<Merchant> {
    const current = findMerchant(id);
    if (!canTransitionMerchant(current.status, to)) {
      forbidden(`A ${current.status} merchant cannot move to ${to}.`);
    }
    if ((to === "rejected" || to === "action_required" || to === "suspended") && !options.note?.trim()) {
      invalid("Give the merchant a reason for this decision.");
    }
    if (to === "approved") {
      const blockers: string[] = [];
      if (current.kyc.status !== "verified") blockers.push("KYC is not verified");
      if (!current.contract.acceptedAt) blockers.push("the agreement has not been accepted");
      if (current.bank?.status !== "verified") blockers.push("payout details are not verified");
      if (blockers.length && current.status !== "suspended") {
        invalid(`Cannot approve: ${blockers.join(", ")}.`);
      }
    }

    const now = new Date().toISOString();
    const updated = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id)!;
      row.status = to;
      row.reviewedAt = now;
      row.reviewedBy = actor.name;
      row.reviewNote = options.note;
      if (to === "approved") {
        row.approvedAt = now;
        row.suspendedAt = undefined;
        row.suspensionReason = undefined;
        if (row.subscription.status === "trialing") row.subscription.status = "active";
      }
      if (to === "suspended") {
        row.suspendedAt = now;
        row.suspensionReason = options.note;
      }
      return structuredClone(row);
    });

    const ACTION: Record<string, "approve" | "reject" | "suspend" | "status_change"> = {
      approved: "approve",
      rejected: "reject",
      suspended: "suspend",
    };
    recordAudit({
      actor,
      action: ACTION[to] ?? "status_change",
      entity: "merchant",
      entityId: id,
      entityLabel: updated.name,
      summary: `${updated.name} moved to ${to}${options.note ? `: ${options.note}` : ""}`,
      from: current.status,
      to,
    });

    const COPY: Partial<Record<MerchantStatus, { title: string; body: string; tone: "success" | "warning" | "danger" | "neutral" }>> = {
      under_review: {
        title: "Application under review",
        body: "Our compliance team has started reviewing your application.",
        tone: "neutral",
      },
      approved: {
        title: "You're approved",
        body: "Your merchant account is live. You can now create listings and submit them for review.",
        tone: "success",
      },
      rejected: {
        title: "Application rejected",
        body: options.note ?? "Your application was not approved.",
        tone: "danger",
      },
      action_required: {
        title: "Action required on your application",
        body: options.note ?? "Some details need correcting before we can continue.",
        tone: "warning",
      },
      suspended: {
        title: "Account suspended",
        body: options.note ?? "Your merchant account has been suspended.",
        tone: "danger",
      },
    };
    const copy = COPY[to];
    if (copy) {
      notify({
        category: "system",
        audience: ["merchant"],
        merchantId: id,
        title: copy.title,
        body: copy.body,
        href: to === "approved" ? "/dashboard" : "/dashboard/onboarding",
        tone: copy.tone,
      });
    }
    return delay(updated);
  },

  /** Admin: renegotiate commission. Percent, and it rewrites the contract with it. */
  async setCommission(
    id: string,
    rate: number,
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<Merchant> {
    if (!Number.isFinite(rate) || rate < 0 || rate > 60) {
      invalid("Commission must be a percentage between 0 and 60.");
    }
    const before = findMerchant(id).commissionRate;
    const updated = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      row.commissionRate = rate;
      touch(row);
      return structuredClone(row);
    });
    recordAudit({
      actor,
      action: "update",
      entity: "merchant",
      entityId: id,
      entityLabel: updated.name,
      summary: `Commission changed for ${updated.name}`,
      from: `${before}%`,
      to: `${rate}%`,
    });
    notify({
      category: "commission",
      audience: ["merchant"],
      merchantId: id,
      title: "Commission rate updated",
      body: `Your commission rate is now ${rate}%.`,
      href: "/dashboard/finance/earnings",
      tone: "neutral",
    });
    return delay(updated);
  },

  // --- staff ---------------------------------------------------------------

  async addStaff(
    id: string,
    input: StaffInput,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<MerchantStaff> {
    assertScope(scope, id);
    if (!input.name.trim()) invalid("Enter the team member's name.");
    if (!input.email.includes("@")) invalid("Enter a valid email address.");

    const merchant = findMerchant(id);
    if (merchant.staff.some((s) => s.email.toLowerCase() === input.email.toLowerCase())) {
      invalid("That email is already on your team.");
    }
    const limit = planFor(merchant).limits.staff;
    if (!withinLimit(limit, merchant.staff.length)) {
      forbidden(
        `Your ${planFor(merchant).name} plan allows ${limit} staff accounts. Upgrade to add more.`,
      );
    }

    const member = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id)!;
      const record: MerchantStaff = {
        id: nextId("stf"),
        merchantId: id,
        name: input.name.trim(),
        email: input.email.trim(),
        role: input.role,
        propertyIds: input.propertyIds ?? [],
        status: "invited",
        invitedAt: new Date().toISOString(),
      };
      row.staff.push(record);
      return structuredClone(record);
    });

    recordAudit({
      actor,
      action: "create",
      entity: "merchant_staff",
      entityId: member.id,
      entityLabel: member.name,
      summary: `${member.name} invited as ${MERCHANT_ROLES[member.role].label}`,
    });
    return delay(member);
  },

  async updateStaff(
    id: string,
    staffId: string,
    input: Partial<Pick<MerchantStaff, "role" | "propertyIds" | "status" | "name">>,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<MerchantStaff> {
    assertScope(scope, id);
    const member = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      const target = row.staff.find((s) => s.id === staffId) ?? notFound("Team member");
      // The account must always keep one active owner, or nobody can pay anyone.
      const owners = row.staff.filter((s) => s.role === "owner" && s.status === "active");
      const losingLastOwner =
        target.role === "owner" &&
        owners.length === 1 &&
        ((input.role && input.role !== "owner") || (input.status && input.status !== "active"));
      if (losingLastOwner) {
        forbidden("Your account needs at least one active owner.");
      }
      Object.assign(target, input);
      if (input.status === "active" && !target.acceptedAt) {
        target.acceptedAt = new Date().toISOString();
      }
      return structuredClone(target);
    });

    recordAudit({
      actor,
      action: "update",
      entity: "merchant_staff",
      entityId: staffId,
      entityLabel: member.name,
      summary: `${member.name} updated (${MERCHANT_ROLES[member.role].label})`,
    });
    return delay(member);
  },

  async removeStaff(
    id: string,
    staffId: string,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<void> {
    assertScope(scope, id);
    const name = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      const target = row.staff.find((s) => s.id === staffId) ?? notFound("Team member");
      const owners = row.staff.filter((s) => s.role === "owner" && s.status === "active");
      if (target.role === "owner" && owners.length === 1) {
        forbidden("Your account needs at least one active owner.");
      }
      row.staff = row.staff.filter((s) => s.id !== staffId);
      return target.name;
    });
    recordAudit({
      actor,
      action: "delete",
      entity: "merchant_staff",
      entityId: staffId,
      entityLabel: name,
      summary: `${name} removed from the team`,
    });
    return delay(undefined, 200);
  },

  // --- properties ----------------------------------------------------------

  async addProperty(
    id: string,
    input: PropertyInput,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<MerchantProperty> {
    assertScope(scope, id);
    if (!input.name.trim()) invalid("Give the property a name.");
    if (!input.city.trim()) invalid("Enter the city.");
    if (!(input.units > 0)) invalid("Enter the number of rooms, units or seats.");

    const merchant = findMerchant(id);
    if (!merchant.verticals.includes(input.vertical)) {
      invalid(`Your account is not approved to supply ${input.vertical}.`);
    }
    const limit = planFor(merchant).limits.properties;
    if (!withinLimit(limit, merchant.properties.length)) {
      forbidden(
        `Your ${planFor(merchant).name} plan allows ${limit} ${limit === 1 ? "property" : "properties"}. Upgrade to add more.`,
      );
    }

    const property = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id)!;
      const record: MerchantProperty = {
        id: nextId("prp"),
        merchantId: id,
        name: input.name.trim(),
        vertical: input.vertical,
        city: input.city.trim(),
        country: input.country.trim(),
        addressLine: input.addressLine.trim(),
        status: input.status ?? "active",
        units: input.units,
        listingIds: [],
        createdAt: new Date().toISOString(),
        channel: { provider: "none", status: "not_connected", scopes: [] },
      };
      row.properties.push(record);
      return structuredClone(record);
    });

    recordAudit({
      actor,
      action: "create",
      entity: "merchant_property",
      entityId: property.id,
      entityLabel: property.name,
      summary: `Property added: ${property.name}`,
    });
    return delay(property);
  },

  async updateProperty(
    id: string,
    propertyId: string,
    input: Partial<PropertyInput>,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<MerchantProperty> {
    assertScope(scope, id);
    const property = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      const target = row.properties.find((p) => p.id === propertyId) ?? notFound("Property");
      Object.assign(target, input);
      return structuredClone(target);
    });
    recordAudit({
      actor,
      action: "update",
      entity: "merchant_property",
      entityId: propertyId,
      entityLabel: property.name,
      summary: `Property updated: ${property.name}`,
    });
    return delay(property);
  },

  async removeProperty(
    id: string,
    propertyId: string,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<void> {
    assertScope(scope, id);
    const name = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      const target = row.properties.find((p) => p.id === propertyId) ?? notFound("Property");
      const live = draft.catalogueDrafts.filter(
        (c) => c.propertyId === propertyId && c.status === "published",
      );
      if (live.length) {
        forbidden("Unpublish this property's listings before removing it.");
      }
      row.properties = row.properties.filter((p) => p.id !== propertyId);
      return target.name;
    });
    recordAudit({
      actor,
      action: "delete",
      entity: "merchant_property",
      entityId: propertyId,
      entityLabel: name,
      summary: `Property removed: ${name}`,
    });
    return delay(undefined, 200);
  },

  // --- channel manager / PMS ----------------------------------------------

  /**
   * Record a channel-manager connection.
   *
   * **Nothing is called.** No external request leaves the browser; this stores
   * the connection state a real integration would report so the surfaces exist.
   */
  async connectChannel(
    id: string,
    propertyId: string,
    input: { provider: ChannelProvider; externalRef: string; scopes: ChannelScope[] },
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<MerchantProperty> {
    assertScope(scope, id);
    const merchant = findMerchant(id);
    if (!planFor(merchant).unlocks.includes("channel_manager")) {
      forbidden(
        `Channel manager connections are available on Professional and Premium. You're on ${planFor(merchant).name}.`,
      );
    }
    if (input.provider === "none") invalid("Choose a channel manager or PMS.");
    if (!input.externalRef.trim()) invalid("Enter the property code from your provider.");
    if (input.scopes.length === 0) invalid("Choose at least one thing to sync.");

    const property = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id)!;
      const target = row.properties.find((p) => p.id === propertyId) ?? notFound("Property");
      target.channel = {
        provider: input.provider,
        // A real connection begins by syncing; the prototype stops there rather
        // than faking a successful handshake it never performed.
        status: "syncing",
        externalRef: input.externalRef.trim(),
        scopes: input.scopes,
        lastSyncAt: new Date().toISOString(),
        message: "Initial sync queued. No external system is contacted in this prototype.",
      };
      return structuredClone(target);
    });

    recordAudit({
      actor,
      action: "update",
      entity: "merchant_channel",
      entityId: propertyId,
      entityLabel: property.name,
      summary: `${property.name} connected to ${input.provider}`,
      to: "syncing",
    });
    return delay(property);
  },

  async disconnectChannel(
    id: string,
    propertyId: string,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<MerchantProperty> {
    assertScope(scope, id);
    const property = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      const target = row.properties.find((p) => p.id === propertyId) ?? notFound("Property");
      target.channel = { provider: "none", status: "not_connected", scopes: [] };
      return structuredClone(target);
    });
    recordAudit({
      actor,
      action: "update",
      entity: "merchant_channel",
      entityId: propertyId,
      entityLabel: property.name,
      summary: `${property.name} disconnected from its channel manager`,
      to: "not_connected",
    });
    return delay(property);
  },

  /** Mark a queued sync as settled. Local state only — nothing is fetched. */
  async completeChannelSync(
    id: string,
    propertyId: string,
    outcome: { status: "connected" | "error"; message?: string },
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<MerchantProperty> {
    assertScope(scope, id);
    const property = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      const target = row.properties.find((p) => p.id === propertyId) ?? notFound("Property");
      target.channel.status = outcome.status;
      target.channel.lastSyncAt = new Date().toISOString();
      target.channel.message = outcome.message;
      return structuredClone(target);
    });
    recordAudit({
      actor,
      action: "update",
      entity: "merchant_channel",
      entityId: propertyId,
      entityLabel: property.name,
      summary: `Channel sync ${outcome.status} for ${property.name}`,
      to: outcome.status,
    });
    return delay(property, 200);
  },

  // --- subscription --------------------------------------------------------

  /**
   * Change plan. **Mock billing only** — no charge is attempted; the platform
   * revenue entry is recorded so the Revenue Center reflects the subscription.
   */
  async changePlan(
    id: string,
    planId: MerchantPlanId,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Merchant> {
    assertScope(scope, id);
    const merchant = findMerchant(id);
    const plan = MERCHANT_PLANS[planId] ?? notFound("Plan");
    if (merchant.subscription.planId === planId && merchant.subscription.status === "active") {
      invalid(`You're already on ${plan.name}.`);
    }
    // Downgrades must not leave the merchant over the new ceilings.
    const over: string[] = [];
    if (!withinLimit(plan.limits.properties, merchant.properties.length - 1)) {
      over.push(`${merchant.properties.length} properties (limit ${plan.limits.properties})`);
    }
    if (!withinLimit(plan.limits.staff, merchant.staff.length - 1)) {
      over.push(`${merchant.staff.length} staff accounts (limit ${plan.limits.staff})`);
    }
    if (over.length) {
      invalid(`You're over the ${plan.name} limits: ${over.join(", ")}. Remove them first.`);
    }

    const now = new Date().toISOString();
    const updated = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id)!;
      row.subscription = {
        planId,
        status: "active",
        billingCycle: plan.billingCycle,
        price: plan.price,
        startedAt: now,
        renewsAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        autoRenew: true,
      };
      row.contract.payoutTermDays = plan.limits.payoutTermDays;
      return structuredClone(row);
    });

    if (plan.price > 0) {
      recordRevenue({
        at: now,
        source: "merchant_subscription",
        status: "finalized",
        currency: "USD",
        label: `${plan.name} merchant subscription — ${updated.name}`,
        grossValue: money(plan.price),
        partnerShare: 0,
        amount: money(plan.price),
        merchantId: id,
        merchantName: updated.name,
        planId,
        note: "Merchant subscription (mock billing — no charge was attempted).",
      });
    }

    recordAudit({
      actor,
      action: "update",
      entity: "merchant_subscription",
      entityId: id,
      entityLabel: updated.name,
      summary: `${updated.name} moved to the ${plan.name} plan`,
      from: merchant.subscription.planId,
      to: planId,
    });
    notify({
      category: "system",
      audience: ["merchant"],
      merchantId: id,
      title: `You're on ${plan.name}`,
      body: plan.price > 0 ? `Billed $${plan.price}/month (demo billing).` : "No charge on this plan.",
      href: "/dashboard/merchant/subscription",
      tone: "success",
    });
    return delay(updated);
  },

  async cancelSubscription(
    id: string,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<Merchant> {
    assertScope(scope, id);
    const updated = mutate((draft) => {
      const row = draft.merchants.find((m) => m.id === id) ?? notFound("Merchant");
      if (row.subscription.planId === "basic") {
        invalid("Basic is the free plan — there's nothing to cancel.");
      }
      row.subscription.status = "cancelled";
      row.subscription.autoRenew = false;
      row.subscription.cancelledAt = new Date().toISOString();
      return structuredClone(row);
    });
    recordAudit({
      actor,
      action: "update",
      entity: "merchant_subscription",
      entityId: id,
      entityLabel: updated.name,
      summary: `${updated.name} cancelled their subscription`,
      to: "cancelled",
    });
    return delay(updated);
  },

  // --- performance ---------------------------------------------------------

  /**
   * Merchant health, derived on read from bookings, reviews and the profile.
   * Nothing here is stored, so it can never disagree with the ledger.
   */
  async performance(id: string): Promise<MerchantPerformance> {
    const state = getState();
    const merchant = findMerchant(id);
    const bookings = state.bookings.filter((b) => b.merchant.id === id);
    const reviews = state.reviews.filter((r) => r.merchantId === id);

    const cancelled = bookings.filter(
      (b) => b.status === "cancelled" || b.status === "refunded",
    ).length;
    const grossBookingValue = money(
      bookings.reduce((n, b) => n + b.money.base + b.money.markup, 0),
    );
    const netEarnings = money(bookings.reduce((n, b) => n + b.money.netSettlement, 0));
    const reviewScore = reviews.length
      ? money(reviews.reduce((n, r) => n + r.rating, 0) / reviews.length)
      : 0;
    const replied = reviews.filter((r) => Boolean(r.response)).length;
    const responseRate = reviews.length ? money((replied / reviews.length) * 100) : 0;
    const cancellationRate = bookings.length ? money((cancelled / bookings.length) * 100) : 0;

    // Completeness is the onboarding checklist, so the two can't disagree.
    const listingCompleteness = onboardingProgress(merchant).percent;

    const score = money(
      (reviewScore / 5) * 100 * 0.35 +
        Math.max(0, 100 - cancellationRate * 3) * 0.25 +
        responseRate * 0.2 +
        listingCompleteness * 0.2,
    );

    return delay(
      {
        currency: merchant.currency,
        bookings: bookings.length,
        cancelledBookings: cancelled,
        grossBookingValue,
        netEarnings,
        averageOrderValue: bookings.length ? money(grossBookingValue / bookings.length) : 0,
        cancellationRate,
        responseRate,
        reviewScore,
        reviewCount: reviews.length,
        listingCompleteness,
        healthScore: score,
        tier: healthTier(score),
      },
      120,
    );
  },

  /** Required document types still missing or rejected — drives the upload UI. */
  outstandingDocuments(merchant: Merchant): MerchantDocumentType[] {
    return REQUIRED_DOCUMENT_TYPES.filter(
      (type) => !merchant.documents.some((d) => d.type === type && d.status === "approved"),
    );
  },
};
