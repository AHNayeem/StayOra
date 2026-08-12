/**
 * Bookings module types.
 *
 * The booking model, its lifecycle and its money now live in the shared domain
 * layer (`@/features/dashboard/domain`) because four surfaces depend on them —
 * admin, merchant, agency and the customer account. This file re-exports what
 * the module's columns/forms/views need so call sites keep a single import, and
 * adds only presentation-level option lists.
 */

export type {
  Booking,
  BookingChannel,
  BookingEvent,
  BookingFailureReason,
  BookingMoney,
  BookingSegment,
  BookingStatus,
  Payment,
  PaymentStatus,
  ProductKind,
  RefundQuote,
  Traveler,
} from "../../domain/types";

export {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  FAILURE_REASON_LABELS,
  FAILURE_NEXT_ACTIONS,
} from "../../domain/lifecycle";

export type { CreateBookingInput } from "../../domain/services";

import type { SelectOption } from "@/components/ui/select";
import type { BookingSegment, ProductKind } from "../../domain/types";

/** Product kinds a booking can be created against, as select options. */
export const PRODUCT_KIND_OPTIONS: SelectOption[] = [
  { value: "hotels", label: "Hotel" },
  { value: "apartments", label: "Apartment" },
  { value: "resorts", label: "Resort" },
  { value: "shared-rooms", label: "Shared room" },
  { value: "convention-hall", label: "Convention hall" },
  { value: "tours", label: "Tour" },
  { value: "activities", label: "Activity" },
  { value: "transport", label: "Transport" },
  { value: "flights", label: "Flight" },
  { value: "visa", label: "Visa" },
  { value: "combo", label: "Combo bundle" },
];

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = Object.fromEntries(
  PRODUCT_KIND_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ProductKind, string>;

export const SEGMENT_OPTIONS: SelectOption[] = [
  { value: "b2c", label: "B2C — direct customer" },
  { value: "b2b", label: "B2B — agency / corporate" },
];

export const SEGMENT_LABELS: Record<BookingSegment, string> = {
  b2c: "B2C",
  b2b: "B2B",
};

export const CHANNEL_OPTIONS: SelectOption[] = [
  { value: "web", label: "Web" },
  { value: "ios", label: "iOS app" },
  { value: "android", label: "Android app" },
  { value: "agency", label: "Agency portal" },
  { value: "call_center", label: "Call centre" },
];
