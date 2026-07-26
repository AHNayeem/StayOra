import type { SeoEntry } from "./types";

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 6, 1) - dayOffset * 86_400_000).toISOString();
}

/** [path, title, description, indexable] */
const ENTRIES: [string, string, string, boolean][] = [
  [
    "/",
    "StayOra — Book Hotels, Apartments & Resorts Worldwide",
    "Find and book the perfect stay across 190+ countries. Hotels, apartments, resorts and more at the best prices, with free cancellation on most bookings.",
    true,
  ],
  [
    "/hotels",
    "Hotels — Compare & Book Hotels Worldwide | StayOra",
    "Browse thousands of hotels with real guest reviews. Filter by price, rating and amenities, then book instantly with free cancellation options.",
    true,
  ],
  [
    "/apartments",
    "Apartments & Serviced Stays | StayOra",
    "Spacious apartments and serviced stays for every trip. Book monthly or nightly with verified hosts and transparent pricing.",
    true,
  ],
  [
    "/resorts",
    "All-Inclusive Resorts & Getaways | StayOra",
    "Discover beachfront and mountain resorts with all-inclusive packages, spa deals and family-friendly amenities.",
    true,
  ],
  [
    "/transport",
    "Airport Transfers & Transport | StayOra",
    "Pre-book reliable airport transfers, car rentals and intercity transport alongside your stay.",
    true,
  ],
  [
    "/activities",
    "Tours & Activities | StayOra",
    "Book tours, day trips and experiences at your destination — skip-the-line tickets and local guides included.",
    true,
  ],
  [
    "/visa",
    "Visa Assistance & Travel Documents | StayOra",
    "Check visa requirements and get end-to-end assistance for your destination, with document checklists and processing times.",
    true,
  ],
  [
    "/about",
    "About StayOra — Our Story & Mission",
    "Learn how StayOra helps millions of travellers book smarter across the globe.",
    true,
  ],
  [
    "/blog",
    "Travel Guides & Tips | StayOra Blog",
    "Destination guides, travel tips and inspiration to plan your next trip with confidence.",
    true,
  ],
  [
    "/checkout",
    "Secure Checkout | StayOra",
    "Complete your booking securely.",
    false,
  ],
  [
    "/account",
    "Your Account | StayOra",
    "Manage your bookings, payment methods and preferences.",
    false,
  ],
  [
    "/help",
    "Help Center & Support | StayOra",
    "Answers to common questions about bookings, refunds, payments and account management.",
    true,
  ],
];

export const SEO_SEED: SeoEntry[] = ENTRIES.map(([path, title, description, indexable], i) => ({
  id: `seo_${900 + i}`,
  path,
  title,
  description,
  canonical: "",
  ogImage: "",
  indexable,
  updatedAt: iso((i * 6) % 75),
}));
