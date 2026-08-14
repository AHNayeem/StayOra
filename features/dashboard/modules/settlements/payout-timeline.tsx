"use client";

import { Check, Circle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { settlementService } from "../../domain/services";
import type { Settlement } from "../../domain/types";

/**
 * The financial timeline of a payout.
 *
 * The settlement state machine has its own vocabulary; this renders it in the
 * platform's canonical chain — pending → eligible → approved → released → paid,
 * with held and reversed as the two exception branches — so an admin, a
 * merchant and finance all describe the same payout the same way.
 */
export function PayoutTimeline({ settlement }: { settlement: Settlement }) {
  const stages = settlementService.payoutTimeline(settlement);
  return (
    <ol className="flex flex-col gap-2.5">
      {stages
        .filter((stage) => !stage.skipped || stage.done)
        .map((stage) => (
          <li key={stage.key} className="flex gap-3">
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                stage.done
                  ? stage.key === "reversed" || stage.key === "held"
                    ? "bg-danger/10 text-danger"
                    : "bg-primary-50 text-primary-700"
                  : "bg-surface-muted text-muted",
              )}
            >
              {stage.done ? (
                <Check className="size-3" />
              ) : stage.skipped ? (
                <Minus className="size-3" />
              ) : (
                <Circle className="size-2" />
              )}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  stage.done ? "text-ink" : "text-muted",
                )}
              >
                {stage.label}
              </p>
              <p className="text-xs text-muted">{stage.note}</p>
            </div>
          </li>
        ))}
    </ol>
  );
}
