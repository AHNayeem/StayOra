"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarRange,
  CreditCard,
  DoorOpen,
  FileText,
  Luggage,
  MapPin,
  MessageSquare,
  Moon,
  Receipt,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import type { Invoice, TravelerBooking } from "@/types/traveler";
import { VERTICALS, listingHref } from "@/constants/verticals";
import { useLocale } from "@/features/i18n";
import { cancelBookingLocal, useIsCancelled } from "@/features/account/booking-overrides";
import { useResolvedBooking } from "@/features/account/created-bookings";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { StatusBadge, bookingStatusMeta } from "@/components/account/status-badge";
import { Money } from "@/components/account/money";
import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  booking?: TravelerBooking;
  invoice?: Invoice;
}

export function BookingDetailView({ id, booking: serverBooking, invoice: serverInvoice }: Props) {
  const { date } = useLocale();
  const { booking, invoice } = useResolvedBooking(id, serverBooking, serverInvoice);
  const cancelledLocally = useIsCancelled(id);
  const [confirming, setConfirming] = useState(false);

  if (!booking) {
    return (
      <div>
        <AccountPageHeader
          title="Booking not found"
          back={{ href: "/account/bookings", label: "All bookings" }}
        />
        <AccountEmpty
          icon={Luggage}
          title="We couldn't find that booking"
          description="It may have been removed, or the link is out of date."
          action={
            <Link
              href="/account/bookings"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              View all bookings
            </Link>
          }
        />
      </div>
    );
  }

  const status = cancelledLocally ? "cancelled" : booking.status;
  const meta = bookingStatusMeta(status);
  const vertical = VERTICALS[booking.vertical];
  const canCancel = status === "upcoming" || status === "pending";
  const canReview = status === "completed" && !booking.reviewed;

  const onCancel = () => {
    cancelBookingLocal(booking.id);
    setConfirming(false);
    toast.success("Booking cancelled", {
      description: `Ref ${booking.reference}. Any refund will follow your cancellation policy.`,
    });
  };

  return (
    <div>
      <AccountPageHeader
        title={booking.title}
        back={{ href: "/account/bookings", label: "All bookings" }}
        actions={<StatusBadge label={meta.label} tone={meta.tone} />}
      />

      {/* Hero image */}
      <div className="relative aspect-video overflow-hidden rounded-card sm:aspect-21/9">
        <Image
          src={booking.image}
          alt={booking.title}
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        {/* Details */}
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
                  <li
                    key={name}
                    className="rounded-pill bg-surface-muted px-3 py-1 text-sm text-body"
                  >
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

        {/* Summary + actions */}
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
            <Link
              href={listingHref({ vertical: booking.vertical, slug: booking.listingSlug })}
              className={buttonVariants({ variant: "outline", size: "md", fullWidth: true })}
            >
              View listing
            </Link>
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
              href="/account/messages"
              className={buttonVariants({ variant: "outline", size: "md", fullWidth: true })}
            >
              <MessageSquare className="size-4" aria-hidden="true" />
              Message host
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
                  <p className="text-sm text-ink">Cancel this booking?</p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="danger" size="sm" onClick={onCancel} className="flex-1">
                      Yes, cancel
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
