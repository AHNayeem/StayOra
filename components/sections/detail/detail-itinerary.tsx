import type { ItineraryStep } from "@/types/detail";
import { DetailBlock } from "./detail-block";

interface DetailItineraryProps {
  steps: ItineraryStep[];
}

/**
 * DetailItinerary — a vertical timeline of day-by-day (or step-by-step) plans.
 * Rendered only when the listing has an itinerary (currently multi-day tours).
 */
export function DetailItinerary({ steps }: DetailItineraryProps) {
  if (steps.length === 0) return null;

  return (
    <DetailBlock title="Itinerary">
      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <li key={step.label} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                  {i + 1}
                </span>
                {!isLast && <span className="w-px flex-1 bg-line" aria-hidden="true" />}
              </div>
              <div className={isLast ? "pb-0" : "pb-8"}>
                <span className="text-overline text-primary">{step.label}</span>
                <h3 className="mt-1 text-base font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm text-body">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </DetailBlock>
  );
}
