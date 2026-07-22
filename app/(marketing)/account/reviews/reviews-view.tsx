"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PenLine, Star, Trash2 } from "lucide-react";
import type { ReviewableStay, TravelerReview } from "@/types/traveler";
import { VERTICALS, listingHref } from "@/constants/verticals";
import {
  addReview,
  deleteReview,
  updateReview,
  useAuthoredReviews,
} from "@/features/account/reviews-store";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { RatingStars } from "@/components/ui/rating-stars";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Composer =
  | { mode: "create"; stay: ReviewableStay }
  | { mode: "edit"; review: TravelerReview }
  | null;

export function ReviewsView({ reviewable }: { reviewable: ReviewableStay[] }) {
  const authored = useAuthoredReviews();
  const [composer, setComposer] = useState<Composer>(null);

  const reviewedRefs = useMemo(
    () => new Set(authored.map((r) => r.bookingRef)),
    [authored],
  );
  const pending = useMemo(
    () => reviewable.filter((s) => !reviewedRefs.has(s.bookingRef)),
    [reviewable, reviewedRefs],
  );

  return (
    <div>
      <AccountPageHeader
        title="Reviews"
        description="Share your experience — reviews help other travelers and earn you points."
      />

      {/* Awaiting review */}
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-ink">
            Awaiting your review
            <span className="ml-2 text-sm font-normal text-muted">({pending.length})</span>
          </h2>
          <div className="grid gap-3">
            {pending.map((stay) => (
              <PendingRow
                key={stay.bookingId}
                stay={stay}
                onWrite={() => setComposer({ mode: "create", stay })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Written reviews */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">
          Your reviews
          <span className="ml-2 text-sm font-normal text-muted">({authored.length})</span>
        </h2>

        {authored.length > 0 ? (
          <div className="grid gap-4">
            {authored.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onEdit={() => setComposer({ mode: "edit", review })}
                onDelete={() => {
                  deleteReview(review.id);
                  toast.success("Review deleted");
                }}
              />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <AccountEmpty
            icon={Star}
            title="No reviews yet"
            description="Once you complete a trip you'll be able to review it here."
          />
        ) : (
          <p className="text-body">
            You haven&apos;t written any reviews yet — start with one of the stays above.
          </p>
        )}
      </section>

      {composer && (
        <ReviewComposer composer={composer} onClose={() => setComposer(null)} />
      )}
    </div>
  );
}

function PendingRow({ stay, onWrite }: { stay: ReviewableStay; onWrite: () => void }) {
  const { date } = useLocale();
  return (
    <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-3 shadow-card">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-field">
        <Image src={stay.image} alt={stay.title} fill sizes="64px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-overline text-primary">{VERTICALS[stay.vertical].label}</span>
        <p className="truncate font-semibold text-ink">{stay.title}</p>
        <p className="text-sm text-muted">Stayed {date(stay.stayedAt)}</p>
      </div>
      <Button variant="primary" size="sm" onClick={onWrite}>
        <PenLine className="size-4" aria-hidden="true" />
        Review
      </Button>
    </div>
  );
}

function ReviewCard({
  review,
  onEdit,
  onDelete,
}: {
  review: TravelerReview;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { date } = useLocale();
  return (
    <article className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex gap-3">
        <Link
          href={listingHref({ vertical: review.vertical, slug: review.listingSlug })}
          className="relative size-14 shrink-0 overflow-hidden rounded-field"
        >
          <Image
            src={review.listingImage}
            alt={review.listingTitle}
            fill
            sizes="56px"
            className="object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={listingHref({ vertical: review.vertical, slug: review.listingSlug })}
                className="truncate font-semibold text-ink hover:text-primary"
              >
                {review.listingTitle}
              </Link>
              <div className="mt-0.5 flex items-center gap-2">
                <RatingStars value={review.rating} size="sm" />
                <span className="text-xs text-muted">
                  {date(review.updatedAt ?? review.createdAt)}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                onClick={onEdit}
                aria-label="Edit review"
                className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-primary"
              >
                <PenLine className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label="Delete review"
                className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <h3 className="mt-3 font-semibold text-ink">{review.title}</h3>
      <p className="mt-1 text-sm text-body">{review.body}</p>

      {review.helpfulCount > 0 && (
        <p className="mt-2 text-xs text-muted">{review.helpfulCount} found this helpful</p>
      )}

      {review.response && (
        <div className="mt-3 rounded-field bg-surface-muted/60 p-3">
          <p className="text-xs font-semibold text-ink">
            Response from {review.response.author}
          </p>
          <p className="mt-1 text-sm text-body">{review.response.body}</p>
        </div>
      )}
    </article>
  );
}

function ReviewComposer({ composer, onClose }: { composer: NonNullable<Composer>; onClose: () => void }) {
  const existing = composer.mode === "edit" ? composer.review : null;
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");

  const listingTitle =
    composer.mode === "edit" ? composer.review.listingTitle : composer.stay.title;

  const canSubmit = title.trim().length > 0 && body.trim().length >= 10;

  const onSubmit = () => {
    if (!canSubmit) return;
    if (composer.mode === "edit") {
      updateReview(composer.review.id, {
        rating,
        title: title.trim(),
        body: body.trim(),
        updatedAt: new Date().toISOString(),
      });
      toast.success("Review updated");
    } else {
      const { stay } = composer;
      addReview({
        id: `rvw_${Date.now().toString(36)}`,
        listingId: stay.listingId,
        listingSlug: stay.listingSlug,
        vertical: stay.vertical,
        listingTitle: stay.title,
        listingImage: stay.image,
        bookingRef: stay.bookingRef,
        rating,
        title: title.trim(),
        body: body.trim(),
        createdAt: new Date().toISOString(),
        helpfulCount: 0,
      });
      toast.success("Review published", { description: "You earned 50 reward points." });
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={composer.mode === "edit" ? "Edit review" : "Write a review"}
      description={listingTitle}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={!canSubmit}>
            {composer.mode === "edit" ? "Save changes" : "Publish review"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Your rating</label>
          <StarInput value={rating} onChange={setRating} />
        </div>
        <div>
          <label htmlFor="review-title" className="mb-1.5 block text-sm font-medium text-ink">
            Title
          </label>
          <input
            id="review-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sum up your experience"
            maxLength={80}
            className="h-11 w-full rounded-field border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25"
          />
        </div>
        <div>
          <label htmlFor="review-body" className="mb-1.5 block text-sm font-medium text-ink">
            Your review
          </label>
          <textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="What did you like? What could be better?"
            className="w-full rounded-field border border-line bg-surface p-3.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25"
          />
          <p className="mt-1 text-xs text-muted">Minimum 10 characters.</p>
        </div>
      </div>
    </Modal>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={value === n}
          className="p-0.5"
        >
          <Star
            className={cn(
              "size-7 transition-colors",
              n <= active ? "fill-accent text-accent" : "text-line",
            )}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}
