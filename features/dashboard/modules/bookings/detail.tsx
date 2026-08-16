"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CircleAlert,
  Clock,
  CreditCard,
  FileText,
  Luggage,
  MapPin,
  Receipt,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  FormSkeleton,
  Modal,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatusBadge,
  Textarea,
  buttonVariants,
} from "../../ui";
import { getErrorMessage } from "../../data";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { toast } from "@/lib/toast";
import { useRbac } from "../../rbac/rbac-provider";
import {
  BOOKING_FAILURE_REASONS,
  type BookingFailureReason,
  type RefundReason,
} from "../../domain/types";
import {
  BOOKING_STATUSES,
  FAILURE_NEXT_ACTIONS,
  FAILURE_REASON_LABELS,
  PAYMENT_STATUSES,
  availableBookingActions,
  getCancellationPolicy,
  refundIsOwed,
} from "../../domain/lifecycle";
import type { BookingActionDef } from "../../domain/lifecycle";
import { CommissionLifecycle } from "../commission/lifecycle-panel";
import { useBooking, useCancellationQuote, useBookingTransition } from "./hooks";
import { PRODUCT_KIND_LABELS, SEGMENT_LABELS } from "./types";

const statusTone = toneMap(BOOKING_STATUSES);
const statusLabel = labelMap(BOOKING_STATUSES);
const paymentTone = toneMap(PAYMENT_STATUSES);
const paymentLabel = labelMap(PAYMENT_STATUSES);

const FAILURE_OPTIONS = BOOKING_FAILURE_REASONS.map((value) => ({
  value,
  label: FAILURE_REASON_LABELS[value],
}));

const REFUND_REASON_OPTIONS: { value: RefundReason; label: string }[] = [
  { value: "customer_cancellation", label: "Customer cancellation (policy applies)" },
  { value: "merchant_cancellation", label: "Merchant cancelled (full refund)" },
  { value: "payment_captured_booking_failed", label: "Booking failed after capture (full refund)" },
  { value: "duplicate_booking", label: "Duplicate booking (full refund)" },
  { value: "service_not_as_described", label: "Service not as described" },
  { value: "goodwill", label: "Goodwill gesture" },
];

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function MoneyRow({
  label,
  amount,
  currency,
  tone,
  strong,
  hint,
}: {
  label: string;
  amount: number;
  currency: string;
  tone?: "positive" | "negative" | "muted";
  strong?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={strong ? "text-sm font-semibold text-ink" : "text-sm text-body"}>
        {label}
        {hint && <span className="ml-1 text-xs text-muted">({hint})</span>}
      </span>
      <span
        className={
          tone === "negative"
            ? "text-sm font-medium tabular-nums text-danger"
            : tone === "positive"
              ? "text-sm font-medium tabular-nums text-success"
              : strong
                ? "text-base font-bold tabular-nums text-ink"
                : "text-sm font-medium tabular-nums text-ink"
        }
      >
        {tone === "negative" ? "−" : ""}
        {formatCurrency(Math.abs(amount), currency)}
      </span>
    </div>
  );
}

/**
 * Booking detail — the single screen where the whole lifecycle is legible.
 *
 * It keeps the three states the brief insists must never be conflated visually
 * apart: the booking status, the *payment* status, and any refund. When a booking
 * failed after capture it says so explicitly, with the money that is owed and the
 * next action. Every action button comes from the state machine, so nothing is
 * offered that the domain would reject.
 */
export function BookingDetail({ id }: { id: string }) {
  const { can } = useRbac();
  const { data: booking, isLoading, isError, error, refetch } = useBooking(id);
  const transition = useBookingTransition();

  const [failureOpen, setFailureOpen] = useState(false);
  const [failureReason, setFailureReason] = useState<BookingFailureReason>("provider_rejected");
  const [failureNote, setFailureNote] = useState("");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundReason, setRefundReason] = useState<RefundReason>("customer_cancellation");
  const quote = useCancellationQuote(id, refundReason, cancelOpen);

  if (isLoading) return <FormSkeleton />;

  if (isError) {
    if (error?.kind === "forbidden") {
      return (
        <EmptyState
          title="Not your booking"
          description="This booking belongs to another organization, so it isn't visible to your account."
          action={
            <Link
              href="/dashboard/bookings"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Back to bookings
            </Link>
          }
        />
      );
    }
    return error?.kind === "not-found" ? (
      <EmptyState
        title="Booking not found"
        description="This reservation may have been removed."
        action={
          <Link
            href="/dashboard/bookings"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Back to bookings
          </Link>
        }
      />
    ) : (
      <ErrorState description="Couldn't load this booking." onRetry={refetch} />
    );
  }

  if (!booking) return null;

  const m = booking.money;
  const policy = getCancellationPolicy(booking.cancellationPolicyId);
  const actions = availableBookingActions(booking, can);
  const owesRefund = refundIsOwed(booking);
  const paymentCapturedButFailed =
    booking.status === "failed" &&
    (booking.payment.status === "captured" || booking.payment.status === "refund_pending");

  const run = async (action: BookingActionDef, extra?: Partial<{ failureReason: BookingFailureReason; note: string; refundReason: RefundReason }>) => {
    try {
      const result = await transition.mutateAsync({
        id: booking.id,
        actionId: action.id,
        failureReason: extra?.failureReason,
        note: extra?.note,
        refundReason: extra?.refundReason,
      });
      toast.success(`${action.label} — ${booking.reference}`, {
        description: result.refund
          ? `Refund ${result.refund.reference} for ${formatCurrency(result.refund.refundAmount, result.refund.currency)} raised.`
          : `Status is now ${statusLabel[result.to]}.`,
      });
      setFailureOpen(false);
      setCancelOpen(false);
      setFailureNote("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleAction = (action: BookingActionDef) => {
    if (action.id === "mark_failed") {
      setFailureOpen(true);
      return;
    }
    if (action.id === "cancel" || action.id === "request_cancellation") {
      setCancelOpen(true);
      return;
    }
    void run(action);
  };

  const cancelAction = actions.find((a) => a.id === "cancel" || a.id === "request_cancellation");
  const q = quote.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-body transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Bookings
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {actions.length === 0 && (
            <span className="text-xs text-muted">
              No further actions available in this state.
            </span>
          )}
          {actions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant={action.tone}
              loading={transition.isPending}
              onClick={() => handleAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Booking failed — the state that must never read as "cancelled". */}
      {booking.status === "failed" && (
        <Alert
          tone="danger"
          title={`Booking failed — ${FAILURE_REASON_LABELS[booking.failureReason ?? "technical_error"]}`}
        >
          <div className="space-y-2">
            <p>
              This booking was never delivered. Payment status is{" "}
              <strong>{paymentLabel[booking.payment.status]}</strong>.
            </p>
            {paymentCapturedButFailed ? (
              <p className="font-medium">
                Money was captured and is owed back:{" "}
                {formatCurrency(m.total - m.refunded, m.currency)} still to refund.
              </p>
            ) : (
              <p>No payment was captured, so there is nothing to refund.</p>
            )}
            <p className="text-sm">
              Next action: {FAILURE_NEXT_ACTIONS[booking.failureReason ?? "technical_error"]}
            </p>
          </div>
        </Alert>
      )}

      {owesRefund && booking.status !== "failed" && (
        <Alert tone="warning" title="Refund owed">
          {formatCurrency(m.total - m.refunded, m.currency)} of a captured payment has
          not been returned yet.
        </Alert>
      )}

      {booking.status === "cancellation_requested" && (
        <Alert tone="warning" title="Cancellation requested">
          Awaiting a decision. Approving it applies the {policy.label} policy and raises
          a refund; confirming keeps the booking as it was.
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-start">
        <div className="flex flex-col gap-4">
          <Panel flush>
            <PanelHeader
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {booking.reference}
                  <StatusBadge tone={statusTone[booking.status]}>
                    {statusLabel[booking.status]}
                  </StatusBadge>
                  <Badge variant={booking.segment === "b2b" ? "accent" : "neutral"} size="sm">
                    {SEGMENT_LABELS[booking.segment]}
                  </Badge>
                </span>
              }
              description={`${booking.productTitle} · ${PRODUCT_KIND_LABELS[booking.productKind]}`}
            />
            <PanelBody>
              <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Field
                  label="Customer"
                  value={
                    <>
                      {booking.customer.name}
                      <span className="block text-xs text-muted">{booking.customer.email}</span>
                    </>
                  }
                />
                {booking.customer.organizationName && (
                  <Field label="Booked by" value={booking.customer.organizationName} />
                )}
                <Field label="Merchant / provider" value={booking.merchant.name} />
                {booking.tripRef && (
                  <Field
                    label="Trip group"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Luggage className="size-3.5 text-muted" aria-hidden="true" />
                        {booking.tripRef}
                        <span className="text-xs text-muted">
                          · booked with other products
                        </span>
                      </span>
                    }
                  />
                )}
                <Field
                  label="Destination"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-muted" aria-hidden="true" />
                      {booking.destination}
                    </span>
                  }
                />
                <Field
                  label="Travel dates"
                  value={`${formatDate(booking.startAt)} → ${formatDate(booking.endAt)}`}
                />
                <Field
                  label={booking.nights > 0 ? "Nights / units" : "Units"}
                  value={booking.nights > 0 ? `${booking.nights} × ${booking.quantity}` : booking.quantity}
                />
                <Field label="Channel" value={<span className="capitalize">{booking.channel.replace(/_/g, " ")}</span>} />
                <Field
                  label="Invoice"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="size-3.5 text-muted" aria-hidden="true" />
                      {booking.invoiceNumber}
                    </span>
                  }
                />
                <Field label="Created" value={formatDateTime(booking.createdAt)} />
              </dl>

              <div className="mt-5 border-t border-line pt-4">
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <Users className="size-4 text-muted" aria-hidden="true" />
                  Travelers ({booking.travelers.length})
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {booking.travelers.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-pill bg-surface-muted px-3 py-1 text-sm text-body"
                    >
                      {t.fullName}
                      <span className="ml-1.5 text-xs text-muted">{t.type}</span>
                      {t.employeeRef && (
                        <span className="ml-1.5 text-xs text-muted">· {t.employeeRef}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 rounded-field bg-surface-muted/60 p-3">
                <p className="text-sm font-medium text-ink">
                  {policy.label} cancellation policy
                </p>
                <p className="mt-0.5 text-sm text-body">{policy.summary}</p>
              </div>
            </PanelBody>
          </Panel>

          <Panel flush>
            <PanelHeader
              title="Lifecycle & audit trail"
              description="Every status change, with who made it and why."
            />
            <PanelBody>
              <ol className="relative space-y-4 border-l border-line pl-5">
                {booking.timeline.map((event) => (
                  <li key={event.id} className="relative">
                    <span
                      aria-hidden="true"
                      className={
                        event.tone === "danger"
                          ? "absolute -left-[1.6rem] top-1 size-2.5 rounded-full bg-danger"
                          : event.tone === "success"
                            ? "absolute -left-[1.6rem] top-1 size-2.5 rounded-full bg-success"
                            : event.tone === "warning"
                              ? "absolute -left-[1.6rem] top-1 size-2.5 rounded-full bg-accent"
                              : "absolute -left-[1.6rem] top-1 size-2.5 rounded-full bg-muted"
                      }
                    />
                    <p className="text-sm font-medium text-ink">{event.label}</p>
                    {event.note && <p className="text-sm text-body">{event.note}</p>}
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" aria-hidden="true" />
                        {formatDateTime(event.at)}
                      </span>
                      <span>· {event.actor}</span>
                      {event.paymentStatus && (
                        <span>· payment: {paymentLabel[event.paymentStatus]}</span>
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            </PanelBody>
          </Panel>
        </div>

        <aside className="flex flex-col gap-4">
          {/* The commission's own lifecycle — accrued, finalised, settled,
              reversed — with the rule that decided the rate. */}
          <CommissionLifecycle booking={booking} />

          <Panel flush>
            <PanelHeader title="Money breakdown" description="Single source: the commission engine." />
            <PanelBody className="pt-3">
              <div className="divide-y divide-line">
                <div className="pb-2">
                  <MoneyRow label="Base amount" amount={m.base} currency={m.currency} />
                  {m.markup > 0 && (
                    <MoneyRow
                      label="Agency markup"
                      amount={m.markup}
                      currency={m.currency}
                      hint="B2B resale margin"
                    />
                  )}
                  {m.discount > 0 && (
                    <MoneyRow
                      label="Discount"
                      amount={m.discount}
                      currency={m.currency}
                      tone="negative"
                    />
                  )}
                  <MoneyRow label="Net sale" amount={m.netSale} currency={m.currency} />
                  {/* The rules that were live when this booking was priced — a
                      later rate change never rewrites what was charged. */}
                  {m.taxLines?.length ? (
                    m.taxLines.map((line) => (
                      <MoneyRow
                        key={line.ruleId}
                        label={line.name}
                        amount={line.amount}
                        currency={m.currency}
                        hint={
                          line.type === "inclusive"
                            ? "Included in the price"
                            : (line.rate !== undefined
                                ? `${line.rate}% of net sale`
                                : line.detail)
                        }
                      />
                    ))
                  ) : (
                    <MoneyRow label="Taxes" amount={m.taxes} currency={m.currency} />
                  )}
                  <MoneyRow label="Platform fee" amount={m.fees} currency={m.currency} />
                  {m.insurance > 0 && (
                    <MoneyRow
                      label="Travel insurance"
                      amount={m.insurance}
                      currency={m.currency}
                      hint="Demo policy — not commissionable"
                    />
                  )}
                </div>
                <div className="py-2">
                  <MoneyRow
                    label={booking.segment === "b2b" ? "Agency invoiced" : "Customer pays"}
                    amount={m.total}
                    currency={m.currency}
                    strong
                  />
                </div>
                <div className="py-2">
                  <MoneyRow
                    label="Platform commission"
                    amount={m.commission}
                    currency={m.currency}
                    hint={`${m.commissionRate}% of ${m.commissionBasis === "gross" ? "gross" : "net"} sale`}
                  />
                  {m.insuranceRevenue > 0 && (
                    <MoneyRow
                      label="Insurance commission"
                      amount={m.insuranceRevenue}
                      currency={m.currency}
                      hint={`${formatCurrency(m.insuranceProviderShare, m.currency)} to the provider`}
                    />
                  )}
                  {m.platformCancellationFee > 0 && (
                    <MoneyRow
                      label="Cancellation admin fee"
                      amount={m.platformCancellationFee}
                      currency={m.currency}
                    />
                  )}
                  {m.platformFundedDiscount > 0 && (
                    <MoneyRow
                      label="Platform-funded discount"
                      amount={m.platformFundedDiscount}
                      currency={m.currency}
                      tone="negative"
                      hint="Merchant made whole"
                    />
                  )}
                  <MoneyRow
                    label="Platform revenue"
                    amount={m.platformRevenue}
                    currency={m.currency}
                    hint="Commission + fees + insurance − subsidies"
                  />
                  <MoneyRow
                    label="Merchant earning"
                    amount={m.merchantEarning}
                    currency={m.currency}
                  />
                  {m.refunded > 0 && (
                    <>
                      <MoneyRow
                        label="Refunded"
                        amount={m.refunded}
                        currency={m.currency}
                        tone="negative"
                      />
                      <MoneyRow
                        label="Commission reversed"
                        amount={m.commissionReversed}
                        currency={m.currency}
                        tone="negative"
                      />
                    </>
                  )}
                </div>
                <div className="pt-2">
                  <MoneyRow
                    label="Net settlement"
                    amount={m.netSettlement}
                    currency={m.currency}
                    strong
                  />
                </div>
              </div>

              {booking.discounts.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-line pt-3">
                  {booking.discounts.map((d) => (
                    <li key={`${d.kind}-${d.ref}`} className="flex justify-between text-xs">
                      <span className="text-muted">
                        {d.kind === "combo" ? "Combo" : d.kind === "coupon" ? `Code ${d.ref}` : "Offer"}
                        : {d.label}
                      </span>
                      <span className="tabular-nums text-success">
                        −{formatCurrency(d.amount, m.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </PanelBody>
          </Panel>

          <Panel flush>
            <PanelHeader
              title={
                <span className="flex items-center gap-2">
                  <CreditCard className="size-4 text-muted" aria-hidden="true" />
                  Payment
                </span>
              }
            />
            <PanelBody className="space-y-3 pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-body">Status</span>
                <StatusBadge tone={paymentTone[booking.payment.status]}>
                  {paymentLabel[booking.payment.status]}
                </StatusBadge>
              </div>
              <dl className="grid gap-3">
                <Field label="Method" value={`${booking.payment.method} · ${booking.payment.instrument}`} />
                <Field label="Reference" value={booking.payment.reference} />
                {booking.payment.capturedAt && (
                  <Field label="Captured" value={formatDateTime(booking.payment.capturedAt)} />
                )}
                {booking.payment.gatewayRef && (
                  <Field label="Gateway ref" value={booking.payment.gatewayRef} />
                )}
              </dl>
              {booking.payment.failureMessage && (
                <Alert tone="danger" title="Payment failed">
                  {booking.payment.failureMessage}
                </Alert>
              )}
              {booking.refundIds.length > 0 && (
                <Link
                  href="/dashboard/finance/refunds"
                  className={buttonVariants({ variant: "outline", size: "sm", fullWidth: true })}
                >
                  <Receipt className="size-4" aria-hidden="true" />
                  View {booking.refundIds.length} refund
                  {booking.refundIds.length > 1 ? "s" : ""}
                </Link>
              )}
              {booking.settlementId && (
                <Link
                  href="/dashboard/finance/settlements"
                  className={buttonVariants({ variant: "outline", size: "sm", fullWidth: true })}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  View settlement
                </Link>
              )}
            </PanelBody>
          </Panel>
        </aside>
      </div>

      {/* Mark-as-failed: reason drives whether a refund is owed. */}
      <Modal
        open={failureOpen}
        onClose={() => setFailureOpen(false)}
        title="Mark booking as failed"
        description="A failure means the booking was never delivered — it is not a cancellation."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setFailureOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={transition.isPending}
              onClick={() => {
                const action = actions.find((a) => a.id === "mark_failed");
                if (action) void run(action, { failureReason, note: failureNote || undefined });
              }}
            >
              Mark as failed
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Failure reason"
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value as BookingFailureReason)}
            options={FAILURE_OPTIONS}
          />
          <Textarea
            label="Internal note"
            rows={3}
            placeholder="What happened, and what was communicated to the customer?"
            value={failureNote}
            onChange={(e) => setFailureNote(e.target.value)}
          />
          <Alert tone="info" title="What happens next">
            {failureReason === "payment_failed" || failureReason === "payment_declined"
              ? "The charge is marked failed. Nothing was captured, so no refund is created — the customer can retry payment."
              : "The captured payment stays captured and a refund becomes owed. Use “Initiate refund” to raise it."}
          </Alert>
        </div>
      </Modal>

      {/* Cancellation: always shows the refund quote before committing. */}
      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={cancelAction?.label ?? "Cancel booking"}
        description={`${policy.label} policy · ${policy.summary}`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={transition.isPending}
              onClick={() => {
                if (cancelAction) void run(cancelAction, { refundReason });
              }}
            >
              {cancelAction?.label ?? "Cancel booking"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Reason"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value as RefundReason)}
            options={REFUND_REASON_OPTIONS}
            hint="Platform-fault reasons refund in full and waive the cancellation fee."
          />

          {quote.isLoading && <p className="text-sm text-muted">Calculating refund…</p>}

          {q && (
            <div className="rounded-card border border-line p-4">
              <p className="text-sm font-medium text-ink">Refund estimate</p>
              <p className="mt-0.5 text-xs text-muted">
                {q.hoursUntilStart}h before travel · {Math.round(q.refundPercent * 100)}% of net
                sale refundable
              </p>
              <div className="mt-3 divide-y divide-line">
                {q.lines.map((line) => (
                  <MoneyRow
                    key={line.label}
                    label={line.label}
                    amount={line.amount}
                    currency={q.currency}
                    tone={line.tone === "negative" ? "negative" : undefined}
                  />
                ))}
                <div className="pt-1.5">
                  <MoneyRow
                    label="Customer receives"
                    amount={q.refundAmount}
                    currency={q.currency}
                    strong
                  />
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-xs">
                <div>
                  <dt className="text-muted">Commission reversed</dt>
                  <dd className="font-medium text-ink">
                    {formatCurrency(q.commissionReversed, q.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Merchant deduction</dt>
                  <dd className="font-medium text-ink">
                    {formatCurrency(q.merchantDeduction, q.currency)}
                  </dd>
                </div>
              </dl>
              {!q.eligible && (
                <Alert tone="warning" title="No refund due" className="mt-3">
                  <span className="flex items-start gap-1.5">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    {q.reason}
                  </span>
                </Alert>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
