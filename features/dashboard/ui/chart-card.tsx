import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "./panel";
import { ChartSkeleton } from "./skeletons";

interface ChartLegendItem {
  label: string;
  /** A token-based colour class, e.g. "bg-primary" or "bg-accent". */
  colorClass: string;
}

interface ChartCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned header controls (range picker, export…). */
  actions?: ReactNode;
  legend?: ChartLegendItem[];
  loading?: boolean;
  /** No data to plot. */
  empty?: boolean;
  emptyLabel?: string;
  /** Fixed height for the plot area. */
  height?: number;
  /**
   * The chart node — typically a Recharts primitive from `../ui/charts`
   * ({@link TrendChart}, {@link CategoryBarChart}, {@link DonutChart}). When
   * omitted, a decorative placeholder is shown.
   */
  children?: ReactNode;
  className?: string;
}

/** Decorative bar placeholder shown until a real chart is supplied. */
function ChartPlaceholder({ height }: { height: number }) {
  const bars = [45, 62, 38, 72, 55, 83, 48, 66, 40, 78, 58, 70];
  return (
    <div
      className="flex items-end gap-2 border-b border-line pb-2"
      style={{ height }}
      aria-hidden="true"
    >
      {bars.map((h, i) => (
        <div
          key={i}
          style={{ height: `${h}%` }}
          className="flex-1 rounded-t-field bg-primary-50"
        />
      ))}
    </div>
  );
}

/**
 * ChartCard — a {@link Panel}-wrapped chart container with a header, optional
 * legend, and loading/empty states. Pass a real chart via `children`; with none,
 * it renders a decorative placeholder. Presentation-only.
 */
export function ChartCard({
  title,
  description,
  actions,
  legend,
  loading = false,
  empty = false,
  emptyLabel = "No data for this period",
  height = 240,
  children,
  className,
}: ChartCardProps) {
  return (
    <Panel flush className={className}>
      <PanelHeader title={title} description={description} actions={actions} />
      <div className="p-5">
        {loading ? (
          <ChartSkeleton className="border-0 p-0 shadow-none" />
        ) : empty ? (
          <div
            role="status"
            className="flex flex-col items-center justify-center gap-2 text-center text-muted"
            style={{ height }}
          >
            <BarChart3 className="size-8" aria-hidden="true" />
            <p className="text-sm">{emptyLabel}</p>
          </div>
        ) : (
          children ?? <ChartPlaceholder height={height} />
        )}

        {legend && legend.length > 0 && !loading && (
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {legend.map((item) => (
              <li
                key={item.label}
                className="inline-flex items-center gap-2 text-sm text-body"
              >
                <span
                  className={cn("size-2.5 rounded-full", item.colorClass)}
                  aria-hidden="true"
                />
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
