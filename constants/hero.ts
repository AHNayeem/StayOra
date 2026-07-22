/**
 * Hero slider content. Three rotating slides establishing the travel/booking
 * mood. Images are remote (Unsplash) during design build-out — see
 * `next.config.ts` remotePatterns. Swap `image` for local assets in `/public`
 * or a CDN when wiring real content.
 */
export interface HeroSlide {
  id: string;
  /** Full-bleed background image URL. */
  image: string;
  imageAlt: string;
  /** Small eyebrow above the headline. */
  eyebrow: string;
  /** Headline; `highlight` (if present) is rendered in the accent color. */
  title: string;
  highlight: string;
  subtitle: string;
}

/** A trust badge shown over the hero, independent of the active slide. */
export interface HeroRating {
  score: number;
  count: string;
  source: string;
}

export const HERO_RATING: HeroRating = {
  score: 4.9,
  count: "12k+",
  source: "verified travellers",
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "beach-resorts",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Turquoise sea meeting a white sand beach at golden hour",
    eyebrow: "Explore the world with us",
    title: "Find your next",
    highlight: "escape",
    subtitle:
      "Hotels, resorts, apartments and more — one platform for every kind of stay and journey.",
  },
  {
    id: "mountain-tours",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Sunlit mountain range above a layer of low clouds",
    eyebrow: "Adventures that move you",
    title: "Discover unforgettable",
    highlight: "destinations",
    subtitle:
      "Curated tours and activities, trusted transport, and effortless booking from start to finish.",
  },
  {
    id: "city-stays",
    image:
      "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=2000&q=80",
    imageAlt: "Modern city skyline glowing at dusk",
    eyebrow: "Stay closer to everything",
    title: "Book smarter, travel",
    highlight: "further",
    subtitle:
      "Compare thousands of verified listings and reserve in minutes, with free cancellation on many stays.",
  },
];
