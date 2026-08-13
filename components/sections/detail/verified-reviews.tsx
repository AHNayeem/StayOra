"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { BadgeCheck, Flag, MessageSquareReply, ThumbsUp } from "lucide-react";
import { reviewService } from "@/features/dashboard/domain";
import { useCustomerEmail, useDomainValue } from "@/features/booking";
import { useLocale } from "@/features/i18n";
import { Avatar } from "@/components/ui/avatar";
import { RatingStars } from "@/components/ui/rating-stars";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { controlClasses } from "@/components/ui/field";
import { DetailBlock } from "./detail-block";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * Verified-stay reviews for a listing.
 *
 * Every review here is attached to a completed booking — the domain refuses to
 * create one otherwise — so the "verified stay" badge is a fact, not a label.
 * Moderation, the property's reply and reports all read and write the same
 * records the dashboard's review queue works from.
 */
export function VerifiedReviews({ listingSlug }: { listingSlug: string }) {
  const { date } = useLocale();
  const email = useCustomerEmail();
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [showAll, setShowAll] = useState(false);

  const reviews = useDomainValue(() => reviewService.forListing(listingSlug), [listingSlug]);
  const summary = useDomainValue(() => reviewService.summary(listingSlug), [listingSlug]);

  if (reviews.length === 0) return null;

  const maxCount = Math.max(1, ...summary.distribution);
  const visible = showAll ? reviews : reviews.slice(0, 4);

  return (
    <DetailBlock
      title="Verified guest reviews"
      description={`${summary.average.toFixed(1)} average from ${summary.count} stay${
        summary.count === 1 ? "" : "s"
      } booked on Otithee`}
    >
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-5">
          <div className="rounded-panel border border-line bg-surface-muted p-6 text-center">
            <p className="text-5xl font-bold text-ink">{summary.average.toFixed(1)}</p>
            <RatingStars value={summary.average} size="md" className="mt-2 justify-center" />
            <p className="mt-2 text-sm text-muted">{summary.count} verified reviews</p>

            <ul className="mt-5 flex flex-col gap-2 text-left">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary.distribution[stars - 1] ?? 0;
                return (
                  <li key={stars} className="flex items-center gap-2 text-xs text-muted">
                    <span className="w-3 text-right tabular-nums">{stars}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-line">
                      <span
                        className="block h-full w-(--bar) rounded-pill bg-accent"
                        style={{ "--bar": `${(count / maxCount) * 100}%` } as CSSProperties}
                      />
                    </span>
                    <span className="w-8 tabular-nums">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-panel border border-line bg-surface p-5">
            <p className="text-sm font-semibold text-ink">What guests rate</p>
            <ul className="mt-3 space-y-2.5">
              {summary.aspects
                .filter((aspect) => aspect.score > 0)
                .map((aspect) => (
                  <li key={aspect.aspect}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-body">{aspect.label}</span>
                      <span className="font-semibold text-ink tabular-nums">
                        {aspect.score.toFixed(1)}
                      </span>
                    </div>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-pill bg-line">
                      <span
                        className="block h-full w-(--bar) rounded-pill bg-primary"
                        style={{ "--bar": `${(aspect.score / 5) * 100}%` } as CSSProperties}
                      />
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        </aside>

        <div className="space-y-5">
          {visible.map((review) => (
            <article key={review.id} className="rounded-card border border-line bg-surface p-5">
              <header className="flex flex-wrap items-start gap-3">
                <Avatar src={review.authorAvatar} name={review.authorName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {review.authorName}
                    {review.verifiedStay && (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <BadgeCheck className="size-3" aria-hidden="true" />
                        Verified stay
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    Stayed {date(review.stayedAt)} · reviewed {date(review.createdAt)}
                  </p>
                </div>
                <RatingStars value={review.rating} size="sm" />
              </header>

              <h3 className="mt-3 text-base font-semibold text-ink">{review.title}</h3>
              <p className="mt-1 text-sm text-body">{review.body}</p>

              {review.photos.length > 0 && (
                <ul className="mt-3 flex gap-2 overflow-x-auto">
                  {review.photos.map((photo) => (
                    <li key={photo.id} className="relative size-24 shrink-0 overflow-hidden rounded-field">
                      <Image
                        src={photo.url}
                        alt={photo.caption ?? ""}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}

              {review.response && (
                <div className="mt-4 rounded-field border-l-2 border-primary bg-surface-muted/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <MessageSquareReply className="size-3.5 text-primary" aria-hidden="true" />
                    Response from {review.response.authorName}
                  </p>
                  <p className="mt-1 text-sm text-body">{review.response.body}</p>
                  <p className="mt-1 text-xs text-muted">{date(review.response.at)}</p>
                </div>
              )}

              <footer className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    reviewService.markHelpful(review.id);
                    toast.success("Thanks — that helps other travellers");
                  }}
                  className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-primary"
                >
                  <ThumbsUp className="size-3.5" aria-hidden="true" />
                  Helpful ({review.helpful})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReporting(review.id);
                    setReason("");
                  }}
                  className="inline-flex items-center gap-1.5 text-muted transition-colors hover:text-danger"
                >
                  <Flag className="size-3.5" aria-hidden="true" />
                  Report
                </button>
              </footer>
            </article>
          ))}

          {reviews.length > visible.length && (
            <Button variant="outline" size="md" onClick={() => setShowAll(true)}>
              Show all {reviews.length} reviews
            </Button>
          )}
        </div>
      </div>

      {reporting && (
        <Modal
          open
          onClose={() => setReporting(null)}
          title="Report this review"
          description="Our moderation team reads every report. Tell us what's wrong with it."
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReporting(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={reason.trim().length < 5}
                onClick={() => {
                  reviewService.report(reporting, email, reason.trim());
                  setReporting(null);
                  toast.success("Report submitted", {
                    description: "A moderator will review it shortly.",
                  });
                }}
              >
                Report review
              </Button>
            </div>
          }
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Why are you reporting it?</span>
            <textarea
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Offensive language, not a real stay, spam…"
              className={cn(controlClasses(false), "resize-none py-2.5")}
            />
          </label>
        </Modal>
      )}
    </DetailBlock>
  );
}
