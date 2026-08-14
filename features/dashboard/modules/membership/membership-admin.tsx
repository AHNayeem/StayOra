"use client";

import { useState } from "react";
import { BanknoteArrowDown, Check, Download, RefreshCw, X } from "lucide-react";
import { ResourceListView, RowActions } from "../../crud";
import {
  Alert,
  Badge,
  Button,
  CHART_COLORS,
  ChartCard,
  DonutChart,
  DropdownItem,
  Input,
  Modal,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { toast } from "@/lib/toast";
import { exportToCsv } from "../../lib/export-csv";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { PERIOD_LABELS, type MembershipPlan, type MembershipSubscription } from "../../domain/membership";
import {
  useCancelMembership,
  useMembershipPlans,
  useMembershipSummary,
  useRefundMembership,
  useRenewMembership,
  useSubscriptions,
  useUpdateMembershipPlan,
} from "./hooks";

/**
 * Premium membership administration.
 *
 * Membership is a platform revenue source in its own right — a price, a billing
 * period, an expiry and a set of benefits that checkout actually honours. It is
 * deliberately separate from loyalty tiers, which are earned rather than bought.
 * Renewal here is simulated; the prototype has no recurring billing.
 */
export function MembershipAdmin() {
  const summary = useMembershipSummary();
  const plans = useMembershipPlans();
  const update = useUpdateMembershipPlan();
  const cancel = useCancelMembership();
  const renew = useRenewMembership();
  const refund = useRefundMembership();
  const [editing, setEditing] = useState<MembershipPlan | null>(null);

  const list = useSubscriptions((row) => (
    <RowActions
      label={`Actions for ${row.customerName}`}
      extra={
        <Can anyPermission={["finance:update", "customers:update"]}>
          <DropdownItem
            icon={<RefreshCw />}
            onSelect={async () => {
              await renew.mutateAsync(row.id);
              toast.success(`${row.planName} renewed for ${row.customerName}`);
            }}
          >
            Simulate renewal
          </DropdownItem>
          {row.autoRenew && (
            <DropdownItem
              icon={<X />}
              onSelect={async () => {
                await cancel.mutateAsync(row.id);
                toast.success("Auto-renew cancelled — benefits run to the period end");
              }}
            >
              Cancel auto-renew
            </DropdownItem>
          )}
          {row.lifetimeRevenue > 0 && (
            <DropdownItem
              icon={<BanknoteArrowDown />}
              danger
              onSelect={async () => {
                await refund.mutateAsync({ id: row.id });
                toast.success("Membership refunded and revenue reversed");
              }}
            >
              Refund current period
            </DropdownItem>
          )}
        </Can>
      }
    />
  ));

  const s = summary.data;
  const currency = s?.currency ?? "USD";

  const handleExport = () => {
    exportToCsv<MembershipSubscription>("memberships", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Member", value: (r) => r.customerName },
      { header: "Email", value: (r) => r.customerEmail },
      { header: "Plan", value: (r) => r.planName },
      { header: "Billing", value: (r) => r.billingPeriod },
      { header: "Price", value: (r) => r.price.toFixed(2) },
      { header: "Started", value: (r) => formatDate(r.startAt) },
      { header: "Renews", value: (r) => formatDate(r.renewsAt) },
      { header: "Periods billed", value: (r) => r.periodsBilled },
      { header: "Lifetime revenue", value: (r) => r.lifetimeRevenue.toFixed(2) },
      { header: "Refunded", value: (r) => r.refunded.toFixed(2) },
      { header: "Status", value: (r) => r.status },
    ]);
    toast.success(`Exported ${list.rows.length} memberships`);
  };

  return (
    <div className="flex flex-col gap-5">
      <Alert tone="info" title="Renewal is simulated">
        There is no recurring billing in this prototype. &ldquo;Simulate renewal&rdquo;
        advances a subscription by one period and records the revenue, so the whole
        lifecycle can be demonstrated without a payment processor.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active members"
          icon="Crown"
          value={s ? formatNumber(s.active) : "—"}
          hint={s ? `${formatNumber(s.autoRenewing)} auto-renewing` : undefined}
        />
        <StatCard
          label="Membership revenue"
          icon="CircleDollarSign"
          value={s ? formatCurrency(s.revenue, currency) : "—"}
          hint={s ? `${formatCurrency(s.refunded, currency)} refunded` : undefined}
        />
        <StatCard
          label="Monthly recurring"
          icon="TrendingUp"
          value={s ? formatCurrency(s.mrr, currency) : "—"}
          hint="Annual plans counted at 1/12"
        />
        <StatCard
          label="Churn"
          icon="ArrowLeftRight"
          value={s ? formatNumber(s.cancelled + s.expired) : "—"}
          hint={s ? `${formatNumber(s.cancelled)} cancelled · ${formatNumber(s.expired)} expired` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel flush className="lg:col-span-2">
          <PanelHeader
            title="Plans"
            description="What each tier costs and what it grants. Benefits are honoured at checkout."
          />
          <PanelBody>
            <div className="grid gap-4 md:grid-cols-3">
              {(plans.data ?? []).map((plan) => (
                <div
                  key={plan.id}
                  className="flex flex-col rounded-card border border-line p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{plan.name}</p>
                      <p className="text-xs text-muted">{plan.tagline}</p>
                    </div>
                    {plan.code !== "free" && (
                      <Badge size="sm" variant={plan.code === "premium" ? "accent" : "neutral"}>
                        {plan.code}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-xl font-bold text-ink">
                    {plan.price > 0 ? formatCurrency(plan.price, "USD") : "Free"}
                    {plan.price > 0 && (
                      <span className="ml-1 text-xs font-normal text-muted">
                        {PERIOD_LABELS[plan.billingPeriod]}
                      </span>
                    )}
                  </p>
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {plan.benefits.perks.map((perk) => (
                      <li key={perk} className="flex gap-2 text-xs text-body">
                        <Check className="mt-0.5 size-3 shrink-0 text-primary" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <Can anyPermission={["finance:update"]}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setEditing(plan)}
                      disabled={plan.code === "free"}
                    >
                      Edit pricing
                    </Button>
                  </Can>
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>

        <ChartCard
          title="Members by plan"
          description="Active subscriptions"
          loading={summary.isLoading}
          empty={summary.isSuccess && !s?.byPlan.length}
        >
          <DonutChart
            data={(s?.byPlan ?? []).map((row, i) => ({
              name: row.name,
              value: row.members,
              color: [CHART_COLORS.accent, CHART_COLORS.primary, CHART_COLORS.teal][i % 3],
            }))}
            height={240}
            valueFormatter={(v) => `${formatNumber(v)} members`}
            centerLabel="Active"
            centerValue={s ? formatNumber(s.active) : undefined}
          />
        </ChartCard>
      </div>

      <ResourceListView<MembershipSubscription>
        list={list}
        searchPlaceholder="Search member, email or plan…"
        selectable={false}
        caption="Membership subscriptions"
        filterControls={
          <>
            <Select
              aria-label="Filter by status"
              value={list.filters.status ?? ""}
              onChange={(e) => list.setFilter("status", e.target.value)}
              options={[
                { value: "", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "cancelled", label: "Cancelled" },
                { value: "expired", label: "Expired" },
              ]}
              wrapperClassName="w-40"
            />
            <Select
              aria-label="Filter by plan"
              value={list.filters.planCode ?? ""}
              onChange={(e) => list.setFilter("planCode", e.target.value)}
              options={[
                { value: "", label: "All plans" },
                { value: "plus", label: "StayOra Plus" },
                { value: "premium", label: "StayOra Premium" },
              ]}
              wrapperClassName="w-44"
            />
          </>
        }
        primaryAction={
          <Can anyPermission={["finance:export", "finance:read"]}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="size-4" />}
              onClick={handleExport}
              disabled={list.rows.length === 0}
            >
              Export CSV
            </Button>
          </Can>
        }
      />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.name}` : ""}
        description="Price changes are audited with their before and after value."
      >
        {editing && (
          <PlanPricingForm
            plan={editing}
            pending={update.status === "pending"}
            onSubmit={async (input) => {
              await update.mutateAsync({ id: editing.id, input });
              toast.success("Membership plan updated");
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function PlanPricingForm({
  plan,
  pending,
  onSubmit,
}: {
  plan: MembershipPlan;
  pending: boolean;
  onSubmit: (input: Partial<MembershipPlan>) => void | Promise<void>;
}) {
  const [price, setPrice] = useState(String(plan.price));
  const [period, setPeriod] = useState(plan.billingPeriod);
  const [discount, setDiscount] = useState(String(plan.benefits.memberDiscountPercent));
  const [cap, setCap] = useState(String(plan.benefits.memberDiscountCap));
  const [waiver, setWaiver] = useState(String(plan.benefits.serviceFeeWaiver * 100));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          price: Number(price) || 0,
          billingPeriod: period,
          benefits: {
            ...plan.benefits,
            memberDiscountPercent: Number(discount) || 0,
            memberDiscountCap: Number(cap) || 0,
            serviceFeeWaiver: Math.min(1, Math.max(0, (Number(waiver) || 0) / 100)),
          },
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Price (USD)"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Select
          label="Billing period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as MembershipPlan["billingPeriod"])}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "annual", label: "Annual" },
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Member discount (%)"
          type="number"
          step="0.5"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          hint="Funded by the platform"
        />
        <Input
          label="Discount cap (USD)"
          type="number"
          step="1"
          value={cap}
          onChange={(e) => setCap(e.target.value)}
          hint="0 = uncapped"
        />
        <Input
          label="Service fee waived (%)"
          type="number"
          step="5"
          value={waiver}
          onChange={(e) => setWaiver(e.target.value)}
        />
      </div>
      <p className="text-xs text-muted">
        The member discount reduces platform revenue rather than the merchant&rsquo;s
        earning — the merchant is made whole for it.
      </p>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} loading={pending}>
          Save plan
        </Button>
      </div>
    </form>
  );
}
