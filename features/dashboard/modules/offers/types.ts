/**
 * Offers module types — offer/combo models live in the domain layer because the
 * same rules must evaluate identically at checkout, in the dashboard preview and
 * when a booking is created.
 */

export type {
  ComboItem,
  ComboOffer,
  CustomerEligibility,
  DiscountType,
  Offer,
  OfferEvaluation,
  OfferScope,
  OfferStatus,
  OfferType,
} from "../../domain/types";

export type { ComboTotals, OfferContext } from "../../domain/money";

import type { SelectOption } from "@/components/ui/select";
import type { StatusDef } from "../../lib/status";
import type {
  CustomerEligibility,
  DiscountType,
  OfferStatus,
  OfferType,
} from "../../domain/types";

/** Status registry — labels and tones for both offers and combos. */
export const OFFER_STATUSES: readonly StatusDef<OfferStatus>[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "scheduled", label: "Scheduled", tone: "info" },
  { value: "active", label: "Active", tone: "success" },
  { value: "paused", label: "Paused", tone: "warning" },
  { value: "expired", label: "Expired", tone: "danger" },
];

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  promo_code: "Promo code",
  seasonal: "Seasonal campaign",
  flash: "Flash sale",
  member: "Member rate",
  combo: "Combo bundle",
};

export const OFFER_TYPE_OPTIONS: SelectOption[] = Object.entries(OFFER_TYPE_LABELS)
  .filter(([value]) => value !== "combo")
  .map(([value, label]) => ({ value, label }));

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percent: "Percentage",
  fixed: "Fixed amount",
};

export const DISCOUNT_TYPE_OPTIONS: SelectOption[] = Object.entries(
  DISCOUNT_TYPE_LABELS,
).map(([value, label]) => ({ value, label }));

export const ELIGIBILITY_LABELS: Record<CustomerEligibility, string> = {
  all: "Everyone",
  new: "New customers",
  returning: "Returning customers",
  member: "Loyalty members",
  b2b: "B2B accounts only",
};

export const ELIGIBILITY_OPTIONS: SelectOption[] = Object.entries(
  ELIGIBILITY_LABELS,
).map(([value, label]) => ({ value, label }));

export const OFFER_SCOPE_OPTIONS: SelectOption[] = [
  { value: "platform", label: "Platform-wide" },
  { value: "merchant", label: "My products only" },
];

export const REFUND_HANDLING_OPTIONS: SelectOption[] = [
  { value: "pro_rata", label: "Pro-rata across items" },
  { value: "bundle_only", label: "Bundle only (all or nothing)" },
  { value: "non_refundable", label: "Non-refundable" },
];
