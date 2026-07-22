/**
 * Home-page editorial content — the static copy and section headings for the
 * landing page, kept out of components so wording is editable in one place.
 * Card/rail data lives in `constants/listings` + `constants/content` and is read
 * through the service layer; this file only holds the page's own prose.
 */

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

/** Eyebrow + title + optional description for a section header. */
export interface SectionCopy {
  eyebrow: string;
  title: string;
  description?: string;
}

/** Standard section headings, keyed for reuse by the home page. */
export const HOME_SECTIONS = {
  destinations: {
    eyebrow: "Top destinations",
    title: "Explore popular places to stay",
    description:
      "Hand-picked cities and escapes travellers love — browse thousands of stays in each.",
  },
  tours: {
    eyebrow: "Featured tours",
    title: "Trips worth taking",
    description: "Curated multi-day journeys led by trusted local operators.",
  },
  hotels: {
    eyebrow: "Featured hotels",
    title: "Stays our guests rate highest",
    description: "Comfort, location and value — the properties booking best right now.",
  },
  activities: {
    eyebrow: "Things to do",
    title: "Experiences to remember",
    description: "Fill your days with activities you can book in a couple of taps.",
  },
  transport: {
    eyebrow: "Getting around",
    title: "Transport for every route",
    description: "Airport transfers, private cars and coaches — priced upfront, no surprises.",
  },
  features: {
    eyebrow: "Why book with us",
    title: "Travel with total confidence",
    description: "Everything about the way we work is built to make booking easier.",
  },
  deals: {
    eyebrow: "Phenomenal deals",
    title: "Limited-time offers",
    description: "Save more when you book early — these deals won't last long.",
  },
  blog: {
    eyebrow: "From the blog",
    title: "Travel inspiration & tips",
    description: "Guides, ideas and practical advice from people who travel for a living.",
  },
  testimonials: {
    eyebrow: "Loved by travellers",
    title: "What our guests say",
    description: "Real reviews from real trips booked across the platform.",
  },
  visa: {
    eyebrow: "Travel documents",
    title: "Visa services made simple",
    description: "Skip the paperwork stress — we handle the process end to end.",
  },
  stats: {
    eyebrow: "Fun facts",
    title: "Trusted by travellers worldwide",
  },
} satisfies Record<string, SectionCopy>;

/** "About" intro band content. */
export const HOME_ABOUT = {
  eyebrow: "About StayOra",
  title: "One platform for every kind of stay and journey",
  description:
    "Hotels, resorts, apartments, shared rooms, convention halls and transport — searched the same way and booked in minutes. We bring every part of your trip together so you can plan less and travel more.",
  points: [
    "Every vertical, one seamless checkout",
    "Transparent pricing with no hidden fees",
    "Free cancellation on thousands of listings",
    "Support from real people, around the clock",
  ],
  cta: { label: "Learn more about us", href: "/about-us" },
  image: img("photo-1533105079780-92b9be482077"),
  imageAlt: "A traveller overlooking a coastal town at sunset",
  secondaryImage: img("photo-1540202404-a2f29016b523"),
  secondaryImageAlt: "A resort pool by the sea",
  highlight: { value: "15+", label: "years helping people travel" },
} as const;

/** Promo / discount banner content. */
export const HOME_PROMO = {
  eyebrow: "Members save more",
  title: "Get 10% off your first booking",
  description:
    "Sign up free and unlock member-only prices across every vertical. Use the code at checkout on any stay, tour or transfer.",
  code: "WELCOME10",
  cta: { label: "Claim your discount", href: "/register" },
} as const;

/** Newsletter sign-up band content. */
export const HOME_NEWSLETTER = {
  eyebrow: "Stay in the loop",
  title: "Get the best travel deals in your inbox",
  description:
    "Join 200,000+ travellers and be first to hear about flash sales, new destinations and insider tips. No spam — unsubscribe any time.",
} as const;
