"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarRange,
  CircleAlert,
  CreditCard,
  DoorOpen,
  FileText,
  MapPin,
  MessageSquare,
  Moon,
  Receipt,
  ShieldCheck,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import type { Invoice, TravelerBooking } from "@/types/traveler";
import { VERTICALS, listingHref } from "@/constants/verticals";
import { useLocale } from "@/features/i18n";
import { cancelBookingLocal, useIsCancelled } from "@/features/account/booking-overrides";
import {
  policyForBooking,
  quoteBookingRefund,
  useRequestBookingRefund,
} from "@/features/account/refunds";
import { useAuth } from "@/features/auth";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { StatusBadge, bookingStatusMeta } from "@/components/account/status-badge";
import { Money } from "@/components/account/money";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * Detail view for bookings that are *not* catalogue bookings.
 *
 * Flights and unified trips have their own product models (fares, PNRs, seat
 * maps, multi-component itineraries) and their own client stores, so they keep
 * the original screen. Everything sold from the catalogue is a domain booking
 * and gets the richer management view instead. Cancellations here still price
 * through the platform's refund engine, so finance sees one queue either way.
 */
export function LegacyBookingDetail({
  booking,
  invoice,
}: {
  booking: TravelerBooking;
  invoice?: Invoice;
}) {
  const { date } = useLocale();
  const cancelledLocally = useIsCancelled(booking.id);
  const [confirming, setConfirming] = useState(false);
  const { user } = useAuth();
  const { request, isPending } = useRequestBookingRefund({
    name: user?.name ?? "Guest",
    email: user?.email ?? "guest@otithee.com",
  });

  const status = cancelledLocally ? "cancelled" : booking.status;
  const meta = bookingStatusMeta(status);
  const vertical = VERTICALS[booking.vertical];
  const canCancel = status === "upcoming" || status === "pending";
  const canReview = status === "completed" && !booking.reviewed;

  const policy = policyForBooking(booking);
  const quote = quoteBookingRefund(booking);

  const onCancel = async () => {
    cancelBookingLocal(booking.id);
    setConfirming(false);
    try {
      if (quote.refundAmount > 0) {
        const { refund } = await request(booking);
        toast.success("Cancelled — refund requested", {
          description: `${refund.reference}: ${refund.currency} ${refund.refundAmount.toFixed(2)} will be returned to your original payment method once approved.`,
        });
      } else {
        toast.success("Booking cancelled", {
          description: `Ref ${booking.reference}. No refund is due under the ${policy.label} policy.`,
        });
      }
    } catch {
      toast.error("Cancelled, but the refund request could not be filed.", {
        description: "Please contact support with your booking reference.",
      });
    }
  };

  return (
    <div>
      <AccountPageHeader
        title={booking.title}
        back={{ href: "/account/bookings", label: "All bookings" }}
        actions={<StatusBadge label={meta.label} tone={meta.tone} />}
      />

      <div className="relative aspect-video overflow-hidden rounded-card sm:aspect-21/9">
        <Image
          src={booking.image}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 760px"
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/70 to-transparent p-4">
          <span className="text-overline text-white/80">{vertical.label}</span>
          <p className="flex items-center gap-1.5 text-sm font-medium text-white">
            <MapPin className="size-4" aria-hidden="true" />
            {booking.location}
          </p>
        </div>
      </div>

      {status === "failed" && (
        <div role="alert" className="mt-6 rounded-card border border-danger/30 bg-danger/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-danger">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            Booking failed — this trip was not confirmed
          </p>
          <p className="mt-1 text-sm text-body">
            {booking.failureReason ?? "We could not confirm this booking with the provider."}
          </p>
          <p className="mt-1 text-sm text-body">
            Your payment was taken, so a full refund of{" "}
            <strong className="text-ink">
              <Money usd={booking.totalUsd} />
            </strong>{" "}
            is owed — no cancellation fee applies to a failed booking.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={listingHref({ vertical: booking.vertical, slug: booking.listingSlug })}
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              Try booking again
            </Link>
            <Button
              variant="outline"
              size="sm"
              loading={isPending}
              onClick={async () => {
                try {
                  const { refund } = await request(booking, {
                    reason: "payment_captured_booking_failed",
                    note: booking.failureReason,
                  });
                  toast.success("Refund requested", {
                    description: `${refund.reference}: ${refund.currency} ${refund.refundAmount.toFixed(2)} — full refund, no fee.`,
                  });
                } catch {
                  toast.error("Couldn't file the refund request. Please contact support.");
                }
              }}
            >
              Request the refund
            </Button>
            <Link
              href="/account/support"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Contact support
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-ink">Trip details</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Detail icon={CalendarRange} label="Dates">
                {date(booking.checkIn)} – {date(booking.checkOut)}
              </Detail>
              <Detail icon={Moon} label="Duration">
                {booking.nights} {booking.nights === 1 ? "night" : "nights"}
              </Detail>
              <Detail icon={Users} label="Guests">
                {booking.guests} {booking.guests === 1 ? "guest" : "guests"}
                {booking.rooms > 1 ? ` · ${booking.rooms} rooms` : ""}
              </Detail>
              <Detail icon={CreditCard} label="Paid with">
                {booking.paymentMethod}
              </Detail>
              <Detail icon={Receipt} label="Reference">
                {booking.reference}
              </Detail>
              <Detail icon={DoorOpen} label="Booked on">
                {date(booking.bookedAt)}
              </Detail>
            </dl>

            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-medium text-ink">Guests on this booking</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {booking.guestNames.map((name) => (
                  <li key={name} className="rounded-pill bg-surface-muted px-3 py-1 text-sm text-body">
                    {name}
                  </li>
                ))}
              </ul>
            </div>

            {booking.specialRequests && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-sm font-medium text-ink">Special requests</p>
                <p className="mt-1 text-sm text-body">{booking.specialRequests}</p>
              </div>
            )}

            <div className="mt-4 flex items-start gap-2 rounded-field bg-surface-muted/60 p-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm text-body">{booking.cancellationPolicy}</p>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-3 text-base font-semibold text-ink">Payment summary</h2>
            {invoice ? (
              <dl className="space-y-2 text-sm">
                <Line label="Subtotal">
                  <Money usd={invoice.subtotalUsd} />
                </Line>
                <Line label="Taxes">
                  <Money usd={invoice.taxesUsd} />
                </Line>
                <Line label="Fees">
                  <Money usd={invoice.feesUsd} />
                </Line>
                {invoice.discountUsd > 0 && (
                  <Line label="Discount" tone="success">
                    −<Money usd={invoice.discountUsd} />
                  </Line>
                )}
                <div className="mt-2 flex items-center justify-between border-t border-line pt-3 text-base">
                  <span className="font-semibold text-ink">Total</span>
                  <span className="font-bold text-accent-600">
                    <Money usd={invoice.totalUsd} />
                  </span>
                </div>
              </dl>
            ) : (
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-bold text-accent-600">
                  <Money usd={booking.totalUsd} />
                </span>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            {booking.vertical === "flights" ? (
              <Link
                href={`/account/flights/${booking.id}`}
                className={buttonVariants({ variant: "outline", size: "md", fullWidth: true })}
              >
                <Ticket className="size-4" aria-hidden="true" />
                View flight ticket
              </Link>
            ) : (
              <Link
                href={listingHref({ vertical: booking.vertical, slug: booking.listingSlug })}
                className={buttonVariants({ variant: "outline", size: "md", fullWidth: true })}
              >
                View listing
              </Link>
            )}
            {invoice && (
              <Link
                href="/account/invoices"
                className={buttonVariants({ variant: "outline", size: "md", fullWidth: true })}
              >
                <FileText className="size-4" aria-hidden="true" />
                View invoice
              </Link>
            )}
            <Link
              href="/account/support"
              className={buttonVariants({ variant: "outline", size: "md", fullWidth: true })}
            >
              <MessageSquare className="size-4" aria-hidden="true" />
              Get help
            </Link>
            {canReview && (
              <Link
                href="/account/reviews"
                className={buttonVariants({ variant: "primary", size: "md", fullWidth: true })}
              >
                <Star className="size-4" aria-hidden="true" />
                Write a review
              </Link>
            )}

            {canCancel &&
              (confirming ? (
                <div className="rounded-field border border-danger/30 bg-danger/5 p-3">
                  <p className="text-sm font-semibold text-ink">Cancel this booking?</p>
                  <p className="mt-1 text-xs text-body">
                    {policy.label} policy · {policy.summary}
                  </p>

                  <dl className="mt-3 space-y-1.5 border-t border-danger/20 pt-2 text-sm">
                    <Line label="Paid">
                      <Money usd={quote.originalAmount} />
                    </Line>
                    <Line label={`Refundable (${Math.round(quote.refundPercent * 100)}%)`}>
                      <Money usd={quote.refundAmount} />
                    </Line>
                    {quote.cancellationFee > 0 && (
                      <Line label="Cancellation fee">
                        −<Money usd={quote.cancellationFee} />
                      </Line>
                    )}
                    <div className="flex items-center justify-between border-t border-danger/20 pt-2">
                      <span className="font-semibold text-ink">Estimated refund</span>
                      <span className="font-bold text-ink">
                        <Money usd={quote.refundAmount} />
                      </span>
                    </div>
                  </dl>

                  {quote.refundAmount <= 0 && (
                    <p className="mt-2 text-xs font-medium text-danger">
                      {quote.reason ?? "No refund is due for this booking."}
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      loading={isPending}
                      onClick={onCancel}
                      className="flex-1"
                    >
                      {quote.refundAmount > 0 ? "Cancel & request refund" : "Cancel booking"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirming(false)}
                      className="flex-1"
                    >
                      Keep it
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  onClick={() => setConfirming(true)}
                  className="text-danger hover:bg-danger/10"
                >
                  Cancel booking
                </Button>
              ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-field bg-surface-muted text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="text-sm font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}

function Line({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: "success";
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-body">{label}</span>
      <span className={cn("font-medium text-ink", tone === "success" && "text-emerald-600")}>
        {children}
      </span>
    </div>
  );
}
