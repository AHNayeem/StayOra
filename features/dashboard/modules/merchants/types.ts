/**
 * Merchants module types.
 *
 * There is no module-local merchant model any more: the entity, its statuses
 * and its rules all come from the domain (`@/features/dashboard/domain`). This
 * file only adds the presentation registries the dashboard's table/filter
 * helpers consume, derived from the domain's own label and tone maps so the two
 * can never disagree.
 */

import {
  BANK_STATUS_LABELS,
  CHANNEL_STATUS_LABELS,
  CHANNEL_STATUS_TONES,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_TONES,
  DOCUMENT_STATUS_VALUES,
  KYC_STATUS_LABELS,
  KYC_STATUS_TONES,
  KYC_STATUS_VALUES,
  MERCHANT_STATUS_LABELS,
  MERCHANT_STATUS_TONES,
  MERCHANT_STATUS_VALUES,
  CHANNEL_STATUS_VALUES,
  type BankStatus,
  type ChannelStatus,
  type KycStatus,
  type Merchant,
  type MerchantDocumentStatus,
  type MerchantStatus,
} from "@/features/dashboard/domain";
import type { StatusDef } from "../../lib/status";

export type { Merchant, MerchantStatus, KycStatus, MerchantDocumentStatus, BankStatus };
export { MERCHANT_STATUS_VALUES };

function registry<V extends string>(
  values: readonly V[],
  labels: Record<V, string>,
  tones: Record<V, StatusDef<V>["tone"]>,
): readonly StatusDef<V>[] {
  return values.map((value) => ({ value, label: labels[value], tone: tones[value] }));
}

export const MERCHANT_STATUSES = registry(
  MERCHANT_STATUS_VALUES,
  MERCHANT_STATUS_LABELS,
  MERCHANT_STATUS_TONES,
);

export const KYC_STATUSES = registry(KYC_STATUS_VALUES, KYC_STATUS_LABELS, KYC_STATUS_TONES);

export const DOCUMENT_STATUSES = registry(
  DOCUMENT_STATUS_VALUES,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_TONES,
);

export const CHANNEL_STATUSES = registry(
  CHANNEL_STATUS_VALUES,
  CHANNEL_STATUS_LABELS,
  CHANNEL_STATUS_TONES,
);

export const BANK_STATUSES: readonly StatusDef<BankStatus>[] = [
  { value: "unverified", label: BANK_STATUS_LABELS.unverified, tone: "neutral" },
  { value: "pending", label: BANK_STATUS_LABELS.pending, tone: "warning" },
  { value: "verified", label: BANK_STATUS_LABELS.verified, tone: "success" },
  { value: "rejected", label: BANK_STATUS_LABELS.rejected, tone: "danger" },
];
