"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { segmentMembers, segmentSizes } from "@/features/dashboard/domain";
import { useDomainValue } from "@/features/booking";
import { Alert, StatCard } from "../../ui";
import { formatCurrency, formatDate } from "../../lib/format";
import { cn } from "@/lib/utils";

/**
 * Customer segments — the CRM foundation.
 *
 * Nothing here is a stored list. Each segment is a rule evaluated against the
 * live booking history, membership state, abandoned checkouts and waitlist, so
 * a customer joins "lapsed" by not booking rather than by an import job. That
 * is what makes the counts trustworthy and what lets a campaign target them.
 */
export function SegmentsView() {
  const segments = useDomainValue(() => segmentSizes(), []) ?? [];
  const [active, setActive] = useState("all");
  const members = useDomainValue(() => segmentMembers(active).slice(0, 50), [active]) ?? [];

  const total = segments.find((s) => s.id === "all");

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Customers" value={String(total?.size ?? 0)} icon="Users" />
        <StatCard
          label="Lifetime value"
          value={formatCurrency(total?.value ?? 0, "USD")}
          icon="CircleDollarSign"
        />
        <StatCard
          label="Repeat guests"
          value={String(segments.find((s) => s.id === "repeat")?.size ?? 0)}
          icon="Repeat"
        />
        <StatCard
          label="Lapsed"
          value={String(segments.find((s) => s.id === "lapsed")?.size ?? 0)}
          icon="Clock"
        />
      </div>

      <Alert tone="info" title="Computed, not stored" className="mb-5">
        Segments are queries over the platform&apos;s own data — bookings, memberships,
        abandoned checkouts and the waitlist. Membership updates itself as customers behave
        differently, so a campaign always reaches who qualifies at send time.
      </Alert>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <ul className="flex flex-col gap-2">
          {segments.map((segment) => (
            <li key={segment.id}>
              <button
                type="button"
                onClick={() => setActive(segment.id)}
                aria-pressed={active === segment.id}
                className={cn(
                  "w-full rounded-card border px-4 py-3 text-left transition-colors",
                  active === segment.id
                    ? "border-primary bg-primary-50/60"
                    : "border-line bg-surface hover:border-primary/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-ink">{segment.name}</span>
                  <span className="text-sm font-semibold text-primary">{segment.size}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{segment.description}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatCurrency(segment.value, "USD")} lifetime value
                </p>
              </button>
            </li>
          ))}
        </ul>

        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">Segment members</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Bookings</th>
                <th className="px-4 py-3">Lifetime value</th>
                <th className="px-4 py-3">Last booked</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted">
                    <Users className="mx-auto mb-2 size-6" aria-hidden="true" />
                    Nobody is in this segment right now.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.email} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{member.name}</p>
                      <p className="text-xs text-muted">{member.email}</p>
                    </td>
                    <td className="px-4 py-3 text-body">{member.bookings}</td>
                    <td className="px-4 py-3 text-body">
                      {formatCurrency(member.lifetimeValue, "USD")}
                    </td>
                    <td className="px-4 py-3 text-body">
                      {member.lastBookingAt ? formatDate(member.lastBookingAt) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
