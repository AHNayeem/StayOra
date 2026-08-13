"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Clock, MessageSquareReply, PenLine, Star, XCircle } from "lucide-react";
import { VERTICALS, listingHref } from "@/constants/verticals";
import {
  ASPECT_LABELS,
  REVIEW_ASPECTS,
  reviewService,
  type Booking,
  type PlatformReview,
  type ReviewAspect,
} from "@/features/dashboard/domain";
import {
  bookingVertical,
  useCustomerReviews,
  useReviewInvitations,
} from "@/features/booking";
import { useAuth } from "@/features/auth";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { RatingStars } from "@/components/ui/rating-stars";
import { StatusBadge, type StatusTone } from "@/components/account/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { controlClasses } from "@/components/ui/field";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const STATUS_META: Record<PlatformReview["status"], { label: string; tone: StatusTone }> = {
  pending: { label: "In moderation", tone: "warning" },
  published: { label: "Published", tone: "success" },
  rejected: { label: "Not published", tone: "danger" },
  removed: { label: "Removed", tone: "neutral" },
};

/**
 * Reviews — write-ups the traveller has left, and prompts for stays they can
 * still review.
 *
 * Eligibility is enforced by the domain: only a completed booking can be
 * reviewed, and only once. That is why every review carries a verified-stay
 * badge, and why a new review starts in moderation rather than going straight
 * live — the same queue the platform's content team works.
 */
export function ReviewsView() {
  const invitations = useReviewInvitations();
  const reviews = useCustomerReviews();
  const [composing, setComposing] = useState<Booking | null>(null);

  return (
    <div>
      <AccountPageHeader
        title="Reviews"
        description="Share your experience — reviews help other travellers and earn you points."
      />

      {invitations.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-ink">
            Awaiting your review
            <span className="ml-2 text-sm font-normal text-muted">({invitations.length})</span>
          </h2>
          <div className="grid gap-3">
            {invitations.map((booking) => (
              <PendingRow
                key={booking.id}
                booking={booking}
                onWrite={() => setComposing(booking)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">
          Your reviews
          <span className="ml-2 text-sm font-normal text-muted">({reviews.length})</span>
        </h2>

        {reviews.length === 0 ? (
          <AccountEmpty
            icon={Star}
            title="No reviews yet"
            description="Once a trip is complete you'll be able to review it here."
          />
        ) : (
          <ul className="grid gap-3">
            {reviews.map((review) => (
              <li key={review.id}>
                <ReviewRow review={review} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {composing && (
        <ReviewComposer booking={composing} onClose={() => setComposing(null)} />
      )}
    </div>
  );
}

function PendingRow({ booking, onWrite }: { booking: Booking; onWrite: () => void }) {
  const { date } = useLocale();
  const vertical = bookingVertical(booking);
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card">
      {booking.listing && (
        <div className="relative size-16 shrink-0 overflow-hidden rounded-field">
          <Image src={booking.listing.image} alt="" fill sizes="64px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="text-overline text-primary">{VERTICALS[vertical].label}</span>
        <p className="truncate font-medium text-ink">{booking.productTitle}</p>
        <p className="text-xs text-muted">
          Stayed {date(booking.endAt)} · {booking.reference}
        </p>
      </div>
      <Button variant="primary" size="sm" onClick={onWrite}>
        <PenLine className="size-4" aria-hidden="true" />
        Write a review
      </Button>
    </div>
  );
}

function ReviewRow({ review }: { review: PlatformReview }) {
  const { date } = useLocale();
  const meta = STATUS_META[review.status];
  return (
    <article className="rounded-card border border-line bg-surface p-5 shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={listingHref({ vertical: review.vertical, slug: review.listingSlug })}
            className="truncate font-medium text-ink hover:text-primary"
          >
            {review.listingTitle}
          </Link>
          <p className="text-xs text-muted">
            {review.bookingRef} · {date(review.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RatingStars value={review.rating} size="sm" />
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>
      </header>

      <h3 className="mt-3 text-base font-semibold text-ink">{review.title}</h3>
      <p className="mt-1 text-sm text-body">{review.body}</p>

      {review.status === "pending" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
          <Clock className="size-3.5" aria-hidden="true" />
          A moderator is checking this before it goes live.
        </p>
      )}
      {review.status === "rejected" && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-danger">
          <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {review.moderation?.note ??
            "This didn't meet our review guidelines, so it wasn't published."}
        </p>
      )}
      {review.verifiedStay && review.status === "published" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
          <BadgeCheck className="size-3.5" aria-hidden="true" />
          Published as a verified stay
        </p>
      )}

      {review.response && (
        <div className="mt-4 rounded-field border-l-2 border-primary bg-surface-muted/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <MessageSquareReply className="size-3.5 text-primary" aria-hidden="true" />
            {review.response.authorName} replied
          </p>
          <p className="mt-1 text-sm text-body">{review.response.body}</p>
        </div>
      )}
    </article>
  );
}

function ReviewComposer({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { user } = useAuth();
  const [aspects, setAspects] = useState<Partial<Record<ReviewAspect, number>>>({
    cleanliness: 5,
    location: 5,
    service: 5,
    value: 4,
    comfort: 5,
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const eligibility = reviewService.eligibility(booking);
  const vertical = bookingVertical(booking);

  const submit = () => {
    setBusy(true);
    try {
      reviewService.create({
        booking,
        listingId: booking.listing?.id ?? `lst_${booking.id}`,
        listingSlug: booking.listing?.slug ?? "",
        vertical,
        authorName: user?.name ?? booking.customer.name,
        authorAvatar: user?.avatar,
        title: title.trim(),
        body: body.trim(),
        aspects,
      });
      onClose();
      toast.success("Thanks for your review", {
        description: "It'll appear on the listing once a moderator approves it.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Review ${booking.productTitle}`}
      description={`Booking ${booking.reference} · your review will be marked as a verified stay.`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!eligibility.eligible || title.trim().length < 3 || body.trim().length < 20}
            onClick={submit}
          >
            Submit review
          </Button>
        </div>
      }
    >
      {!eligibility.eligible ? (
        <p className="text-sm text-danger">{eligibility.reason}</p>
      ) : (
        <div className="grid gap-4">
          <fieldset>
            <legend className="text-sm font-medium text-ink">Rate your stay</legend>
            <ul className="mt-2 space-y-2">
              {REVIEW_ASPECTS.map((aspect) => (
                <li key={aspect} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-body">{ASPECT_LABELS[aspect]}</span>
                  <span className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        aria-label={`${ASPECT_LABELS[aspect]}: ${score} of 5`}
                        aria-pressed={(aspects[aspect] ?? 0) >= score}
                        onClick={() => setAspects((prev) => ({ ...prev, [aspect]: score }))}
                        className="p-0.5"
                      >
                        <Star
                          className={cn(
                            "size-5 transition-colors",
                            (aspects[aspect] ?? 0) >= score
                              ? "fill-accent text-accent"
                              : "text-line",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Headline</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Sum up your stay in a few words"
              maxLength={80}
              className={cn(controlClasses(false), "h-11")}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Your review</span>
            <textarea
              rows={5}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What stood out? What would you tell a friend before they book?"
              className={cn(controlClasses(false), "resize-none py-2.5")}
            />
            <span className="text-xs text-muted">{body.trim().length}/20 characters minimum</span>
          </label>
        </div>
      )}
    </Modal>
  );
}
