"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { ResourceListView } from "../../crud";
import {
  Alert,
  Button,
  CHART_COLORS,
  CategoryBarChart,
  ChartCard,
  DonutChart,
  Modal,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  Tabs,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { toast } from "@/lib/toast";
import { exportToCsv } from "../../lib/export-csv";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "../../lib/format";
import {
  COVERAGE_LABELS,
  INSURANCE_DISCLAIMER,
  TIER_LABELS,
  type InsurancePlan,
  type InsurancePolicy,
} from "../../domain/insurance";
import {
  useInsurancePlans,
  useInsurancePolicies,
  useInsuranceSummary,
  useUpdateInsurancePlan,
} from "./hooks";
import { PlanEditor } from "./plan-editor";

/**
 * Insurance administration.
 *
 * Shows the attach product as a business: how many bookings take a policy, what
 * the customer paid, what the demo provider is owed and what the platform kept.
 * The commission terms are editable here, and a plan-scoped commission rule (in
 * Finance → Commission → Rules) overrides them.
 */
export function InsuranceAdmin() {
  const summary = useInsuranceSummary();
  const plans = useInsurancePlans();
  const policies = useInsurancePolicies();
  const update = useUpdateInsurancePlan();
  const [tab, setTab] = useState("policies");
  const [editing, setEditing] = useState<InsurancePlan | null>(null);

  const s = summary.data;
  const currency = s?.currency ?? "USD";

  const handleExport = () => {
    exportToCsv<InsurancePolicy>("insurance-policies", policies.rows, [
      { header: "Policy", value: (r) => r.reference },
      { header: "Booking", value: (r) => r.bookingRef },
      { header: "Plan", value: (r) => r.planName },
      { header: "Provider", value: (r) => r.providerName },
      { header: "Tier", value: (r) => TIER_LABELS[r.tier] },
      { header: "Customer", value: (r) => r.customerName },
      { header: "Travellers", value: (r) => r.travelers },
      { header: "Premium", value: (r) => r.premium.toFixed(2) },
      { header: "Provider share", value: (r) => r.providerShare.toFixed(2) },
      { header: "Platform revenue", value: (r) => r.platformRevenue.toFixed(2) },
      { header: "Refunded", value: (r) => r.refunded.toFixed(2) },
      { header: "Revenue reversed", value: (r) => r.revenueReversed.toFixed(2) },
      { header: "Status", value: (r) => r.status },
      { header: "Sold", value: (r) => formatDate(r.purchasedAt) },
    ]);
    toast.success(`Exported ${policies.rows.length} policies`);
  };

  return (
    <div className="flex flex-col gap-5">
      <Alert tone="warning" title="Demo insurance products">
        {INSURANCE_DISCLAIMER} No underwriter is connected, no policy document is issued
        and no claim can be made. The plans exist so the marketplace economics can be
        demonstrated end to end.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross premium"
          icon="ShieldCheck"
          value={s ? formatCurrency(s.grossPremium, currency) : "—"}
          hint={s ? `${formatNumber(s.policies)} policies sold` : undefined}
        />
        <StatCard
          label="Provider payable"
          icon="Handshake"
          value={s ? formatCurrency(s.providerPayable, currency) : "—"}
          hint="Owed to the demo underwriters"
        />
        <StatCard
          label="Platform revenue"
          icon="CircleDollarSign"
          value={s ? formatCurrency(s.platformRevenue, currency) : "—"}
          hint={s ? `${formatCurrency(s.refunded, currency)} refunded` : undefined}
        />
        <StatCard
          label="Attach rate"
          icon="TrendingUp"
          value={s ? formatPercent(s.attachRate) : "—"}
          hint="Bookings that took a policy"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Platform revenue by plan"
          description="Net of refund reversals"
          loading={summary.isLoading}
          empty={summary.isSuccess && !s?.byPlan.length}
        >
          <CategoryBarChart
            data={(s?.byPlan ?? []).map((r) => ({ name: r.label, value: r.value }))}
            xKey="name"
            valueKey="value"
            label="Platform revenue"
            horizontal
            height={260}
            valueFormatter={(v) => formatCurrency(v, currency)}
          />
        </ChartCard>
        <ChartCard
          title="By tier"
          description="Which cover level sells"
          loading={summary.isLoading}
          empty={summary.isSuccess && !s?.byTier.length}
        >
          <DonutChart
            data={(s?.byTier ?? []).map((r, i) => ({
              name: TIER_LABELS[r.key as keyof typeof TIER_LABELS] ?? r.label,
              value: r.value,
              color: [CHART_COLORS.primary, CHART_COLORS.accent, CHART_COLORS.violet][i % 3],
            }))}
            height={240}
            valueFormatter={(v) => formatCurrency(v, currency)}
            centerLabel="Platform revenue"
            centerValue={s ? formatCurrency(s.platformRevenue, currency) : undefined}
          />
        </ChartCard>
      </div>

      <Panel flush>
        <PanelHeader
          title="Insurance"
          description="Plans, their commercial terms, and every policy sold."
          actions={
            <div className="flex gap-2">
              <Tabs
                items={[
                  { key: "policies", label: "Policies" },
                  { key: "plans", label: "Plans" },
                ]}
                value={tab}
                onValueChange={setTab}
                variant="pill"
                renderPanels={false}
              />
              {tab === "policies" && (
                <Can anyPermission={["finance:export", "finance:read"]}>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Download className="size-4" />}
                    onClick={handleExport}
                    disabled={policies.rows.length === 0}
                  >
                    Export CSV
                  </Button>
                </Can>
              )}
            </div>
          }
        />
        <PanelBody className="pt-0">
          {tab === "policies" ? (
            <ResourceListView<InsurancePolicy>
              list={policies}
              searchPlaceholder="Search policy, booking or customer…"
              selectable={false}
              caption="Insurance policies"
              filterControls={
                <Select
                  aria-label="Filter by status"
                  value={policies.filters.status ?? ""}
                  onChange={(e) => policies.setFilter("status", e.target.value)}
                  options={[
                    { value: "", label: "All statuses" },
                    { value: "active", label: "Active" },
                    { value: "refunded", label: "Refunded" },
                    { value: "cancelled", label: "Cancelled" },
                    { value: "expired", label: "Expired" },
                  ]}
                  wrapperClassName="w-44"
                />
              }
            />
          ) : (
            <ResourceListView<InsurancePlan>
              list={plans}
              searchPlaceholder="Search plan or provider…"
              selectable={false}
              caption="Insurance plans"
              onRowClick={(row) => setEditing(row)}
            />
          )}
        </PanelBody>
      </Panel>

      {tab === "plans" && (
        <Panel flush>
          <PanelHeader
            title="What each plan covers"
            description="Illustrative limits only — no real cover is provided."
          />
          <PanelBody>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(plans.rows ?? []).map((plan) => (
                <div key={plan.id} className="rounded-card border border-line p-4">
                  <p className="text-sm font-semibold text-ink">{plan.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{plan.summary}</p>
                  <ul className="mt-3 space-y-1.5">
                    {plan.coverage.map((item) => (
                      <li
                        key={item.key}
                        className="flex items-baseline justify-between gap-2 text-xs"
                      >
                        <span className={item.limit > 0 ? "text-body" : "text-muted line-through"}>
                          {COVERAGE_LABELS[item.key] ?? item.label}
                        </span>
                        <span className="shrink-0 tabular-nums text-ink">
                          {item.limit > 0
                            ? formatCurrency(item.limit, "USD")
                            : (item.note ?? "—")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing ? `Edit ${editing.name}` : ""}
        description="Changes to a plan's price or commission are audited."
      >
        {editing && (
          <PlanEditor
            plan={editing}
            pending={update.status === "pending"}
            onSubmit={async (input) => {
              await update.mutateAsync({ id: editing.id, input });
              toast.success("Insurance plan updated");
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
