import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { HOME_CTA } from "@/constants/home";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

/**
 * CtaSection — the closing call-to-action: a full-bleed image panel with a
 * gradient scrim, headline and dual CTAs (sign up / explore). The last band
 * before the newsletter + footer.
 */
export function CtaSection() {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-panel">
            <Image
              src={HOME_CTA.image}
              alt={HOME_CTA.imageAlt}
              fill
              sizes="(max-width: 1320px) 100vw, 1320px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-r from-ink/85 via-ink/60 to-ink/30" />

            <div className="relative flex flex-col items-start gap-6 px-6 py-16 md:px-16 md:py-24">
              <div className="max-w-xl">
                <p className="text-sm font-medium tracking-wide text-white/80 uppercase">
                  {HOME_CTA.eyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                  {HOME_CTA.title}
                </h2>
                <p className="mt-4 text-white/85">{HOME_CTA.description}</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={HOME_CTA.primary.href}
                  className={cn(buttonVariants({ variant: "primary", size: "lg" }), "gap-2")}
                >
                  {HOME_CTA.primary.label}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href={HOME_CTA.secondary.href}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "gap-2 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20",
                  )}
                >
                  {HOME_CTA.secondary.label}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
