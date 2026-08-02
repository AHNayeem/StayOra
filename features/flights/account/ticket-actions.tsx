"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarSync,
  Download,
  LifeBuoy,
  Loader2,
  RefreshCw,
  Share2,
} from "lucide-react";
import type { FlightBooking } from "@/types/flight";
import { quoteChange, requestRefund } from "@/services/flight.service";
import { airportLabel } from "@/lib/mock/airports";
import { CABIN_LABEL } from "@/lib/mock/fares";
import { formatTime } from "@/lib/flight-time";
import { useLocale } from "@/features/i18n";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/lib/toast";
import { cancelFlightBookingLocal } from "../bookings-store";

/**
 * TicketActions — download, share, change, refund and support.
 *
 * Each action is real rather than decorative:
 *
 *  - **Download** builds a plain-text itinerary client-side and saves it. No PDF
 *    library is wired up, and an inert button would be worse than a format the
 *    traveller can actually open, forward and print.
 *  - **Share** uses the Web Share API where available and falls back to the
 *    clipboard, because a share button that silently does nothing on desktop is
 *    a bug people report.
 *  - **Change** and **Refund** quote real numbers from the service before
 *    confirming, so the traveller sees what a cancellation costs *before*
 *    committing to it.
 */
export function TicketActions({ booking }: { booking: FlightBooking }) {
  const { money } = useLocale();
  const [refundOpen, setRefundOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refundQuote, setRefundQuote] = useState<{
    refundUsd: number;
    feeUsd: number;
  } | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [changeQuote, setChangeQuote] = useState<{
    changeFeeUsd: number;
    fareDifferenceUsd: number;
  } | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);

  const active = booking.status === "upcoming";

  /** Plain-text itinerary — readable, forwardable, printable. */
  const itineraryText = () => {
    const lines: string[] = [
      "OTITHEE — FLIGHT ITINERARY",
      "==========================",
      "",
      `Booking reference : ${booking.reference}`,
      `Airline PNR       : ${booking.pnr}`,
      `Cabin             : ${CABIN_LABEL[booking.cabin]} (${booking.fareBrand} fare)`,
      `Status            : ${booking.status}`,
      "",
      "TRAVELLERS",
      "----------",
    ];

    for (const passenger of booking.passengers) {
      lines.push(
        `  ${passenger.title} ${passenger.firstName} ${passenger.lastName} (${passenger.type})` +
          `  ticket ${booking.ticketNumbers[passenger.id] ?? "—"}`,
      );
    }

    lines.push("", "ITINERARY", "---------");
    for (const slice of booking.slices) {
      for (const segment of slice.segments) {
        lines.push(
          `  ${segment.flightNumber}  ${segment.fromCode} ${segment.departLocal.replace("T", " ")} → ` +
            `${segment.toCode} ${segment.arriveLocal.replace("T", " ")}`,
          `      Terminal ${segment.departTerminal} · Gate ${segment.gate} · Boarding ${formatTime(segment.boardingLocal)}`,
          `      Seats: ${booking.passengers
            .map((p) => p.seats?.[segment.id])
            .filter(Boolean)
            .join(", ") || "assigned at check-in"}`,
        );
      }
    }

    lines.push(
      "",
      "BAGGAGE",
      "-------",
      `  Cabin   : ${booking.baggage.cabinKg} kg`,
      `  Checked : ${booking.baggage.checkedKg > 0 ? `${booking.baggage.checkedKg} kg` : "not included"}`,
      "",
      "PAYMENT",
      "-------",
      `  Total paid : USD ${booking.grandTotalUsd}`,
      `  Method     : ${booking.paymentMethod}`,
      `  Refundable : ${booking.refundable ? "yes" : "no"}`,
      "",
      "Arrive 3 hours before international departures, 2 hours for domestic.",
    );

    return lines.join("\n");
  };

  const onDownload = () => {
    const blob = new Blob([itineraryText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `otithee-${booking.reference}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Itinerary downloaded");
  };

  const onShare = async () => {
    const first = booking.slices[0];
    const last = booking.slices[booking.slices.length - 1];
    const summary = `${airportLabel(first.fromCode)} → ${airportLabel(last.toCode)} · ${booking.reference}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "My Otithee flight",
          text: summary,
          url: window.location.href,
        });
        return;
      } catch {
        // The user dismissed the sheet, or sharing isn't permitted — fall through.
      }
    }

    try {
      await navigator.clipboard.writeText(`${summary}\n${window.location.href}`);
      toast.success("Trip link copied to clipboard");
    } catch {
      toast.info(`Booking reference: ${booking.reference}`);
    }
  };

  const openRefund = async () => {
    setRefundOpen(true);
    setBusy(true);
    setRefundError(null);
    setRefundQuote(null);
    const result = await requestRefund(booking);
    setBusy(false);
    if (result.ok) setRefundQuote({ refundUsd: result.refundUsd, feeUsd: result.feeUsd });
    else setRefundError(result.reason);
  };

  const confirmRefund = () => {
    cancelFlightBookingLocal(booking.id, new Date().toISOString());
    setRefundOpen(false);
    toast.success("Refund requested", {
      description: `We'll process ${money(refundQuote?.refundUsd ?? 0)} back to ${booking.paymentMethod} within 7–10 working days.`,
    });
  };

  const runChangeQuote = async () => {
    if (!newDate) return;
    setBusy(true);
    setChangeError(null);
    setChangeQuote(null);
    const result = await quoteChange(booking, newDate);
    setBusy(false);
    if (result.ok) {
      setChangeQuote({
        changeFeeUsd: result.changeFeeUsd,
        fareDifferenceUsd: result.fareDifferenceUsd,
      });
    } else {
      setChangeError(result.reason);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDownload}
          leftIcon={<Download className="size-4" aria-hidden="true" />}
        >
          Download ticket
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onShare}
          leftIcon={<Share2 className="size-4" aria-hidden="true" />}
        >
          Share
        </Button>
        {active && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangeOpen(true)}
              leftIcon={<CalendarSync className="size-4" aria-hidden="true" />}
            >
              Modify booking
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openRefund}
              leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
            >
              Request refund
            </Button>
          </>
        )}
        <Link
          href={`/contact-us?ref=${encodeURIComponent(booking.reference)}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <LifeBuoy className="size-4" aria-hidden="true" />
          Support
        </Link>
      </div>

      {/* ---- Refund --------------------------------------------------------- */}
      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Request a refund"
        size="md"
      >
        <div className="p-5">
          {busy ? (
            <p className="flex items-center gap-2 text-sm text-body">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Checking your fare rules…
            </p>
          ) : refundError ? (
            <>
              <p className="text-sm text-body">{refundError}</p>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" size="md" onClick={() => setRefundOpen(false)}>
                  Close
                </Button>
                <Link
                  href={`/contact-us?ref=${encodeURIComponent(booking.reference)}`}
                  className={buttonVariants({ variant: "primary", size: "md" })}
                >
                  Contact support
                </Link>
              </div>
            </>
          ) : refundQuote ? (
            <>
              <p className="text-sm text-body">
                Cancelling <strong className="text-ink">{booking.reference}</strong> will
                refund the amount below to {booking.paymentMethod}. This can&apos;t be
                undone.
              </p>
              <dl className="mt-4 space-y-2 rounded-field border border-line p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Total paid</dt>
                  <dd className="tabular-nums text-ink">
                    {money(booking.grandTotalUsd)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Cancellation fee</dt>
                  <dd className="tabular-nums text-danger">
                    − {money(refundQuote.feeUsd)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-line pt-2 font-semibold">
                  <dt className="text-ink">You&apos;ll receive</dt>
                  <dd className="tabular-nums text-success">
                    {money(refundQuote.refundUsd)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted">
                Refunds are processed within 7–10 working days.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" size="md" onClick={() => setRefundOpen(false)}>
                  Keep my booking
                </Button>
                <Button variant="danger" size="md" onClick={confirmRefund}>
                  Cancel & refund
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {/* ---- Change --------------------------------------------------------- */}
      <Modal
        open={changeOpen}
        onClose={() => setChangeOpen(false)}
        title="Change your departure date"
        size="md"
      >
        <div className="p-5">
          <p className="text-sm text-body">
            Pick a new departure date and we&apos;ll quote the change fee and any
            difference in fare before anything is confirmed.
          </p>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">New departure date</span>
            <input
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                setChangeQuote(null);
                setChangeError(null);
              }}
              className="h-11 rounded-field border border-line bg-surface px-4 text-sm text-ink outline-none focus:border-primary"
            />
          </label>

          {changeError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {changeError}
            </p>
          )}

          {changeQuote && (
            <dl className="mt-4 space-y-2 rounded-field border border-line p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Airline change fee</dt>
                <dd className="tabular-nums text-ink">
                  {money(changeQuote.changeFeeUsd)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Fare difference</dt>
                <dd className="tabular-nums text-ink">
                  {changeQuote.fareDifferenceUsd >= 0 ? "" : "− "}
                  {money(Math.abs(changeQuote.fareDifferenceUsd))}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <dt className="text-ink">Total to pay</dt>
                <dd className="tabular-nums text-accent-600">
                  {money(
                    Math.max(0, changeQuote.changeFeeUsd + changeQuote.fareDifferenceUsd),
                  )}
                </dd>
              </div>
            </dl>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={() => setChangeOpen(false)}>
              Close
            </Button>
            {changeQuote ? (
              <Link
                href={`/contact-us?ref=${encodeURIComponent(booking.reference)}&change=${newDate}`}
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                Confirm with support
              </Link>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={runChangeQuote}
                disabled={!newDate || busy}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Quoting…
                  </>
                ) : (
                  "Get a quote"
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
