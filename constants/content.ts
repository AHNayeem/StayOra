/**
 * Mock editorial / marketing content. Typed against `types/content`. Icons are
 * Lucide names (strings) resolved at render by `components/shared/lucide-icon`.
 * Consumed via `services/content`.
 *
 * Destinations are *not* here: they have their own lifecycle and are authored in
 * the dashboard, so their seed lives in `constants/destinations.ts` and is read
 * through `features/destinations`.
 */

import type { Feature, Offer, Stat, Testimonial } from "@/types/content";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

/**
 * Blog posts moved to `constants/blog-posts.ts` when the blog gained a
 * lifecycle: they are records the dashboard writes, not static marketing copy,
 * and keeping a second array here is exactly how a published post fails to
 * appear on the site. Read them through `features/blog` or `services/content`.
 */

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
