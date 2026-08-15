/**
 * The catalogue API surface — create → submit → review → approve → publish.
 *
 * This is the seam the prototype was missing: the merchant's product list, the
 * admin review queue and the public storefront all read the *same* records, so
 * approving a listing here is what makes it appear on the site, and rejecting
 * one is what takes it down.
 *
 * Reads merge two sources without duplicating either: the launch catalogue from
 * `constants/listings` (workflow state overlaid from the store) and products
 * created in the dashboard (stored whole).
 */

import type { ListParams, Paginated } from "../data/types";
import {
  CATALOGUE_STATUS_LABELS,
  canTransitionCatalogue,
  catalogueSubmissionProblems,
  publishedWorkflow,
  seedCatalogueStatic,
  seedCatalogueStatics,
  toListing,
  type CatalogueDraftInput,
  type CatalogueEvent,
  type CatalogueItem,
  type CatalogueStatic,
  type CatalogueStatus,
  type CatalogueWorkflow,
} from "./catalogue";
import { canTrade, planFor, publishBlockers, withinLimit } from "./merchants";
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
import type { DomainActor } from "./types";
import type { DomainState } from "./store";

// ---------------------------------------------------------------------------
// Read model
// ---------------------------------------------------------------------------

function merchantName(state: DomainState, merchantId: string): string {
  return state.merchants.find((m) => m.id === merchantId)?.name ?? "Unknown merchant";
}

function compose(
  state: DomainState,
  statics: CatalogueStatic,
  workflow: CatalogueWorkflow,
): CatalogueItem {
  return { ...statics, ...workflow, merchantName: merchantName(state, statics.merchantId) };
}

/**
 * Every catalogue item, launch listings included.
 *
 * Launch listings are published unless the store says otherwise, which is why a
 * listing added to `constants/listings` needs no migration to show up here.
 */
export function allCatalogueItems(): CatalogueItem[] {
  const state = getState();
  const seeded = seedCatalogueStatics().map((s) =>
    compose(state, s, state.catalogueWorkflow[s.id] ?? publishedWorkflow()),
  );
  const created = state.catalogueDrafts.map((row) => {
    const { status, version, createdAt, updatedAt, submittedAt, reviewedAt, reviewedBy, reviewNote, publishedAt, unpublishedAt, timeline, ...statics } = row;
    return compose(
      state,
      statics,
      { status, version, createdAt, updatedAt, submittedAt, reviewedAt, reviewedBy, reviewNote, publishedAt, unpublishedAt, timeline },
    );
  });
  return [...created, ...seeded];
}

export function getCatalogueItem(id: string): CatalogueItem | undefined {
  return allCatalogueItems().find((item) => item.id === id);
}

/** Items owned by one merchant — the merchant's product list. */
export function catalogueForMerchant(merchantId: string): CatalogueItem[] {
  return allCatalogueItems().filter((item) => item.merchantId === merchantId);
}

/**
 * Is a listing visible to customers?
 *
 * `services/catalog.ts` calls this for every storefront read, which is what
 * makes "unpublish" actually remove a product from the site.
 */
export function isListingLive(listingId: string): boolean {
  const state = getState();
  const workflow = state.catalogueWorkflow[listingId];
  if (workflow) return workflow.status === "published";
  const draft = state.catalogueDrafts.find((d) => d.id === listingId);
  if (draft) return draft.status === "published";
  // No record at all: a launch listing nobody has touched, which is live.
  return Boolean(seedCatalogueStatic(listingId));
}

/**
 * Filter a listing array down to what the public may see, then append the
 * merchant-created products that have been approved and published.
 *
 * Storefront reads call this, so a listing a merchant creates in the dashboard
 * and gets approved genuinely appears on the site — the create → submit →
 * approve → publish loop closes where a customer can book it.
 */
export function filterLive<T extends { id: string; vertical?: string }>(rows: T[]): T[] {
  const state = getState();
  const workflow = state.catalogueWorkflow;
  const visible = rows.filter((row) => {
    const wf = workflow[row.id];
    return wf ? wf.status === "published" : true;
  });

  const vertical = rows[0]?.vertical;
  if (!vertical) return visible;

  const created = state.catalogueDrafts
    .filter((d) => d.status === "published" && d.vertical === vertical)
    .map((d) => toListing({ ...d, merchantName: merchantName(state, d.merchantId) }));
  return created.length ? ([...(created as unknown as T[]), ...visible]) : visible;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function event(
  status: CatalogueStatus,
  label: string,
  actor: DomainActor,
  note?: string,
): CatalogueEvent {
  return {
    id: nextId("cate"),
    at: new Date().toISOString(),
    status,
    label,
    actor: actor.name,
    note,
  };
}

/**
 * Apply a workflow change to whichever half of the store owns the item.
 *
 * Launch listings keep their product data in `constants/listings` and get a
 * workflow entry written here; dashboard-created items are updated in place.
 */
function writeWorkflow(
  draft: DomainState,
  id: string,
  apply: (wf: CatalogueWorkflow) => void,
): void {
  const created = draft.catalogueDrafts.find((d) => d.id === id);
  if (created) {
    apply(created);
    created.updatedAt = new Date().toISOString();
    return;
  }
  if (!seedCatalogueStatic(id)) notFound("Catalogue item");
  const existing = draft.catalogueWorkflow[id] ?? publishedWorkflow();
  const next = structuredClone(existing);
  apply(next);
  next.updatedAt = new Date().toISOString();
  draft.catalogueWorkflow[id] = next;
}

function assertOwnership(item: CatalogueItem, scope: DomainScope): void {
  if (scope.merchantId && item.merchantId !== scope.merchantId) {
    forbidden("You can only manage your own listings.");
  }
}

const CATALOGUE_FILTERS: Record<string, (row: CatalogueItem, value: string) => boolean> = {
  status: (row, value) => row.status === value,
  vertical: (row, value) => row.vertical === value,
  merchantId: (row, value) => row.merchantId === value,
  origin: (row, value) => row.origin === value,
  /** The admin review queue. */
  awaitingReview: (row) => row.status === "submitted" || row.status === "under_review",
};

export const catalogueService = {
  async list(params: ListParams = {}, scope: DomainScope = SCOPE_NONE): Promise<Paginated<CatalogueItem>> {
    const rows = allCatalogueItems().filter(
      (item) => !scope.merchantId || item.merchantId === scope.merchantId,
    );
    return delay(
      queryList(rows, {
        params,
        searchFields: (r) => [r.title, r.merchantName, r.city, r.country, r.vertical],
        sortValue: (r, field) => (r as unknown as Record<string, string | number>)[field],
        filterPredicates: CATALOGUE_FILTERS,
        defaultSort: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      }),
    );
  },

  async get(id: string, scope: DomainScope = SCOPE_NONE): Promise<CatalogueItem> {
    const item = getCatalogueItem(id) ?? notFound("Catalogue item");
    assertOwnership(item, scope);
    return delay(item);
  },

  /** Every item for a merchant, unpaginated — the checklist and stat tiles use this. */
  async forMerchant(merchantId: string): Promise<CatalogueItem[]> {
    return delay(catalogueForMerchant(merchantId), 90);
  },

  /** The admin review queue, newest submission first. */
  async reviewQueue(): Promise<CatalogueItem[]> {
    const rows = allCatalogueItems().filter(
      (item) => item.status === "submitted" || item.status === "under_review",
    );
    rows.sort(
      (a, b) => new Date(a.submittedAt ?? a.updatedAt).getTime() - new Date(b.submittedAt ?? b.updatedAt).getTime(),
    );
    return delay(rows, 120);
  },

  // --- merchant side -------------------------------------------------------

  async create(
    merchantId: string,
    input: CatalogueDraftInput,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<CatalogueItem> {
    if (scope.merchantId && scope.merchantId !== merchantId) {
      forbidden("You can only create listings for your own account.");
    }
    const state = getState();
    const merchant = state.merchants.find((m) => m.id === merchantId) ?? notFound("Merchant");
    if (!canTrade(merchant)) {
      forbidden("Your merchant account must be approved before you can create listings.");
    }
    if (!merchant.verticals.includes(input.vertical)) {
      invalid(`Your account is not approved to supply ${input.vertical}.`);
    }
    const limit = planFor(merchant).limits.listings;
    const used = catalogueForMerchant(merchantId).filter((i) => i.status !== "archived").length;
    if (!withinLimit(limit, used)) {
      forbidden(
        `Your ${planFor(merchant).name} plan allows ${limit} listings. Upgrade to add more.`,
      );
    }

    const now = new Date().toISOString();
    const id = nextId("cat");
    const record: CatalogueStatic & CatalogueWorkflow = {
      id,
      merchantId,
      propertyId: input.propertyId,
      vertical: input.vertical,
      title: input.title.trim(),
      slug: input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      summary: input.summary.trim(),
      city: input.city.trim(),
      country: input.country.trim(),
      basePrice: input.basePrice,
      currency: "USD",
      image:
        input.image ??
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      origin: "merchant",
      status: "draft",
      version: 1,
      createdAt: now,
      updatedAt: now,
      timeline: [event("draft", "Draft created", actor)],
    };

    mutate((draft) => draft.catalogueDrafts.unshift(record));
    recordAudit({
      actor,
      action: "create",
      entity: "catalogue",
      entityId: id,
      entityLabel: record.title,
      summary: `Listing drafted: ${record.title}`,
    });
    return delay(getCatalogueItem(id)!);
  },

  async update(
    id: string,
    input: Partial<CatalogueDraftInput>,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<CatalogueItem> {
    const item = getCatalogueItem(id) ?? notFound("Catalogue item");
    assertOwnership(item, scope);
    if (item.status === "submitted" || item.status === "under_review") {
      forbidden("This listing is being reviewed. Wait for the decision before editing it.");
    }
    if (item.origin === "seed") {
      forbidden(
        "Launch listings are managed from the catalogue module; only their review status can change here.",
      );
    }

    const updated = mutate((draft) => {
      const row = draft.catalogueDrafts.find((d) => d.id === id) ?? notFound("Catalogue item");
      Object.assign(row, input);
      row.updatedAt = new Date().toISOString();
      // Editing a live listing does not silently change what customers see.
      if (row.status === "published") {
        row.status = "unpublished";
        row.unpublishedAt = new Date().toISOString();
        row.timeline.push(
          event("unpublished", "Taken down for editing", actor, "Resubmit to publish the changes."),
        );
      }
      return structuredClone(row);
    });

    recordAudit({
      actor,
      action: "update",
      entity: "catalogue",
      entityId: id,
      entityLabel: updated.title,
      summary: `Listing updated: ${updated.title}`,
    });
    return delay(getCatalogueItem(id)!);
  },

  /** Merchant: send a draft (or a sent-back listing) for review. */
  async submit(
    id: string,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<CatalogueItem> {
    const item = getCatalogueItem(id) ?? notFound("Catalogue item");
    assertOwnership(item, scope);
    if (!canTransitionCatalogue(item.status, "submitted")) {
      forbidden(`A ${CATALOGUE_STATUS_LABELS[item.status].toLowerCase()} listing cannot be submitted.`);
    }
    const merchant = getState().merchants.find((m) => m.id === item.merchantId) ?? notFound("Merchant");
    const blockers = publishBlockers(merchant);
    if (blockers.length) invalid(`Finish onboarding first: ${blockers.join(" ")}`);

    const problems = catalogueSubmissionProblems(item);
    if (problems.length) invalid(problems.join(" "));

    const resubmission = item.version > 1 || item.status === "action_required";
    mutate((draft) =>
      writeWorkflow(draft, id, (wf) => {
        wf.status = "submitted";
        wf.submittedAt = new Date().toISOString();
        wf.reviewNote = undefined;
        if (resubmission) wf.version += 1;
        wf.timeline.push(
          event("submitted", resubmission ? "Resubmitted for review" : "Submitted for review", actor),
        );
      }),
    );

    recordAudit({
      actor,
      action: "status_change",
      entity: "catalogue",
      entityId: id,
      entityLabel: item.title,
      summary: `${item.title} submitted for review`,
      from: item.status,
      to: "submitted",
    });
    notify({
      category: "system",
      audience: ["admin"],
      title: "Listing awaiting review",
      body: `${item.merchantName} submitted "${item.title}".`,
      href: "/dashboard/catalog/approvals",
      tone: "neutral",
    });
    return delay(getCatalogueItem(id)!);
  },

  /** Merchant: make an approved listing live. */
  async publish(
    id: string,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<CatalogueItem> {
    const item = getCatalogueItem(id) ?? notFound("Catalogue item");
    assertOwnership(item, scope);
    if (!canTransitionCatalogue(item.status, "published")) {
      forbidden("Only an approved (or previously published) listing can go live.");
    }
    const merchant = getState().merchants.find((m) => m.id === item.merchantId) ?? notFound("Merchant");
    const blockers = publishBlockers(merchant);
    if (blockers.length) forbidden(blockers.join(" "));

    mutate((draft) =>
      writeWorkflow(draft, id, (wf) => {
        wf.status = "published";
        wf.publishedAt = new Date().toISOString();
        wf.unpublishedAt = undefined;
        wf.timeline.push(event("published", "Published", actor));
      }),
    );

    recordAudit({
      actor,
      action: "status_change",
      entity: "catalogue",
      entityId: id,
      entityLabel: item.title,
      summary: `${item.title} published`,
      from: item.status,
      to: "published",
    });
    return delay(getCatalogueItem(id)!);
  },

  async unpublish(
    id: string,
    reason: string | undefined,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<CatalogueItem> {
    const item = getCatalogueItem(id) ?? notFound("Catalogue item");
    assertOwnership(item, scope);
    if (!canTransitionCatalogue(item.status, "unpublished")) {
      forbidden("Only a published listing can be taken down.");
    }
    mutate((draft) =>
      writeWorkflow(draft, id, (wf) => {
        wf.status = "unpublished";
        wf.unpublishedAt = new Date().toISOString();
        wf.reviewNote = reason;
        wf.timeline.push(event("unpublished", "Taken down", actor, reason));
      }),
    );
    recordAudit({
      actor,
      action: "status_change",
      entity: "catalogue",
      entityId: id,
      entityLabel: item.title,
      summary: `${item.title} unpublished${reason ? `: ${reason}` : ""}`,
      from: item.status,
      to: "unpublished",
    });
    return delay(getCatalogueItem(id)!);
  },

  // --- admin side ----------------------------------------------------------

  /**
   * Admin: record a review decision.
   *
   * `approved` clears the listing to go live but does **not** publish it — that
   * stays the merchant's call, which is what keeps "approved" and "live" from
   * being the same fact.
   */
  async review(
    id: string,
    decision: {
      to: Extract<CatalogueStatus, "under_review" | "approved" | "action_required" | "rejected">;
      note?: string;
      /** Publish immediately on approval, for the "approve & publish" action. */
      publish?: boolean;
    },
    actor: DomainActor = SYSTEM_ACTOR,
  ): Promise<CatalogueItem> {
    const item = getCatalogueItem(id) ?? notFound("Catalogue item");
    if (!canTransitionCatalogue(item.status, decision.to)) {
      forbidden(
        `A ${CATALOGUE_STATUS_LABELS[item.status].toLowerCase()} listing cannot move to ${CATALOGUE_STATUS_LABELS[decision.to].toLowerCase()}.`,
      );
    }
    if ((decision.to === "rejected" || decision.to === "action_required") && !decision.note?.trim()) {
      invalid("Tell the merchant what needs to change.");
    }

    const now = new Date().toISOString();
    const LABEL: Record<string, string> = {
      under_review: "Review started",
      approved: "Approved",
      action_required: "Changes requested",
      rejected: "Rejected",
    };

    mutate((draft) =>
      writeWorkflow(draft, id, (wf) => {
        wf.status = decision.to;
        wf.reviewedAt = now;
        wf.reviewedBy = actor.name;
        wf.reviewNote = decision.note;
        wf.timeline.push(event(decision.to, LABEL[decision.to], actor, decision.note));
        if (decision.to === "approved" && decision.publish) {
          wf.status = "published";
          wf.publishedAt = now;
          wf.timeline.push(event("published", "Published by the platform", actor));
        }
      }),
    );

    recordAudit({
      actor,
      action: decision.to === "approved" ? "approve" : decision.to === "rejected" ? "reject" : "status_change",
      entity: "catalogue",
      entityId: id,
      entityLabel: item.title,
      summary: `${item.title}: ${LABEL[decision.to]}${decision.note ? ` — ${decision.note}` : ""}`,
      from: item.status,
      to: decision.to,
    });

    const COPY: Record<string, { title: string; body: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
      under_review: {
        title: "Listing under review",
        body: `"${item.title}" is being reviewed.`,
        tone: "neutral",
      },
      approved: {
        title: "Listing approved",
        body: decision.publish
          ? `"${item.title}" is approved and live.`
          : `"${item.title}" is approved — publish it when you're ready.`,
        tone: "success",
      },
      action_required: {
        title: "Changes requested",
        body: `"${item.title}": ${decision.note}`,
        tone: "warning",
      },
      rejected: {
        title: "Listing rejected",
        body: `"${item.title}": ${decision.note}`,
        tone: "danger",
      },
    };
    const copy = COPY[decision.to];
    notify({
      category: "system",
      audience: ["merchant"],
      merchantId: item.merchantId,
      title: copy.title,
      body: copy.body,
      href: "/dashboard/catalog/approvals",
      tone: copy.tone,
    });
    return delay(getCatalogueItem(id)!);
  },
};
