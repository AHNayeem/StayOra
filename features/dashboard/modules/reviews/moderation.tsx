"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  CheckCircle2,
  Flag,
  MessageSquareReply,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import { reviewService, type PlatformReview } from "../../domain";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { useDomainValue } from "@/features/booking";
import { Can } from "../../rbac/permission-guard";
import {
  Button,
  EmptyState,
  Modal,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  type StatusTone,
} from "../../ui";
import { formatDate } from "../../lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const STATUS_META: Record<PlatformReview["status"], { label: string; tone: StatusTone }> = {
  pending: { label: "Awaiting moderation", tone: "warning" },
  published: { label: "Published", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  removed: { label: "Taken down", tone: "neutral" },
};

type Queue = "pending" | "reported" | "awaiting_reply" | "all";

/**
 * Review moderation.
 *
 * Every review in this queue is attached to a completed booking — the domain
 * will not create one otherwise — so moderation is about tone and policy, not
 * about whether the stay happened. Approving one publishes it on the listing
 * page immediately, and the reply written here appears under it.
 */
export function ReviewModeration() {
  const scope = useDomainScope();
  const actor = useDomainActor();
  const [queue, setQueue] = useState<Queue>("pending");
  const [replyTo, setReplyTo] = useState<PlatformReview | null>(null);
  const [rejecting, setRejecting] = useState<PlatformReview | null>(null);

  const reviews = useDomainValue(
    () => reviewService.all({ merchantId: scope.merchantId }),
    [scope.merchantId],
  );
  const counts = useDomainValue(
    () => reviewService.counts({ merchantId: scope.merchantId }),
    [scope.merchantId],
  );

  const filtered = useMemo(() => {
    switch (queue) {
      case "pending":
        return reviews.filter((r) => r.status === "pending");
      case "reported":
        return reviews.filter((r) => r.reports.length > 0);
      case "awaiting_reply":
        return reviews.filter((r) => r.status === "published" && !r.response);
      default:
        return reviews;
    }
  }, [reviews, queue]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Awaiting moderation" value={String(counts.pending)} icon="ShieldAlert" />
        <StatCard label="Published" value={String(counts.published)} icon="Star" />
        <StatCard label="Reported" value={String(counts.reported)} icon="Flag" />
        <StatCard label="Awaiting reply" value={String(counts.awaitingReply)} icon="MessageSquare" />
      </div>

      <Panel>
        <PanelHeader
          title="Moderation queue"
          description={`${filtered.length} review${filtered.length === 1 ? "" : "s"}`}
          actions={
            <Select
              aria-label="Queue"
              value={queue}
              onChange={(event) => setQueue(event.target.value as Queue)}
              options={[
                { value: "pending", label: "Awaiting moderation" },
                { value: "reported", label: "Reported" },
                { value: "awaiting_reply", label: "Awaiting reply" },
                { value: "all", label: "All reviews" },
              ]}
              wrapperClassName="w-52"
            />
          }
        />
        <PanelBody className="space-y-4">
          {filtered.length === 0 ? (
            <EmptyState
              title="Queue is clear"
              description="Nothing needs your attention in this view."
            />
          ) : (
            filtered.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onApprove={() => {
                  reviewService.moderate(review.id, "published", actor);
                  toast.success("Review published", { description: review.listingTitle });
                }}
                onReject={() => setRejecting(review)}
                onTakedown={() => {
                  reviewService.moderate(review.id, "removed", actor, "Taken down after report");
                  toast.success("Review taken down");
                }}
                onReply={() => setReplyTo(review)}
              />
            ))
          )}
        </PanelBody>
      </Panel>

      {rejecting && (
        <RejectDialog
          review={rejecting}
          onClose={() => setRejecting(null)}
          onConfirm={(note) => {
            reviewService.moderate(rejecting.id, "rejected", actor, note);
            setRejecting(null);
            toast.success("Review rejected", { description: "The author has been told why." });
          }}
        />
      )}

      {replyTo && (
        <ReplyDialog
          review={replyTo}
          onClose={() => setReplyTo(null)}
          onConfirm={(body) => {
            reviewService.reply(replyTo.id, replyTo.merchantName, body);
            setReplyTo(null);
            toast.success("Reply published under the review");
          }}
        />
      )}
    </div>
  );
}

function ReviewCard({
  review,
  onApprove,
  onReject,
  onTakedown,
  onReply,
}: {
  review: PlatformReview;
  onApprove: () => void;
  onReject: () => void;
  onTakedown: () => void;
  onReply: () => void;
}) {
  const meta = STATUS_META[review.status];

  return (
    <article className="rounded-card border border-line p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
            {review.listingTitle}
            <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <BadgeCheck className="size-3" aria-hidden="true" />
              Verified stay
            </span>
          </p>
          <p className="text-xs text-muted">
            {review.authorName} · {review.bookingRef} · {formatDate(review.createdAt)} ·{" "}
            {review.merchantName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink">
            <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
            {review.rating.toFixed(1)}
          </span>
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
        </div>
      </header>

      <h3 className="mt-3 text-base font-semibold text-ink">{review.title}</h3>
      <p className="mt-1 text-sm text-body">{review.body}</p>

      {review.photos.length > 0 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto">
          {review.photos.map((photo) => (
            <li key={photo.id} className="relative size-20 shrink-0 overflow-hidden rounded-field">
              <Image src={photo.url} alt="" fill sizes="80px" className="object-cover" />
            </li>
          ))}
        </ul>
      )}

      {review.reports.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-field border border-danger/25 bg-danger/8 p-3 text-xs text-danger">
          {review.reports.map((report, index) => (
            <li key={index} className="flex items-start gap-1.5">
              <Flag className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              {report.reason} — reported by {report.by} on {formatDate(report.at)}
            </li>
          ))}
        </ul>
      )}

      {review.response && (
        <div className="mt-3 rounded-field border-l-2 border-primary bg-surface-muted/60 p-3">
          <p className="text-xs font-semibold text-ink">
            {review.response.authorName} replied {formatDate(review.response.at)}
          </p>
          <p className="mt-1 text-sm text-body">{review.response.body}</p>
        </div>
      )}

      {review.moderation && (
        <p className="mt-3 text-xs text-muted">
          Moderated by {review.moderation.by} on {formatDate(review.moderation.at)}
          {review.moderation.note ? ` — ${review.moderation.note}` : ""}
        </p>
      )}

      <Can anyPermission={["reviews:update"]}>
        <footer className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
          {review.status === "pending" && (
            <>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckCircle2 className="size-4" />}
                onClick={onApprove}
              >
                Approve & publish
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<XCircle className="size-4" />}
                onClick={onReject}
              >
                Reject
              </Button>
            </>
          )}
          {review.status === "published" && (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<MessageSquareReply className="size-4" />}
                onClick={onReply}
              >
                {review.response ? "Edit reply" : "Reply as property"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="size-4" />}
                onClick={onTakedown}
                className="text-danger"
              >
                Take down
              </Button>
            </>
          )}
          {(review.status === "rejected" || review.status === "removed") && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCircle2 className="size-4" />}
              onClick={onApprove}
            >
              Restore & publish
            </Button>
          )}
          <Link
            href={`/dashboard/bookings/${review.bookingId}`}
            className={cn(
              "ml-auto inline-flex items-center text-sm font-medium text-primary hover:underline",
            )}
          >
            View booking {review.bookingRef}
          </Link>
        </footer>
      </Can>
    </article>
  );
}

function RejectDialog({
  review,
  onClose,
  onConfirm,
}: {
  review: PlatformReview;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title="Reject this review"
      description={`${review.authorName} will be told why it wasn't published.`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={note.trim().length < 5} onClick={() => onConfirm(note.trim())}>
            Reject review
          </Button>
        </div>
      }
    >
      <Textarea
        label="Reason"
        rows={4}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Offensive language, not about this property, contains personal data…"
      />
    </Modal>
  );
}

function ReplyDialog({
  review,
  onClose,
  onConfirm,
}: {
  review: PlatformReview;
  onClose: () => void;
  onConfirm: (body: string) => void;
}) {
  const [body, setBody] = useState(review.response?.body ?? "");
  return (
    <Modal
      open
      onClose={onClose}
      title={`Reply as ${review.merchantName}`}
      description="Your reply appears publicly under the review."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={body.trim().length < 10}
            onClick={() => onConfirm(body.trim())}
          >
            Publish reply
          </Button>
        </div>
      }
    >
      <p className="mb-3 rounded-field bg-surface-muted/60 p-3 text-sm text-body">
        <strong className="text-ink">{review.title}</strong>
        <br />
        {review.body}
      </p>
      <Textarea
        label="Your reply"
        rows={5}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Thank them, address the specific point, say what you've changed."
      />
    </Modal>
  );
}
