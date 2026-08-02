/**
 * Flight-domain types — the contract between the flight service seam and every
 * flight UI surface.
 *
 * These shapes are deliberately close to what a real GDS/NDC aggregator returns
 * (offer → slice → segment, fare broken into base/taxes/fees) so replacing
 * {@link "@/services/flight.service"} with live endpoints is a body swap, not a
 * refactor. Like the rest of the platform, **all money is base USD** so the
 * locale currency switcher can reprice everything live, and all times are stored
 * as *local wall-clock* ISO strings paired with the airport's UTC offset — never
 * as instants — because a flight's "08:40 departure" is a fact about the origin
 * airport, not about the viewer's timezone.
 */

import type { BookingStatus } from "./traveler";

/* -------------------------------------------------------------------------- */
/* Search vocabulary                                                           */
/* -------------------------------------------------------------------------- */

export const TRIP_TYPES = ["one-way", "round-trip", "multi-city"] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const CABIN_CLASSES = [
  "economy",
  "premium-economy",
  "business",
  "first",
] as const;
export type CabinClass = (typeof CABIN_CLASSES)[number];

export const PASSENGER_TYPES = ["adult", "child", "infant"] as const;
export type PassengerType = (typeof PASSENGER_TYPES)[number];

/** Head-count per passenger type. Infants are lap-held (no seat). */
export interface PassengerCounts {
  adults: number;
  children: number;
  infants: number;
}

/** One directional leg the traveller asked for (multi-city has 2–6). */
export interface FlightLeg {
  /** Origin IATA code. */
  from: string;
  /** Destination IATA code. */
  to: string;
  /** Departure date, ISO `YYYY-MM-DD`. */
  date: string;
}

/** The full search request — everything the search panel collects. */
export interface FlightSearchQuery {
  tripType: TripType;
  legs: FlightLeg[];
  passengers: PassengerCounts;
  cabin: CabinClass;
  /** Non-stop itineraries only. */
  directOnly: boolean;
  /** Widen the date window by ±3 days and surface a price calendar. */
  flexibleDates: boolean;
  /** Include alternative airports serving the same city. */
  nearbyAirports: boolean;
  /** Only fares with a refund option. */
  refundableOnly: boolean;
  /** Only fares including checked baggage. */
  baggageIncluded: boolean;
  /** Marketing-airline IATA codes to prefer; empty = all. */
  preferredAirlines: string[];
}

/* -------------------------------------------------------------------------- */
/* Reference data                                                              */
/* -------------------------------------------------------------------------- */

/** An airport in the reference dataset. */
export interface Airport {
  /** IATA code, e.g. "DAC". Primary key. */
  code: string;
  name: string;
  city: string;
  country: string;
  /** ISO 3166-1 alpha-2. */
  countryCode: string;
  /** IANA timezone, e.g. "Asia/Dhaka". */
  timezone: string;
  /** Standard UTC offset in minutes — used for cross-timezone duration maths. */
  utcOffsetMinutes: number;
  /** Terminal labels available at this airport, e.g. ["T1", "T2"]. */
  terminals: string[];
  /** Surfaced first in autocomplete when the query is empty. */
  popular?: boolean;
  /** IATA codes of alternative airports serving the same city region. */
  nearby?: string[];
}

export const ALLIANCES = ["Star Alliance", "SkyTeam", "Oneworld", "None"] as const;
export type Alliance = (typeof ALLIANCES)[number];

/** An airline in the reference dataset. */
export interface Airline {
  /** IATA designator, e.g. "BG". Primary key. */
  code: string;
  name: string;
  country: string;
  countryCode: string;
  alliance: Alliance;
  /** Brand colour used for the generated logo mark (hex). */
  brandColor: string;
  /** Contrasting foreground for the logo mark (hex). */
  logoTextColor: string;
  /** Traveller rating out of 5. */
  rating: number;
  /** On-time performance, 0–100. */
  onTimePct: number;
  fleetSize: number;
  /** IATA codes of the airline's hub airports. */
  hubs: string[];
  /** Low-cost carrier — drives the fare model and baggage defaults. */
  lowCost: boolean;
  /**
   * How far the carrier's network actually reaches from its hubs, km.
   *
   * Distinct from aircraft range, and the more important of the two: Novoair's
   * E190s *could* reach Dubai, but Novoair is a domestic and near-regional
   * operator that doesn't sell that route. Without this, a hub-based generator
   * happily offers every locally-based carrier on every long-haul search.
   */
  networkRadiusKm: number;
}

/** An aircraft type in the reference dataset. */
export interface Aircraft {
  /** IATA aircraft code, e.g. "788". Primary key. */
  code: string;
  name: string;
  /** Typical cruise speed, km/h — used to derive believable durations. */
  cruiseKph: number;
  /**
   * Maximum range in km. Hard constraint on which routes the type can fly — an
   * ATR 72 cannot cross the Bay of Bengal, and a generator that ignores this
   * produces itineraries no airline could operate.
   */
  rangeKm: number;
  /** Widebody aircraft get a 3-4-3 / 2-3-2 seat map instead of 3-3. */
  wideBody: boolean;
  seatPitchInches: number;
  hasWifi: boolean;
  hasEntertainment: boolean;
  hasPower: boolean;
}

/* -------------------------------------------------------------------------- */
/* Itineraries                                                                 */
/* -------------------------------------------------------------------------- */

/** Checked + cabin baggage granted by a fare. */
export interface BaggageAllowance {
  /** Cabin allowance in kg. */
  cabinKg: number;
  /** Checked allowance in kg (0 = not included). */
  checkedKg: number;
  /** Number of checked pieces the allowance covers. */
  checkedPieces: number;
}

/** A single operated flight between two airports. */
export interface FlightSegment {
  id: string;
  /** Marketing airline IATA code. */
  airlineCode: string;
  /** Operating carrier when codeshared, else the marketing airline. */
  operatedByCode: string;
  /** e.g. "BG 435". */
  flightNumber: string;
  aircraftCode: string;
  fromCode: string;
  toCode: string;
  departTerminal: string;
  arriveTerminal: string;
  /** Departure gate, e.g. "A12". Assigned close to departure in reality. */
  gate: string;
  /** Local wall-clock boarding time at origin, ISO `YYYY-MM-DDTHH:mm`. */
  boardingLocal: string;
  /** Local wall-clock departure at origin, ISO `YYYY-MM-DDTHH:mm`. */
  departLocal: string;
  /** Local wall-clock arrival at destination, ISO `YYYY-MM-DDTHH:mm`. */
  arriveLocal: string;
  /** Gate-to-gate minutes (already timezone-corrected). */
  durationMinutes: number;
  cabin: CabinClass;
  distanceKm: number;
  /** Per-passenger CO₂ for this segment, kg. */
  co2Kg: number;
  /** Seats left at this fare — drives the scarcity badge. */
  seatsAvailable: number;
}

/** A connection between two consecutive segments. */
export interface Layover {
  airportCode: string;
  durationMinutes: number;
  /** True when the connection requires changing airports in the same city. */
  changeOfAirport: boolean;
  /** Connection spans local 00:00–06:00. */
  overnight: boolean;
}

/** One directional journey (outbound, return, or a multi-city leg). */
export interface FlightSlice {
  id: string;
  segments: FlightSegment[];
  layovers: Layover[];
  fromCode: string;
  toCode: string;
  departLocal: string;
  arriveLocal: string;
  /** Total journey minutes including layovers. */
  durationMinutes: number;
  /** Connection count (0 = non-stop). */
  stops: number;
  /** Calendar days the arrival lands after departure (0 = same day). */
  dayOffset: number;
}

/** Per-passenger-type slice of the fare. */
export interface FareLine {
  type: PassengerType;
  count: number;
  /** Base fare for ONE passenger of this type, USD. */
  baseUsd: number;
  /** Taxes for ONE passenger of this type, USD. */
  taxesUsd: number;
}

/** The full price of an offer, itemised. */
export interface FareBreakdown {
  lines: FareLine[];
  /** Sum of base fares across all passengers. */
  baseFareUsd: number;
  /** Sum of taxes + carrier-imposed charges. */
  taxesUsd: number;
  /** Otithee booking fee. */
  serviceFeeUsd: number;
  /** Promotional reduction already applied by the airline (not a coupon). */
  discountUsd: number;
  /** baseFare + taxes + serviceFee − discount. */
  totalUsd: number;
  /** Total ÷ passenger count, for the "from / per adult" line. */
  perAdultUsd: number;
}

export const FLIGHT_BADGES = [
  "recommended",
  "cheapest",
  "fastest",
  "best-value",
  "promo",
] as const;
export type FlightBadge = (typeof FLIGHT_BADGES)[number];

/** Named fare families, cheapest → most flexible. */
export const FARE_BRANDS = ["Saver", "Value", "Flex", "Business Flex"] as const;
export type FareBrand = (typeof FARE_BRANDS)[number];

/** A priced, bookable itinerary — the unit the results list renders. */
export interface FlightOffer {
  id: string;
  tripType: TripType;
  /** 1 slice for one-way, 2 for round-trip, 2–6 for multi-city. */
  slices: FlightSlice[];
  /** Marketing airline for the whole offer. */
  airlineCode: string;
  /** True when slices are flown by more than one marketing airline. */
  mixedAirlines: boolean;
  cabin: CabinClass;
  fareBrand: FareBrand;
  fare: FareBreakdown;
  passengers: PassengerCounts;
  baggage: BaggageAllowance;
  refundable: boolean;
  /** Date/time changes permitted (a fee may apply — see {@link changeFeeUsd}). */
  changeable: boolean;
  changeFeeUsd: number;
  /** Cancellation fee when {@link refundable}; the rest is returned. */
  cancellationFeeUsd: number;
  mealsIncluded: boolean;
  wifiAvailable: boolean;
  entertainment: boolean;
  /** Total per-passenger CO₂ across every segment, kg. */
  co2Kg: number;
  /** Percent above/below the route average (negative = greener). */
  co2VsAveragePct: number;
  /** Lowest `seatsAvailable` across segments — the booking constraint. */
  seatsAvailable: number;
  badges: FlightBadge[];
  /** Marketing label for a promo fare, e.g. "Eid Sale · 12% off". */
  promoLabel?: string;
}

/* -------------------------------------------------------------------------- */
/* Results shaping                                                             */
/* -------------------------------------------------------------------------- */

export const FLIGHT_SORTS = [
  "recommended",
  "cheapest",
  "fastest",
  "earliest-departure",
  "latest-departure",
] as const;
export type FlightSort = (typeof FLIGHT_SORTS)[number];

/** Departure/arrival time buckets used by the results filter rail. */
export const TIME_BANDS = ["early", "morning", "afternoon", "evening"] as const;
export type TimeBand = (typeof TIME_BANDS)[number];

/** Client-side narrowing applied to a result set. */
export interface FlightFilters {
  /** Allowed stop counts (0, 1, 2 = "2+"). Empty = all. */
  stops: number[];
  /** Marketing airline codes. Empty = all. */
  airlines: string[];
  alliances: Alliance[];
  /** Inclusive USD bounds on the total fare. */
  priceMinUsd: number;
  priceMaxUsd: number;
  departBands: TimeBand[];
  arriveBands: TimeBand[];
  /** Cap on total journey minutes (0 = no cap). */
  maxDurationMinutes: number;
  /** Cap on the longest single layover, minutes (0 = no cap). */
  maxLayoverMinutes: number;
  refundableOnly: boolean;
  baggageIncluded: boolean;
}

/** Range metadata computed over the unfiltered result set, for filter bounds. */
export interface FlightResultFacets {
  priceMinUsd: number;
  priceMaxUsd: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  /** Airline codes present in the results with their cheapest total. */
  airlines: Array<{ code: string; count: number; fromUsd: number }>;
  alliances: Array<{ alliance: Alliance; count: number }>;
  /** Result counts by stop bucket. */
  stops: Array<{ stops: number; count: number; fromUsd: number }>;
}

/** One day in the flexible-dates price strip. */
export interface FarePricePoint {
  date: string;
  fromUsd: number;
  /** Cheapest day in the window. */
  cheapest: boolean;
}

/** What {@link searchFlights} returns. */
export interface FlightSearchResult {
  /** Echo of the query, so views can render "DAC → DXB · 2 adults". */
  query: FlightSearchQuery;
  offers: FlightOffer[];
  facets: FlightResultFacets;
  /** Populated when `query.flexibleDates` is set. */
  priceCalendar: FarePricePoint[];
  /** Server-side result count before client filters. */
  total: number;
}

/* -------------------------------------------------------------------------- */
/* Seat map                                                                    */
/* -------------------------------------------------------------------------- */

export type SeatKind = "window" | "middle" | "aisle";
export type SeatStatus = "available" | "occupied" | "blocked";

/** One seat on the map. */
export interface Seat {
  /** e.g. "12A". Unique within a seat map. */
  id: string;
  row: number;
  column: string;
  kind: SeatKind;
  status: SeatStatus;
  /** Surcharge to select this seat, USD (0 = free). */
  priceUsd: number;
  extraLegroom: boolean;
  emergencyExit: boolean;
  /** Seat sits in a premium cabin section. */
  cabin: CabinClass;
}

export interface SeatRow {
  row: number;
  cabin: CabinClass;
  /** Exit row — carries the emergency-exit briefing requirement. */
  exitRow: boolean;
  seats: Seat[];
}

/** The seat map for one segment. */
export interface SeatMap {
  segmentId: string;
  flightNumber: string;
  aircraftName: string;
  fromCode: string;
  toCode: string;
  /** Column letters left→right, e.g. ["A","B","C","D","E","F"]. */
  columns: string[];
  /** Columns after which an aisle gap is drawn. */
  aisleAfter: string[];
  rows: SeatRow[];
}

/* -------------------------------------------------------------------------- */
/* Ancillaries                                                                 */
/* -------------------------------------------------------------------------- */

export const ANCILLARY_CATEGORIES = [
  "baggage",
  "meal",
  "assistance",
  "comfort",
  "protection",
  "transfer",
] as const;
export type AncillaryCategory = (typeof ANCILLARY_CATEGORIES)[number];

/** A purchasable extra. Priced per passenger unless {@link perBooking}. */
export interface AncillaryOption {
  id: string;
  category: AncillaryCategory;
  label: string;
  description: string;
  priceUsd: number;
  /** Charged once for the whole booking rather than per passenger. */
  perBooking?: boolean;
  /** Lucide icon name, resolved at render. */
  icon: string;
  /** Max quantity selectable (default 1 → a toggle). */
  maxQuantity?: number;
  /** Free of charge — shown as "Included". */
  free?: boolean;
}

/** A chosen ancillary with its quantity. */
export interface AncillarySelection {
  optionId: string;
  quantity: number;
}

/* -------------------------------------------------------------------------- */
/* Passengers & booking                                                        */
/* -------------------------------------------------------------------------- */

export type Gender = "male" | "female" | "other";
export type TravelDocumentType = "passport" | "national-id";

/** One traveller on a flight booking. */
export interface FlightPassenger {
  id: string;
  type: PassengerType;
  title: string;
  firstName: string;
  lastName: string;
  /** ISO `YYYY-MM-DD`. */
  dateOfBirth: string;
  gender: Gender;
  /** ISO 3166-1 alpha-2. */
  nationality: string;
  documentType: TravelDocumentType;
  documentNumber: string;
  /** ISO `YYYY-MM-DD`. Passports must outlast the trip by 6 months. */
  documentExpiry: string;
  /** IATA code of the loyalty programme's airline. */
  frequentFlyerAirline?: string;
  frequentFlyerNumber?: string;
  /** Seat ids keyed by segment id. */
  seats?: Record<string, string>;
}

/** Who the airline contacts about this booking. */
export interface FlightContact {
  email: string;
  /** E.164 dial code including "+", e.g. "+880". */
  phoneCountryCode: string;
  phone: string;
  /** ISO 3166-1 alpha-2 of the billing/residence country. */
  country: string;
}

/** Named contact for in-flight emergencies. */
export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneCountryCode: string;
  phone: string;
}

/** Whether a destination needs a visa — surfaced, never enforced. */
export interface VisaRequirement {
  destinationCountry: string;
  /** "required" | "on-arrival" | "e-visa" | "visa-free" | "unknown". */
  status: "required" | "on-arrival" | "e-visa" | "visa-free" | "unknown";
  note: string;
  /** Deep link into the visa vertical when we sell it. */
  href?: string;
}

/** Lifecycle of a flight booking, tracked on the ticket timeline. */
export const FLIGHT_BOOKING_STAGES = [
  "booked",
  "ticketed",
  "checked-in",
  "boarded",
  "flown",
] as const;
export type FlightBookingStage = (typeof FLIGHT_BOOKING_STAGES)[number];

/** A confirmed flight booking — the record behind "My Flights" and the ticket. */
export interface FlightBooking {
  id: string;
  /** Otithee reference, e.g. "OT-FL-9K2P". */
  reference: string;
  /** Airline record locator, e.g. "X7QM2B". */
  pnr: string;
  offerId: string;
  tripType: TripType;
  cabin: CabinClass;
  /** Fare family booked — determines the change and refund rules that apply. */
  fareBrand: FareBrand;
  airlineCode: string;
  slices: FlightSlice[];
  passengers: FlightPassenger[];
  ancillaries: AncillarySelection[];
  contact: FlightContact;
  emergencyContact?: EmergencyContact;
  fare: FareBreakdown;
  /** Total of seat surcharges, USD. */
  seatsTotalUsd: number;
  /** Total of ancillary purchases, USD. */
  ancillariesTotalUsd: number;
  /** Coupon reduction applied at checkout, USD. */
  couponDiscountUsd: number;
  couponCode?: string;
  /** Grand total charged, USD. */
  grandTotalUsd: number;
  /** Mirrors the shared traveller-booking lifecycle. */
  status: BookingStatus;
  stage: FlightBookingStage;
  /** Ticket numbers keyed by passenger id. */
  ticketNumbers: Record<string, string>;
  bookedAt: string;
  invoiceId: string;
  paymentMethod: string;
  baggage: BaggageAllowance;
  refundable: boolean;
  changeable: boolean;
  cancellationFeeUsd: number;
}

/** A boarding pass for one passenger on one segment. */
export interface BoardingPass {
  id: string;
  bookingReference: string;
  pnr: string;
  passengerName: string;
  segmentId: string;
  flightNumber: string;
  airlineCode: string;
  fromCode: string;
  toCode: string;
  departLocal: string;
  boardingLocal: string;
  gate: string;
  terminal: string;
  seat: string;
  /** Boarding group, e.g. "Zone 2". */
  zone: string;
  sequence: number;
  cabin: CabinClass;
  /** Payload the (placeholder) barcode encodes — IATA BCBP-ish. */
  barcodeData: string;
  /** Traveller holds priority boarding / lounge access. */
  fastTrack: boolean;
}

/* -------------------------------------------------------------------------- */
/* Saved & recent searches                                                     */
/* -------------------------------------------------------------------------- */

/** A search the traveller ran or pinned, persisted client-side. */
export interface SavedFlightSearch {
  id: string;
  query: FlightSearchQuery;
  /** Human summary, e.g. "DAC → DXB · 12 Aug · 2 adults". */
  label: string;
  /** ISO timestamp the search was last run. */
  savedAt: string;
  /** Pinned by the traveller (vs. an automatic recent entry). */
  pinned: boolean;
}

/** A marketed city pair on the landing page. */
export interface PopularRoute {
  fromCode: string;
  toCode: string;
  fromCity: string;
  toCity: string;
  /** Cheapest observed fare, USD. */
  fromUsd: number;
  /** Typical non-stop duration, minutes. */
  durationMinutes: number;
  airlineCode: string;
  image: string;
  /** Non-stop service exists on this pair. */
  direct: boolean;
}

/** A merchandised fare on the home page / landing rails. */
export interface FlightDeal {
  id: string;
  fromCode: string;
  toCode: string;
  fromCity: string;
  toCity: string;
  airlineCode: string;
  cabin: CabinClass;
  fromUsd: number;
  /** Pre-discount fare, USD. */
  wasUsd: number;
  /** Departure date the deal is priced for, ISO `YYYY-MM-DD`. */
  departDate: string;
  returnDate?: string;
  /** Marketing line, e.g. "Book by 20 Aug". */
  note: string;
  image: string;
  discountPct: number;
}
