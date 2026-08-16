"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CircleDashed,
  CreditCard,
  Loader,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import type { AIBlock, AIBookingSession, AIProgressStep, AIUserAction } from "@/types/ai";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";
import { AiText } from "./ai-text";
import { BlockShell } from "./block-shell";
import { ListingBlock } from "./listing-block";

/**
 * Booking blocks — the visible half of the booking state machine.
 *
 * Each one renders exactly one state, so the traveller can always tell which of
 * "we're looking", "you need to decide" and "it's done" they are in. That
 * distinction is the difference between a chatbot that says "booked!" and a
 * product someone can trust with a card.
 */

type Block<K extends AIBlock["kind"]> = Extract<AIBlock, { kind: K }>;

export interface BlockActionProps {
  /** Raise a structured action on the traveller's behalf. */
  onAction?: (action: AIUserAction, label: string) => void;
  disabled?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

/** The agent's working, shown as steps rather than a spinner. */
export function ProgressTrail({ steps }: { steps: AIProgressStep[] }) {
  return (
    <ol className="space-y-1.5">
      {steps.map((step, index) => (
        <li key={`${step.label}-${index}`} className="flex items-center gap-2 text-xs">
          <StepIcon status={step.status} />
          <span
            className={cn(
              step.status === "pending" && "text-muted",
              step.status === "failed" && "text-danger",
              step.status === "done" && "text-body",
              step.status === "active" && "font-semibold text-ink",
            )}
          >
            {step.label}
          </span>
          {step.detail && (
            // Step details carry money tokens ("Taking payment · {{usd:412}}"),
            // so they resolve through the same currency formatter as the prose.
            <span className="text-muted">
              · <AiText text={step.detail} />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function StepIcon({ status }: { status: AIProgressStep["status"] }) {
  if (status === "done") return <Check className="size-3.5 shrink-0 text-success" aria-hidden="true" />;
  if (status === "failed") return <X className="size-3.5 shrink-0 text-danger" aria-hidden="true" />;
  if (status === "active") {
    return <Loader className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden="true" />;
  }
  return <CircleDashed className="size-3.5 shrink-0 text-muted" aria-hidden="true" />;
}

export function BookingProgressBlock({ block }: { block: Block<"booking-progress"> }) {
  return (
    <BlockShell title={block.title}>
      <div className="p-4">
        <ProgressTrail steps={block.steps} />
      </div>
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Review                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The confirmation gate.
 *
 * Everything financially consequential is on screen *before* the button: dates,
 * guests, the room and rate, every price line, the cancellation policy, the
 * restrictions and the card. Nothing is charged until this button is pressed.
 */
export function BookingReviewBlock({
  block,
  onAction,
  disabled,
}: { block: Block<"booking-review"> } & BlockActionProps) {
  const { money } = useLocale();
  const { session } = block;
  const quote = session.quote;

  return (
    <BlockShell title="Review your booking — nothing charged yet">
      <SessionHeader session={session} />

      {quote && (
        <>
          <dl className="divide-y divide-line border-t border-line text-sm">
            {quote.lines.map((line, index) => (
              <div key={`${line.label}-${index}`} className="flex items-baseline justify-between gap-3 px-4 py-2">
                <dt className="min-w-0 text-body">
                  {line.label}
                  {line.detail && <span className="block text-xs text-muted">{line.detail}</span>}
                </dt>
                <dd
                  className={cn(
                    "shrink-0 font-medium",
                    line.kind === "discount" ? "text-success" : "text-ink",
                  )}
                >
                  {money(line.amountUsd)}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3 bg-surface-muted px-4 py-3">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="text-base font-bold text-accent-600">{money(quote.totalUsd)}</dd>
            </div>
          </dl>

          <div className="space-y-2 border-t border-line px-4 py-3 text-xs text-body">
            <p className="flex gap-2">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
              {quote.cancellationPolicy}
            </p>
            {quote.restrictions.map((restriction) => (
              <p key={restriction} className="flex gap-2 text-warning-700">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {restriction}
              </p>
            ))}
            {session.payment && (
              <p className="flex gap-2">
                <CreditCard className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
                Paying with {session.payment.label}
              </p>
            )}
            {session.contact && (
              <p className="flex gap-2">
                <Users className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
                {session.contact.fullName} · {session.contact.email}
              </p>
            )}
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 border-t border-line p-4 sm:flex-row">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction?.({ kind: "confirm-booking" }, "Confirm booking")}
          className="flex h-11 flex-1 items-center justify-center rounded-pill bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-50"
        >
          {block.confirmLabel} · {quote ? money(quote.totalUsd) : ""}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction?.({ kind: "abandon-booking" }, "Not right now")}
          className="flex h-11 items-center justify-center rounded-pill border border-line px-6 text-sm font-semibold text-body transition-colors hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-50"
        >
          Not now
        </button>
      </div>
    </BlockShell>
  );
}

/** Shared summary strip: what, when, who. */
function SessionHeader({ session }: { session: AIBookingSession }) {
  const { date } = useLocale();
  const { subject, selection } = session;
  return (
    <div className="flex gap-3 p-4">
      {subject.image && (
        <Link
          href={subject.href}
          className="relative size-20 shrink-0 overflow-hidden rounded-field bg-surface-muted"
        >
          <Image src={subject.image} alt={subject.title} fill sizes="80px" className="object-cover" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <Link href={subject.href} className="line-clamp-2 text-sm font-semibold text-ink hover:text-primary">
          {subject.title}
        </Link>
        {subject.location && <p className="truncate text-xs text-muted">{subject.location}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-body">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {date(selection.checkIn, { month: "short", day: "numeric" })}
            {selection.checkOut !== selection.checkIn && (
              <> – {date(selection.checkOut, { month: "short", day: "numeric" })}</>
            )}
            {selection.nights > 0 && ` · ${selection.nights} night${selection.nights > 1 ? "s" : ""}`}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden="true" />
            {selection.guests} {selection.guests === 1 ? "guest" : "guests"}
          </span>
        </p>
        {session.selection.roomTypeName && (
          <p className="mt-1 text-xs text-muted">
            {session.selection.roomTypeName}
            {session.selection.ratePlanName && ` · ${session.selection.ratePlanName}`}
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Confirmation                                                                */
/* -------------------------------------------------------------------------- */

export function BookingConfirmationBlock({ block }: { block: Block<"booking-confirmation"> }) {
  const { money } = useLocale();
  const { session } = block;

  return (
    <BlockShell className="border-success/40" title={undefined}>
      <div className="flex items-center gap-3 border-b border-line bg-success/5 px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/15 text-success">
          <Check className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Booking confirmed</p>
          <p className="truncate text-xs text-muted">Reference {session.reference}</p>
        </div>
      </div>

      <SessionHeader session={session} />

      {session.quote && (
        <dl className="divide-y divide-line border-t border-line text-sm">
          <div className="flex items-baseline justify-between gap-3 px-4 py-2">
            <dt className="text-body">Paid</dt>
            <dd className="font-semibold text-ink">{money(session.quote.totalUsd)}</dd>
          </div>
          {session.payment && (
            <div className="flex items-baseline justify-between gap-3 px-4 py-2">
              <dt className="text-body">Payment method</dt>
              <dd className="font-medium text-ink">{session.payment.label}</dd>
            </div>
          )}
        </dl>
      )}

      <p className="flex gap-2 border-t border-line px-4 py-3 text-xs text-body">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
        {session.quote?.cancellationPolicy}
      </p>

      <div className="border-t border-line p-4">
        <Link
          href={block.manageHref}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-pill bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          View booking
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Failures                                                                    */
/* -------------------------------------------------------------------------- */

export function BookingErrorBlock({
  block,
  onAction,
  disabled,
}: { block: Block<"booking-error"> } & BlockActionProps) {
  const { failure } = block;
  return (
    <section className="overflow-hidden rounded-card border border-danger/30 bg-danger/5">
      <div className="flex items-start gap-3 px-4 py-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{failure.title}</p>
          <p className="mt-0.5 text-sm text-body">{failure.message}</p>
          {failure.details && failure.details.length > 1 && (
            <ul className="mt-2 list-disc space-y-0.5 ps-4 text-xs text-body">
              {failure.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {failure.recoverable && block.session && (
        <div className="flex flex-wrap gap-2 border-t border-danger/20 px-4 py-3">
          {failure.code === "payment_failed" && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAction?.({ kind: "select-payment", methodId: "" }, "Use a different card")}
              className="rounded-pill bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              Use a different card
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onAction?.({ kind: "abandon-booking" }, "Stop this booking")}
            className="rounded-pill border border-line px-4 py-2 text-xs font-semibold text-body transition-colors hover:bg-surface disabled:opacity-50"
          >
            Stop this booking
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * The price-change gate.
 *
 * Shows both numbers, side by side, and re-asks. Silently booking at the new
 * price would be the single worst thing this assistant could do.
 */
export function PriceChangeBlock({
  block,
  onAction,
  disabled,
}: { block: Block<"price-change"> } & BlockActionProps) {
  const { money } = useLocale();
  const { revalidation } = block;
  const up = revalidation.deltaUsd > 0;

  return (
    <BlockShell className="border-warning/40" title="The price changed since your search">
      <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
        <div className="px-4 py-3">
          <p className="text-xs text-muted">Previous price</p>
          <p className="text-sm font-semibold text-body line-through">
            {money(revalidation.previousTotalUsd)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted">Updated price</p>
          <p className={cn("flex items-center gap-1 text-base font-bold", up ? "text-danger" : "text-success")}>
            {up ? (
              <TrendingUp className="size-4" aria-hidden="true" />
            ) : (
              <TrendingDown className="size-4" aria-hidden="true" />
            )}
            {money(revalidation.currentTotalUsd)}
          </p>
        </div>
      </div>

      <p className="px-4 py-3 text-xs text-body">
        {up
          ? `That's ${money(Math.abs(revalidation.deltaUsd))} more than when I quoted you. I won't book it until you confirm the new total.`
          : `That's ${money(Math.abs(revalidation.deltaUsd))} less than when I quoted you — but I still need your go-ahead for the new total.`}
      </p>

      <div className="flex flex-col gap-2 border-t border-line p-4 sm:flex-row">
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onAction?.({ kind: "accept-price-change" }, `Book it at ${money(revalidation.currentTotalUsd)}`)
          }
          className="flex h-11 flex-1 items-center justify-center rounded-pill bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
        >
          Review updated price
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction?.({ kind: "abandon-booking" }, "Cancel this booking")}
          className="flex h-11 items-center justify-center rounded-pill border border-line px-6 text-sm font-semibold text-body transition-colors hover:bg-surface-muted disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </BlockShell>
  );
}

/** The item is gone — say so plainly, then offer real alternatives. */
export function AvailabilityChangeBlock({
  block,
  onAsk,
}: {
  block: Block<"availability-change">;
  onAsk?: (prompt: string) => void;
}) {
  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-card border border-warning/40 bg-warning/5 px-4 py-3">
        <p className="flex items-start gap-2 text-sm text-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-700" aria-hidden="true" />
          <span>
            <strong className="font-semibold">{block.session.subject.title}</strong> is no longer
            bookable for these dates.
            {block.result.blockers[0] ? ` ${block.result.blockers[0].message}` : ""} Nothing was
            charged.
          </span>
        </p>
      </section>

      {block.alternatives.length > 0 && (
        <ListingBlock
          block={{
            kind: "listings",
            title: "Available instead",
            vertical: block.alternatives[0].listing.vertical,
            items: block.alternatives,
            comparable: block.alternatives.length >= 2,
          }}
          onAsk={onAsk}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Cancellation and existing bookings                                          */
/* -------------------------------------------------------------------------- */

export function CancellationBlock({
  block,
  onAction,
  disabled,
}: { block: Block<"cancellation"> } & BlockActionProps) {
  const { money } = useLocale();
  const { quote, booking } = block;
  const cancelled = booking.status === "cancelled";

  return (
    <BlockShell title={cancelled ? "Booking cancelled" : "Cancellation quote"}>
      <div className="px-4 py-3">
        <p className="text-sm font-semibold text-ink">{booking.title}</p>
        <p className="text-xs text-muted">
          {booking.reference} · {booking.startDate}
          {booking.endDate ? ` → ${booking.endDate}` : ""}
        </p>
      </div>
      <dl className="divide-y divide-line border-t border-line text-sm">
        <div className="flex items-baseline justify-between gap-3 px-4 py-2">
          <dt className="text-body">Paid</dt>
          <dd className="font-medium text-ink">{money(booking.totalUsd)}</dd>
        </div>
        {quote.feeUsd > 0 && (
          <div className="flex items-baseline justify-between gap-3 px-4 py-2">
            <dt className="text-body">Cancellation fee</dt>
            <dd className="font-medium text-danger">−{money(quote.feeUsd)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 bg-surface-muted px-4 py-3">
          <dt className="font-semibold text-ink">Refund</dt>
          <dd className="text-base font-bold text-success">{money(quote.refundUsd)}</dd>
        </div>
      </dl>
      <p className="border-t border-line px-4 py-3 text-xs text-body">{quote.policy}</p>

      {!cancelled && (
        <div className="flex flex-col gap-2 border-t border-line p-4 sm:flex-row">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onAction?.(
                { kind: "cancel-booking", bookingId: quote.bookingId, confirmed: true },
                `Yes, cancel ${quote.reference}`,
              )
            }
            className="flex h-11 flex-1 items-center justify-center rounded-pill bg-danger px-6 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            Cancel this booking
          </button>
          <Link
            href={booking.href}
            className="flex h-11 items-center justify-center rounded-pill border border-line px-6 text-sm font-semibold text-body transition-colors hover:bg-surface-muted"
          >
            Keep it
          </Link>
        </div>
      )}
    </BlockShell>
  );
}

export function BookingRecordsBlock({ block }: { block: Block<"booking-records"> }) {
  const { money, date } = useLocale();
  return (
    <BlockShell title={block.title}>
      <ul className="divide-y divide-line">
        {block.records.map((record) => (
          <li key={record.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <Link href={record.href} className="truncate text-sm font-semibold text-ink hover:text-primary">
                {record.title}
              </Link>
              <p className="truncate text-xs text-muted">
                {record.reference} · {date(record.startDate, { month: "short", day: "numeric" })}
                {record.location ? ` · ${record.location}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-end">
              <p className="text-sm font-semibold text-ink">{money(record.totalUsd)}</p>
              <p className="text-xs capitalize text-muted">{record.status.replace(/_/g, " ")}</p>
            </div>
          </li>
        ))}
      </ul>
    </BlockShell>
  );
}
