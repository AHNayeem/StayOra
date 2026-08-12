import type { TripStatus } from "@/types/trip";
import type { BookingStatus } from "@/features/dashboard/domain/types";
import { BOOKING_STATUSES } from "@/features/dashboard/domain/lifecycle";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

/**
 * Status pills for a trip and its components.
 *
 * The component pill reads its label straight from the platform's
 * {@link BOOKING_STATUSES} registry, so a booking shows the same words to the
 * traveller as it does to the admin looking at the same record.
 */

const TRIP_STATUS_COPY: Record<TripStatus, { label: string; variant: BadgeVariant }> = {
  confirmed: { label: "Confirmed", variant: "success" },
  partially_confirmed: { label: "Partially confirmed", variant: "accent" },
  pending: { label: "Pending", variant: "neutral" },
  failed: { label: "Failed", variant: "danger" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  refund_pending: { label: "Refund pending", variant: "accent" },
  completed: { label: "Completed", variant: "outline" },
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const copy = TRIP_STATUS_COPY[status];
  return (
    <Badge variant={copy.variant} size="md">
      {copy.label}
    </Badge>
  );
}

const TONE_TO_VARIANT: Record<string, BadgeVariant> = {
  success: "success",
  warning: "accent",
  danger: "danger",
  info: "primary",
  neutral: "neutral",
};

export function ComponentStatusBadge({ status }: { status: BookingStatus }) {
  const def = BOOKING_STATUSES.find((s) => s.value === status);
  return (
    <Badge variant={TONE_TO_VARIANT[def?.tone ?? "neutral"] ?? "neutral"} size="sm">
      {def?.label ?? status}
    </Badge>
  );
}
