import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { HOME_ABOUT } from "@/constants/home";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

/**
 * AboutSection — the intro band under the hero: an image composition beside the
 * platform pitch, benefit checklist and a call to action. A floating highlight
 * card overlaps the imagery. Both columns reveal on scroll.
 */
export function AboutSection() {
  return (
    <Section background="surface">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        {/* Imagery */}
        <Reveal>
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-panel">
              <Image
                src={HOME_ABOUT.image}
                alt={HOME_ABOUT.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            <div className="absolute right-4 bottom-4 hidden w-40 overflow-hidden rounded-card border-4 border-surface shadow-card sm:block">
              <div className="relative aspect-square">
                <Image
                  src={HOME_ABOUT.secondaryImage}
                  alt={HOME_ABOUT.secondaryImageAlt}
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="absolute top-4 left-4 rounded-card bg-surface/95 px-4 py-3 shadow-card backdrop-blur-sm">
              <p className="text-2xl font-bold text-primary">{HOME_ABOUT.highlight.value}</p>
              <p className="max-w-28 text-xs text-muted">{HOME_ABOUT.highlight.label}</p>
            </div>
          </div>
        </Reveal>

        {/* Copy */}
        <Reveal step={1}>
          <div>
            <p className="text-overline">{HOME_ABOUT.eyebrow}</p>
            <h2 className="text-h2 mt-3">{HOME_ABOUT.title}</h2>
            <p className="mt-4 text-body">{HOME_ABOUT.description}</p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {HOME_ABOUT.points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-ink">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>

            <Link
              href={HOME_ABOUT.cta.href}
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-8 gap-2")}
            >
              {HOME_ABOUT.cta.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
