import type { CSSProperties } from "react";
import type { Review } from "@/types/booking";
import type { ReviewSummary } from "@/types/detail";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "@/components/ui/rating-stars";
import { fromISODate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { DetailBlock } from "./detail-block";

interface DetailReviewsProps {
  summary: ReviewSummary;
  reviews: Review[];
}

/** "May 2026" style month/year label from an ISO date string. */
function formatReviewDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/**
 * DetailReviews — a review summary card (average score + per-star breakdown bars)
 * beside the individual guest reviews. Read-only; submission is out of scope for
 * the template.
 */
export function DetailReviews({ summary, reviews }: DetailReviewsProps) {
  const maxCount = Math.max(1, ...summary.breakdown.map((b) => b.count));

  return (
    <DetailBlock
      title="Guest reviews"
      description={
        summary.total > 0
          ? `${summary.average.toFixed(1)} average from ${summary.total.toLocaleString()} verified reviews`
          : undefined
      }
    >
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-panel border border-line bg-surface-muted p-6 text-center">
          <p className="text-5xl font-bold text-ink">{summary.average.toFixed(1)}</p>
          <RatingStars value={summary.average} size="md" className="mt-2 justify-center" />
          <p className="mt-2 text-sm text-muted">
            {summary.total.toLocaleString()} reviews
          </p>

          <ul className="mt-5 flex flex-col gap-2 text-left">
            {summary.breakdown.map((row) => (
              <li key={row.stars} className="flex items-center gap-2 text-xs text-muted">
                <span className="w-3 text-right tabular-nums">{row.stars}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-line">
                  <span
                    className="block h-full w-(--bar) rounded-pill bg-accent"
                    style={{ "--bar": `${(row.count / maxCount) * 100}%` } as CSSProperties}
                  />
                </span>
                <span className="w-8 tabular-nums">{row.count}</span>
              </li>
            ))}
          </ul>
        </aside>

        <ul className="flex flex-col gap-5">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-card border border-line bg-surface p-5"
            >
              <div className="flex items-center gap-3">
                <Avatar src={review.avatar} name={review.author} size="md" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{review.author}</p>
                  {review.location && (
                    <p className="truncate text-xs text-muted">{review.location}</p>
                  )}
                </div>
                <span className="ml-auto text-xs text-muted">
                  {formatReviewDate(review.date)}
                </span>
              </div>
              <RatingStars value={review.rating} size="sm" className="mt-3" />
              <p className={cn("mt-2 text-sm text-body")}>{review.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </DetailBlock>
  );
}
