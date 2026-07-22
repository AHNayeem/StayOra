import type { Feature } from "@/types/content";
import { FeatureCard } from "@/components/cards/feature-card";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { HOME_SECTIONS } from "@/constants/home";
import { Reveal } from "@/components/shared/reveal";

/**
 * WhyChooseUs — the "why book with us" band: a scroll-revealing grid of feature
 * tiles. Centered header; up to four columns.
 */
export function WhyChooseUs({ features }: { features: Feature[] }) {
  if (features.length === 0) return null;

  return (
    <Section background="surface">
      <SectionHeader {...HOME_SECTIONS.features} align="center" />

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, index) => (
          <Reveal key={feature.id} step={index % 4} className="h-full">
            <FeatureCard feature={feature} className="h-full" />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
