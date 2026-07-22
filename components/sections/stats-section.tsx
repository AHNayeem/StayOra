import type { Stat } from "@/types/content";
import { Icon } from "@/components/shared/lucide-icon";
import { CountUp } from "@/components/shared/count-up";
import { Section } from "@/components/ui/section";
import { HOME_SECTIONS } from "@/constants/home";
import { Reveal } from "@/components/shared/reveal";

/**
 * StatsSection — the "fun facts" band on a dark surface. Each figure animates
 * from zero when scrolled into view via {@link CountUp} (the animated
 * counterpart to the static StatCard). Values reveal with a per-item cascade.
 */
export function StatsSection({ stats }: { stats: Stat[] }) {
  if (stats.length === 0) return null;

  return (
    <Section background="dark">
      <div className="text-center">
        <p className="text-overline">{HOME_SECTIONS.stats.eyebrow}</p>
        <h2 className="text-h2 mt-3 text-white">{HOME_SECTIONS.stats.title}</h2>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-8 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Reveal key={stat.id} step={index % 4} className="flex flex-col items-center text-center">
            {stat.icon && (
              <span className="mb-4 grid size-14 place-items-center rounded-full bg-white/10 text-primary">
                <Icon name={stat.icon} className="size-7" aria-hidden="true" />
              </span>
            )}
            <CountUp
              value={stat.value}
              suffix={stat.suffix}
              className="text-4xl font-bold text-white tabular-nums md:text-5xl"
              suffixClassName="text-primary"
            />
            <span className="mt-2 text-sm text-white/70">{stat.label}</span>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
