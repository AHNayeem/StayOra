import { HeroSearch } from "@/features/search/hero-search";
import type { BookingVertical } from "@/types/booking";
import { HeroSlider } from "./hero-slider";

interface HeroProps {
  /** Vertical selected in the search tabs on first paint. Default "hotels". */
  defaultVertical?: BookingVertical;
}

/**
 * Hero — the home page opener: the animated hero slider with the multi-vertical
 * search widget layered on top. Composition only; slider and search are
 * independently reusable.
 */
export function Hero({ defaultVertical = "hotels" }: HeroProps) {
  return (
    <HeroSlider>
      <HeroSearch defaultVertical={defaultVertical} />
    </HeroSlider>
  );
}
