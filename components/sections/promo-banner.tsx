import Link from "next/link";
import { ArrowRight, BadgePercent } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { HOME_PROMO } from "@/constants/home";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

/**
 * PromoBanner — a full-bleed discount call-out between rails. Brand-green
 * gradient panel with the offer, a copy-ready promo code chip and a CTA.
 */
export function PromoBanner() {
  return (
    <section className="py-8 md:py-12">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-panel bg-linear-to-br from-primary-700 via-primary to-primary-600 px-6 py-12 text-white md:px-14 md:py-16">
            {/* Decorative glow */}
            <div className="pointer-events-none absolute -top-16 -right-10 size-64 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="inline-flex items-center gap-2 text-sm font-medium text-white/90">
                  <BadgePercent className="size-4" aria-hidden="true" />
                  {HOME_PROMO.eyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                  {HOME_PROMO.title}
                </h2>
                <p className="mt-3 text-white/85">{HOME_PROMO.description}</p>
              </div>

              <div className="flex shrink-0 flex-col items-start gap-4 sm:flex-row sm:items-center md:flex-col md:items-end">
                <span className="rounded-pill border-2 border-dashed border-white/60 bg-white/10 px-5 py-2 text-lg font-bold tracking-wide">
                  {HOME_PROMO.code}
                </span>
                <Link
                  href={HOME_PROMO.cta.href}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "gap-2 bg-white text-primary-700 hover:bg-white/90",
                  )}
                >
                  {HOME_PROMO.cta.label}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
