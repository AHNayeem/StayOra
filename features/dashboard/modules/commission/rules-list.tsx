"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  Modal,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  Switch,
  type ColumnDef,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { ConfirmDialog } from "../../crud";
import { toast } from "@/lib/toast";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  BASIS_LABELS,
  CALC_LABELS,
  COMMISSION_SCOPES,
  SCOPE_LABELS,
  describeRule,
  type CommissionCalc,
  type CommissionRule,
  type CommissionRuleInput,
  type CommissionScope,
} from "../../domain/commission-rules";
import type { CommissionBasis, ProductKind } from "../../domain/types";
import { MERCHANTS } from "../../domain/seed";
import { RATE_PLAN_LIST } from "../../domain/inventory";
import { PRODUCT_KIND_LABELS } from "../bookings/types";
import {
  useCommissionPreview,
  useCommissionRules,
  useCreateCommissionRule,
  useDeleteCommissionRule,
  useUpdateCommissionRule,
} from "./rules-hooks";

const STATUS_TONES = {
  active: "success",
  scheduled: "info",
  expired: "neutral",
  disabled: "warning",
} as const;

/** Targets a scope can point at, so the form never asks for a free-text id. */
function targetOptions(scope: CommissionScope): { value: string; label: string }[] {
  switch (scope) {
    case "vertical":
      return Object.entries(PRODUCT_KIND_LABELS).map(([value, label]) => ({
        value,
        label: String(label),
      }));
    case "merchant":
      return MERCHANTS.map((m) => ({ value: m.id, label: m.name }));
    case "rate_plan":
      return RATE_PLAN_LIST.map((p) => ({ value: p.id, label: p.name }));
    default:
      return [];
  }
}

const EMPTY_RULE: CommissionRuleInput = {
  name: "",
  scope: "vertical",
  targetId: "hotels",
  targetLabel: "Hotels",
  calc: "percent",
  percent: 12,
  fixedFee: 0,
  minFee: 0,
  maxFee: 0,
  basis: "net",
  effectiveFrom: new Date().toISOString().slice(0, 10),
  status: "active",
  note: "",
};

/**
 * Commission configuration.
 *
 * A rule can target a vertical, a merchant, a product, a rate plan, a B2B
 * account or an insurance plan, charge a percentage and/or a flat fee, be
 * floored and capped, be measured against gross or net, and apply only between
 * two dates. The most specific active rule wins — and the simulator below shows
 * exactly which one would, and why, before anything is saved.
 */
export function CommissionRulesList() {
  const rules = useCommissionRules();
  const create = useCreateCommissionRule();
  const update = useUpdateCommissionRule();
  const remove = useDeleteCommissionRule();

  const [editing, setEditing] = useState<CommissionRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CommissionRule | null>(null);

  const rows = useMemo(() => rules.data ?? [], [rules.data]);
  const counts = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      scheduled: rows.filter((r) => r.status === "scheduled").length,
      overrides: rows.filter((r) => r.scope !== "vertical").length,
    }),
    [rows],
  );

  const columns: ColumnDef<CommissionRule>[] = [
    {
      id: "name",
      header: "Rule",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.name}</p>
          {row.note && <p className="truncate text-xs text-muted">{row.note}</p>}
        </div>
      ),
    },
    {
      id: "scope",
      header: "Applies to",
      cell: (row) => (
        <div className="min-w-0">
          <Badge size="sm" variant={row.scope === "vertical" ? "neutral" : "accent"}>
            {SCOPE_LABELS[row.scope]}
          </Badge>
          <p className="mt-1 truncate text-xs text-muted">{row.targetLabel}</p>
        </div>
      ),
    },
    {
      id: "charge",
      header: "Charge",
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium tabular-nums text-ink">{describeRule(row)}</p>
          <p className="truncate text-xs text-muted">{BASIS_LABELS[row.basis]}</p>
        </div>
      ),
    },
    {
      id: "window",
      header: "Effective",
      cell: (row) => (
        <div className="text-xs text-body">
          <p>{formatDate(row.effectiveFrom)}</p>
          <p className="text-muted">
            {row.effectiveTo ? `until ${formatDate(row.effectiveTo)}` : "open-ended"}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "w-28",
      cell: (row) => (
        <StatusBadge tone={STATUS_TONES[row.status]}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </StatusBadge>
      ),
    },
    {
      id: "actions",
      header: "",
      width: "w-px",
      align: "right",
      cell: (row) => (
        <Can anyPermission={["finance:update"]}>
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Edit ${row.name}`}
              onClick={() => setEditing(row)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Delete ${row.name}`}
              onClick={() => setDeleting(row)}
            >
              <Trash2 className="size-4 text-danger" />
            </Button>
          </div>
        </Can>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rules" icon="Percent" value={counts.total} hint="Across every scope" />
        <StatCard label="Active now" icon="CircleCheck" value={counts.active} />
        <StatCard label="Scheduled" icon="Clock" value={counts.scheduled} hint="Future effective dates" />
        <StatCard
          label="Negotiated overrides"
          icon="Handshake"
          value={counts.overrides}
          hint="Beat the published vertical rate"
        />
      </div>

      <Alert tone="info" title="How a rate is decided">
        The most specific rule wins: insurance plan → B2B account → rate plan → product →
        merchant → vertical. Ties break on the most recent effective date. If nothing
        matches, the merchant&rsquo;s negotiated rate applies, then the platform default.
      </Alert>

      <CommissionSimulator />

      <Panel flush>
        <PanelHeader
          title="Commission rules"
          description="Every rate the platform charges, in one place."
          actions={
            <Can anyPermission={["finance:create", "finance:update"]}>
              <Button
                size="sm"
                leftIcon={<Plus className="size-4" />}
                onClick={() => setCreating(true)}
              >
                New rule
              </Button>
            </Can>
          }
        />
        <DataTable<CommissionRule>
          columns={columns}
          rows={rows}
          getRowId={(row) => row.id}
          loading={rules.isLoading}
          caption="Commission rules"
          emptyState={
            <EmptyState
              title="No commission rules"
              description="Without a rule the platform falls back to the merchant's negotiated rate."
            />
          }
        />
      </Panel>

      <Modal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        size="lg"
        title={editing ? `Edit ${editing.name}` : "New commission rule"}
        description="Changing a commission rate is audited with its before and after value."
      >
        <RuleForm
          initial={editing ?? EMPTY_RULE}
          pending={create.status === "pending" || update.status === "pending"}
          onSubmit={async (values) => {
            if (editing) {
              await update.mutateAsync({ id: editing.id, input: values });
              toast.success("Commission rule updated");
            } else {
              await create.mutateAsync(values);
              toast.success("Commission rule created");
            }
            setCreating(false);
            setEditing(null);
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this commission rule?"
        message={
          deleting
            ? `Bookings for ${deleting.targetLabel} will fall back to the next matching rule.`
            : ""
        }
        confirmLabel="Delete rule"
        tone="danger"
        onConfirm={async () => {
          if (!deleting) return;
          await remove.mutateAsync(deleting.id);
          toast.success("Commission rule deleted");
          setDeleting(null);
        }}
      />
    </div>
  );
}

/**
 * The simulator — enter a hypothetical sale and see which rule wins, what it
 * charges and what the merchant is left with. This is the same
 * `resolveCommission` the booking engine calls, so what it shows is what a real
 * booking would be charged.
 */
function CommissionSimulator() {
  const [productKind, setProductKind] = useState<ProductKind>("hotels");
  const [merchantId, setMerchantId] = useState(MERCHANTS[0].id);
  const [gross, setGross] = useState("1000");
  const [discount, setDiscount] = useState("100");

  const grossValue = Number(gross) || 0;
  const net = Math.max(0, grossValue - (Number(discount) || 0));
  const merchant = MERCHANTS.find((m) => m.id === merchantId);

  const preview = useCommissionPreview({
    productKind,
    merchantId,
    gross: grossValue,
    net,
    merchantRate: merchant?.commissionRate,
  });
  const resolution = preview.data?.resolution;

  return (
    <Panel flush>
      <PanelHeader
        title="Rate simulator"
        description="Which rule would apply, and what the split would be."
      />
      <PanelBody>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Vertical"
            value={productKind}
            onChange={(e) => setProductKind(e.target.value as ProductKind)}
            options={Object.entries(PRODUCT_KIND_LABELS).map(([value, label]) => ({
              value,
              label: String(label),
            }))}
          />
          <Select
            label="Merchant"
            value={merchantId}
            onChange={(e) => setMerchantId(e.target.value)}
            options={MERCHANTS.map((m) => ({ value: m.id, label: m.name }))}
          />
          <Input
            label="Gross sale (USD)"
            type="number"
            value={gross}
            onChange={(e) => setGross(e.target.value)}
          />
          <Input
            label="Discount (USD)"
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </div>

        {resolution && (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-ink">{resolution.ruleName}</p>
              <p className="mt-1 text-sm text-body">{resolution.explanation}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge size="sm" variant="accent">
                  {resolution.scope === "default" ? "Fallback" : SCOPE_LABELS[resolution.scope]}
                </Badge>
                <Badge size="sm">{BASIS_LABELS[resolution.basis]}</Badge>
                {resolution.minFeeApplied && (
                  <Badge size="sm" variant="danger">
                    Minimum fee applied
                  </Badge>
                )}
                {resolution.maxFeeApplied && (
                  <Badge size="sm" variant="danger">
                    Capped
                  </Badge>
                )}
              </div>
              {(preview.data?.candidates.length ?? 0) > 1 && (
                <p className="mt-3 text-xs text-muted">
                  {preview.data!.candidates.length} rules matched; the most specific won.
                </p>
              )}
            </div>

            <dl className="space-y-2">
              <SimLine label="Gross sale" value={grossValue} />
              <SimLine label="Discount" value={-(Number(discount) || 0)} />
              <SimLine label="Net sale (commission base)" value={resolution.basisAmount} />
              <SimLine
                label={`Platform commission (${resolution.rate}%)`}
                value={resolution.commission}
                tone="positive"
              />
              {resolution.fixedComponent > 0 && (
                <SimLine label="— of which fixed fee" value={resolution.fixedComponent} muted />
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
                <dt className="text-sm font-semibold text-ink">Merchant earning</dt>
                <dd className="text-sm font-bold tabular-nums text-ink">
                  {formatCurrency(net - resolution.commission, "USD")}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

function SimLine({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: number;
  tone?: "positive";
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={muted ? "text-xs text-muted" : "text-sm text-body"}>{label}</dt>
      <dd
        className={
          tone === "positive"
            ? "text-sm font-semibold tabular-nums text-primary-700"
            : muted
              ? "text-xs tabular-nums text-muted"
              : "text-sm tabular-nums text-ink"
        }
      >
        {formatCurrency(value, "USD")}
      </dd>
    </div>
  );
}

function RuleForm({
  initial,
  pending,
  onSubmit,
}: {
  initial: CommissionRuleInput;
  pending: boolean;
  onSubmit: (values: CommissionRuleInput) => void | Promise<void>;
}) {
  const [values, setValues] = useState<CommissionRuleInput>({
    ...initial,
    effectiveFrom: initial.effectiveFrom.slice(0, 10),
    effectiveTo: initial.effectiveTo?.slice(0, 10),
  });

  const set = <K extends keyof CommissionRuleInput>(key: K, value: CommissionRuleInput[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const options = targetOptions(values.scope);
  const valid = values.name.trim().length > 2 && values.targetId.trim().length > 0;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        void onSubmit({
          ...values,
          name: values.name.trim(),
          targetLabel:
            options.find((o) => o.value === values.targetId)?.label ??
            (values.targetLabel || values.targetId),
          effectiveFrom: new Date(`${values.effectiveFrom}T00:00:00.000Z`).toISOString(),
          effectiveTo: values.effectiveTo
            ? new Date(`${values.effectiveTo}T23:59:59.999Z`).toISOString()
            : undefined,
        });
      }}
    >
      <Input
        label="Rule name"
        required
        value={values.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="e.g. Hotels — standard rate"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Applies to"
          value={values.scope}
          onChange={(e) => {
            const scope = e.target.value as CommissionScope;
            const first = targetOptions(scope)[0];
            setValues((prev) => ({
              ...prev,
              scope,
              targetId: first?.value ?? "",
              targetLabel: first?.label ?? "",
            }));
          }}
          options={COMMISSION_SCOPES.map((s) => ({ value: s, label: SCOPE_LABELS[s] }))}
        />
        {options.length > 0 ? (
          <Select
            label="Target"
            value={values.targetId}
            onChange={(e) => set("targetId", e.target.value)}
            options={options}
          />
        ) : (
          <Input
            label="Target id"
            required
            value={values.targetId}
            onChange={(e) => set("targetId", e.target.value)}
            hint="Account, product or plan id this rule governs."
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Calculation"
          value={values.calc}
          onChange={(e) => set("calc", e.target.value as CommissionCalc)}
          options={Object.entries(CALC_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <Select
          label="Measured against"
          value={values.basis}
          onChange={(e) => set("basis", e.target.value as CommissionBasis)}
          options={Object.entries(BASIS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Input
          label="Percent"
          type="number"
          step="0.1"
          value={values.percent}
          disabled={values.calc === "fixed"}
          onChange={(e) => set("percent", Number(e.target.value))}
        />
        <Input
          label="Fixed fee"
          type="number"
          step="0.01"
          value={values.fixedFee}
          disabled={values.calc === "percent"}
          onChange={(e) => set("fixedFee", Number(e.target.value))}
        />
        <Input
          label="Minimum fee"
          type="number"
          step="0.01"
          value={values.minFee}
          onChange={(e) => set("minFee", Number(e.target.value))}
          hint="0 = none"
        />
        <Input
          label="Maximum fee"
          type="number"
          step="0.01"
          value={values.maxFee}
          onChange={(e) => set("maxFee", Number(e.target.value))}
          hint="0 = uncapped"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Effective from"
          type="date"
          required
          value={values.effectiveFrom}
          onChange={(e) => set("effectiveFrom", e.target.value)}
        />
        <Input
          label="Effective to"
          type="date"
          value={values.effectiveTo ?? ""}
          onChange={(e) => set("effectiveTo", e.target.value || undefined)}
          hint="Leave empty for open-ended"
        />
      </div>

      <Input
        label="Note"
        value={values.note ?? ""}
        onChange={(e) => set("note", e.target.value)}
        placeholder="Why this rate was agreed"
      />

      <Switch
        label="Enabled"
        checked={values.status !== "disabled"}
        onChange={(e) => set("status", e.target.checked ? "active" : "disabled")}
        hint="A disabled rule never applies, whatever its dates say."
      />

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!valid || pending} loading={pending}>
          Save rule
        </Button>
      </div>
    </form>
  );
}
