/**
 * Repository contracts — the boundary a real backend replaces.
 *
 * Everything the assistant knows about the world arrives through one of these
 * six interfaces. Tools compose and rank; repositories only *fetch and mutate*.
 * That split is what makes the promised swap real:
 *
 *   MockListingRepository → ApiListingRepository
 *
 * changes one line in {@link "./index".setRepositories}, and no tool, agent
 * action, block or component knows the difference. Every method is async even
 * where the mock is synchronous, because a network call will be.
 */

import type {
  AIAvailabilityResult,
  AIBookingRecord,
  AIBookingSelection,
  AICancellationQuote,
  AIContactInformation,
  AIPaymentMethod,
  AIPaymentResult,
  AIPaymentSelection,
  AITravelerInfo,
  AITripPlan,
} from "@/types/ai";
import type { ListingVertical } from "@/types/booking";
import type { TravelerBooking } from "@/types/traveler";
import type { Listing } from "@/types/catalog";
import type { ListingDetail } from "@/types/detail";
import type {
  FlightBooking,
  FlightOffer,
  FlightSearchQuery,
  FlightSearchResult,
  VisaRequirement,
} from "@/types/flight";

/* -------------------------------------------------------------------------- */
/* Catalog                                                                     */
/* -------------------------------------------------------------------------- */

export interface ListingRepository {
  readonly id: string;
  /** Every listing in a vertical. The tools filter and rank; this only fetches. */
  listByVertical(vertical: ListingVertical): Promise<Listing[]>;
  getBySlug(vertical: ListingVertical, slug: string): Promise<Listing | undefined>;
  getDetail(vertical: ListingVertical, slug: string): Promise<ListingDetail | undefined>;
  /** Resolve ids across every vertical — what "the second one" needs. */
  getManyByIds(ids: string[]): Promise<Listing[]>;
}

/* -------------------------------------------------------------------------- */
/* Flights                                                                     */
/* -------------------------------------------------------------------------- */

export interface FlightRepository {
  readonly id: string;
  search(query: FlightSearchQuery): Promise<FlightSearchResult>;
  getOffer(offerId: string): Promise<FlightOffer | undefined>;
  getVisaRequirement(destinationCode: string, nationality: string): Promise<VisaRequirement>;
  listBookings(): Promise<FlightBooking[]>;
}

/* -------------------------------------------------------------------------- */
/* Account                                                                     */
/* -------------------------------------------------------------------------- */

/** The traveller's profile as the assistant is allowed to see it. */
export interface AIUserProfile {
  name?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  /** Loyalty tier label, when the account has one. */
  membership?: string;
  /** Points balance, for "can I pay with points?". */
  points?: number;
}

export interface AccountRepository {
  readonly id: string;
  getProfile(): Promise<AIUserProfile | null>;
  getSavedTravelers(): Promise<AITravelerInfo[]>;
  getSavedContact(): Promise<AIContactInformation | null>;
  /** Stay bookings the traveller already holds, as the account records them. */
  listStays(): Promise<TravelerBooking[]>;
  /** The same bookings in the assistant's neutral shape. */
  listStayBookings(): Promise<AIBookingRecord[]>;
}

/* -------------------------------------------------------------------------- */
/* Payments                                                                    */
/* -------------------------------------------------------------------------- */

export interface PaymentAuthorizeInput {
  intentId: string;
  amountUsd: number;
  methodId: string;
}

export interface PaymentRepository {
  readonly id: string;
  listMethods(): Promise<AIPaymentMethod[]>;
  /** Never returns a "confirmed" booking — only a payment outcome. */
  authorize(input: PaymentAuthorizeInput): Promise<AIPaymentResult>;
  /** Complete a step-up challenge (3-D Secure in the mock gateway). */
  authenticate(attemptId: string, code: string): Promise<AIPaymentResult>;
}

/* -------------------------------------------------------------------------- */
/* Bookings                                                                    */
/* -------------------------------------------------------------------------- */

/** Everything needed to price one bookable selection. */
export interface BookingQuoteInput {
  vertical: ListingVertical;
  slug: string;
  checkIn: string;
  /** Exclusive; equal to `checkIn` for single-date products. */
  checkOut: string;
  units: number;
  guests: number;
  roomTypeId?: string;
  ratePlanId?: string;
  /** Whose price this is — membership and wallet discounts depend on it. */
  customerEmail?: string;
  /** ISO date the quote is made on, so a re-price is reproducible. */
  bookingDate: string;
}

export interface BookingConfirmInput {
  quoteInput: BookingQuoteInput;
  selection: AIBookingSelection;
  contact: AIContactInformation;
  travelers: AITravelerInfo[];
  payment: AIPaymentSelection;
  specialRequests?: string;
  /** Total the traveller confirmed, base USD. Rejected if it has moved. */
  agreedTotalUsd: number;
}

export type BookingConfirmResult =
  | { ok: true; record: AIBookingRecord }
  | {
      ok: false;
      code: "availability_lost" | "price_changed" | "payment_failed" | "booking_failed";
      message: string;
      /** Present when the price moved under the traveller. */
      currentTotalUsd?: number;
      details?: string[];
    };

export type BookingCancelResult =
  | { ok: true; quote: AICancellationQuote }
  | { ok: false; message: string; href?: string };

export interface BookingRepository {
  readonly id: string;
  /**
   * Availability *and* price in one call — they are the same question in every
   * revenue system, and splitting them invites the two answers to disagree.
   */
  checkAvailability(input: BookingQuoteInput): Promise<AIAvailabilityResult>;
  /** The cheapest bookable room/rate for these dates, when none was chosen. */
  defaultRoomAndRate(
    input: Omit<BookingQuoteInput, "roomTypeId" | "ratePlanId">,
  ): Promise<{ roomTypeId: string; roomTypeName: string; ratePlanId: string; ratePlanName: string } | null>;
  /** Create the booking. Only ever called after explicit confirmation. */
  confirm(input: BookingConfirmInput): Promise<BookingConfirmResult>;
  /**
   * One booking, scoped to the traveller who asked.
   *
   * `customerEmail` is not optional politeness: a booking reference is a
   * guessable string, and without the scope the assistant would happily read
   * out somebody else's stay. Omitting it returns nothing rather than
   * everything.
   */
  get(idOrReference: string, customerEmail?: string): Promise<AIBookingRecord | undefined>;
  list(customerEmail?: string): Promise<AIBookingRecord[]>;
  quoteCancellation(
    idOrReference: string,
    customerEmail?: string,
  ): Promise<AICancellationQuote | undefined>;
  cancel(idOrReference: string, customerEmail?: string): Promise<BookingCancelResult>;
  /** Re-price a booking under a changed date range or party. */
  quoteModification(
    idOrReference: string,
    patch: { checkIn?: string; checkOut?: string; guests?: number; units?: number },
  ): Promise<
    | { ok: true; currentTotalUsd: number; newTotalUsd: number; available: boolean; message: string }
    | { ok: false; message: string }
  >;
}

/* -------------------------------------------------------------------------- */
/* Trips                                                                       */
/* -------------------------------------------------------------------------- */

export interface TripRepository {
  readonly id: string;
  save(plan: AITripPlan): Promise<AITripPlan>;
  get(planId: string): Promise<AITripPlan | undefined>;
  list(): Promise<AITripPlan[]>;
}

/* -------------------------------------------------------------------------- */
/* The bundle                                                                  */
/* -------------------------------------------------------------------------- */

export interface Repositories {
  listings: ListingRepository;
  flights: FlightRepository;
  account: AccountRepository;
  payments: PaymentRepository;
  bookings: BookingRepository;
  trips: TripRepository;
}
