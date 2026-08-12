"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { ResourceListView, RowActions } from "../../crud";
import {
  Alert,
  Button,
  Drawer,
  DropdownItem,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  buttonVariants,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, statusOptions, toneMap } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { getErrorMessage } from "../../data";
import { toast } from "@/lib/toast";
import { priceB2B } from "../../domain/money";
import type { B2BAccount, B2BAccountStatus } from "../../domain/types";
import { useRbac } from "../../rbac/rbac-provider";
import {
  useB2BAccounts,
  useB2BSummary,
  useCreditStatus,
  useUpdateB2BAccount,
} from "./hooks";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_OPTIONS,
  B2B_ACCOUNT_STATUSES,
  SETTLEMENT_TERM_LABELS,
} from "./types";

const statusLabel = labelMap(B2B_ACCOUNT_STATUSES);
const statusTone = toneMap(B2B_ACCOUNT_STATUSES);

/** Sample rate used to demonstrate an account's net-rate + markup build-up. */
const SAMPLE_PUBLIC_RATE = 1000;

const STATUS_ACTIONS: { to: B2BAccountStatus; label: string; danger?: boolean }[] = [
  { to: "active", label: "Approve / activate" },
  { to: "suspended", label: "Suspend", danger: true },
  { to: "closed", label: "Close account", danger: true },
];

/**
 * B2B accounts — agencies, corporates and tour operators.
 *
 * The drawer is where the B2B model becomes concrete: the negotiated net-rate
 * discount and markup are run through {@link priceB2B} on a sample rate, so you
 * can see exactly what the agency is charged, what their customer pays and what
 * the platform still earns — next to the account's live credit position.
 */
export function B2BAccountsList() {
  const { can } = useRbac();
  const summary = useB2BSummary();
  const update = useUpdateB2BAccount();
  const [selected, setSelected] = useState<B2BAccount | null>(null);
  const credit = useCreditStatus(selected?.id);
  const canManage = can("b2b:update");

  const setStatus = async (account: B2BAccount, status: B2BAccountStatus) => {
    try {
      await update.mutateAsync({ id: account.id, input: { status } });
      toast.success(`${account.name} → ${statusLabel[status]}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const list = useB2BAccounts((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onView={() => setSelected(row)}
      viewPermission={["b2b:read"]}
      extra={
        canManage
          ? STATUS_ACTIONS.filter((a) => a.to !== row.status).map((action) => (
              <DropdownItem
                key={action.to}
                danger={action.danger}
                disabled={update.isPending}
                onSelect={() => void setStatus(row, action.to)}
              >
                {action.label}
              </DropdownItem>
            ))
          : null
      }
    />
  ));

  const { status = "", type = "" } = list.filters;
  const activeFilters: ActiveFilter[] = [
    status && { key: "status", label: `Status: ${statusLabel[status as B2BAccountStatus]}` },
    type && { key: "type", label: `Type: ${ACCOUNT_TYPE_LABELS[type as B2BAccount["type"]]}` },
  ].filter(Boolean) as ActiveFilter[];

  const handleExport = () => {
    exportToCsv<B2BAccount>("b2b-accounts", list.rows, [
      { header: "Name", value: (r) => r.name },
      { header: "Code", value: (r) => r.code },
      { header: "Type", value: (r) => ACCOUNT_TYPE_LABELS[r.type] },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Country", value: (r) => r.country },
      { header: "Contact", value: (r) => `${r.contactName} <${r.contactEmail}>` },
      { header: "Net rate discount", value: (r) => `${r.netRateDiscount}%` },
      { header: "Default markup", value: (r) => `${r.defaultMarkupRate}%` },
      { header: "Credit limit", value: (r) => formatCurrency(r.creditLimit, r.currency) },
      { header: "Credit used", value: (r) => formatCurrency(r.creditUsed, r.currency) },
      { header: "Terms", value: (r) => SETTLEMENT_TERM_LABELS[r.settlementTerm] },
    ]);
    toast.success(`Exported ${list.rows.length} accounts`);
  };

  const s = summary.data;
  const rates = selected
    ? priceB2B({
        publicRate: SAMPLE_PUBLIC_RATE,
        netRateDiscount: selected.netRateDiscount,
        markupRate: selected.defaultMarkupRate,
      })
    : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active accounts"
          icon="Handshake"
          value={s?.activeAccounts ?? "—"}
          hint={s ? `${s.pendingAccounts} pending approval` : undefined}
        />
        <StatCard
          label="Credit extended"
          icon="Landmark"
          value={s ? formatCurrency(s.creditUsed, s.currency) : "—"}
          hint={s ? `of ${formatCurrency(s.creditLimit, s.currency)} approved` : undefined}
        />
        <StatCard
          label="Outstanding"
          icon="Receipt"
          value={s ? formatCurrency(s.outstanding, s.currency) : "—"}
          hint="Invoiced but unpaid"
        />
        <StatCard
          label="Overdue"
          icon="TriangleAlert"
          value={s ? formatCurrency(s.overdue, s.currency) : "—"}
          hint="Past the agreed terms"
        />
      </div>

      <ResourceListView<B2BAccount>
        list={list}
        searchPlaceholder="Search account, code or contact…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => list.setFilter("status", e.target.value)}
              options={[
                { value: "", label: "All statuses" },
                ...statusOptions(B2B_ACCOUNT_STATUSES),
              ]}
              wrapperClassName="w-48"
            />
            <Select
              aria-label="Filter by type"
              value={type}
              onChange={(e) => list.setFilter("type", e.target.value)}
              options={[{ value: "", label: "All types" }, ...ACCOUNT_TYPE_OPTIONS]}
              wrapperClassName="w-44"
            />
          </>
        }
        primaryAction={
          <Can anyPermission={["b2b:read"]}>
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
        onRowClick={(row) => setSelected(row)}
        caption="B2B accounts"
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected?.name ?? "Account"}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone[selected.status]}>
                {statusLabel[selected.status]}
              </StatusBadge>
              <span className="text-sm text-muted">
                {selected.code} · {ACCOUNT_TYPE_LABELS[selected.type]} ·{" "}
                {SETTLEMENT_TERM_LABELS[selected.settlementTerm]}
              </span>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Contact" value={`${selected.contactName} · ${selected.contactPhone}`} />
              <Detail label="Email" value={selected.contactEmail} />
              <Detail label="Country" value={selected.country} />
              <Detail label="Named travellers" value={selected.seats} />
              <Detail label="Partner since" value={formatDate(selected.createdAt)} />
            </dl>

            <Panel flush>
              <PanelHeader
                title="Rate build-up"
                description={`On a ${formatCurrency(SAMPLE_PUBLIC_RATE, selected.currency)} public rate`}
              />
              <PanelBody className="pt-3">
                <dl className="divide-y divide-line">
                  <Row label="Public (B2C) rate" value={rates!.publicRate} currency={selected.currency} />
                  <Row
                    label={`Net-rate discount (${selected.netRateDiscount}%)`}
                    value={-rates!.agencySaving}
                    currency={selected.currency}
                  />
                  <Row label="Agency is charged" value={rates!.netRate} currency={selected.currency} strong />
                  <Row
                    label={`Agency markup (${selected.defaultMarkupRate}%)`}
                    value={rates!.markup}
                    currency={selected.currency}
                  />
                  <Row label="Traveller pays" value={rates!.sellRate} currency={selected.currency} strong />
                </dl>
                <p className="mt-3 text-xs text-muted">
                  Platform commission is charged on the net rate, so the agency keeps its
                  markup and the merchant earning is unaffected by the resale price.
                </p>
              </PanelBody>
            </Panel>

            <Panel flush>
              <PanelHeader title="Credit position" description="Drives whether new bookings can be made on account." />
              <PanelBody className="pt-3">
                {credit.isLoading ? (
                  <p className="text-sm text-muted">Loading credit position…</p>
                ) : credit.data ? (
                  <>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-body">Utilisation</span>
                      <span className="text-sm font-semibold tabular-nums text-ink">
                        {credit.data.utilization}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-pill bg-surface-muted">
                      <div
                        className={
                          credit.data.utilization >= 90
                            ? "h-full bg-danger"
                            : credit.data.utilization >= 70
                              ? "h-full bg-accent"
                              : "h-full bg-primary"
                        }
                        style={{ width: `${Math.min(100, credit.data.utilization)}%` }}
                      />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-4">
                      <Detail
                        label="Limit"
                        value={formatCurrency(credit.data.creditLimit, credit.data.currency)}
                      />
                      <Detail
                        label="Available"
                        value={formatCurrency(credit.data.available, credit.data.currency)}
                      />
                      <Detail
                        label="Outstanding"
                        value={formatCurrency(credit.data.outstanding, credit.data.currency)}
                      />
                      <Detail
                        label="Overdue"
                        value={formatCurrency(credit.data.overdue, credit.data.currency)}
                      />
                    </dl>
                    {credit.data.utilization >= 90 && (
                      <Alert tone="danger" title="Credit limit nearly exhausted" className="mt-4">
                        New bookings on account will be blocked once the limit is reached.
                        Collect payment or raise the limit.
                      </Alert>
                    )}
                  </>
                ) : null}
              </PanelBody>
            </Panel>

            {canManage && (
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                {STATUS_ACTIONS.filter((a) => a.to !== selected.status).map((action) => (
                  <Button
                    key={action.to}
                    size="sm"
                    variant={action.danger ? "danger" : "primary"}
                    loading={update.isPending}
                    onClick={() => void setStatus(selected, action.to)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/b2b/bookings"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                View B2B bookings
              </Link>
              <Link
                href="/dashboard/b2b/invoices"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                View invoices
              </Link>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function Row({
  label,
  value,
  currency,
  strong,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
}) {
  const negative = value < 0;
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className={strong ? "text-sm font-semibold text-ink" : "text-sm text-body"}>
        {label}
      </dt>
      <dd
        className={
          negative
            ? "text-sm font-medium tabular-nums text-danger"
            : strong
              ? "text-base font-bold tabular-nums text-ink"
              : "text-sm font-medium tabular-nums text-ink"
        }
      >
        {negative ? "−" : ""}
        {formatCurrency(Math.abs(value), currency)}
      </dd>
    </div>
  );
}
