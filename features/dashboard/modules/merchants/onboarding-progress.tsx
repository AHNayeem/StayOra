"use client";

import Link from "next/link";
import { AlertTriangle, Check, Circle, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHECKLIST_STATE_TONES,
  type ChecklistItem,
  type ChecklistState,
  type OnboardingProgress,
} from "@/features/dashboard/domain";
import { StatusBadge } from "../../ui";

/** A completion bar. Percent, 0–100. */
export function ProgressBar({
  percent,
  label,
  className,
}: {
  percent: number;
  label?: string;
  className?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={className}>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Completion"}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

const STATE_ICON: Record<ChecklistState, React.ComponentType<{ className?: string }>> = {
  complete: Check,
  in_progress: Loader2,
  pending: Circle,
  blocked: Lock,
  rejected: AlertTriangle,
};

const STATE_LABEL: Record<ChecklistState, string> = {
  complete: "Done",
  in_progress: "In progress",
  pending: "To do",
  blocked: "Locked",
  rejected: "Action needed",
};

function ChecklistRow({ item, interactive }: { item: ChecklistItem; interactive: boolean }) {
  const Icon = STATE_ICON[item.state];
  const body = (
    <>
      <span
        className={cn(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
          item.state === "complete"
            ? "border-success bg-success/10 text-success"
            : item.state === "rejected"
              ? "border-danger bg-danger/10 text-danger"
              : item.state === "blocked"
                ? "border-line bg-surface-muted text-muted"
                : "border-line bg-surface text-muted",
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{item.label}</span>
          {!item.required && <span className="text-[11px] text-muted">Optional</span>}
        </span>
        <span className="mt-0.5 block text-xs text-muted">{item.description}</span>
        {item.reason && (
          <span className="mt-1 block text-xs font-medium text-danger">{item.reason}</span>
        )}
        {item.blockedBy && (
          <span className="mt-1 block text-xs text-muted">{item.blockedBy}</span>
        )}
      </span>
      <StatusBadge tone={CHECKLIST_STATE_TONES[item.state]}>{STATE_LABEL[item.state]}</StatusBadge>
    </>
  );

  const className =
    "flex items-start gap-3 rounded-field px-3 py-3 transition-colors";

  if (!interactive || item.state === "blocked" || item.state === "complete") {
    return <li className={className}>{body}</li>;
  }
  return (
    <li>
      <Link href={item.href} className={cn(className, "hover:bg-surface-muted")}>
        {body}
      </Link>
    </li>
  );
}

/**
 * The onboarding checklist.
 *
 * The same {@link OnboardingProgress} object drives this, the completion
 * percentage and the service's submission validation — so what a merchant is
 * shown is exactly what the platform enforces.
 */
export function OnboardingChecklist({
  progress,
  interactive = true,
  title = "Onboarding checklist",
}: {
  progress: OnboardingProgress;
  interactive?: boolean;
  title?: string;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span className="text-xs text-muted">
          {progress.completed} of {progress.total} complete · {progress.percent}%
        </span>
      </div>
      <ProgressBar percent={progress.percent} label="Onboarding completion" className="mt-3" />
      <ul className="mt-3 divide-y divide-line">
        {progress.items.map((item) => (
          <ChecklistRow key={item.id} item={item} interactive={interactive} />
        ))}
      </ul>
    </section>
  );
}
