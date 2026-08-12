"use client";

import Link from "next/link";
import { ArrowRight, PiggyBank, TriangleAlert } from "lucide-react";
import type { AIBlock } from "@/types/ai";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";
import { AiText } from "./ai-text";
import { BlockShell } from "./block-shell";

type BudgetBlock = Extract<AIBlock, { kind: "budget" }>;

/**
 * BudgetBlock — the costed plan.
 *
 * The progress bar and every figure come from real listing prices and fare
 * totals; the alternatives are actual cheaper listings, and each saving is the
 * arithmetic difference against the current pick. Nothing here is an estimate
 * dressed up as a promise.
 */
export function BudgetBlock({ block }: { block: BudgetBlock }) {
  const { money } = useLocale();
  const { budget } = block;
  const over = (budget.overByUsd ?? 0) > 0;

  const usage =
    budget.budgetUsd && budget.budgetUsd > 0
      ? Math.min(100, Math.round((budget.totalUsd / budget.budgetUsd) * 100))
      : 0;

  return (
    <BlockShell title="Budget breakdown">
      <ul className="divide-y divide-line">
        {budget.lines.map((line) => (
          <li key={`${line.kind}-${line.label}`} className="flex items-start gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              {line.href ? (
                <Link
                  href={line.href}
                  className="block truncate text-sm font-medium text-ink hover:text-primary"
                >
                  {line.label}
                </Link>
              ) : (
                <span className="block truncate text-sm font-medium text-ink">{line.label}</span>
              )}
              {line.detail && (
                <span className="block truncate text-xs text-muted">
                  <AiText text={line.detail} />
                </span>
              )}
            </div>
            <span className="shrink-0 text-sm font-semibold text-ink">
              {money(line.amountUsd)}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t border-line px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-semibold text-ink">Estimated total</span>
          <span className="text-lg font-bold text-accent-600">{money(budget.totalUsd)}</span>
        </div>

        {budget.budgetUsd !== undefined && (
          <>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-surface-muted"
              role="img"
              aria-label={`${usage}% of your ${money(budget.budgetUsd)} budget used`}
            >
              <div
                className={cn("h-full rounded-pill", over ? "bg-danger" : "bg-primary")}
                style={{ width: `${Math.max(4, usage)}%` }}
              />
            </div>
            <p
              className={cn(
                "mt-2 flex items-center gap-1.5 text-xs font-medium",
                over ? "text-danger" : "text-primary-700",
              )}
            >
              {over ? (
                <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <PiggyBank className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              {over
                ? `${money(budget.overByUsd!)} over your ${money(budget.budgetUsd)} budget`
                : `${money(budget.remainingUsd ?? 0)} left of your ${money(budget.budgetUsd)} budget`}
            </p>
          </>
        )}
      </div>

      {budget.alternatives.length > 0 && (
        <div className="border-t border-line bg-surface-muted px-4 py-3">
          <p className="text-xs font-semibold text-ink">Ways to close the gap</p>
          <ul className="mt-2 space-y-2">
            {budget.alternatives.map((alternative) => (
              <li key={alternative.href}>
                <Link
                  href={alternative.href}
                  className="flex items-start gap-2 rounded-field bg-surface px-3 py-2 transition-colors hover:bg-primary-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-ink">
                      <AiText text={alternative.label} />
                    </span>
                    {alternative.detail && (
                      <span className="block truncate text-xs text-muted">
                        <AiText text={alternative.detail} />
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs font-bold text-primary">
                    −{money(alternative.savesUsd)}
                  </span>
                  <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </BlockShell>
  );
}
