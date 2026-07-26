import { merchantsService } from "./service";
import type { Merchant, MerchantStatus } from "./types";

/**
 * Extended merchant profile shown on `merchants/[id]`. The base {@link Merchant}
 * lives in the CRUD stub; the KYC / documents / wallet / settlement / audit
 * sections are derived deterministically from it here so the mock stays stable
 * across renders. A real build fetches these from the merchant's sub-resources —
 * only {@link getMerchantDetail} changes.
 */

export type KycStatus = "verified" | "pending" | "rejected" | "unsubmitted";
export type DocumentStatus = "approved" | "pending" | "rejected";
export type SettlementStatus = "paid" | "processing" | "scheduled";

export interface MerchantKyc {
  status: KycStatus;
  legalName: string;
  registrationNo: string;
  taxId: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewer?: string;
}

export interface MerchantDocument {
  id: string;
  name: string;
  category: string;
  status: DocumentStatus;
  uploadedAt: string;
  sizeKb: number;
}

export interface MerchantWallet {
  currency: string;
  /** Available to withdraw. */
  balance: number;
  /** Held in escrow until settlement. */
  pending: number;
  lifetimeEarnings: number;
  lastPayoutAt: string;
}

export interface MerchantSettlement {
  id: string;
  period: string;
  gross: number;
  commission: number;
  net: number;
  status: SettlementStatus;
  settledAt: string;
}

export interface MerchantAuditEntry {
  id: string;
  actor: string;
  action: string;
  at: string;
}

export interface MerchantDetail extends Merchant {
  kyc: MerchantKyc;
  documents: MerchantDocument[];
  wallet: MerchantWallet;
  settlements: MerchantSettlement[];
  audit: MerchantAuditEntry[];
}

const KYC_BY_STATUS: Record<MerchantStatus, KycStatus> = {
  active: "verified",
  suspended: "verified",
  pending: "pending",
  rejected: "rejected",
};

const DOC_CATALOGUE = [
  { name: "Business registration certificate", category: "Legal" },
  { name: "Tax registration (VAT/GST)", category: "Tax" },
  { name: "Authorised signatory ID", category: "Identity" },
  { name: "Bank account confirmation letter", category: "Banking" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Fixed reference point so derived dates are deterministic (no module-load clock). */
const REF = Date.UTC(2026, 6, 1);
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(REF - daysAgo * DAY).toISOString();

function round(n: number): number {
  return Math.round(n);
}

function buildDetail(m: Merchant): MerchantDetail {
  const n = Number(m.id.replace(/\D/g, "")) || 0;
  const kycStatus = KYC_BY_STATUS[m.status];

  const kyc: MerchantKyc = {
    status: kycStatus,
    legalName: `${m.name} Ltd.`,
    registrationNo: `REG-${100000 + n * 7}`,
    taxId: `TAX-${m.country.slice(0, 2).toUpperCase()}-${900000 + n * 13}`,
    submittedAt: iso(90 + (n % 30)),
    reviewedAt: kycStatus === "pending" ? undefined : iso(60 + (n % 20)),
    reviewer: kycStatus === "pending" ? undefined : "Compliance Team",
  };

  // Document statuses track the KYC outcome, with a little per-merchant variation.
  const documents: MerchantDocument[] = DOC_CATALOGUE.map((doc, i) => {
    let status: DocumentStatus = "approved";
    if (kycStatus === "pending") status = i < 2 ? "approved" : "pending";
    else if (kycStatus === "rejected") status = i === 2 ? "rejected" : "approved";
    else if (kycStatus === "unsubmitted") status = "pending";
    return {
      id: `${m.id}-doc-${i + 1}`,
      name: doc.name,
      category: doc.category,
      status,
      uploadedAt: iso(80 - i * 6 + (n % 10)),
      sizeKb: 180 + ((n + i * 37) % 640),
    };
  });

  const pending = round(m.revenue * m.commissionRate * 0.4);
  const wallet: MerchantWallet = {
    currency: m.currency,
    balance: round(m.revenue * 0.12),
    pending: m.status === "active" ? pending : 0,
    lifetimeEarnings: round(m.revenue * (1 - m.commissionRate)),
    lastPayoutAt: iso(14 + (n % 21)),
  };

  // Last four monthly settlements, newest first.
  const settlements: MerchantSettlement[] = Array.from({ length: 4 }).map((_, i) => {
    const monthIdx = (6 - i + 12) % 12; // Jul, Jun, May, Apr 2026
    const gross = round((m.revenue / 6) * (1 + ((n + i) % 5) * 0.08));
    const commission = round(gross * m.commissionRate);
    const status: SettlementStatus = i === 0 ? "processing" : i === 1 && m.status === "active" ? "scheduled" : "paid";
    return {
      id: `${m.id}-stl-${monthIdx}`,
      period: `${MONTHS[monthIdx]} 2026`,
      gross,
      commission,
      net: gross - commission,
      status,
      settledAt: iso(i * 30 + 5),
    };
  });

  const audit: MerchantAuditEntry[] = [
    { id: `${m.id}-aud-1`, actor: "System", action: "Merchant account created", at: m.joinedAt },
    { id: `${m.id}-aud-2`, actor: "Compliance Team", action: "KYC documents received", at: kyc.submittedAt },
    ...(kyc.reviewedAt
      ? [{
          id: `${m.id}-aud-3`,
          actor: "Compliance Team",
          action: kycStatus === "rejected" ? "KYC rejected" : "KYC verified",
          at: kyc.reviewedAt,
        }]
      : []),
    { id: `${m.id}-aud-4`, actor: "Admin", action: `Commission rate set to ${(m.commissionRate * 100).toFixed(1)}%`, at: iso(30 + (n % 15)) },
    { id: `${m.id}-aud-5`, actor: "System", action: "Last payout disbursed", at: wallet.lastPayoutAt },
  ];

  return { ...m, kyc, documents, wallet, settlements, audit };
}

/** Full merchant profile, or `undefined` when the id is unknown (→ notFound). */
export async function getMerchantDetail(id: string): Promise<MerchantDetail | undefined> {
  try {
    const merchant = await merchantsService.get(id);
    return merchant ? buildDetail(merchant) : undefined;
  } catch {
    return undefined;
  }
}
