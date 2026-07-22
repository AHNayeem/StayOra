/**
 * Editorial copy for the About page. Kept here (like `constants/home`) so the
 * page composes existing sections around a small amount of page-specific text.
 * Value icons are Lucide names resolved by `components/shared/lucide-icon`.
 */

import type { Feature } from "@/types/content";

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const ABOUT_HERO = {
  title: "We make the world easier to book",
  description:
    "One platform for stays, experiences and everything in between — built by travellers, for travellers.",
  image: img("photo-1488646953014-85cb44e25828"),
  imageAlt: "Two travellers looking out over a mountain valley",
};

export const ABOUT_STORY = {
  eyebrow: "Our story",
  title: "Booking travel shouldn't be the hard part",
  paragraphs: [
    "StayOra began with a simple frustration: planning a single trip meant juggling a dozen tabs, five logins and prices that never quite matched. We thought booking the world should feel as good as being in it.",
    "So we built one place for hotels, apartments, resorts, shared rooms, convention halls, transport and tours — with honest pricing, real reviews and support that actually answers. Today millions of travellers start their journeys with us.",
  ],
  image: img("photo-1522199755839-a2bacb67c546"),
  imageAlt: "A team collaborating around a laptop",
  secondaryImage: img("photo-1521737604893-d14cc237f11d"),
  secondaryImageAlt: "Colleagues planning together",
  highlight: { value: "2M+", label: "Journeys booked and counting" },
};

export const ABOUT_MISSION = {
  eyebrow: "What drives us",
  title: "The values behind every booking",
  description:
    "They're not slogans on a wall — they're the standards we hold every listing, price and reply to.",
};

export const ABOUT_VALUES: Feature[] = [
  {
    id: "val-1",
    icon: "Globe",
    title: "Genuinely global",
    description:
      "Listings in 120+ countries, all held to the same standard so you know what you're getting anywhere.",
  },
  {
    id: "val-2",
    icon: "ShieldCheck",
    title: "Trust by default",
    description:
      "Verified listings, real reviews and secure payments — transparency isn't a feature, it's the baseline.",
  },
  {
    id: "val-3",
    icon: "Heart",
    title: "Built for travellers",
    description:
      "Every decision starts with the person on the trip, not the transaction. If it doesn't help you, we don't ship it.",
  },
  {
    id: "val-4",
    icon: "Headphones",
    title: "Always here",
    description:
      "Real people, any time zone, ready before, during and after your journey — not just when things go wrong.",
  },
  {
    id: "val-5",
    icon: "Leaf",
    title: "Lighter footprint",
    description:
      "We highlight sustainable stays and partners so a great trip can also be a responsible one.",
  },
  {
    id: "val-6",
    icon: "Award",
    title: "Quality over noise",
    description:
      "We'd rather list fewer places we believe in than flood you with options that waste your time.",
  },
];
