"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { UnifiedBookingList } from "@/components/booking/unified-booking-list";
import {
  UNIFIED_TYPE_LABEL,
  type UnifiedBookingType,
} from "@/features/booking/unified";
import { useUnifiedAdminBookings } from "@/features/booking/use-unified";
import { Alert, Panel, Select, StatCard } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { useDomainScope } from "../../domain/use-domain";

const TYPES: (UnifiedBookingType | "all")[] = ["all", "stay", "flight", "trip"];

/**
 * The operator's cross-vertical read view.
 *
 * Read-only on purpose: every action on a booking (confirm, cancel, refund,
 * amend) belongs to the vertical that owns it and stays on that vertical's own
 * screen. This view answers "what has been booked, across everything" — the one
 * question no single vertical's list can.
 *
 * Merchant scope is applied by {@link useUnifiedAdminBookings}, so a merchant
 * principal sees only their own rows here, exactly as elsewhere.
 */
export function UnifiedBookingsView() {
  const scope = useDomainScope();
  const rows = useUnifiedAdminBookings(scope);
  const [type, setType] = useState<UnifiedBookingType | "all">("all");

  const filtered = useMemo(
    () => (type === "all" ? rows : rows.filter((r) => r.type === type)),
    [rows, type],
  );

  const totals = useMemo(
    () => ({
      count: filtered.length,
      value: filtered.reduce((sum, r) => sum + r.total, 0),
      upcoming: filtered.filter(
        (r) => r.status === "confirmed" || r.status === "pending",
      ).length,
    }),
    [filtered],
  );

  return (
    <div className="flex flex-col gap-5">
      {scope.merchantId && (
        <Alert tone="info" title="Scoped to your properties">
          Flights and unified trips are sold by the platform, not by a merchant, so
          they are excluded from a merchant-scoped read.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Bookings" value={totals.count} icon="CalendarCheck" />
        <StatCard
          label="Gross value (USD)"
          value={totals.value.toLocaleString()}
          icon="Coins"
        />
        <StatCard label="Upcoming or pending" value={totals.upcoming} icon="Clock" />
      </div>

      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Info className="size-4" aria-hidden="true" />
            Read-only — open a booking in its own module to act on it.
          </p>
          <Select
            aria-label="Filter by booking type"
            value={type}
            onChange={(e) => setType(e.target.value as UnifiedBookingType | "all")}
            options={TYPES.map((value) => ({
              value,
              label: value === "all" ? "All types" : UNIFIED_TYPE_LABEL[value],
            }))}
            wrapperClassName="w-44"
          />
        </div>

        <UnifiedBookingList
          bookings={filtered}
          showCustomer
          money={(usd) => formatCurrency(usd, "USD")}
          date={(iso) => formatDate(iso)}
          emptyMessage="No bookings match this filter."
        />
      </Panel>
    </div>
  );
}
