/**
 * Mock data for the home page's marketing bands (flash deals, trending
 * packages, country highlights, inspiration themes, partners, awards). Typed
 * against `types/home`. Consumed only through `services/content` — never
 * imported directly by components. Images reuse the curated Unsplash IDs used
 * elsewhere in the app to avoid 404s.
 */

import type {
  Award,
  CountryHighlight,
  FlashDeal,
  InspirationTheme,
  Partner,
  TravelPackage,
} from "@/types/home";
import { flagOf } from "@/constants/geo";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

/** Time-limited drops. `endsInSeconds` counts down live on the client. */
export const FLASH_DEALS: FlashDeal[] = [
  {
    id: "flash-1",
    title: "Overwater Villa · Maldives",
    location: "Malé, Maldives",
    image: img("photo-1540202404-a2f29016b523"),
    vertical: "resorts",
    price: { amount: 420, original: 690, unit: "per night" },
    discountPct: 39,
    endsInSeconds: 6 * 3600 + 42 * 60,
    claimed: 34,
    total: 40,
    href: "/resorts",
  },
  {
    id: "flash-2",
    title: "Boutique City Loft",
    location: "Lisbon, Portugal",
    image: img("photo-1502672260266-1c1ef2d93688"),
    vertical: "apartments",
    price: { amount: 96, original: 150, unit: "per night" },
    discountPct: 36,
    endsInSeconds: 11 * 3600 + 15 * 60,
    claimed: 18,
    total: 30,
    href: "/apartments",
  },
  {
    id: "flash-3",
    title: "Sunset Desert Safari",
    location: "Dubai, UAE",
    image: img("photo-1512453979798-5ea266f8880c"),
    vertical: "activities",
    price: { amount: 45, original: 79, unit: "per person" },
    discountPct: 43,
    endsInSeconds: 3 * 3600 + 5 * 60,
    claimed: 112,
    total: 150,
    href: "/activities",
  },
  {
    id: "flash-4",
    title: "5-Star Harbour Hotel",
    location: "Sydney, Australia",
    image: img("photo-1506973035872-a4ec16b8e8d9"),
    vertical: "hotels",
    price: { amount: 189, original: 280, unit: "per night" },
    discountPct: 33,
    endsInSeconds: 22 * 3600 + 30 * 60,
    claimed: 27,
    total: 50,
    href: "/hotels",
  },
];

/** Curated bundles for the "Trending packages" rail. */
export const TRAVEL_PACKAGES: TravelPackage[] = [
  {
    id: "pkg-1",
    title: "Santorini Island Escape",
    destination: "Santorini",
    country: "Greece",
    image: img("photo-1533105079780-92b9be482077"),
    nights: 5,
    days: 6,
    price: { amount: 1290, original: 1590, unit: "per person" },
    rating: 4.9,
    reviews: 214,
    includes: ["Flights", "4★ Hotel", "Breakfast", "Caldera cruise"],
    tag: "Best seller",
    href: "/tours",
  },
  {
    id: "pkg-2",
    title: "Bali Culture & Beaches",
    destination: "Bali",
    country: "Indonesia",
    image: img("photo-1537996194471-e657df975ab4"),
    nights: 7,
    days: 8,
    price: { amount: 980, unit: "per person" },
    rating: 4.8,
    reviews: 301,
    includes: ["Villa stay", "Airport transfer", "Temple tour", "Spa day"],
    tag: "Trending",
    href: "/tours",
  },
  {
    id: "pkg-3",
    title: "Tokyo City Discovery",
    destination: "Tokyo",
    country: "Japan",
    image: img("photo-1540959733332-eab4deabeeaf"),
    nights: 4,
    days: 5,
    price: { amount: 1450, unit: "per person" },
    rating: 4.9,
    reviews: 178,
    includes: ["Flights", "Central hotel", "Rail pass", "Food tour"],
    href: "/tours",
  },
  {
    id: "pkg-4",
    title: "Paris Romantic Getaway",
    destination: "Paris",
    country: "France",
    image: img("photo-1502602898657-3e91760cbb34"),
    nights: 3,
    days: 4,
    price: { amount: 860, original: 1020, unit: "per person" },
    rating: 4.7,
    reviews: 256,
    includes: ["Boutique hotel", "Seine dinner cruise", "Museum pass"],
    href: "/tours",
  },
  {
    id: "pkg-5",
    title: "Dubai Luxury Stopover",
    destination: "Dubai",
    country: "UAE",
    image: img("photo-1512453979798-5ea266f8880c"),
    nights: 4,
    days: 5,
    price: { amount: 1120, unit: "per person" },
    rating: 4.8,
    reviews: 190,
    includes: ["5★ Hotel", "Desert safari", "Burj Khalifa", "Transfers"],
    tag: "Luxury",
    href: "/tours",
  },
  {
    id: "pkg-6",
    title: "New York Weekend Break",
    destination: "New York",
    country: "USA",
    image: img("photo-1496442226666-8d4d0e62e6e9"),
    nights: 3,
    days: 4,
    price: { amount: 940, unit: "per person" },
    rating: 4.6,
    reviews: 142,
    includes: ["Midtown hotel", "City pass", "Broadway show"],
    href: "/tours",
  },
];

const country = (
  code: string,
  name: string,
  image: string,
  listingCount: number,
  from: number,
): CountryHighlight => ({
  code,
  name,
  flag: flagOf(code),
  image: img(image),
  listingCount,
  fromPrice: { amount: from, unit: "per night" },
  href: `/search?q=${encodeURIComponent(name)}`,
});

/** "Browse by country" tiles — a curated global spread. */
export const COUNTRY_HIGHLIGHTS: CountryHighlight[] = [
  country("FR", "France", "photo-1502602898657-3e91760cbb34", 1280, 89),
  country("JP", "Japan", "photo-1540959733332-eab4deabeeaf", 1670, 78),
  country("ID", "Indonesia", "photo-1537996194471-e657df975ab4", 940, 42),
  country("GR", "Greece", "photo-1533105079780-92b9be482077", 512, 120),
  country("AE", "United Arab Emirates", "photo-1512453979798-5ea266f8880c", 830, 96),
  country("US", "United States", "photo-1496442226666-8d4d0e62e6e9", 2040, 145),
  country("IT", "Italy", "photo-1531572753322-ad063cecc140", 1120, 84),
  country("TH", "Thailand", "photo-1528181304800-259b08848526", 760, 38),
];

/** Mood/interest-based entry points for the "Travel inspiration" bento. */
export const INSPIRATION_THEMES: InspirationTheme[] = [
  {
    id: "insp-1",
    title: "Beach escapes",
    subtitle: "Sun, sand and turquoise water",
    image: img("photo-1507525428034-b723cf961d3e"),
    icon: "Waves",
    href: "/resorts",
  },
  {
    id: "insp-2",
    title: "City breaks",
    subtitle: "Culture, food and nightlife",
    image: img("photo-1502602898657-3e91760cbb34"),
    icon: "Building2",
    href: "/hotels",
  },
  {
    id: "insp-3",
    title: "Mountain adventures",
    subtitle: "Trails, peaks and fresh air",
    image: img("photo-1464822759023-fed622ff2c3b"),
    icon: "Mountain",
    href: "/activities",
  },
  {
    id: "insp-4",
    title: "Cultural journeys",
    subtitle: "History and hidden gems",
    image: img("photo-1524562979-3226f2d16f5c"),
    icon: "Landmark",
    href: "/tours",
  },
  {
    id: "insp-5",
    title: "Food & wine trails",
    subtitle: "Taste your way around",
    image: img("photo-1585208798174-6cedd86e019a"),
    icon: "Utensils",
    href: "/activities",
  },
];

/** Trust strip — partner brands (rendered as styled wordmarks, no logo files). */
export const PARTNERS: Partner[] = [
  { id: "pt-1", name: "SkyWings", category: "Airline" },
  { id: "pt-2", name: "Vista Hotels", category: "Hotel group" },
  { id: "pt-3", name: "Nomad Rail", category: "Transport" },
  { id: "pt-4", name: "SafePay", category: "Payments" },
  { id: "pt-5", name: "GlobeCover", category: "Insurance" },
  { id: "pt-6", name: "Wanderlust", category: "Experiences" },
  { id: "pt-7", name: "AeroLink", category: "Airline" },
  { id: "pt-8", name: "Coastline", category: "Resorts" },
];

/** Industry recognition for the "Awards" band. */
export const AWARDS: Award[] = [
  {
    id: "aw-1",
    title: "Best Travel Platform",
    organisation: "Global Travel Awards",
    year: 2026,
    icon: "Trophy",
  },
  {
    id: "aw-2",
    title: "Excellence in Service",
    organisation: "World Tourism Council",
    year: 2025,
    icon: "Medal",
  },
  {
    id: "aw-3",
    title: "Travellers' Choice",
    organisation: "Voyage Review",
    year: 2026,
    icon: "ThumbsUp",
  },
  {
    id: "aw-4",
    title: "Top Rated Booking App",
    organisation: "App Innovators",
    year: 2025,
    icon: "Star",
  },
];
