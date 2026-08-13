/**
 * Checkout add-ons — the extras offered alongside the main product.
 *
 * Prices are deterministic per vertical (no wall-clock, no randomness) and are
 * folded into the booking's commissionable base by the domain, so an add-on
 * behaves like revenue rather than a cosmetic line item.
 */

import type { BookingVertical } from "@/types/booking";
import type { BookingAddOn } from "@/features/dashboard/domain";

export interface AddOnOffer {
  id: string;
  label: string;
  description: string;
  /** USD. Multiplied by `quantity` at checkout. */
  unitPrice: number;
  kind: BookingAddOn["kind"];
  /** How the quantity is derived when the traveller ticks it. */
  scale: "per_booking" | "per_night" | "per_guest" | "per_unit";
  icon: string;
}

const STAY_ADD_ONS: AddOnOffer[] = [
  {
    id: "breakfast",
    label: "Daily breakfast",
    description: "Buffet breakfast for every guest, served 7–10:30am.",
    unitPrice: 18,
    kind: "extra",
    scale: "per_guest",
    icon: "Coffee",
  },
  {
    id: "airport_transfer",
    label: "Airport transfer",
    description: "Private car, one way, meet & greet in arrivals.",
    unitPrice: 45,
    kind: "extra",
    scale: "per_booking",
    icon: "Car",
  },
  {
    id: "late_checkout",
    label: "Guaranteed late check-out",
    description: "Stay in your room until 4pm on departure day.",
    unitPrice: 35,
    kind: "extra",
    scale: "per_unit",
    icon: "Clock",
  },
  {
    id: "parking",
    label: "On-site parking",
    description: "Secure parking space for the length of your stay.",
    unitPrice: 12,
    kind: "extra",
    scale: "per_night",
    icon: "SquareParking",
  },
];

const TOUR_ADD_ONS: AddOnOffer[] = [
  {
    id: "hotel_pickup",
    label: "Hotel pick-up & drop-off",
    description: "We collect you from your hotel and bring you back.",
    unitPrice: 15,
    kind: "extra",
    scale: "per_guest",
    icon: "Car",
  },
  {
    id: "photo_package",
    label: "Photo package",
    description: "Your guide's photos of the day, delivered next morning.",
    unitPrice: 20,
    kind: "extra",
    scale: "per_booking",
    icon: "Camera",
  },
  {
    id: "meal",
    label: "Lunch included",
    description: "Set menu at a local restaurant, dietary needs catered for.",
    unitPrice: 22,
    kind: "extra",
    scale: "per_guest",
    icon: "Utensils",
  },
];

const TRANSPORT_ADD_ONS: AddOnOffer[] = [
  {
    id: "child_seat",
    label: "Child seat",
    description: "Fitted and checked before pick-up.",
    unitPrice: 8,
    kind: "extra",
    scale: "per_booking",
    icon: "Baby",
  },
  {
    id: "extra_luggage",
    label: "Extra luggage",
    description: "Space for two additional large cases.",
    unitPrice: 10,
    kind: "extra",
    scale: "per_booking",
    icon: "Luggage",
  },
];

const VISA_ADD_ONS: AddOnOffer[] = [
  {
    id: "document_check",
    label: "Document pre-check",
    description: "A case officer reviews everything before lodgement.",
    unitPrice: 25,
    kind: "extra",
    scale: "per_guest",
    icon: "FileCheck",
  },
  {
    id: "courier",
    label: "Passport courier",
    description: "Tracked return of your passport by secure courier.",
    unitPrice: 18,
    kind: "extra",
    scale: "per_booking",
    icon: "Truck",
  },
];

const HALL_ADD_ONS: AddOnOffer[] = [
  {
    id: "av_package",
    label: "AV & technician",
    description: "Sound, projection and an on-site technician all day.",
    unitPrice: 240,
    kind: "extra",
    scale: "per_booking",
    icon: "Speaker",
  },
  {
    id: "catering",
    label: "Catering — day delegate",
    description: "Arrival coffee, mid-morning break, lunch and afternoon tea.",
    unitPrice: 32,
    kind: "extra",
    scale: "per_guest",
    icon: "Utensils",
  },
];

/** Travel insurance — offered on everything, called out separately in totals. */
export const INSURANCE_OFFER: AddOnOffer = {
  id: "travel_insurance",
  label: "Travel insurance",
  description:
    "Cancellation, medical and baggage cover for the whole trip. Underwritten by a demo provider — this prototype issues no real policy.",
  unitPrice: 24,
  kind: "insurance",
  scale: "per_guest",
  icon: "ShieldCheck",
};

export function addOnsFor(vertical: BookingVertical): AddOnOffer[] {
  switch (vertical) {
    case "hotels":
    case "resorts":
    case "apartments":
    case "shared-rooms":
      return STAY_ADD_ONS;
    case "tours":
    case "activities":
      return TOUR_ADD_ONS;
    case "transport":
      return TRANSPORT_ADD_ONS;
    case "visa":
      return VISA_ADD_ONS;
    case "convention-hall":
      return HALL_ADD_ONS;
    default:
      return [];
  }
}

export interface AddOnScale {
  nights: number;
  guests: number;
  units: number;
}

/** How many of an add-on a selection implies. */
export function quantityFor(offer: AddOnOffer, scale: AddOnScale): number {
  switch (offer.scale) {
    case "per_night":
      return Math.max(1, scale.nights);
    case "per_guest":
      return Math.max(1, scale.guests);
    case "per_unit":
      return Math.max(1, scale.units);
    default:
      return 1;
  }
}

/** Turn a ticked offer into the priced line stored on the booking. */
export function toBookingAddOn(offer: AddOnOffer, scale: AddOnScale): BookingAddOn {
  const quantity = quantityFor(offer, scale);
  return {
    id: offer.id,
    label: offer.label,
    description: offer.description,
    unitPrice: offer.unitPrice,
    quantity,
    total: Math.round(offer.unitPrice * quantity * 100) / 100,
    kind: offer.kind,
  };
}

/** Short "×3 nights" style qualifier for the summary line. */
export function scaleLabel(offer: AddOnOffer, quantity: number): string {
  switch (offer.scale) {
    case "per_night":
      return `${quantity} night${quantity === 1 ? "" : "s"}`;
    case "per_guest":
      return `${quantity} guest${quantity === 1 ? "" : "s"}`;
    case "per_unit":
      return `${quantity} unit${quantity === 1 ? "" : "s"}`;
    default:
      return "One-off";
  }
}
