"use client";

import { useState } from "react";
import { Button, Input, Select } from "../../ui";
import { formatCurrency } from "../../lib/format";
import { quoteInsurance, type InsurancePlan, type InsurancePlanInput } from "../../domain/insurance";

/**
 * Plan editor with a live split preview.
 *
 * The preview calls the same `quoteInsurance` a checkout does, so what an
 * operator sees here is exactly what a traveller would be charged and exactly
 * what the platform would keep.
 */
export function PlanEditor({
  plan,
  pending,
  onSubmit,
}: {
  plan: InsurancePlan;
  pending: boolean;
  onSubmit: (input: Partial<InsurancePlanInput>) => void | Promise<void>;
}) {
  const [price, setPrice] = useState(String(plan.price));
  const [commissionType, setCommissionType] = useState(plan.commissionType);
  const [commissionValue, setCommissionValue] = useState(String(plan.commissionValue));
  const [status, setStatus] = useState(plan.status);
  const [summary, setSummary] = useState(plan.summary);

  const draft: InsurancePlan = {
    ...plan,
    price: Number(price) || 0,
    commissionType,
    commissionValue: Number(commissionValue) || 0,
  };
  // A representative trip so the preview is comparable across plans.
  const preview = quoteInsurance(draft, { travelers: 2, tripValue: 1_200 });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          price: draft.price,
          commissionType,
          commissionValue: draft.commissionValue,
          status,
          summary: summary.trim(),
        });
      }}
    >
      <Input
        label="Summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label={plan.pricingModel === "percent_of_trip" ? "Rate (% of trip)" : "Premium (USD)"}
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          hint={
            plan.pricingModel === "per_traveler"
              ? "Charged per traveller"
              : plan.pricingModel === "percent_of_trip"
                ? "Percentage of the trip value"
                : "Charged once per booking"
          }
        />
        <Select
          label="Commission type"
          value={commissionType}
          onChange={(e) => setCommissionType(e.target.value as "percent" | "fixed")}
          options={[
            { value: "percent", label: "Percent of premium" },
            { value: "fixed", label: "Fixed per policy" },
          ]}
        />
        <Input
          label={commissionType === "percent" ? "Commission (%)" : "Commission (USD)"}
          type="number"
          step="0.01"
          value={commissionValue}
          onChange={(e) => setCommissionValue(e.target.value)}
        />
      </div>

      <Select
        label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value as InsurancePlan["status"])}
        options={[
          { value: "active", label: "Active — offered at checkout" },
          { value: "draft", label: "Draft — not offered" },
          { value: "retired", label: "Retired" },
        ]}
      />

      <div className="rounded-card border border-line bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Preview — 2 travellers, $1,200 trip
        </p>
        <dl className="mt-3 space-y-1.5">
          <PreviewLine label="Customer pays" value={preview.premium} strong />
          <PreviewLine label="Provider share" value={preview.providerShare} />
          <PreviewLine label="Platform revenue" value={preview.platformRevenue} accent />
        </dl>
        <p className="mt-2 text-xs text-muted">{preview.commissionExplanation}</p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} loading={pending}>
          Save plan
        </Button>
      </div>
    </form>
  );
}

function PreviewLine({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: number;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-body">{label}</dt>
      <dd
        className={
          accent
            ? "text-sm font-bold tabular-nums text-primary-700"
            : strong
              ? "text-sm font-semibold tabular-nums text-ink"
              : "text-sm tabular-nums text-body"
        }
      >
        {formatCurrency(value, "USD")}
      </dd>
    </div>
  );
}
