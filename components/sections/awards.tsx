import type { Award } from "@/types/home";
import { Icon } from "@/components/shared/lucide-icon";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/shared/reveal";
import { HOME_SECTIONS } from "@/constants/home";

/**
 * Awards — the "recognised worldwide" band: a scroll-revealing grid of
 * award/recognition tiles (icon, title, awarding body and year).
 */
export function Awards({ awards }: { awards: Award[] }) {
  if (awards.length === 0) return null;

  return (
    <Section background="muted">
      <SectionHeader {...HOME_SECTIONS.awards} align="center" />

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {awards.map((award, index) => (
          <Reveal key={award.id} step={index % 4} className="h-full">
            <div className="flex h-full flex-col items-center gap-3 rounded-card border border-line bg-surface p-6 text-center shadow-card transition duration-base ease-out-soft hover:-translate-y-1 hover:shadow-card-hover">
              <span className="grid size-14 place-items-center rounded-full bg-accent-50 text-accent-600">
                <Icon name={award.icon} className="size-7" aria-hidden="true" />
              </span>
              <h3 className="text-base font-semibold text-ink">{award.title}</h3>
              <p className="text-sm text-body">{award.organisation}</p>
              <span className="mt-auto rounded-pill bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">
                {award.year}
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
