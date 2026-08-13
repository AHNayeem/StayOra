/**
 * Ancillary catalogue — the extras sold alongside a fare.
 *
 * Static data rather than generated: these are merchandising decisions, not
 * simulated inventory. Prices are base USD like everything else, and each option
 * declares whether it is charged per passenger or once per booking, which is the
 * only thing the pricing maths needs to know about it.
 */

import type {
  AncillaryCategory,
  AncillaryOption,
  AncillarySelection,
  BaggageAllowance,
  CabinClass,
  PassengerCounts,
} from "@/types/flight";
import { seatedPassengers, totalPassengers } from "./fares";
import { destinationExtraById } from "./destination-extras";

/**
 * Display metadata for each ancillary group, in booking-flow order.
 *
 * `{city}` in a title or description is replaced with the destination city at
 * render (see {@link fillCity}) — the destination groups at the end of the list
 * are the only ones that need it, and a token keeps this table static data
 * rather than a function of the offer.
 */
export const ANCILLARY_GROUPS: Array<{
  category: AncillaryCategory;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    category: "baggage",
    title: "Extra baggage",
    description: "Add checked bags now — it costs less than at the airport.",
    icon: "Luggage",
  },
  {
    category: "meal",
    title: "Meals",
    description: "Pre-order your in-flight meal, including special diets.",
    icon: "UtensilsCrossed",
  },
  {
    category: "comfort",
    title: "Comfort & priority",
    description: "Skip the queues and settle in sooner.",
    icon: "Armchair",
  },
  {
    category: "assistance",
    title: "Special assistance",
    description: "Tell us what you need and we'll arrange it with the airline.",
    icon: "HeartHandshake",
  },
  {
    category: "protection",
    title: "Travel protection",
    description: "Cover for cancellation, delays, baggage and medical costs.",
    icon: "ShieldCheck",
  },
  {
    category: "transfer",
    title: "Airport transfers",
    description: "Door-to-door pickup, booked with your flight.",
    icon: "CarFront",
  },
  {
    category: "esim",
    title: "Stay connected in {city}",
    description: "A local data eSIM that activates on landing — no roaming bill.",
    icon: "Signal",
  },
  {
    category: "activity",
    title: "Things to do in {city}",
    description: "Highly rated experiences, added to this booking at today's price.",
    icon: "Ticket",
  },
  {
    category: "stay",
    title: "Where to stay in {city}",
    description: "Add a room to your trip and pay for the flight and hotel together.",
    icon: "BedDouble",
  },
];

/** Replace the `{city}` token in group copy with the destination city. */
export function fillCity(text: string, city: string): string {
  return text.replace(/\{city\}/g, city);
}

export const ANCILLARY_OPTIONS: AncillaryOption[] = [
  // ---- Baggage --------------------------------------------------------------
  {
    id: "bag-10",
    category: "baggage",
    label: "Extra 10 kg checked bag",
    description: "One additional piece up to 10 kg.",
    priceUsd: 32,
    icon: "Luggage",
    maxQuantity: 3,
  },
  {
    id: "bag-23",
    category: "baggage",
    label: "Extra 23 kg checked bag",
    description: "One additional piece up to 23 kg — the standard allowance.",
    priceUsd: 58,
    icon: "Luggage",
    maxQuantity: 3,
  },
  {
    id: "bag-sports",
    category: "baggage",
    label: "Sports equipment",
    description: "Bicycles, golf clubs, surfboards and skis, up to 32 kg.",
    priceUsd: 75,
    icon: "Bike",
    maxQuantity: 2,
  },
  {
    id: "bag-fragile",
    category: "baggage",
    label: "Fragile item handling",
    description: "Priority-handled and specially tagged at the belt.",
    priceUsd: 24,
    icon: "PackageOpen",
  },

  // ---- Meals ----------------------------------------------------------------
  {
    id: "meal-standard",
    category: "meal",
    label: "Standard hot meal",
    description: "Chef-prepared main, side, dessert and a drink.",
    priceUsd: 18,
    icon: "UtensilsCrossed",
  },
  {
    id: "meal-halal",
    category: "meal",
    label: "Halal meal",
    description: "Certified halal main course.",
    priceUsd: 18,
    icon: "UtensilsCrossed",
  },
  {
    id: "meal-vegetarian",
    category: "meal",
    label: "Vegetarian meal",
    description: "Seasonal vegetarian main, prepared without meat or fish.",
    priceUsd: 16,
    icon: "Salad",
  },
  {
    id: "meal-vegan",
    category: "meal",
    label: "Vegan meal",
    description: "Fully plant-based main and dessert.",
    priceUsd: 16,
    icon: "Sprout",
  },
  {
    id: "meal-child",
    category: "meal",
    label: "Child meal",
    description: "Smaller portions children actually eat, plus a snack.",
    priceUsd: 12,
    icon: "Cookie",
  },
  {
    id: "meal-diabetic",
    category: "meal",
    label: "Diabetic meal",
    description: "Low-sugar, controlled-carbohydrate main.",
    priceUsd: 18,
    icon: "HeartPulse",
  },

  // ---- Comfort & priority ---------------------------------------------------
  {
    id: "priority-boarding",
    category: "comfort",
    label: "Priority boarding",
    description: "Board first and secure overhead locker space.",
    priceUsd: 14,
    icon: "ArrowUpNarrowWide",
  },
  {
    id: "fast-track",
    category: "comfort",
    label: "Fast track security",
    description: "Dedicated security lane at departure.",
    priceUsd: 19,
    icon: "Zap",
  },
  {
    id: "lounge",
    category: "comfort",
    label: "Airport lounge access",
    description: "Food, drinks, Wi-Fi and showers before you fly.",
    priceUsd: 42,
    icon: "Sofa",
  },
  {
    id: "extra-legroom",
    category: "comfort",
    label: "Extra legroom guarantee",
    description: "We'll place you in an extra-legroom seat at check-in.",
    priceUsd: 29,
    icon: "StretchHorizontal",
  },

  // ---- Special assistance ---------------------------------------------------
  {
    id: "wheelchair",
    category: "assistance",
    label: "Wheelchair assistance",
    description: "Assistance from check-in to the aircraft door and on arrival.",
    priceUsd: 0,
    free: true,
    icon: "Accessibility",
  },
  {
    id: "mobility-aid",
    category: "assistance",
    label: "Carry own mobility aid",
    description: "Your wheelchair or walker travels free in the hold.",
    priceUsd: 0,
    free: true,
    icon: "Accessibility",
  },
  {
    id: "unaccompanied-minor",
    category: "assistance",
    label: "Unaccompanied minor service",
    description: "Airline staff escort children aged 5–11 throughout the journey.",
    priceUsd: 45,
    icon: "Baby",
  },
  {
    id: "medical-clearance",
    category: "assistance",
    label: "Medical clearance support",
    description: "We collect and submit the airline's medical forms for you.",
    priceUsd: 0,
    free: true,
    icon: "Stethoscope",
  },
  {
    id: "pet-cabin",
    category: "assistance",
    label: "Pet in cabin",
    description:
      "Small pets in an approved carrier. Availability confirmed with the airline after booking.",
    priceUsd: 95,
    icon: "PawPrint",
    maxQuantity: 1,
  },

  // ---- Travel protection ----------------------------------------------------
  {
    id: "insurance-basic",
    category: "protection",
    label: "Essential cover",
    description: "Trip cancellation, delay and lost baggage up to $2,000.",
    priceUsd: 21,
    icon: "Shield",
  },
  {
    id: "insurance-plus",
    category: "protection",
    label: "Comprehensive cover",
    description:
      "Everything in Essential plus medical, repatriation and gadget cover up to $10,000.",
    priceUsd: 39,
    icon: "ShieldCheck",
  },
  {
    id: "flexi-change",
    category: "protection",
    label: "Flexible date change",
    description: "One free date change up to 24 hours before departure.",
    priceUsd: 27,
    icon: "CalendarSync",
  },

  // ---- Transfers ------------------------------------------------------------
  {
    id: "transfer-arrival",
    category: "transfer",
    label: "Arrival airport pickup",
    description: "Private car meets you at arrivals and takes you to your hotel.",
    priceUsd: 34,
    perBooking: true,
    icon: "CarFront",
  },
  {
    id: "transfer-return",
    category: "transfer",
    label: "Return airport drop-off",
    description: "Private car collects you for your outbound flight.",
    priceUsd: 34,
    perBooking: true,
    icon: "CarTaxiFront",
  },
];

export const ANCILLARY_BY_ID: Record<string, AncillaryOption> = Object.fromEntries(
  ANCILLARY_OPTIONS.map((o) => [o.id, o]),
);

/**
 * Resolve any selected extra by id — flight-side from the static catalogue,
 * destination-side rebuilt from the id itself.
 *
 * Everything that prices a selection goes through here, because `{ optionId,
 * quantity }` is all that survives into checkout, the invoice and the ticket:
 * if an id didn't resolve there, a traveller would be charged for a hotel that
 * vanished from their receipt.
 */
export function resolveAncillary(id: string): AncillaryOption | undefined {
  return ANCILLARY_BY_ID[id] ?? destinationExtraById(id);
}

/**
 * Noun for what `quantity` counts on an option — nights for a hotel, travellers
 * for a meal, bookings for a transfer. Pluralised for the count given.
 */
export function ancillaryUnitNoun(option: AncillaryOption, count: number): string {
  const noun = option.unitLabel ?? (option.perBooking ? "booking" : "traveller");
  return `${noun}${count === 1 ? "" : "s"}`;
}

/** Options in one group, in catalogue order. */
export function ancillariesIn(category: AncillaryCategory): AncillaryOption[] {
  return ANCILLARY_OPTIONS.filter((o) => o.category === category);
}

/**
 * Options that are *already covered* by the fare, so the UI can show them as
 * included instead of selling them twice. Business and first fares bundle
 * lounge access, priority boarding and fast track; meals come with any
 * full-service fare.
 */
export function includedAncillaryIds(
  cabin: CabinClass,
  mealsIncluded: boolean,
): string[] {
  const included: string[] = [];
  if (cabin === "business" || cabin === "first") {
    included.push("lounge", "priority-boarding", "fast-track", "extra-legroom");
  }
  if (mealsIncluded) included.push("meal-standard");
  return included;
}

/**
 * Price a set of ancillary selections.
 *
 * Per-passenger options multiply by the *seated* head count — an infant on a lap
 * doesn't get their own meal tray or checked bag allowance to extend — while
 * per-booking options (transfers, a hotel room) are charged once no matter the
 * party size, their `quantity` counting whatever their `unitLabel` says: one
 * pickup, or four nights.
 */
export function ancillariesTotal(
  selections: AncillarySelection[],
  passengers: PassengerCounts,
): number {
  const seated = Math.max(1, seatedPassengers(passengers));
  return selections.reduce((sum, selection) => {
    const option = resolveAncillary(selection.optionId);
    if (!option || option.free) return sum;
    const multiplier = option.perBooking ? 1 : seated;
    return sum + option.priceUsd * multiplier * Math.max(0, selection.quantity);
  }, 0);
}

/** Line items for the price breakdown, resolved and priced. */
export interface AncillaryLine {
  option: AncillaryOption;
  quantity: number;
  /** Units charged (quantity × head count, or quantity for per-booking). */
  units: number;
  totalUsd: number;
}

export function ancillaryLines(
  selections: AncillarySelection[],
  passengers: PassengerCounts,
): AncillaryLine[] {
  const seated = Math.max(1, seatedPassengers(passengers));
  return selections
    .map((selection) => {
      const option = resolveAncillary(selection.optionId);
      if (!option || selection.quantity <= 0) return null;
      const units = option.perBooking
        ? selection.quantity
        : selection.quantity * seated;
      return {
        option,
        quantity: selection.quantity,
        units,
        totalUsd: option.free ? 0 : option.priceUsd * units,
      };
    })
    .filter((line): line is AncillaryLine => line !== null);
}

/**
 * Total checked baggage the party carries once extras are added — shown on the
 * review screen so travellers can sanity-check their allowance before paying.
 */
export function totalCheckedKg(
  baggage: BaggageAllowance,
  selections: AncillarySelection[],
  passengers: PassengerCounts,
): number {
  const seated = Math.max(1, seatedPassengers(passengers));
  const extra = selections.reduce((sum, s) => {
    if (s.optionId === "bag-10") return sum + 10 * s.quantity * seated;
    if (s.optionId === "bag-23") return sum + 23 * s.quantity * seated;
    return sum;
  }, 0);
  return baggage.checkedKg * seated + extra;
}

/** Whether a party size makes an option relevant at all. */
export function isRelevant(
  option: AncillaryOption,
  passengers: PassengerCounts,
): boolean {
  if (option.id === "meal-child") return passengers.children > 0;
  if (option.id === "unaccompanied-minor") {
    return passengers.children > 0 && passengers.adults === 0;
  }
  return totalPassengers(passengers) > 0;
}
