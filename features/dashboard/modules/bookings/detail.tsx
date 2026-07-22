"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  Alert,
  Button,
  buttonVariants,
  Panel,
  PanelBody,
  PanelHeader,
  StatusBadge,
  EmptyState,
  ErrorState,
  FormSkeleton,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { useBooking, useDeleteBooking } from "./hooks";
import { BOOKING_STATUSES } from "./types";

const statusTone = toneMap(BOOKING_STATUSES);
const statusLabel = labelMap(BOOKING_STATUSES);

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

/** Booking detail — loads one booking and renders its summary, guest and meta. */
export function BookingDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: booking, isLoading, isError, error, refetch } = useBooking(id);
  const del = useDeleteBooking();

  if (isLoading) return <FormSkeleton />;

  if (isError) {
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

  const handleDelete = async () => {
    await del.mutateAsync(booking.id);
    router.push("/dashboard/bookings");
  };

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
        <Can permissions={["bookings:delete"]}>
          <Button
            variant="danger"
            size="sm"
            loading={del.isPending}
            leftIcon={<Trash2 className="size-4" />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Can>
      </div>

      {del.isError && (
        <Alert tone="danger" title="Couldn't delete booking">
          Please try again.
        </Alert>
      )}

      <Panel flush>
        <PanelHeader
          title={
            <span className="flex items-center gap-3">
              {booking.reference}
              <StatusBadge tone={statusTone[booking.status]}>
                {statusLabel[booking.status]}
              </StatusBadge>
            </span>
          }
          description={`${booking.property} · ${booking.propertyType}`}
        />
        <PanelBody>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Guest" value={booking.guestName} />
            <Field label="Email" value={booking.guestEmail} />
            <Field label="Guests" value={booking.guests} />
            <Field label="Check-in" value={formatDate(booking.checkIn)} />
            <Field label="Check-out" value={formatDate(booking.checkOut)} />
            <Field label="Nights" value={booking.nights} />
            <Field
              label="Amount"
              value={
                <span className="font-semibold">
                  {formatCurrency(booking.amount, booking.currency)}
                </span>
              }
            />
            <Field label="Channel" value={booking.channel} />
            <Field label="Created" value={formatDateTime(booking.createdAt)} />
          </dl>
        </PanelBody>
      </Panel>

      <Panel>
        <h2 className="text-base font-semibold text-ink">Timeline &amp; audit</h2>
        <p className="mt-1 text-sm text-body">
          Reservation events, invoice, refund and rebook actions attach here once
          the backend is connected.
        </p>
      </Panel>
    </div>
  );
}
