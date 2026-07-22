/**
 * Mock editorial / marketing content. Typed against `types/content`. Icons are
 * Lucide names (strings) resolved at render by `components/shared/lucide-icon`.
 * Consumed via `services/content`.
 */

import type {
  BlogPost,
  Destination,
  Feature,
  Offer,
  Stat,
  Testimonial,
} from "@/types/content";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const DESTINATIONS: Destination[] = [
  {
    id: "dst-1",
    slug: "paris",
    name: "Paris",
    country: "France",
    image: img("photo-1502602898657-3e91760cbb34"),
    propertyCount: 1280,
    startingPrice: { amount: 89, unit: "per night" },
  },
  {
    id: "dst-2",
    slug: "bali",
    name: "Bali",
    country: "Indonesia",
    image: img("photo-1537996194471-e657df975ab4"),
    propertyCount: 940,
    startingPrice: { amount: 42, unit: "per night" },
  },
  {
    id: "dst-3",
    slug: "santorini",
    name: "Santorini",
    country: "Greece",
    image: img("photo-1533105079780-92b9be482077"),
    propertyCount: 512,
    startingPrice: { amount: 120, unit: "per night" },
  },
  {
    id: "dst-4",
    slug: "tokyo",
    name: "Tokyo",
    country: "Japan",
    image: img("photo-1540959733332-eab4deabeeaf"),
    propertyCount: 1670,
    startingPrice: { amount: 78, unit: "per night" },
  },
  {
    id: "dst-5",
    slug: "dubai",
    name: "Dubai",
    country: "UAE",
    image: img("photo-1512453979798-5ea266f8880c"),
    propertyCount: 830,
    startingPrice: { amount: 96, unit: "per night" },
  },
  {
    id: "dst-6",
    slug: "new-york",
    name: "New York",
    country: "USA",
    image: img("photo-1496442226666-8d4d0e62e6e9"),
    propertyCount: 2040,
    startingPrice: { amount: 145, unit: "per night" },
  },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "blg-1",
    slug: "10-hidden-beaches-worth-the-trip",
    title: "10 Hidden Beaches Worth the Trip",
    excerpt:
      "Skip the crowds and discover secluded shorelines that still feel like a secret — with tips on when to go and where to stay.",
    image: img("photo-1507525428034-b723cf961d3e"),
    category: "Inspiration",
    author: "Mia Carter",
    date: "2026-06-18",
    readMinutes: 6,
  },
  {
    id: "blg-2",
    slug: "how-to-plan-the-perfect-city-break",
    title: "How to Plan the Perfect City Break",
    excerpt:
      "A practical framework for packing a long weekend with the right mix of sights, food and downtime — without burning out.",
    image: img("photo-1524562979-3226f2d16f5c"),
    category: "Guides",
    author: "Leo Nguyen",
    date: "2026-05-30",
    readMinutes: 8,
  },
  {
    id: "blg-3",
    slug: "budget-travel-that-doesnt-feel-cheap",
    title: "Budget Travel That Doesn't Feel Cheap",
    excerpt:
      "Smart swaps and booking timing that stretch your money further while keeping the experience firmly in the treat-yourself column.",
    image: img("photo-1436491865332-7a61a109cc05"),
    category: "Tips",
    author: "Sofia Rossi",
    date: "2026-05-12",
    readMinutes: 5,
  },
  {
    id: "blg-4",
    slug: "a-first-timers-guide-to-solo-travel",
    title: "A First-Timer's Guide to Solo Travel",
    excerpt:
      "Everything nobody tells you before your first trip alone — from picking a base to staying safe without staying home.",
    image: img("photo-1469854523086-cc02fe5d8800"),
    category: "Guides",
    author: "Leo Nguyen",
    date: "2026-04-28",
    readMinutes: 9,
  },
  {
    id: "blg-5",
    slug: "where-to-eat-like-a-local-in-lisbon",
    title: "Where to Eat Like a Local in Lisbon",
    excerpt:
      "Skip the tourist traps near the castle and follow the tascas, markets and pastry counters that Lisboetas actually love.",
    image: img("photo-1585208798174-6cedd86e019a"),
    category: "Food & Drink",
    author: "Sofia Rossi",
    date: "2026-04-10",
    readMinutes: 7,
  },
  {
    id: "blg-6",
    slug: "seven-under-the-radar-alpine-trails",
    title: "7 Under-the-Radar Alpine Trails",
    excerpt:
      "Trade the crowded classics for quieter ridgelines and valley walks that deliver the views without the queues.",
    image: img("photo-1464822759023-fed622ff2c3b"),
    category: "Adventure",
    author: "Mia Carter",
    date: "2026-03-22",
    readMinutes: 8,
  },
  {
    id: "blg-7",
    slug: "travel-trends-shaping-2026",
    title: "Travel Trends Shaping 2026",
    excerpt:
      "From slow travel to shoulder-season swaps, here's how people are planning trips this year — and what it means for you.",
    image: img("photo-1503220317375-aaad61436b1b"),
    category: "News",
    author: "Leo Nguyen",
    date: "2026-03-05",
    readMinutes: 6,
  },
  {
    id: "blg-8",
    slug: "the-art-of-packing-light",
    title: "The Art of Packing Light",
    excerpt:
      "A carry-on-only system that works for a weekend or a month — the capsule wardrobe, the fold, and the one rule that matters.",
    image: img("photo-1553531384-cc64ac80f931"),
    category: "Tips",
    author: "Sofia Rossi",
    date: "2026-02-18",
    readMinutes: 5,
  },
  {
    id: "blg-9",
    slug: "weekend-wonders-48-hours-in-kyoto",
    title: "Weekend Wonders: 48 Hours in Kyoto",
    excerpt:
      "Temples at dawn, a long lunch, and a route that packs the essentials into two unhurried days without the burnout.",
    image: img("photo-1493976040374-85c8e12f0c0e"),
    category: "Inspiration",
    author: "Mia Carter",
    date: "2026-02-02",
    readMinutes: 7,
  },
];

export const OFFERS: Offer[] = [
  {
    id: "ofr-1",
    title: "Summer Escape Sale",
    description: "Up to 25% off beach resorts when you book by the end of the month.",
    image: img("photo-1540202404-a2f29016b523"),
    discountLabel: "-25%",
    code: "SUMMER25",
    expiresOn: "2026-08-31",
    href: "/offers/summer-escape",
  },
  {
    id: "ofr-2",
    title: "Early-Bird City Stays",
    description: "Save $80 on selected city hotels when you book 30 days ahead.",
    image: img("photo-1477959858617-67f85cf4f1df"),
    discountLabel: "Save $80",
    code: "EARLY80",
    expiresOn: "2026-09-30",
    href: "/offers/early-bird",
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "tst-1",
    author: "Amara Okafor",
    role: "Frequent traveller",
    location: "London, UK",
    avatar: img("photo-1494790108377-be9c29b29330"),
    rating: 5,
    body: "Booking six months of travel across four countries was genuinely effortless. Everything was in one place and the prices beat every site I compared.",
    date: "2026-06-02",
  },
  {
    id: "tst-2",
    author: "Daniel Vega",
    role: "Honeymooner",
    location: "Madrid, Spain",
    avatar: img("photo-1500648767791-00dcc994a43e"),
    rating: 5,
    body: "The resort matched the photos exactly and the support team upgraded us without any fuss. It made our honeymoon completely stress-free.",
    date: "2026-05-21",
  },
  {
    id: "tst-3",
    author: "Priya Sharma",
    role: "Solo backpacker",
    location: "Mumbai, India",
    avatar: img("photo-1438761681033-6461ffad8d80"),
    rating: 4,
    body: "Loved how easy it was to find social hostels with real reviews. The map view alone saved me hours of planning on the road.",
    date: "2026-04-15",
  },
];

export const FEATURES: Feature[] = [
  {
    id: "ftr-1",
    icon: "BadgePercent",
    title: "Best price guarantee",
    description: "Find it cheaper elsewhere and we'll match the price — no questions asked.",
  },
  {
    id: "ftr-2",
    icon: "ShieldCheck",
    title: "Secure booking",
    description: "Bank-grade encryption and buyer protection on every reservation.",
  },
  {
    id: "ftr-3",
    icon: "Headphones",
    title: "24/7 support",
    description: "Real people, any time zone, ready to help before and during your trip.",
  },
  {
    id: "ftr-4",
    icon: "CalendarCheck",
    title: "Free cancellation",
    description: "Flexible options on thousands of stays and experiences worldwide.",
  },
];

export const STATS: Stat[] = [
  { id: "stt-1", value: 2, suffix: "M+", label: "Happy travellers", icon: "Users" },
  { id: "stt-2", value: 150, suffix: "k+", label: "Listings worldwide", icon: "Building2" },
  { id: "stt-3", value: 120, suffix: "+", label: "Countries covered", icon: "Globe" },
  { id: "stt-4", value: 4.8, suffix: "/5", label: "Average rating", icon: "Star" },
];
