"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Clock,
  Download,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  Repeat,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import type { TripComponent } from "@/types/trip";
import { travelerCount } from "@/types/trip";
import type { BookingEvent } from "@/features/dashboard/domain/types";
import {
  FAILURE_NEXT_ACTIONS,
  FAILURE_REASON_LABELS,
  getRevision,
  getState,
  subscribe as subscribeToDomain,
} from "@/features/dashboard/domain";
import { VERTICALS } from "@/constants/verticals";
import {
  cancelTripComponent,
  cancelWholeTrip,
  quoteTripCancellation,
  retryTripComponent,
} from "@/services/trip.service";
import { useLocale } from "@/features/i18n";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardImage } from "@/components/ui/card-image";
import { Modal } from "@/components/ui/modal";
import { VerticalIcon } from "@/components/shared/vertical-icon";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { removeTripComponent, tripStatus, useTrip } from "./trips-store";
import { ComponentStatusBadge, TripStatusBadge } from "./components/trip-status-badge";
import { RecommendationRail } from "./components/recommendation-rail";
import { downloadItinerary, downloadTripICS } from "./itinerary";

/**
 * TripDetailView — managing one booked trip.
 *
 * The screen is built around the rule that makes unified booking safe: **the
 * trip has no status of its own**. Each component shows its own state, its own
 * reference and its own actions, and a failure offers the four things a
 * traveller actually wants — retry, replace, remove, or carry on with what is
 * confirmed. Nothing here ever cancels a healthy booking as a side effect.
 */
export function TripDetailView({ tripId }: { tripId: string }) {
  const trip = useTrip(tripId);
  const { money, date, dateTime } = useLocale();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancellingTrip, setCancellingTrip] = useState(false);

  // Timelines live on the platform bookings; subscribe to the store revision so
  // a retry or an admin action re-renders without this view owning any state.
  const revision = useSyncExternalStore(subscribeToDomain, getRevision, () => 0);
  const timelines = useMemo(() => {
    void revision;
    const bookings = getState().bookings;
    const map = new Map<string, BookingEvent[]>();
    for (const component of trip?.components ?? []) {
      const booking = bookings.find((b) => b.id === component.bookingId);
      if (booking) map.set(component.bookingId, booking.timeline);
    }
    return map;
  }, [revision, trip]);

  if (!trip) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-h3 text-ink">Trip not found</h1>
        <p className="mt-2 text-body">
          This trip isn&apos;t in your account. It may have been booked in another browser.
        </p>
        <Link
          href="/account/trips"
          className={`${buttonVariants({ variant: "primary", size: "md" })} mt-6`}
        >
          All trips
        </Link>
      </div>
    );
  }

  const status = tripStatus(trip);
  const people = travelerCount(trip.travelers);
  const failed = trip.components.filter((c) => c.status === "failed");
  const confirmed = trip.components.filter((c) =>
    ["confirmed", "checked_in", "completed"].includes(c.status),
  );
  // Quoted per leg, against each supplier's own policy — the whole point of the
  // dialog is that the traveller sees the difference before committing.
  const cancelQuote = quoteTripCancellation(trip);

  const onRetry = async (component: TripComponent) => {
    setBusyId(component.bookingId);
    try {
      const booking = await retryTripComponent(component.bookingId, {
        capacity: undefined,
        travelers: component.travelers,
        quantity: 1,
        title: component.title,
        kind: component.kind,
        startDate: component.startDate,
      });
      if (booking.status === "confirmed") {
        toast.success(`${component.title} confirmed`, {
          description: `Reference ${booking.reference}`,
        });
      } else {
        toast.error("The provider still can't confirm this booking", {
          description: booking.failureNote,
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const onCancel = async (component: TripComponent) => {
    setBusyId(component.bookingId);
    try {
      const { refundId } = await cancelTripComponent(component.bookingId);
      toast.success(`${component.title} cancelled`, {
        description: refundId
          ? "A refund has been raised for this component only — the rest of your trip is unaffected."
          : "The rest of your trip is unaffected.",
      });
    } catch {
      toast.error("This booking can't be cancelled at its current stage.");
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Cancel every cancellable leg. Deliberately sequential and non-atomic: each
   * leg is its own contract with its own supplier, so one refusing must not
   * stop the others — the result reports exactly what moved.
   */
  const onCancelTrip = async () => {
    setCancellingTrip(false);
    setBusyId("trip");
    try {
      const result = await cancelWholeTrip(trip);
      if (result.cancelled.length === 0) {
        toast.error("Nothing could be cancelled", {
          description: result.skipped[0]?.reason,
        });
      } else if (result.skipped.length > 0) {
        toast.warning(
          `${result.cancelled.length} of ${trip.components.length} bookings cancelled`,
          {
            description: `${result.skipped.length} couldn't be: ${result.skipped
              .map((s) => s.title)
              .join(", ")}. ${result.refundIds.length} refund${result.refundIds.length === 1 ? "" : "s"} raised.`,
          },
        );
      } else {
        toast.success("Trip cancelled", {
          description: `${result.refundIds.length} refund${result.refundIds.length === 1 ? "" : "s"} raised — each supplier settles its own.`,
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const onRemove = (component: TripComponent) => {
    removeTripComponent(trip.id, component.bookingId);
    toast.info(`${component.title} removed from this trip`, {
      description: "The booking record stays in your history.",
    });
  };

  return (
    <div>
      <Link
        href="/account/trips"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All trips
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h2 text-ink">{trip.destination} trip</h1>
            <TripStatusBadge status={status} />
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden="true" />
              {trip.destinationLabel}
            </span>
            {trip.startDate && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                {date(trip.startDate, { dateStyle: "medium" })}
                {trip.endDate &&
                  trip.endDate !== trip.startDate &&
                  ` – ${date(trip.endDate, { dateStyle: "medium" })}`}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden="true" />
              {people} traveller{people === 1 ? "" : "s"}
            </span>
            <span className="font-mono">{trip.reference}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-right">
            <p className="text-xs text-muted">Charged</p>
            <p className="text-h3 font-bold text-accent-600">{money(trip.totalUsd)}</p>
            {trip.savingsUsd > 0 && (
              <p className="text-xs font-medium text-emerald-600">
                Saved {money(trip.savingsUsd)}
              </p>
            )}
          </div>
          {/* One document for the whole trip — every leg, in order, under one
              reference. Per-leg vouchers stay on each booking. */}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="size-4" />}
              onClick={() => downloadItinerary(trip)}
            >
              Itinerary
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<CalendarPlus className="size-4" />}
              onClick={() => downloadTripICS(trip)}
            >
              Add to calendar
            </Button>
            {cancelQuote.cancellableCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger/10"
                leftIcon={<XCircle className="size-4" />}
                onClick={() => setCancellingTrip(true)}
              >
                Cancel trip
              </Button>
            )}
          </div>
        </div>
      </header>

      {failed.length > 0 && (
        <section className="mt-6 rounded-card border border-danger/40 bg-danger/5 p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-danger">
            <AlertTriangle className="size-4" aria-hidden="true" />
            {failed.length} booking{failed.length === 1 ? "" : "s"} couldn&apos;t be confirmed
          </h2>
          <p className="mt-1 text-sm text-danger/90">
            {confirmed.length} of {trip.components.length} components are confirmed and
            unaffected. Retry the failed ones, swap them for something else, or continue
            with what you have.
          </p>
        </section>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-4">
          {trip.components.map((component) => {
            const config = VERTICALS[component.kind];
            const events = timelines.get(component.bookingId) ?? [];
            const busy = busyId === component.bookingId;
            const isFailed = component.status === "failed";
            const cancellable = ["confirmed", "checked_in"].includes(component.status);

            return (
              <article
                key={component.bookingId}
                className={cn(
                  "overflow-hidden rounded-card border bg-surface shadow-card",
                  isFailed ? "border-danger/40" : "border-line",
                )}
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row">
                  <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-field bg-surface-muted sm:w-40">
                    <CardImage
                      src={component.image}
                      alt={component.title}
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                          <VerticalIcon
                            name={config.icon}
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          {config.label} · {component.merchantName}
                        </p>
                        <h3 className="mt-0.5 truncate text-sm font-semibold text-ink">
                          {component.title}
                        </h3>
                        <p className="text-xs text-muted">{component.detail}</p>
                        <p className="mt-1 font-mono text-xs text-muted">
                          {component.reference}
                        </p>
                      </div>
                      <div className="text-right">
                        <ComponentStatusBadge status={component.status} />
                        <p className="mt-1 text-sm font-semibold text-ink">
                          {money(component.totalUsd)}
                        </p>
                      </div>
                    </div>

                    {isFailed && (
                      <div className="mt-3 rounded-field bg-danger/8 p-3 text-sm">
                        <p className="font-medium text-danger">
                          {component.failureReason
                            ? FAILURE_REASON_LABELS[component.failureReason]
                            : "Booking failed"}
                        </p>
                        {component.failureNote && (
                          <p className="mt-0.5 text-xs text-danger/90">
                            {component.failureNote}
                          </p>
                        )}
                        {component.failureReason && (
                          <p className="mt-1 text-xs text-danger/80">
                            {FAILURE_NEXT_ACTIONS[component.failureReason]}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {isFailed && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onRetry(component)}
                            disabled={busy}
                          >
                            {busy ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <RefreshCw className="size-4" aria-hidden="true" />
                            )}
                            Retry
                          </Button>
                          <Link
                            href={config.href}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            <Repeat className="size-4" aria-hidden="true" />
                            Choose another {config.label.toLowerCase()}
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemove(component)}
                            disabled={busy}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                            Remove from trip
                          </Button>
                        </>
                      )}

                      {!isFailed && component.travelerBookingId && (
                        <Link
                          href={`/account/bookings/${component.travelerBookingId}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          View booking
                        </Link>
                      )}

                      {cancellable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCancel(component)}
                          disabled={busy}
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <XCircle className="size-4" aria-hidden="true" />
                          )}
                          Cancel this component
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {events.length > 0 && (
                  <details className="border-t border-line bg-surface-muted/40 px-5 py-3">
                    <summary className="cursor-pointer text-sm font-medium text-body">
                      Timeline ({events.length})
                    </summary>
                    <ol className="mt-3 space-y-2.5">
                      {events.map((event) => (
                        <li key={event.id} className="flex items-start gap-2.5 text-sm">
                          <Clock
                            className="mt-0.5 size-3.5 shrink-0 text-muted"
                            aria-hidden="true"
                          />
                          <div>
                            <p className="font-medium text-ink">{event.label}</p>
                            <p className="text-xs text-muted">
                              {dateTime(event.at)} · {event.actor}
                            </p>
                            {event.note && (
                              <p className="text-xs text-muted">{event.note}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </article>
            );
          })}

          <RecommendationRail
            title={`Add more to your ${trip.destination} trip`}
            subtitle="Book alongside what you already have"
            maxGroups={3}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="text-base font-semibold text-ink">Trip totals</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="Products" value={money(trip.subtotalUsd)} />
              {trip.discountUsd > 0 && (
                <Row label="Savings applied" value={`−${money(trip.discountUsd)}`} positive />
              )}
              <Row label="Taxes" value={money(trip.taxesUsd)} />
              <Row label="Fees" value={money(trip.feesUsd)} />
              {trip.segment === "b2b" && (
                <Row label="Commission (incl.)" value={money(trip.commissionUsd)} />
              )}
            </dl>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="text-sm font-semibold text-ink">Charged</span>
              <span className="text-h4 font-bold text-accent-600">
                {money(trip.totalUsd)}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">Paid with {trip.paymentMethod}</p>
          </div>

          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="text-base font-semibold text-ink">Trip actions</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/trip"
                className={buttonVariants({ variant: "outline", size: "sm", fullWidth: true })}
              >
                Add a booking
              </Link>
              <Link
                href="/account/invoices"
                className={buttonVariants({ variant: "outline", size: "sm", fullWidth: true })}
              >
                <FileText className="size-4" aria-hidden="true" />
                Download invoices
              </Link>
              <Link
                href="/account/refunds"
                className={buttonVariants({ variant: "ghost", size: "sm", fullWidth: true })}
              >
                Refund status
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted">
              {new Set(trip.components.map((c) => c.merchantId)).size} providers ·{" "}
              {trip.components.length} independent bookings
            </p>
          </div>
        </aside>
      </div>

      {/* Whole-trip cancellation. Each leg is quoted against its own supplier's
          policy and the traveller sees all of them before committing — a single
          headline number would hide that a non-refundable tour returns nothing
          while the flexible hotel returns everything. */}
      <Modal
        open={cancellingTrip}
        onClose={() => setCancellingTrip(false)}
        title="Cancel the whole trip?"
        description={`${cancelQuote.cancellableCount} of ${trip.components.length} bookings can be cancelled. Each supplier settles its own refund.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCancellingTrip(false)}>
              Keep my trip
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={busyId === "trip"}
              onClick={onCancelTrip}
            >
              Cancel {cancelQuote.cancellableCount} booking
              {cancelQuote.cancellableCount === 1 ? "" : "s"}
            </Button>
          </div>
        }
      >
        <ul className="flex flex-col gap-2 text-sm">
          {cancelQuote.legs.map((leg) => (
            <li
              key={leg.bookingId}
              className={cn(
                "flex flex-wrap items-start justify-between gap-2 rounded-field border p-3",
                leg.cancellable ? "border-line" : "border-dashed border-line bg-surface-muted",
              )}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{leg.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {VERTICALS[leg.kind].label} · {leg.policyLabel}
                  {leg.reason ? ` · ${leg.reason}` : ""}
                </p>
              </div>
              <div className="text-right">
                {leg.cancellable ? (
                  <>
                    <p className="font-semibold text-emerald-600">
                      {money(leg.refundUsd)} back
                    </p>
                    {leg.cancellationFeeUsd > 0 && (
                      <p className="text-xs text-muted">
                        after {money(leg.cancellationFeeUsd)} fee
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs font-medium text-muted">Left as it is</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
          <Row label="Total refunded" value={money(cancelQuote.totalRefundUsd)} positive />
          {cancelQuote.totalFeeUsd > 0 && (
            <Row label="Cancellation fees" value={money(cancelQuote.totalFeeUsd)} />
          )}
        </dl>
        <p className="mt-3 text-xs text-muted">
          Refunds are raised against each supplier separately and appear under
          Account → Refunds. One leg refusing doesn&apos;t stop the others.
        </p>
      </Modal>
    </div>
  );
}

function Row({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("font-medium", positive ? "text-emerald-600" : "text-ink")}>
        {value}
      </dd>
    </div>
  );
}
