/**
 * flight-checkout — turning a selected offer into a booking.
 *
 * The critical design point: a flight booking emits **the same triple** the stay
 * checkout does — a {@link TravelerBooking}, an {@link Invoice} and a
 * {@link PaymentTxn} — alongside its flight-specific {@link FlightBooking}
 * record.
 *
 * That's what makes flights a first-class citizen of the account area rather
 * than a bolt-on: invoices, payment history, travel stats, order history and the
 * admin bookings table all read the shared shapes and pick flights up for free,
 * with no branching. Only "My Flights" needs the richer flight record, and it
 * links back by reference.
 *
 * Mirrors `POST /flights/bookings`. Timestamps are injected by the caller
 * (`nowMs`) rather than read here, matching the convention in
 * {@link "@/services/checkout"} — the module stays free of wall-clock reads and
 * every generated reference is reproducible from its inputs.
 */

import type {
  AncillarySelection,
  FlightBooking,
  FlightContact,
  FlightOffer,
  FlightPassenger,
  EmergencyContact,
} from "@/types/flight";
import type {
  CardBrand,
  Invoice,
  PaymentTxn,
  TravelerBooking,
} from "@/types/traveler";
import { airportLabel, AIRPORTS_BY_CODE } from "@/lib/mock/airports";
import { AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { CABIN_LABEL, grandTotal, seatedPassengers } from "@/lib/mock/fares";
import { ancillariesTotal } from "@/lib/mock/ancillaries";
import { flightReference, pnrFor, ticketNumber, token } from "@/lib/mock/passengers";
import { dateOf } from "@/lib/flight-time";
import { mockDelay } from "./http";

/** Everything the booking flow collects before payment. */
export interface CreateFlightBookingInput {
  offer: FlightOffer;
  passengers: FlightPassenger[];
  contact: FlightContact;
  emergencyContact?: EmergencyContact;
  ancillaries: AncillarySelection[];
  /** Total of seat surcharges, USD. */
  seatsTotalUsd: number;
  couponCode?: string;
  couponDiscountUsd: number;
  paymentMethod: string;
  cardBrand: CardBrand;
  billToName: string;
  /** Client timestamp at submit time (`Date.now()`). */
  nowMs: number;
}

/** What a completed flight booking produces, across every surface it touches. */
export interface CreatedFlightBooking {
  flight: FlightBooking;
  /** The shared record that lands in `/account/bookings`. */
  booking: TravelerBooking;
  invoice: Invoice;
  payment: PaymentTxn;
}

/** Representative image for a flight booking card, keyed by destination region. */
const ROUTE_IMAGE =
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80";

/**
 * Create a flight booking (mock).
 *
 * Totals are recomputed here from the offer and the traveller's selections
 * rather than trusted from the client — the same thing a real endpoint does, and
 * the reason the amount charged can't drift from the amount quoted.
 */
export function createFlightBooking(
  input: CreateFlightBookingInput,
): Promise<CreatedFlightBooking> {
  const { offer, passengers, nowMs } = input;

  const seed = `${offer.id}:${nowMs}`;
  const suffix = token(`${seed}:id`, 8).toLowerCase();
  const reference = flightReference(seed);
  const bookingId = `fbk_${suffix}`;
  const invoiceId = `inv_fl_${suffix}`;
  const paymentId = `pay_fl_${suffix}`;
  const nowIso = new Date(nowMs).toISOString();

  // Recompute money server-side.
  const ancillariesTotalUsd = ancillariesTotal(input.ancillaries, offer.passengers);
  const grandTotalUsd = grandTotal({
    fare: offer.fare,
    seatsUsd: input.seatsTotalUsd,
    ancillariesUsd: ancillariesTotalUsd,
    couponDiscountUsd: input.couponDiscountUsd,
  });

  const ticketNumbers: Record<string, string> = {};
  for (const passenger of passengers) {
    ticketNumbers[passenger.id] = ticketNumber(
      offer.airlineCode,
      `${seed}:${passenger.id}`,
    );
  }

  const first = offer.slices[0];
  const last = offer.slices[offer.slices.length - 1];
  const airline = AIRLINES_BY_CODE[offer.airlineCode];

  const flight: FlightBooking = {
    id: bookingId,
    reference,
    pnr: pnrFor(seed),
    offerId: offer.id,
    tripType: offer.tripType,
    cabin: offer.cabin,
    fareBrand: offer.fareBrand,
    airlineCode: offer.airlineCode,
    slices: offer.slices,
    passengers,
    ancillaries: input.ancillaries,
    contact: input.contact,
    emergencyContact: input.emergencyContact,
    fare: offer.fare,
    seatsTotalUsd: input.seatsTotalUsd,
    ancillariesTotalUsd,
    couponDiscountUsd: input.couponDiscountUsd,
    couponCode: input.couponCode,
    grandTotalUsd,
    status: "upcoming",
    // Payment has cleared, so tickets are issued immediately.
    stage: "ticketed",
    ticketNumbers,
    bookedAt: nowIso,
    invoiceId,
    paymentMethod: input.paymentMethod,
    baggage: offer.baggage,
    refundable: offer.refundable,
    changeable: offer.changeable,
    cancellationFeeUsd: offer.cancellationFeeUsd,
  };

  // ---- The shared traveller-booking record --------------------------------
  // `nights` is the journey span in days: a flight isn't a stay, but the field
  // is what the account's travel stats aggregate, and 0 would understate a
  // multi-day itinerary.
  const journeyDays = Math.max(
    1,
    Math.round(
      (Date.parse(`${dateOf(last.arriveLocal)}T00:00:00Z`) -
        Date.parse(`${dateOf(first.departLocal)}T00:00:00Z`)) /
        86_400_000,
    ),
  );

  const routeTitle =
    offer.tripType === "round-trip"
      ? `${airportLabel(first.fromCode)} ⇄ ${airportLabel(first.toCode)}`
      : `${airportLabel(first.fromCode)} → ${airportLabel(last.toCode)}`;

  const destination = AIRPORTS_BY_CODE[last.toCode];

  const booking: TravelerBooking = {
    id: bookingId,
    reference,
    // Flights have no catalog listing; the offer id is the stable pointer back.
    listingId: offer.id,
    listingSlug: bookingId,
    vertical: "flights",
    title: `${airline?.name ?? offer.airlineCode} · ${routeTitle}`,
    image: ROUTE_IMAGE,
    location: destination ? `${destination.city}, ${destination.country}` : last.toCode,
    checkIn: dateOf(first.departLocal),
    checkOut: dateOf(last.arriveLocal),
    nights: journeyDays,
    guests: passengers.length,
    rooms: seatedPassengers(offer.passengers),
    status: "upcoming",
    totalUsd: grandTotalUsd,
    paymentMethod: input.paymentMethod,
    invoiceId,
    bookedAt: nowIso,
    reviewed: false,
    guestNames: passengers.map((p) => `${p.firstName} ${p.lastName}`),
    cancellationPolicy: offer.refundable
      ? `Refundable up to 24 hours before departure${offer.cancellationFeeUsd > 0 ? `, minus a ${offer.cancellationFeeUsd} USD fee per traveller` : ""}.`
      : "This fare is non-refundable. Government taxes may still be reclaimable — contact support.",
  };

  const invoice: Invoice = {
    id: invoiceId,
    number: `INV-${token(`${seed}:inv`, 6)}`,
    bookingId,
    bookingRef: reference,
    title: `${CABIN_LABEL[offer.cabin]} flight · ${routeTitle}`,
    issuedAt: nowIso,
    dueAt: nowIso,
    status: "paid",
    subtotalUsd: offer.fare.baseFareUsd + input.seatsTotalUsd + ancillariesTotalUsd,
    taxesUsd: offer.fare.taxesUsd,
    feesUsd: offer.fare.serviceFeeUsd,
    discountUsd: offer.fare.discountUsd + input.couponDiscountUsd,
    totalUsd: grandTotalUsd,
    billTo: {
      name: input.billToName,
      email: input.contact.email,
      country: input.contact.country,
    },
  };

  const payment: PaymentTxn = {
    id: paymentId,
    bookingId,
    bookingRef: reference,
    description: `Flight ${routeTitle}`,
    method: input.paymentMethod,
    brand: input.cardBrand,
    amountUsd: grandTotalUsd,
    type: "charge",
    status: "succeeded",
    date: nowIso,
  };

  // Ticketing genuinely takes a moment — the flow's progress state has to cover
  // a real wait, so the mock reflects one.
  return mockDelay({ flight, booking, invoice, payment }, 1400);
}
