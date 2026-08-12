"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Alert,
  CHART_COLORS,
  DonutChart,
  Panel,
  PanelBody,
  PanelHeader,
  StatCard,
  buttonVariants,
} from "../../ui";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "../../lib/format";
import { useRoleView } from "../../domain/use-domain";
import { useB2BSummary } from "./hooks";

/** The two commercial models, described as data so the copy stays in one place. */
const MODELS = [
  {
    id: "b2c",
    title: "B2C — direct customer",
    steps: [
      "Customer searches and selects a product",
      "Customer pays Otithee at checkout (card / wallet)",
      "Otithee confirms with the merchant and issues the voucher",
      "Platform keeps commission; merchant is settled on the payout cycle",
      "Refunds go back to the customer's original payment method",
    ],
  },
  {
    id: "b2b",
    title: "B2B — agency / corporate",
    steps: [
      "Agency searches the same inventory and sees its net rates",
      "Agency books on credit for a named traveller — no card at checkout",
      "Agency adds its markup and bills its own customer",
      "Otithee invoices the agency on agreed terms (net 7/15/30)",
      "Platform commission is charged on the net rate; refunds become credit notes",
    ],
  },
];

/**
 * B2B overview — the segment dashboard.
 *
 * Its job is to make the two business models legible side by side: the same
 * inventory, different pricing, different money flow, different documents. The
 * figures come from the same booking ledger as every other screen, filtered by
 * segment, so B2C and B2B are genuinely comparable.
 */
export function B2BOverview() {
  const { isAgency } = useRoleView();
  const summary = useB2BSummary();
  const s = summary.data;
  const currency = s?.currency ?? "USD";

  return (
    <div className="flex flex-col gap-5">
      {isAgency && (
        <Alert tone="info" title="You're viewing your own organization">
          Your account sees only its own bookings, invoices and credit position. Net rates
          and markup are set by your contract with Otithee.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="B2B bookings"
          icon="Handshake"
          value={s ? formatNumber(s.bookings) : "—"}
          hint={s ? `${formatNumber(s.b2cBookings)} B2C for comparison` : undefined}
        />
        <StatCard
          label="B2B booked value"
          icon="Wallet"
          value={s ? formatCurrency(s.b2bGmv, currency) : "—"}
          hint={s ? `Net rate value ${formatCurrency(s.netValue, currency)}` : undefined}
        />
        <StatCard
          label="Agency markup"
          icon="TrendingUp"
          value={s ? formatCurrency(s.markup, currency) : "—"}
          hint="Partner margin on resale"
        />
        <StatCard
          label="Platform commission"
          icon="Percent"
          value={s ? formatCurrency(s.commission, currency) : "—"}
          hint="Charged on the net rate"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel flush className="lg:col-span-2">
          <PanelHeader
            title="B2C vs B2B — how the money moves"
            description="Same inventory, two commercial models."
          />
          <PanelBody>
            <div className="grid gap-6 sm:grid-cols-2">
              {MODELS.map((model) => (
                <div key={model.id}>
                  <h3 className="text-sm font-semibold text-ink">{model.title}</h3>
                  <ol className="mt-3 space-y-2">
                    {model.steps.map((step, index) => (
                      <li key={step} className="flex gap-2.5 text-sm text-body">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-surface-muted text-[0.6875rem] font-semibold text-ink"
                        >
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>

        <Panel flush>
          <PanelHeader title="Segment mix" description="Booked value by segment" />
          <PanelBody>
            {s && (
              <DonutChart
                data={[
                  { name: "B2C", value: s.b2cGmv, color: CHART_COLORS.primary },
                  { name: "B2B", value: s.b2bGmv, color: CHART_COLORS.accent },
                ]}
                height={220}
                valueFormatter={(v) => formatCurrency(v, currency)}
                centerLabel="Total GMV"
                centerValue={formatCurrency(s.b2cGmv + s.b2bGmv, currency)}
              />
            )}
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <h3 className="text-sm font-semibold text-ink">Accounts</h3>
          <p className="mt-1 text-sm text-body">
            {s ? `${s.activeAccounts} active, ${s.pendingAccounts} awaiting approval` : "—"}
          </p>
          <Link
            href="/dashboard/b2b/accounts"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
          >
            Manage accounts
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Panel>
        <Panel>
          <h3 className="text-sm font-semibold text-ink">Bookings</h3>
          <p className="mt-1 text-sm text-body">
            {s ? `${s.bookings} bookings on credit` : "—"}
          </p>
          <Link
            href="/dashboard/b2b/bookings"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
          >
            View B2B bookings
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Panel>
        <Panel>
          <h3 className="text-sm font-semibold text-ink">Invoices</h3>
          <p className="mt-1 text-sm text-body">
            {s
              ? `${formatCurrency(s.outstanding, currency)} outstanding, ${formatCurrency(s.overdue, currency)} overdue`
              : "—"}
          </p>
          <Link
            href="/dashboard/b2b/invoices"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}
          >
            View invoices
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Panel>
      </div>
    </div>
  );
}
