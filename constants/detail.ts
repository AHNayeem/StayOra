/**
 * Editorial + configuration data for the details template. Kept separate from
 * the raw listing mocks so the details page can enrich any listing (real or
 * mock) with believable, vertical-appropriate content. Pure data — imported by
 * the deriving builder in `lib/listing-detail` and by the booking widget.
 */

import type { BookingVertical } from "@/types/booking";
import type { FaqItem } from "@/types/detail";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

/**
 * Extra imagery used to pad a listing's gallery when it has no `gallery` of its
 * own. Vertical-keyed so a hotel gallery reads as rooms/lobbies and a tour
 * gallery reads as landscapes.
 */
export const GALLERY_POOL: Record<BookingVertical, string[]> = {
  hotels: [
    img("photo-1611892440504-42a792e24d32"),
    img("photo-1618773928121-c32242e63f39"),
    img("photo-1445019980597-93fa8acb246c"),
    img("photo-1582719478250-c89cae4dc85b"),
  ],
  apartments: [
    img("photo-1512917774080-9991f1c4c750"),
    img("photo-1493809842364-78817add7ffb"),
    img("photo-1484154218962-a197022b5858"),
    img("photo-1522708323590-d24dbb6b0267"),
  ],
  resorts: [
    img("photo-1540541338287-41700207dee6"),
    img("photo-1582719508461-905c673771fd"),
    img("photo-1512918728675-ed5a9ecdebfd"),
    img("photo-1439066615861-d1af74d74000"),
  ],
  "shared-rooms": [
    img("photo-1555854877-bab0e564b8d5"),
    img("photo-1596394516093-501ba68a0ba6"),
    img("photo-1560448204-603b3fc33ddc"),
    img("photo-1626178793926-22b28830aa30"),
  ],
  "convention-hall": [
    img("photo-1511578314322-379afb476865"),
    img("photo-1505373877841-8d25f7d46678"),
    img("photo-1587825140708-dfaf72ae4b04"),
    img("photo-1540575467063-178a50c2df87"),
  ],
  transport: [
    img("photo-1502877338535-766e1452684a"),
    img("photo-1449965408869-eaa3f722e40d"),
    img("photo-1570125909232-eb263c188f7e"),
    img("photo-1544620347-c4fd4a3d5957"),
  ],
  tours: [
    img("photo-1476514525535-07fb3b4ae5f1"),
    img("photo-1500530855697-b586d89ba3ee"),
    img("photo-1533105079780-92b9be482077"),
    img("photo-1526772662000-3f88f10405ff"),
  ],
  activities: [
    img("photo-1533105079780-92b9be482077"),
    img("photo-1530866495561-507c9faab2ed"),
    img("photo-1502680390469-be75c86b636f"),
    img("photo-1471039497385-b6d6ba609f9c"),
  ],
  visa: [
    img("photo-1502920917128-1aa500764cbd"),
    img("photo-1569154941061-e231b4725ef1"),
    img("photo-1436491865332-7a61a109cc05"),
    img("photo-1520250497591-112f2f40a3f4"),
  ],
};

/** A short editorial blurb appended to the derived overview, per vertical. */
export const OVERVIEW_BLURB: Record<BookingVertical, string> = {
  hotels:
    "Thoughtfully appointed rooms, attentive service and a location that puts the best of the city within easy reach make this a stay worth returning to.",
  apartments:
    "A private, fully-equipped home away from home — ideal for travellers who want space to unwind, cook and live like a local.",
  resorts:
    "An all-in-one escape where days drift between the pool, the spa and the shoreline, and everything you need is a short stroll away.",
  "shared-rooms":
    "A sociable, budget-friendly base with a lively common area — perfect for meeting fellow travellers without stretching your budget.",
  "convention-hall":
    "A versatile, professionally-managed venue with the space, technology and support to make conferences, galas and product launches run flawlessly.",
  transport:
    "Comfortable, reliable door-to-door travel with a professional driver, so you can relax and enjoy the journey from the moment you set off.",
  tours:
    "An expertly-paced itinerary that balances the must-see highlights with time to wander, led by guides who know the region inside out.",
  activities:
    "A memorable few hours in expert hands, with all the essentials taken care of so you can focus on the experience itself.",
  visa:
    "End-to-end application support from specialists who handle the paperwork, review your documents and keep you updated at every step.",
};

/** What the price includes / excludes, per vertical. */
export const INCLUSIONS: Record<
  BookingVertical,
  { included: string[]; excluded: string[] }
> = {
  hotels: {
    included: ["Daily housekeeping", "High-speed Wi-Fi", "Access to on-site facilities", "24/7 front desk"],
    excluded: ["City tourism tax", "Airport transfers", "Minibar & room service", "Spa treatments"],
  },
  apartments: {
    included: ["Fully-equipped kitchen", "High-speed Wi-Fi", "Fresh linens & towels", "Self check-in"],
    excluded: ["Cleaning fee", "Security deposit", "Optional mid-stay clean", "Parking"],
  },
  resorts: {
    included: ["Selected meals & drinks", "Pool & beach access", "Daily activities programme", "Wi-Fi throughout"],
    excluded: ["Premium à la carte dining", "Motorised water sports", "Spa treatments", "Excursions"],
  },
  "shared-rooms": {
    included: ["Bed linen & locker", "Shared kitchen access", "High-speed Wi-Fi", "Common lounge"],
    excluded: ["Towel hire", "Breakfast", "Private bathroom", "Laundry"],
  },
  "convention-hall": {
    included: ["Venue hire for the booked day", "In-house AV & lighting", "On-site event coordinator", "High-speed Wi-Fi"],
    excluded: ["Catering & beverages", "Overtime hours", "External décor", "Security staff"],
  },
  transport: {
    included: ["Professional driver", "Fuel & tolls", "Meet & greet", "Bottled water"],
    excluded: ["Gratuities", "Extra waiting time", "Child seats (on request)", "Additional stops"],
  },
  tours: {
    included: ["Expert local guide", "Accommodation as listed", "Selected meals", "Entrance fees on the itinerary"],
    excluded: ["International flights", "Travel insurance", "Personal expenses", "Optional excursions"],
  },
  activities: {
    included: ["Professional instructor / guide", "All necessary equipment", "Safety briefing", "Complimentary photos"],
    excluded: ["Hotel pick-up", "Food & drinks", "Gratuities", "Personal insurance"],
  },
  visa: {
    included: ["Document checklist & review", "Application form completion", "Appointment scheduling", "Status tracking"],
    excluded: ["Government / embassy fees", "Biometrics fee", "Courier charges", "Travel insurance"],
  },
};

/** FAQs shown on every details page. */
export const FAQ_COMMON: FaqItem[] = [
  {
    question: "How do I confirm my booking?",
    answer:
      "Choose your dates and options, then send your booking request. Our team reviews availability and confirms by email — usually within a few hours.",
  },
  {
    question: "What is the cancellation policy?",
    answer:
      "Most bookings can be cancelled free of charge up to 48 hours in advance. The exact terms are shown on your confirmation before any payment is taken.",
  },
];

/** Extra FAQs tailored to each vertical. */
export const FAQ_BY_VERTICAL: Record<BookingVertical, FaqItem[]> = {
  hotels: [
    { question: "What are the check-in and check-out times?", answer: "Check-in is from 3:00 PM and check-out is until 11:00 AM. Early check-in and late check-out can be arranged on request, subject to availability." },
  ],
  apartments: [
    { question: "Is the apartment self check-in?", answer: "Yes — you'll receive detailed access instructions and a key code the day before arrival, so you can settle in whenever suits you." },
  ],
  resorts: [
    { question: "What does the board basis include?", answer: "Your rate's board basis is shown in the highlights. All-inclusive covers meals and selected drinks; half board covers breakfast and dinner." },
  ],
  "shared-rooms": [
    { question: "Are the dorms mixed or single-gender?", answer: "The room type is listed in the details. We offer both mixed and female-only dorms — just pick the option that suits you at booking." },
  ],
  "convention-hall": [
    { question: "Can you arrange catering and AV?", answer: "Absolutely. In-house AV is included, and our event coordinator can arrange catering, décor and additional staffing as an add-on." },
  ],
  transport: [
    { question: "What happens if my flight is delayed?", answer: "Your driver tracks your flight and adjusts the pick-up time automatically at no extra cost, so someone is always waiting when you land." },
  ],
  tours: [
    { question: "What is the group size?", answer: "Group sizes are kept small — the maximum is shown in the details — so the experience stays personal and the pace stays flexible." },
  ],
  activities: [
    { question: "Do I need any experience?", answer: "No prior experience is needed. Your guide provides a full briefing and all equipment, and the experience is suitable for beginners." },
  ],
  visa: [
    { question: "What documents will I need?", answer: "After you start, we send a personalised checklist based on your nationality and destination, then review everything before submission." },
  ],
};

/**
 * A pool of steps used to synthesise a plausible day-by-day itinerary for tours.
 * The builder slices the first N by trip length.
 */
export const ITINERARY_POOL: { title: string; description: string }[] = [
  { title: "Arrival & welcome", description: "Meet your guide, settle into your accommodation and gather for a relaxed welcome briefing and dinner." },
  { title: "The classic highlights", description: "A guided walk through the region's most iconic sights, with plenty of time for photos and local stories." },
  { title: "Hidden corners", description: "Step off the tourist trail to discover the neighbourhoods, markets and viewpoints only locals know." },
  { title: "Nature & landscapes", description: "A scenic day in the outdoors — think coastline, hills or countryside — at a comfortable, unhurried pace." },
  { title: "Culture & cuisine", description: "Hands-on culture: a workshop, tasting or cooking session that brings the region's traditions to life." },
  { title: "Free day to explore", description: "Time at your own pace to revisit a favourite spot, relax, or join an optional excursion." },
  { title: "The grand finale", description: "A standout experience saved for last, followed by a celebratory group meal." },
  { title: "Departure", description: "A leisurely morning and farewell before your onward journey or transfer." },
];

/**
 * A deterministic pool of reviews. The builder picks a slug-derived slice and
 * nudges ratings toward the listing's own score, so every page looks lived-in
 * without random (SSR-unsafe) generation.
 */
export const REVIEW_POOL: {
  author: string;
  rating: number;
  date: string;
  platform: "google" | "facebook" | "tripadvisor";
  body: string;
  location: string;
}[] = [
  { author: "Amelia Hart", rating: 5, date: "2026-05-18", platform: "google", body: "Exceeded every expectation. The attention to detail was superb and the team could not have been more helpful. We're already planning to come back.", location: "London, UK" },
  { author: "Marco Rossi", rating: 5, date: "2026-04-02", platform: "tripadvisor", body: "Genuinely one of the best experiences we've booked. Smooth from start to finish and worth every penny — highly recommended.", location: "Milan, Italy" },
  { author: "Sofia Alvarez", rating: 4, date: "2026-03-21", platform: "google", body: "Really enjoyable and well organised. A couple of small things could be improved, but overall a lovely time and great value.", location: "Madrid, Spain" },
  { author: "James Okafor", rating: 5, date: "2026-02-14", platform: "facebook", body: "Fantastic communication throughout and everything was exactly as described. The little extras made it feel special.", location: "Lagos, Nigeria" },
  { author: "Yuki Tanaka", rating: 4, date: "2026-01-30", platform: "tripadvisor", body: "Comfortable, clean and in a brilliant location. Staff went out of their way to help us. Would happily book again.", location: "Osaka, Japan" },
  { author: "Chloe Dubois", rating: 5, date: "2025-12-09", platform: "google", body: "Absolutely wonderful from booking to checkout. Seamless, welcoming and a real highlight of our trip.", location: "Lyon, France" },
];

/** Flat service fee applied to the booking subtotal in the live price breakdown. */
export const SERVICE_FEE_RATE = 0.08;

/** A quantity input in the booking widget. */
export interface BookingField {
  key: string;
  label: string;
  hint?: string;
  min: number;
  max: number;
  default: number;
  /** When true, this quantity multiplies the price subtotal. */
  multiplier: boolean;
}

/** An optional extra service the traveller can toggle on for a booking. */
export interface BookingAddOn {
  key: string;
  label: string;
  /** Base USD price. Charged once, or per guest when {@link perPerson} is set. */
  price: number;
  /** When true, the price is multiplied by the guest/traveller count. */
  perPerson?: boolean;
}

export type BookingDateMode = "range" | "single" | "none";

/** Per-vertical configuration for the sticky booking-inquiry widget. */
export interface BookingWidgetConfig {
  /** Panel heading, e.g. "Book Your Room". */
  title: string;
  /** Supporting line under the heading. */
  subtitle: string;
  dateMode: BookingDateMode;
  checkInLabel?: string;
  checkOutLabel?: string;
  /** Static check-in/out times shown under the labels (stays only). */
  checkInTime?: string;
  checkOutTime?: string;
  singleDateLabel?: string;
  /** In range mode, the rate is per night/day → the duration multiplies the total. */
  perDuration: boolean;
  /** Singular noun for the duration unit, e.g. "night", "day". */
  durationUnit?: string;
  fields: BookingField[];
  /** Optional extra services rendered as checkboxes below the quantities. */
  addOns?: BookingAddOn[];
  /** Noun for the priced unit in the summary line, e.g. "Room", "Traveller". */
  summaryNoun: string;
  ctaLabel: string;
  /** Reassurance line under the CTA. */
  note: string;
}

export const BOOKING_CONFIG: Record<BookingVertical, BookingWidgetConfig> = {
  hotels: {
    title: "Book Your Room",
    subtitle:
      "Reserve your ideal room early for a hassle-free trip; secure comfort and convenience!",
    dateMode: "range",
    checkInLabel: "Check in",
    checkOutLabel: "Check out",
    checkInTime: "12:00 PM",
    checkOutTime: "01:00 PM",
    perDuration: true,
    durationUnit: "night",
    fields: [
      { key: "rooms", label: "Room Quantity", min: 1, max: 10, default: 1, multiplier: true },
      { key: "guests", label: "Guest Capability", hint: "Adults & children", min: 1, max: 20, default: 3, multiplier: false },
    ],
    addOns: [
      { key: "buffet", label: "Buffet Dinner", price: 100, perPerson: true },
      { key: "airport", label: "Airport Transportation", price: 100 },
    ],
    summaryNoun: "Room",
    ctaLabel: "Book Now",
    note: "You won't be charged yet",
  },
  apartments: {
    title: "Book Your Stay",
    subtitle:
      "Secure your home away from home — reserve early for the best rate and peace of mind.",
    dateMode: "range",
    checkInLabel: "Check in",
    checkOutLabel: "Check out",
    checkInTime: "03:00 PM",
    checkOutTime: "11:00 AM",
    perDuration: true,
    durationUnit: "night",
    fields: [
      { key: "guests", label: "Guest Capability", hint: "Max occupancy applies", min: 1, max: 16, default: 2, multiplier: false },
    ],
    addOns: [
      { key: "cleaning", label: "Mid-stay Cleaning", price: 40 },
      { key: "parking", label: "Private Parking", price: 25 },
    ],
    summaryNoun: "Stay",
    ctaLabel: "Book Now",
    note: "You won't be charged yet",
  },
  resorts: {
    title: "Book Your Escape",
    subtitle:
      "Reserve your all-inclusive getaway early and lock in comfort, convenience and value.",
    dateMode: "range",
    checkInLabel: "Check in",
    checkOutLabel: "Check out",
    checkInTime: "02:00 PM",
    checkOutTime: "12:00 PM",
    perDuration: true,
    durationUnit: "night",
    fields: [
      { key: "rooms", label: "Room Quantity", min: 1, max: 8, default: 1, multiplier: true },
      { key: "guests", label: "Guest Capability", hint: "Adults & children", min: 1, max: 20, default: 2, multiplier: false },
    ],
    addOns: [
      { key: "spa", label: "Spa Package", price: 150, perPerson: true },
      { key: "airport", label: "Airport Transportation", price: 120 },
    ],
    summaryNoun: "Room",
    ctaLabel: "Book Now",
    note: "You won't be charged yet",
  },
  "shared-rooms": {
    title: "Book Your Bed",
    subtitle:
      "Grab your spot in the dorm early — sociable, safe and easy on the budget.",
    dateMode: "range",
    checkInLabel: "Check in",
    checkOutLabel: "Check out",
    checkInTime: "02:00 PM",
    checkOutTime: "10:00 AM",
    perDuration: true,
    durationUnit: "night",
    fields: [
      { key: "beds", label: "Beds", hint: "Priced per bed", min: 1, max: 12, default: 1, multiplier: true },
      { key: "guests", label: "Guest Capability", min: 1, max: 12, default: 1, multiplier: false },
    ],
    summaryNoun: "Bed",
    ctaLabel: "Book Now",
    note: "You won't be charged yet",
  },
  "convention-hall": {
    title: "Reserve the Venue",
    subtitle:
      "Secure your event date and let our team handle the rest, from AV to layout.",
    dateMode: "range",
    checkInLabel: "From",
    checkOutLabel: "To",
    perDuration: true,
    durationUnit: "day",
    fields: [
      { key: "attendees", label: "Attendees", hint: "Capacity applies", min: 10, max: 2000, default: 100, multiplier: false },
    ],
    addOns: [
      { key: "catering", label: "Catering & Beverages", price: 45, perPerson: true },
      { key: "staffing", label: "Event Staffing", price: 400 },
    ],
    summaryNoun: "Venue",
    ctaLabel: "Request Quote",
    note: "No payment taken — we'll confirm availability",
  },
  transport: {
    title: "Book Your Transfer",
    subtitle:
      "Reserve reliable door-to-door travel with a professional driver.",
    dateMode: "single",
    singleDateLabel: "Travel date",
    perDuration: false,
    fields: [
      { key: "vehicles", label: "Vehicles", min: 1, max: 20, default: 1, multiplier: true },
      { key: "passengers", label: "Passengers", hint: "Seats per vehicle apply", min: 1, max: 200, default: 2, multiplier: false },
    ],
    addOns: [
      { key: "childseat", label: "Child Seat", price: 15 },
      { key: "meet", label: "Meet & Greet", price: 20 },
    ],
    summaryNoun: "Vehicle",
    ctaLabel: "Book Transfer",
    note: "Free cancellation up to 24h before",
  },
  tours: {
    title: "Book This Tour",
    subtitle:
      "Reserve your place on the itinerary — pay later and travel with confidence.",
    dateMode: "single",
    singleDateLabel: "Departure date",
    perDuration: false,
    fields: [
      { key: "travelers", label: "Travellers", hint: "Priced per person", min: 1, max: 30, default: 2, multiplier: true },
    ],
    addOns: [
      { key: "insurance", label: "Travel Insurance", price: 35, perPerson: true },
      { key: "transfer", label: "Airport Transfer", price: 60 },
    ],
    summaryNoun: "Traveller",
    ctaLabel: "Book This Tour",
    note: "Reserve now, pay later",
  },
  activities: {
    title: "Book This Activity",
    subtitle:
      "Reserve your session early and skip the queue on the day.",
    dateMode: "single",
    singleDateLabel: "Activity date",
    perDuration: false,
    fields: [
      { key: "participants", label: "Participants", hint: "Priced per person", min: 1, max: 30, default: 2, multiplier: true },
    ],
    addOns: [
      { key: "photos", label: "Photo Package", price: 25 },
      { key: "pickup", label: "Hotel Pick-up", price: 15, perPerson: true },
    ],
    summaryNoun: "Participant",
    ctaLabel: "Book Now",
    note: "Free cancellation up to 24h before",
  },
  visa: {
    title: "Start Your Application",
    subtitle:
      "Begin your visa application with specialists who handle every step.",
    dateMode: "none",
    perDuration: false,
    fields: [
      { key: "applicants", label: "Applicants", hint: "Priced per person", min: 1, max: 20, default: 1, multiplier: true },
    ],
    addOns: [
      { key: "priority", label: "Priority Processing", price: 80, perPerson: true },
      { key: "courier", label: "Document Courier", price: 30 },
    ],
    summaryNoun: "Applicant",
    ctaLabel: "Start Application",
    note: "Free eligibility check",
  },
};
