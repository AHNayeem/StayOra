import type { Stat } from "@/types/content";
import { Icon } from "@/components/shared/lucide-icon";
import { cn } from "@/lib/utils";

/**
 * StatCard — a headline metric (value + suffix + label). Renders a static value;
 * the animated count-up is layered on in Phase 6 (StatsCounter).
 */
export function StatCard({ stat, className }: { stat: Stat; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
      {stat.icon && (
        <span className="grid size-12 place-items-center rounded-full bg-primary-50 text-primary">
          <Icon name={stat.icon} className="size-6" aria-hidden="true" />
        </span>
      )}
      <span className="text-4xl font-bold text-ink tabular-nums">
        {stat.value.toLocaleString()}
        {stat.suffix && <span className="text-primary">{stat.suffix}</span>}
      </span>
      <span className="text-sm text-muted">{stat.label}</span>
    </div>
  );
}
