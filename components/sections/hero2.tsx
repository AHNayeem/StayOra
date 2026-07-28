import Image from "next/image";
import { HeroSearch } from "@/features/search/hero-search";
import { Container } from "@/components/ui/container";
import { HERO_SLIDES } from "@/constants/hero";
import type { BookingVertical } from "@/types/booking";
import { HeroSearch2 } from "@/features/search/hero-search2";

/** Static beach backdrop for Hero2 — reuses the beach slide's image. */
const BEACH = HERO_SLIDES.find((s) => s.id === "beach-resorts") ?? HERO_SLIDES[1];

interface Hero2Props {
  /** Vertical selected in the search tabs on first paint. Default "hotels". */
  defaultVertical?: BookingVertical;
}

/**
 * Hero2 — a minimal hero variant: a single static beach-view background with no
 * slider and no headline copy. Just the multi-vertical search widget, centered.
 */
export function Hero2({ defaultVertical = "hotels" }: Hero2Props) {
  return (
    <section className="relative isolate z-20 flex min-h-[620px] flex-col bg-dark lg:min-h-[743px]">
      {/* Static background layer */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Image
          src={BEACH.image}
          alt={BEACH.imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Legibility gradient */}
        {/* <div className="absolute inset-0 bg-linear-to-t from-ink/70 via-ink/35 to-ink/10" /> */}
      </div>

      <Container className="relative flex flex-1 flex-col items-center justify-center py-16 lg:py-20">
        <div className="w-full max-w-[80%]">
          <HeroSearch2 defaultVertical={defaultVertical} />
        </div>
      </Container>
    </section>
  );
}
