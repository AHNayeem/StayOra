/**
 * Passenger seed data and the demo flight-booking history.
 *
 * "My Flights" would be a dead page for a first-time visitor without history, so
 * this module builds a handful of bookings — upcoming, completed and cancelled —
 * from *real generated offers*, not hand-typed itineraries. That means every
 * demo ticket has genuine segments, terminals, gates and timezone-correct times,
 * and the ticket/boarding-pass views are exercised against the same shapes a
 * freshly-booked flight produces.
 *
 * Everything is seeded and anchored to {@link FLIGHT_CALENDAR_ANCHOR}; nothing
 * here reads the wall clock.
 */

import type {
  CabinClass,
  FlightBooking,
  FlightBookingStage,
  FlightPassenger,
  FlightSearchQuery,
  Gender,
  PassengerType,
  TripType,
} from "@/types/flight";
import type { BookingStatus } from "@/types/traveler";
import { SeededRandom, hashString } from "@/lib/random";
import { addDays } from "@/lib/flight-time";
import { generateOffers } from "./flights";
import { FLIGHT_CALENDAR_ANCHOR } from "./routes";
import { ancillariesTotal } from "./ancillaries";
import { grandTotal } from "./fares";

/* -------------------------------------------------------------------------- */
/* Reference vocabulary                                                        */
/* -------------------------------------------------------------------------- */

/** Titles offered on the traveller form, by passenger type. */
export const PASSENGER_TITLES: Record<PassengerType, string[]> = {
  adult: ["Mr", "Ms", "Mrs", "Dr", "Prof"],
  child: ["Master", "Miss"],
  infant: ["Master", "Miss"],
};

export const GENDER_LABEL: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other / prefer not to say",
};

export const PASSENGER_TYPE_LABEL: Record<PassengerType, string> = {
  adult: "Adult",
  child: "Child",
  infant: "Infant",
};

/** Age bands the airline applies at the date of travel. */
export const PASSENGER_TYPE_HINT: Record<PassengerType, string> = {
  adult: "12 years and over",
  child: "2–11 years",
  infant: "Under 2 years, on an adult's lap",
};

/**
 * Booking stages in order, with the copy the ticket timeline renders. A real
 * integration maps airline status codes onto these same five stages.
 */
export const STAGE_STEPS: Array<{
  stage: FlightBookingStage;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    stage: "booked",
    label: "Booked",
    description: "Payment received and your seats are held.",
    icon: "CircleCheck",
  },
  {
    stage: "ticketed",
    label: "Ticketed",
    description: "E-tickets issued and sent to your email.",
    icon: "Ticket",
  },
  {
    stage: "checked-in",
    label: "Checked in",
    description: "Boarding passes available 24 hours before departure.",
    icon: "UserCheck",
  },
  {
    stage: "boarded",
    label: "Boarded",
    description: "Scanned at the gate.",
    icon: "PlaneTakeoff",
  },
  {
    stage: "flown",
    label: "Flown",
    description: "Journey complete.",
    icon: "PlaneLanding",
  },
];

/** Index of a stage in {@link STAGE_STEPS} — drives the timeline's progress. */
export function stageIndex(stage: FlightBookingStage): number {
  return STAGE_STEPS.findIndex((s) => s.stage === stage);
}

/* -------------------------------------------------------------------------- */
/* Reference generators                                                        */
/* -------------------------------------------------------------------------- */

/** Short uppercase alphanumeric token derived from a seed (no I/O/0/1). */
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function token(seed: string, length: number): string {
  const rng = new SeededRandom(seed);
  let out = "";
  for (let i = 0; i < length; i++) out += TOKEN_ALPHABET[rng.int(0, TOKEN_ALPHABET.length - 1)];
  return out;
}

/** Otithee booking reference, e.g. `OT-FL-7K2PQ`. */
export function flightReference(seed: string): string {
  return `OT-FL-${token(`${seed}:ref`, 5)}`;
}

/** Airline record locator (PNR), e.g. `X7QM2B`. */
export function pnrFor(seed: string): string {
  return token(`${seed}:pnr`, 6);
}

/** 13-digit e-ticket number, prefixed with the airline's numeric code. */
export function ticketNumber(airlineCode: string, seed: string): string {
  const prefix = String((hashString(airlineCode) % 900) + 100);
  const rng = new SeededRandom(`${seed}:tkt`);
  let digits = "";
  for (let i = 0; i < 10; i++) digits += rng.int(0, 9);
  return `${prefix}-${digits}`;
}

/* -------------------------------------------------------------------------- */
/* Demo passengers                                                             */
/* -------------------------------------------------------------------------- */

const DEMO_PEOPLE: Array<{
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  nationality: string;
  type: PassengerType;
}> = [
  { title: "Mr", firstName: "Arif", lastName: "Hossain", dateOfBirth: "1991-04-18", gender: "male", nationality: "BD", type: "adult" },
  { title: "Mrs", firstName: "Nusrat", lastName: "Hossain", dateOfBirth: "1993-11-02", gender: "female", nationality: "BD", type: "adult" },
  { title: "Master", firstName: "Zayan", lastName: "Hossain", dateOfBirth: "2018-07-21", gender: "male", nationality: "BD", type: "child" },
  { title: "Mr", firstName: "Tanvir", lastName: "Rahman", dateOfBirth: "1988-01-09", gender: "male", nationality: "BD", type: "adult" },
];

/** Build a passenger record with a seeded travel document. */
function demoPassenger(index: number, seed: string): FlightPassenger {
  const person = DEMO_PEOPLE[index % DEMO_PEOPLE.length];
  const rng = new SeededRandom(`${seed}:pax:${index}`);
  return {
    id: `pax_${token(`${seed}:${index}`, 6).toLowerCase()}`,
    type: person.type,
    title: person.title,
    firstName: person.firstName,
    lastName: person.lastName,
    dateOfBirth: person.dateOfBirth,
    gender: person.gender,
    nationality: person.nationality,
    documentType: "passport",
    documentNumber: `${token(`${seed}:doc:${index}`, 2)}${rng.int(1000000, 9999999)}`,
    documentExpiry: addDays(FLIGHT_CALENDAR_ANCHOR, rng.int(400, 2400)),
    frequentFlyerAirline: rng.bool(0.35) ? "EK" : undefined,
    frequentFlyerNumber: rng.bool(0.35) ? `EK${rng.int(100000000, 999999999)}` : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Demo bookings                                                               */
/* -------------------------------------------------------------------------- */

interface BookingSeed {
  from: string;
  to: string;
  /** Days from {@link FLIGHT_CALENDAR_ANCHOR}; negative = in the past. */
  departOffset: number;
  /** Nights away; omit for a one-way. */
  nights?: number;
  cabin: CabinClass;
  adults: number;
  children: number;
  infants: number;
  status: BookingStatus;
  stage: FlightBookingStage;
  ancillaries: string[];
}

const BOOKING_SEEDS: BookingSeed[] = [
  {
    from: "DAC", to: "DXB", departOffset: 21, nights: 7, cabin: "economy",
    adults: 2, children: 1, infants: 0, status: "upcoming", stage: "ticketed",
    ancillaries: ["bag-23", "meal-halal", "transfer-arrival"],
  },
  {
    from: "DAC", to: "SIN", departOffset: 48, nights: 5, cabin: "business",
    adults: 1, children: 0, infants: 0, status: "upcoming", stage: "booked",
    ancillaries: ["insurance-plus"],
  },
  {
    from: "DAC", to: "CXB", departOffset: 6, cabin: "economy",
    adults: 2, children: 0, infants: 0, status: "upcoming", stage: "checked-in",
    ancillaries: ["priority-boarding"],
  },
  {
    from: "DAC", to: "BKK", departOffset: -34, nights: 6, cabin: "economy",
    adults: 2, children: 0, infants: 1, status: "completed", stage: "flown",
    ancillaries: ["bag-10", "meal-vegetarian"],
  },
  {
    from: "CGP", to: "DXB", departOffset: -78, nights: 10, cabin: "economy",
    adults: 1, children: 0, infants: 0, status: "completed", stage: "flown",
    ancillaries: [],
  },
  {
    from: "DAC", to: "KTM", departOffset: -12, nights: 4, cabin: "economy",
    adults: 2, children: 0, infants: 0, status: "cancelled", stage: "booked",
    ancillaries: ["insurance-basic"],
  },
];

/** Turn one seed into a full booking backed by a genuinely generated offer. */
function buildDemoBooking(seed: BookingSeed, index: number): FlightBooking | null {
  const departDate = addDays(FLIGHT_CALENDAR_ANCHOR, seed.departOffset);
  const tripType: TripType = seed.nights ? "round-trip" : "one-way";
  const query: FlightSearchQuery = {
    tripType,
    legs: seed.nights
      ? [
          { from: seed.from, to: seed.to, date: departDate },
          { from: seed.to, to: seed.from, date: addDays(departDate, seed.nights) },
        ]
      : [{ from: seed.from, to: seed.to, date: departDate }],
    passengers: { adults: seed.adults, children: seed.children, infants: seed.infants },
    cabin: seed.cabin,
    directOnly: false,
    flexibleDates: false,
    nearbyAirports: false,
    refundableOnly: false,
    baggageIncluded: false,
    preferredAirlines: [],
  };

  const offers = generateOffers(query);
  if (offers.length === 0) return null;

  const rng = new SeededRandom(`demo-booking:${index}:${seed.from}${seed.to}`);
  // Pick from the top of the list — travellers rarely book the 30th result.
  const offer = offers[Math.min(offers.length - 1, rng.int(0, 4))];
  const bookingSeed = `${offer.id}:${index}`;
  const paxCount = seed.adults + seed.children + seed.infants;

  const passengers: FlightPassenger[] = Array.from({ length: paxCount }, (_, i) => {
    const passenger = demoPassenger(i, bookingSeed);
    // Assign a seat on each segment for anyone who occupies one.
    const seats: Record<string, string> = {};
    if (passenger.type !== "infant") {
      for (const slice of offer.slices) {
        for (const segment of slice.segments) {
          const seatRng = new SeededRandom(`${bookingSeed}:${segment.id}:${i}`);
          seats[segment.id] = `${seatRng.int(8, 32)}${seatRng.pick(["A", "B", "C", "D", "E", "F"])}`;
        }
      }
    }
    return { ...passenger, seats };
  });

  const ancillaries = seed.ancillaries.map((optionId) => ({ optionId, quantity: 1 }));
  const ancillariesTotalUsd = ancillariesTotal(ancillaries, query.passengers);
  const seatsTotalUsd = rng.int(0, 3) * 14;
  const couponDiscountUsd = rng.bool(0.3) ? rng.int(15, 60) : 0;

  const ticketNumbers: Record<string, string> = {};
  for (const passenger of passengers) {
    ticketNumbers[passenger.id] = ticketNumber(offer.airlineCode, `${bookingSeed}:${passenger.id}`);
  }

  return {
    id: `fbk_demo_${token(bookingSeed, 8).toLowerCase()}`,
    reference: flightReference(bookingSeed),
    pnr: pnrFor(bookingSeed),
    offerId: offer.id,
    tripType,
    cabin: seed.cabin,
    fareBrand: offer.fareBrand,
    airlineCode: offer.airlineCode,
    slices: offer.slices,
    passengers,
    ancillaries,
    contact: {
      email: "arif.hossain@example.com",
      phoneCountryCode: "+880",
      phone: "1712345678",
      country: "BD",
    },
    emergencyContact: {
      name: "Nusrat Hossain",
      relationship: "Spouse",
      phoneCountryCode: "+880",
      phone: "1798765432",
    },
    fare: offer.fare,
    seatsTotalUsd,
    ancillariesTotalUsd,
    couponDiscountUsd,
    couponCode: couponDiscountUsd ? "OTITHEE10" : undefined,
    grandTotalUsd: grandTotal({
      fare: offer.fare,
      seatsUsd: seatsTotalUsd,
      ancillariesUsd: ancillariesTotalUsd,
      couponDiscountUsd,
    }),
    status: seed.status,
    stage: seed.stage,
    ticketNumbers,
    // Booked between 5 and 60 days before departure.
    bookedAt: `${addDays(departDate, -rng.int(5, 60))}T09:24`,
    invoiceId: `inv_fl_${token(`${bookingSeed}:inv`, 8).toLowerCase()}`,
    paymentMethod: rng.pick(["Visa •••• 4242", "Mastercard •••• 8817", "bKash •••• 6620"]),
    baggage: offer.baggage,
    refundable: offer.refundable,
    changeable: offer.changeable,
    cancellationFeeUsd: offer.cancellationFeeUsd,
  };
}

/**
 * The demo flight-booking history. Built once at module load; deterministic, so
 * the server and client always agree.
 */
export const DEMO_FLIGHT_BOOKINGS: FlightBooking[] = BOOKING_SEEDS.map(
  buildDemoBooking,
).filter((b): b is FlightBooking => b !== null);
