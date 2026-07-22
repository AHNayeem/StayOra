import type { Feature } from "@/types/content";
import { Icon } from "@/components/shared/lucide-icon";
import { cn } from "@/lib/utils";

/** FeatureCard — an icon + title + description "why choose us" tile. */
export function FeatureCard({ feature, className }: { feature: Feature; className?: string }) {
  return (
    <div
      className={cn(
        "group flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-6 shadow-card transition duration-base ease-out-soft hover:-translate-y-1 hover:shadow-card-hover",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-field bg-primary-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
        <Icon name={feature.icon} className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
      <p className="text-sm text-body">{feature.description}</p>
    </div>
  );
}
