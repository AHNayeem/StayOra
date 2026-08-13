"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BedDouble,
  CalendarPlus,
  CalendarRange,
  CircleAlert,
  Clock,
  CreditCard,
  DoorOpen,
  Download,
  FileText,
  LifeBuoy,
  Luggage,
  MapPin,
  MessageSquare,
  Moon,
  Pencil,
  Printer,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { Invoice, TravelerBooking } from "@/types/traveler";
import { VERTICALS, listingHref } from "@/constants/verticals";
import { useLocale } from "@/features/i18n";
import { useResolvedBooking } from "@/features/account/created-bookings";
import { useAuth } from "@/features/auth";
import {
  AmendmentError,
  BOOKING_STATUSES,
  bookingService,
  getRoomTypes,
  paymentPosition,
  quoteReschedule,
  reschedule,
  addTraveler,
  correctTravelerName,
  supportService,
  upgradeRoom,
  type Booking,
  type RefundQuote,
} from "@/features/dashboard/domain";
import { labelMap } from "@/features/dashboard/lib/status";
import {
  downloadICS,
  downloadVoucher,
  printConfirmation,
  toInvoice,
  toPropertyRef,
  useCustomerBooking,
  useDomainValue,
} from "@/features/booking";
import { getListingBySlug } from "@/services/catalog";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { StatusBadge, bookingStatusMeta } from "@/components/account/status-badge";
import { Money } from "@/components/account/money";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { controlClasses } from "@/components/ui/field";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { LegacyBookingDetail } from "./legacy-booking-detail";

const STATUS_LABEL = labelMap(BOOKING_STATUSES);

interface Props {
  id: string;
  booking?: TravelerBooking;
  invoice?: Invoice;
}

type Tab = "overview" | "travellers" | "payment" | "documents" | "activity";
type Dialog =
  | null
  | "cancel"
  | "reschedule"
  | "upgrade"
  | "add-guest"
  | "rename"
  | "support"
  | "dispute";

/**
 * The traveller's view of one booking — and everything they can do to it.
 *
 * The record here *is* the domain booking, so an operator changing the status,
 * approving a refund or moving the dates in `/dashboard` shows up on this page
 * with no synchronisation step. Amendments go through the domain's amendment
 * service, which re-checks inventory and re-prices, rather than editing fields.
 *
 * Flight and trip bookings still live in their own client store; those fall
 * through to {@link LegacyBookingDetail}.
 */
export function BookingDetailView({ id, booking: serverBooking, invoice: serverInvoice }: Props) {
  const domainBooking = useCustomerBooking(id);
  const legacy = useResolvedBooking(id, serverBooking, serverInvoice);

  if (domainBooking) return <DomainBookingDetail booking={domainBooking} />;
  if (legacy.booking) {
    return <LegacyBookingDetail booking={legacy.booking} invoice={legacy.invoice} />;
  }

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

function DomainBookingDetail({ booking }: { booking: Booking }) {
  const { date, dateTime, money: fmt } = useLocale();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  const actor = useMemo(
    () => ({
      id: user?.id ?? "cus_web",
      name: user?.name ?? booking.customer.name,
      role: "customer",
    }),
    [user?.id, user?.name, booking.customer.name],
  );

  const vertical = VERTICALS[booking.listing?.vertical ?? "hotels"];
  const invoice = toInvoice(booking);
  const meta = bookingStatusMeta(
    booking.status === "confirmed"
      ? "upcoming"
      : booking.status === "checked_in"
        ? "checked_in"
        : booking.status === "completed"
          ? "completed"
          : booking.status === "cancelled"
            ? "cancelled"
            : booking.status === "refunded"
              ? "refunded"
              : booking.status === "failed"
                ? "failed"
                : booking.status === "cancellation_requested"
                  ? "cancellation_requested"
                  : booking.status.startsWith("refund")
                    ? "refund_pending"
                    : "pending",
  );

  const position = useDomainValue(
    () => paymentPosition(booking.id, booking.money.total),
    [booking.id, booking.money.total],
  );

  // Read the clock once, on mount: a countdown that re-derives on every render
  // is both impure and pointlessly unstable for a "days to go" label.
  const [nowMs] = useState(() => Date.now());
  const startMs = new Date(booking.startAt).getTime();
  const daysToStart = Math.ceil((startMs - nowMs) / 86_400_000);
  const canManage = booking.status === "confirmed" || booking.status === "payment_pending";
  const canCancel = canManage || booking.status === "checked_in";
  const canReview = booking.status === "completed";
  const isStay = Boolean(booking.stay) && Boolean(booking.listing);

  const run = async (label: string, action: () => unknown) => {
    setBusy(true);
    try {
      await action();
      setDialog(null);
      toast.success(label);
    } catch (error) {
      const message =
        error instanceof AmendmentError || error instanceof Error
          ? error.message
          : "That didn't work. Please try again.";
      toast.error("Couldn't apply the change", { description: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AccountPageHeader
        title={booking.productTitle}
        back={{ href: "/account/bookings", label: "All bookings" }}
        actions={<StatusBadge label={meta.label} tone={meta.tone} />}
      />

      <div className="relative aspect-video overflow-hidden rounded-card sm:aspect-21/9 print:hidden">
        <Image
          src={booking.listing?.image ?? "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 760px"
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/70 to-transparent p-4">
          <span className="text-overline text-white/80">{vertical.label}</span>
          <p className="flex items-center gap-1.5 text-sm font-medium text-white">
            <MapPin className="size-4" aria-hidden="true" />
            {booking.destination}
          </p>
        </div>
      </div>

      {/* Live status strip — the same lifecycle the operator is driving. */}
      <p className="mt-4 flex flex-wrap items-center gap-2 rounded-field border border-line bg-surface-muted/50 px-4 py-2.5 text-sm text-body">
        <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>
          Currently <strong className="text-ink">{STATUS_LABEL[booking.status]}</strong> · last
          updated {dateTime(booking.updatedAt)}
        </span>
      </p>

      {booking.status === "confirmed" && daysToStart >= 0 && daysToStart <= 7 && (
        <p className="mt-3 flex items-start gap-2 rounded-card border border-primary/25 bg-primary-50/60 p-4 text-sm text-body">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong className="text-ink">
              {daysToStart === 0 ? "Today's the day!" : `${daysToStart} days to go.`}
            </strong>{" "}
            Check-in opens at 14:00. Bring photo ID for every guest, and add the trip to your
            calendar so you don&rsquo;t miss it.
          </span>
        </p>
      )}

      {booking.status === "failed" && <FailedBanner booking={booking} actor={actor} />}

      {position.due > 0 && booking.paymentPlan?.kind === "deposit" && (
        <p className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning/40 bg-warning/10 p-4 text-sm text-amber-900">
          <span>
            Balance of <strong><Money usd={position.due} /></strong> due by{" "}
            {date(booking.paymentPlan.balanceDueAt!)}.
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() =>
              toast.info("Balance payment", {
                description: "In the prototype the balance is collected by the operator from the dashboard.",
              })
            }
          >
            Pay balance
          </Button>
        </p>
      )}

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line print:hidden" aria-label="Booking sections">
        {(
          [
            ["overview", "Overview"],
            ["travellers", "Travellers"],
            ["payment", "Payment"],
            ["documents", "Documents"],
            ["activity", "Activity"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-6">
          {tab === "overview" && <OverviewPanel booking={booking} />}
          {tab === "travellers" && (
            <TravellersPanel booking={booking} onRename={() => setDialog("rename")} />
          )}
          {tab === "payment" && <PaymentPanel booking={booking} position={position} />}
          {tab === "documents" && <DocumentsPanel booking={booking} />}
          {tab === "activity" && <ActivityPanel booking={booking} />}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 print:hidden">
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-3 text-base font-semibold text-ink">Payment summary</h2>
            <dl className="space-y-2 text-sm">
              <Line label="Subtotal">
                <Money usd={invoice.subtotalUsd} />
              </Line>
              {booking.addOns?.map((addOn) => (
                <Line key={addOn.id} label={`${addOn.label} × ${addOn.quantity}`}>
                  <Money usd={addOn.total} />
                </Line>
              ))}
              {booking.money.discount > 0 && (
                <Line label="Discounts" tone="success">
                  −<Money usd={booking.money.discount} />
                </Line>
              )}
              <Line label="Taxes">
                <Money usd={booking.money.taxes} />
              </Line>
              <Line label="Service fee">
                <Money usd={booking.money.fees} />
              </Line>
              <div className="mt-2 flex items-center justify-between border-t border-line pt-3 text-base">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-bold text-accent-600">
                  <Money usd={booking.money.total} />
                </span>
              </div>
              {booking.money.refunded > 0 && (
                <Line label="Refunded" tone="success">
                  <Money usd={booking.money.refunded} />
                </Line>
              )}
            </dl>
            {booking.fx && booking.fx.currency !== "USD" && (
              <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
                Charged in {booking.fx.currency} at the rate held on{" "}
                {date(booking.fx.capturedAt)} (1 USD = {booking.fx.rate} {booking.fx.currency}).
                Today&rsquo;s rate may differ — your total does not change.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            {booking.listing && (
              <Link
                href={listingHref({
                  vertical: booking.listing.vertical,
                  slug: booking.listing.slug,
                })}
                className={buttonVariants({ variant: "outline", size: "md", fullWidth: true })}
              >
                View listing
              </Link>
            )}

            {isStay && canManage && (
              <>
                <Button variant="outline" size="md" fullWidth onClick={() => setDialog("reschedule")}>
                  <CalendarPlus className="size-4" aria-hidden="true" />
                  Change dates
                </Button>
                <Button variant="outline" size="md" fullWidth onClick={() => setDialog("upgrade")}>
                  <TrendingUp className="size-4" aria-hidden="true" />
                  Upgrade room
                </Button>
                <Button variant="outline" size="md" fullWidth onClick={() => setDialog("add-guest")}>
                  <UserPlus className="size-4" aria-hidden="true" />
                  Add a guest
                </Button>
              </>
            )}

            <Button variant="outline" size="md" fullWidth onClick={() => setDialog("support")}>
              <LifeBuoy className="size-4" aria-hidden="true" />
              Get help with this booking
            </Button>

            {(booking.money.refunded > 0 || booking.status === "completed") && (
              <Button variant="outline" size="md" fullWidth onClick={() => setDialog("dispute")}>
                <CircleAlert className="size-4" aria-hidden="true" />
                Raise a dispute
              </Button>
            )}

            {canReview && (
              <Link
                href="/account/reviews"
                className={buttonVariants({ variant: "primary", size: "md", fullWidth: true })}
              >
                <Star className="size-4" aria-hidden="true" />
                Write a review
              </Link>
            )}

            {canCancel && (
              <Button
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => setDialog("cancel")}
                className="text-danger hover:bg-danger/10"
              >
                Cancel booking
              </Button>
            )}
          </div>
        </aside>
      </div>

      {dialog === "cancel" && (
        <CancelDialog
          booking={booking}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={(quote) =>
            run(
              quote.refundAmount > 0
                ? `Cancelled — refund of ${fmt(quote.refundAmount)} requested`
                : "Booking cancelled",
              async () => {
                await bookingService.transition(booking.id, "request_cancellation", { actor });
                await bookingService.transition(booking.id, "cancel", { actor });
                if (quote.refundAmount > 0) {
                  await bookingService.transition(booking.id, "initiate_refund", {
                    actor,
                    refundReason: "customer_cancellation",
                  });
                }
              },
            )
          }
        />
      )}

      {dialog === "reschedule" && (
        <RescheduleDialog
          booking={booking}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={(checkIn, checkOut, property) =>
            run("Dates changed", () => reschedule(booking.id, property, checkIn, checkOut, actor))
          }
        />
      )}

      {dialog === "upgrade" && (
        <UpgradeDialog
          booking={booking}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={(roomTypeId, property) =>
            run("Room upgraded", () => upgradeRoom(booking.id, property, roomTypeId, actor))
          }
        />
      )}

      {dialog === "add-guest" && (
        <AddGuestDialog
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={async (fullName, type) => {
            const listing = booking.listing
              ? await getListingBySlug(booking.listing.vertical, booking.listing.slug)
              : undefined;
            await run("Guest added", () =>
              addTraveler(
                booking.id,
                { fullName, type },
                listing ? toPropertyRef(listing) : null,
                actor,
              ),
            );
          }}
        />
      )}

      {dialog === "rename" && (
        <RenameDialog
          booking={booking}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={(travelerId, fullName) =>
            run("Name corrected", () =>
              correctTravelerName(booking.id, travelerId, fullName, actor),
            )
          }
        />
      )}

      {(dialog === "support" || dialog === "dispute") && (
        <SupportDialog
          booking={booking}
          isDispute={dialog === "dispute"}
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={(subject, body, category) =>
            run("Ticket raised — we'll reply shortly", () =>
              supportService.create({
                subject,
                body,
                category,
                priority: dialog === "dispute" ? "high" : "medium",
                requesterName: booking.customer.name,
                requesterEmail: booking.customer.email,
                bookingId: booking.id,
                bookingRef: booking.reference,
                merchantId: booking.merchant.id,
                merchantName: booking.merchant.name,
              }),
            )
          }
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

function OverviewPanel({ booking }: { booking: Booking }) {
  const { date } = useLocale();
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-ink">Trip details</h2>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Detail icon={CalendarRange} label="Dates">
          {date(booking.startAt)} – {date(booking.endAt)}
        </Detail>
        {booking.nights > 0 && (
          <Detail icon={Moon} label="Duration">
            {booking.nights} {booking.nights === 1 ? "night" : "nights"}
          </Detail>
        )}
        {booking.stay && (
          <>
            <Detail icon={BedDouble} label="Room">
              {booking.stay.units} × {booking.stay.roomTypeName}
            </Detail>
            <Detail icon={ShieldCheck} label="Rate plan">
              {booking.stay.ratePlanName}
            </Detail>
          </>
        )}
        <Detail icon={Users} label="Guests">
          {booking.stay?.guests ?? booking.travelers.length}
        </Detail>
        <Detail icon={CreditCard} label="Paid with">
          {booking.payment.instrument}
        </Detail>
        <Detail icon={Receipt} label="Reference">
          {booking.reference}
        </Detail>
        <Detail icon={DoorOpen} label="Booked on">
          {date(booking.createdAt)}
        </Detail>
      </dl>

      {booking.addOns && booking.addOns.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">Extras included</p>
          <ul className="mt-2 space-y-1 text-sm text-body">
            {booking.addOns.map((addOn) => (
              <li key={addOn.id} className="flex justify-between gap-3">
                <span>
                  {addOn.label} × {addOn.quantity}
                </span>
                <span className="text-muted">
                  <Money usd={addOn.total} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {booking.specialRequests && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">Special requests</p>
          <p className="mt-1 text-sm text-body">{booking.specialRequests}</p>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-field bg-surface-muted/60 p-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm text-body">
          {booking.stay && !booking.stay.refundable
            ? "Non-refundable rate — no refund is due if you cancel."
            : `${booking.cancellationPolicyId.replace(/_/g, " ")} cancellation policy applies.`}
        </p>
      </div>
    </section>
  );
}

function TravellersPanel({
  booking,
  onRename,
}: {
  booking: Booking;
  onRename: () => void;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Travellers</h2>
        <Button variant="outline" size="sm" onClick={onRename}>
          <Pencil className="size-4" aria-hidden="true" />
          Correct a name
        </Button>
      </div>
      <ul className="divide-y divide-line">
        {booking.travelers.map((traveler, index) => (
          <li key={traveler.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted text-sm font-semibold text-primary">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">{traveler.fullName}</span>
              <span className="block text-xs text-muted">
                {traveler.type}
                {traveler.email ? ` · ${traveler.email}` : ""}
                {traveler.nationality ? ` · ${traveler.nationality}` : ""}
                {traveler.passportNumber ? ` · Doc ${traveler.passportNumber}` : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Names must match the photo ID each guest presents at check-in.
      </p>
    </section>
  );
}

function PaymentPanel({
  booking,
  position,
}: {
  booking: Booking;
  position: ReturnType<typeof paymentPosition>;
}) {
  const { dateTime } = useLocale();
  return (
    <>
      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-ink">Payment</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Detail icon={CreditCard} label="Paid">
            <Money usd={position.paid || (booking.payment.status === "captured" ? booking.payment.amount : 0)} />
          </Detail>
          <Detail icon={Receipt} label="Refunded">
            <Money usd={Math.max(position.refunded, booking.money.refunded)} />
          </Detail>
          <Detail icon={Clock} label="Outstanding">
            <Money usd={position.due} />
          </Detail>
        </dl>
        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
          Transaction {booking.payment.reference} · {booking.payment.instrument} · provider mock
        </p>
      </section>

      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-ink">Payment timeline</h2>
        {position.attempts.length === 0 ? (
          <p className="text-sm text-muted">
            No gateway attempts are recorded for this booking — it was seeded with the demo
            dataset rather than paid through the checkout.
          </p>
        ) : (
          <ol className="space-y-4">
            {position.attempts.flatMap((attempt) =>
              attempt.timeline.map((entry, index) => (
                <li key={`${attempt.id}_${index}`} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      entry.tone === "success"
                        ? "bg-emerald-500"
                        : entry.tone === "danger"
                          ? "bg-danger"
                          : entry.tone === "warning"
                            ? "bg-amber-500"
                            : "bg-muted",
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{entry.label}</p>
                    {entry.detail && <p className="text-xs text-body">{entry.detail}</p>}
                    <p className="text-xs text-muted">{dateTime(entry.at)}</p>
                  </div>
                </li>
              )),
            )}
          </ol>
        )}
      </section>
    </>
  );
}

function DocumentsPanel({ booking }: { booking: Booking }) {
  const documents = [
    {
      key: "confirmation",
      icon: Printer,
      title: "Printable confirmation",
      description: "This page, laid out for print or save-as-PDF.",
      action: printConfirmation,
      label: "Print",
    },
    {
      key: "voucher",
      icon: Ticket,
      title: "Property voucher",
      description: "Present at check-in with photo ID for every guest.",
      action: () => downloadVoucher(booking),
      label: "Download",
    },
    {
      key: "ics",
      icon: CalendarPlus,
      title: "Add to calendar",
      description: "An .ics file with a reminder the day before you travel.",
      action: () => downloadICS(booking),
      label: "Download .ics",
    },
  ];

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-ink">Documents</h2>
      <ul className="divide-y divide-line">
        {documents.map((document) => (
          <li key={document.key} className="flex flex-wrap items-center gap-3 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-field bg-surface-muted text-primary">
              <document.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">{document.title}</span>
              <span className="block text-xs text-muted">{document.description}</span>
            </span>
            <Button variant="outline" size="sm" onClick={document.action}>
              <Download className="size-4" aria-hidden="true" />
              {document.label}
            </Button>
          </li>
        ))}
        <li className="flex flex-wrap items-center gap-3 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-field bg-surface-muted text-primary">
            <FileText className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-ink">
              Invoice {booking.invoiceNumber}
            </span>
            <span className="block text-xs text-muted">Full breakdown and billing details.</span>
          </span>
          <Link
            href="/account/invoices"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View
          </Link>
        </li>
      </ul>
    </section>
  );
}

function ActivityPanel({ booking }: { booking: Booking }) {
  const { dateTime } = useLocale();
  const events = [...booking.timeline].reverse();
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-ink">Activity</h2>
      <ol className="space-y-4">
        {events.map((entry) => (
          <li key={entry.id} className="flex gap-3">
            <span
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                entry.tone === "success"
                  ? "bg-emerald-500"
                  : entry.tone === "danger"
                    ? "bg-danger"
                    : entry.tone === "warning"
                      ? "bg-amber-500"
                      : "bg-muted",
              )}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{entry.label}</p>
              {entry.note && <p className="text-sm text-body">{entry.note}</p>}
              <p className="text-xs text-muted">
                {dateTime(entry.at)} · {entry.actor}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FailedBanner({
  booking,
  actor,
}: {
  booking: Booking;
  actor: { id: string; name: string; role: string };
}) {
  const [busy, setBusy] = useState(false);
  const owed = booking.payment.status === "captured";

  return (
    <div role="alert" className="mt-6 rounded-card border border-danger/30 bg-danger/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-danger">
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        Booking failed — this trip was not confirmed
      </p>
      <p className="mt-1 text-sm text-body">
        {booking.failureNote ?? "We could not confirm this booking with the provider."}
      </p>
      {owed && (
        <p className="mt-1 text-sm text-body">
          Your payment was taken, so a full refund of{" "}
          <strong className="text-ink">
            <Money usd={booking.money.total} />
          </strong>{" "}
          is owed — no cancellation fee applies to a failed booking.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {booking.listing && (
          <Link
            href={listingHref({
              vertical: booking.listing.vertical,
              slug: booking.listing.slug,
            })}
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            Try booking again
          </Link>
        )}
        {owed && booking.refundIds.length === 0 && (
          <Button
            variant="outline"
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await bookingService.transition(booking.id, "initiate_refund", {
                  actor,
                  refundReason: "payment_captured_booking_failed",
                  note: booking.failureNote,
                });
                toast.success("Refund requested", {
                  description: `${result.refund?.reference}: full refund, no fee.`,
                });
              } catch {
                toast.error("Couldn't file the refund request. Please contact support.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Request the refund
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function CancelDialog({
  booking,
  busy,
  onClose,
  onConfirm,
}: {
  booking: Booking;
  busy: boolean;
  onClose: () => void;
  onConfirm: (quote: RefundQuote) => void;
}) {
  const quote = useDomainValue(
    () => bookingService.quoteCancellationSync(booking.id),
    [booking.id, booking.updatedAt],
  );

  if (!quote) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title="Cancel this booking?"
      description={`${quote.policy.label} policy · ${quote.policy.summary}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Keep it
          </Button>
          <Button variant="danger" loading={busy} onClick={() => onConfirm(quote)}>
            {quote.refundAmount > 0 ? "Cancel & request refund" : "Cancel booking"}
          </Button>
        </div>
      }
    >
      <dl className="space-y-2 text-sm">
        <Line label="Paid">
          <Money usd={quote.originalAmount} />
        </Line>
        {quote.lines.map((line) => (
          <Line key={line.label} label={line.label} tone={line.tone === "positive" ? "success" : undefined}>
            <Money usd={Math.abs(line.amount)} />
          </Line>
        ))}
        <div className="flex items-center justify-between border-t border-line pt-3 text-base">
          <span className="font-semibold text-ink">Refund due</span>
          <span className="font-bold text-ink">
            <Money usd={quote.refundAmount} />
          </span>
        </div>
      </dl>
      {quote.refundAmount <= 0 && (
        <p className="mt-3 text-sm font-medium text-danger">
          {quote.reason ?? "No refund is due for this booking."}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        {Math.max(0, Math.round(quote.hoursUntilStart))}h until your trip starts. Cancelling
        releases your rooms back to the property immediately; refunds are reviewed by our team
        and returned to the original payment method.
      </p>
    </Modal>
  );
}

function RescheduleDialog({
  booking,
  busy,
  onClose,
  onConfirm,
}: {
  booking: Booking;
  busy: boolean;
  onClose: () => void;
  onConfirm: (checkIn: string, checkOut: string, property: ReturnType<typeof toPropertyRef>) => void;
}) {
  const [checkIn, setCheckIn] = useState(booking.startAt.slice(0, 10));
  const [checkOut, setCheckOut] = useState(booking.endAt.slice(0, 10));
  const [property, setProperty] = useState<ReturnType<typeof toPropertyRef> | null>(null);

  // Resolve the catalogue listing once so the inventory engine can be queried.
  useMemo(() => {
    if (!booking.listing) return;
    void getListingBySlug(booking.listing.vertical, booking.listing.slug).then((listing) => {
      if (listing) setProperty(toPropertyRef(listing));
    });
  }, [booking.listing]);

  const quote = useDomainValue(
    () => (property ? quoteReschedule(booking, property, checkIn, checkOut) : null),
    [property?.id, booking.id, checkIn, checkOut, booking.updatedAt],
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Change your dates"
      description="We'll re-check availability and show any difference in price before anything changes."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!property || !quote?.available}
            onClick={() => property && onConfirm(checkIn, checkOut, property)}
          >
            Confirm new dates
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Check-in</span>
          <input
            type="date"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            className={cn(controlClasses(false), "h-11")}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Check-out</span>
          <input
            type="date"
            value={checkOut}
            min={checkIn}
            onChange={(event) => setCheckOut(event.target.value)}
            className={cn(controlClasses(false), "h-11")}
          />
        </label>
      </div>

      {!property && <p className="mt-4 text-sm text-muted">Loading availability…</p>}

      {quote && (
        <div className="mt-4 rounded-field bg-surface-muted/60 p-3 text-sm">
          {quote.available ? (
            <dl className="space-y-1.5">
              <Line label="Current room charge">
                <Money usd={quote.currentSubtotal} />
              </Line>
              <Line label={`New charge (${quote.nights} nights)`}>
                <Money usd={quote.newSubtotal} />
              </Line>
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="font-semibold text-ink">
                  {quote.difference >= 0 ? "Extra to pay" : "Credit back"}
                </span>
                <span
                  className={cn(
                    "font-bold",
                    quote.difference > 0 ? "text-ink" : "text-emerald-600",
                  )}
                >
                  <Money usd={Math.abs(quote.difference)} />
                </span>
              </div>
            </dl>
          ) : (
            <p className="text-danger">
              {quote.blockers[0]?.message ?? "Those dates aren't available."}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function UpgradeDialog({
  booking,
  busy,
  onClose,
  onConfirm,
}: {
  booking: Booking;
  busy: boolean;
  onClose: () => void;
  onConfirm: (roomTypeId: string, property: ReturnType<typeof toPropertyRef>) => void;
}) {
  const [property, setProperty] = useState<ReturnType<typeof toPropertyRef> | null>(null);
  const [choice, setChoice] = useState(booking.stay?.roomTypeId ?? "");

  useMemo(() => {
    if (!booking.listing) return;
    void getListingBySlug(booking.listing.vertical, booking.listing.slug).then((listing) => {
      if (listing) setProperty(toPropertyRef(listing));
    });
  }, [booking.listing]);

  const options = useDomainValue(
    () => (property ? getRoomTypes(property) : []),
    [property?.id],
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Upgrade your room"
      description="Availability and price are checked live against the property's inventory."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!property || !choice || choice === booking.stay?.roomTypeId}
            onClick={() => property && onConfirm(choice, property)}
          >
            Confirm upgrade
          </Button>
        </div>
      }
    >
      <ul className="space-y-2">
        {options.map((room) => (
          <li key={room.id}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-field border px-3 py-2.5",
                choice === room.id ? "border-primary bg-primary-50" : "border-line",
              )}
            >
              <input
                type="radio"
                name="upgrade-room"
                checked={choice === room.id}
                onChange={() => setChoice(room.id)}
                className="mt-1 size-4 border-line text-primary focus:ring-primary"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">
                  {room.name}
                  {room.id === booking.stay?.roomTypeId && (
                    <span className="ml-2 text-xs font-normal text-muted">(current)</span>
                  )}
                </span>
                <span className="block text-xs text-muted">{room.description}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function AddGuestDialog({
  busy,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: (fullName: string, type: "adult" | "child" | "infant") => void;
}) {
  const [fullName, setFullName] = useState("");
  const [type, setType] = useState<"adult" | "child" | "infant">("adult");

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a guest"
      description="We'll check the room's occupancy before adding them."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={fullName.trim().length < 2}
            onClick={() => onConfirm(fullName.trim(), type)}
          >
            Add guest
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Full name</span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={cn(controlClasses(false), "h-11")}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className={cn(controlClasses(false), "h-11")}
          >
            <option value="adult">Adult</option>
            <option value="child">Child (2–11)</option>
            <option value="infant">Infant (under 2)</option>
          </select>
        </label>
      </div>
    </Modal>
  );
}

function RenameDialog({
  booking,
  busy,
  onClose,
  onConfirm,
}: {
  booking: Booking;
  busy: boolean;
  onClose: () => void;
  onConfirm: (travelerId: string, fullName: string) => void;
}) {
  const [travelerId, setTravelerId] = useState(booking.travelers[0]?.id ?? "");
  const current = booking.travelers.find((t) => t.id === travelerId);
  const [fullName, setFullName] = useState(current?.fullName ?? "");

  return (
    <Modal
      open
      onClose={onClose}
      title="Correct a traveller's name"
      description="Spelling corrections only — a name change to a different person needs a new booking."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={fullName.trim().length < 2}
            onClick={() => onConfirm(travelerId, fullName.trim())}
          >
            Save correction
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Traveller</span>
          <select
            value={travelerId}
            onChange={(event) => {
              setTravelerId(event.target.value);
              setFullName(
                booking.travelers.find((t) => t.id === event.target.value)?.fullName ?? "",
              );
            }}
            className={cn(controlClasses(false), "h-11")}
          >
            {booking.travelers.map((traveler) => (
              <option key={traveler.id} value={traveler.id}>
                {traveler.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Corrected name</span>
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={cn(controlClasses(false), "h-11")}
          />
        </label>
      </div>
    </Modal>
  );
}

const SUPPORT_CATEGORIES = [
  ["booking", "Booking help"],
  ["payment", "Payment issue"],
  ["refund", "Refund"],
  ["cancellation", "Cancellation or change"],
  ["property", "Problem at the property"],
  ["other", "Something else"],
] as const;

function SupportDialog({
  booking,
  isDispute,
  busy,
  onClose,
  onConfirm,
}: {
  booking: Booking;
  isDispute: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (
    subject: string,
    body: string,
    category: (typeof SUPPORT_CATEGORIES)[number][0],
  ) => void;
}) {
  const [subject, setSubject] = useState(
    isDispute ? `Dispute — ${booking.reference}` : `Help with ${booking.reference}`,
  );
  const [category, setCategory] =
    useState<(typeof SUPPORT_CATEGORIES)[number][0]>(isDispute ? "refund" : "booking");
  const [body, setBody] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      title={isDispute ? "Raise a dispute" : "Get help with this booking"}
      description={
        isDispute
          ? "Tell us what went wrong. A case handler will pick this up and ask for any evidence they need."
          : "Your message goes straight to our support team, with this booking attached."
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={body.trim().length < 10}
            onClick={() => onConfirm(subject.trim(), body.trim(), category)}
          >
            Send
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className={cn(controlClasses(false), "h-11")}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as typeof category)}
            className={cn(controlClasses(false), "h-11")}
          >
            {SUPPORT_CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">What&rsquo;s happened?</span>
          <textarea
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Give us as much detail as you can — dates, amounts, who you've spoken to."
            className={cn(controlClasses(false), "resize-none py-2.5")}
          />
        </label>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <MessageSquare className="size-3.5" aria-hidden="true" />
        You&rsquo;ll get replies in{" "}
        <Link href="/account/support" className="underline">
          your support inbox
        </Link>
        .
      </p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

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
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 text-body">{label}</span>
      <span className={cn("shrink-0 font-medium text-ink", tone === "success" && "text-emerald-600")}>
        {children}
      </span>
    </div>
  );
}
