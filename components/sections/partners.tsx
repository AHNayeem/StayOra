import {
  Building2,
  Compass,
  CreditCard,
  Plane,
  ShieldCheck,
  TramFront,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { Partner } from "@/types/home";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/shared/reveal";
import { HOME_PARTNERS } from "@/constants/home";

/**
 * Maps a partner's category to a representative Lucide glyph, so each card
 * carries a meaningful icon instead of a bare initial. Falls back to a neutral
 * building mark for any unmapped category.
 */
const CATEGORY_ICON: Record<string, LucideIcon> = {
  Airline: Plane,
  "Hotel group": Building2,
  Transport: TramFront,
  Payments: CreditCard,
  Insurance: ShieldCheck,
  Experiences: Compass,
  Resorts: Waves,
};

function PartnerCard({ partner }: { partner: Partner }) {
  const Glyph = CATEGORY_ICON[partner.category] ?? Building2;

  return (
    <div className="group/card flex items-center gap-3.5 rounded-pill border border-line bg-surface px-5 py-3.5 shadow-card transition duration-base ease-out-soft hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-colors duration-base group-hover/card:bg-primary/15">
        <Glyph className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-base leading-tight font-bold tracking-tight whitespace-nowrap text-ink">
          {partner.name}
        </span>
        <span className="block text-xs font-medium tracking-wide whitespace-nowrap text-muted uppercase">
          {partner.category}
        </span>
      </span>
    </div>
  );
}

/**
 * Partners — a "trusted by" trust strip rendered as an auto-scrolling marquee
 * of partner cards. Each card pairs a category icon with a styled wordmark (no
 * external logo files, keeping the prototype self-contained and CSP-safe). The
 * marquee is pure CSS: the track duplicates its items and translates by -50%,
 * looping seamlessly, pausing on hover, and freezing under reduced motion — so
 * this stays a zero-JS server component. Edge fades mask the loop seams.
 */
export function Partners({ partners }: { partners: Partner[] }) {
  if (partners.length === 0) return null;

  // Duplicate the list so the -50% translate wraps without a visible jump.
  const track = [...partners, ...partners];

  return (
    <section className="border-y border-line bg-surface py-12">
      <Container>
        <Reveal>
          <p className="text-center text-sm font-medium tracking-wide text-muted uppercase">
            {HOME_PARTNERS.title}
          </p>
        </Reveal>
      </Container>

      <div className="group mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <ul className="flex w-max animate-marquee items-stretch group-hover:[animation-play-state:paused]">
          {track.map((partner, index) => (
            <li
              key={index}
              className="me-4 shrink-0"
              aria-hidden={index >= partners.length}
            >
              <PartnerCard partner={partner} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
