import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DashboardIcon } from "../navigation/dashboard-icons";

interface StatCardProps {
  label: string;
  /** Metric value. Use "—" as a neutral placeholder until data is wired. */
  value: ReactNode;
  /** Registered icon name. */
  icon: string;
  /** Optional trend note (e.g. "+12% vs last week"). */
  hint?: string;
  className?: string;
}

/**
 * KPI stat card. Phase 1 renders the layout with placeholder values; the live
 * metric feed connects in Phase 4. Presentation-only — no data fetching here.
 */
export function StatCard({ label, value, icon, hint, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-surface p-5 shadow-card",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-body">{label}</span>
        <span className="grid size-9 place-items-center rounded-field bg-primary-50 text-primary-700">
          <DashboardIcon name={icon} className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
