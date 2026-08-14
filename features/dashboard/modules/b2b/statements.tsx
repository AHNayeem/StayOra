"use client";

import { useState } from "react";
import { Download, Receipt } from "lucide-react";
import { useQuery } from "../../data";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  type ColumnDef,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { exportToCsv } from "../../lib/export-csv";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { b2bService } from "../../domain/services";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import type { B2BInvoice, B2BSubUser } from "../../domain/types";
import { useB2BAccounts, useCreditStatus } from "./hooks";

const MODEL_LABELS = {
  agency_commission: "Agency commission",
  markup: "Net rate + markup",
  commission_plus_markup: "Commission + markup",
} as const;

const TIER_LABELS = {
  standard: "Standard (free)",
  professional: "Professional",
  enterprise: "Enterprise",
} as const;

function isoIn(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * B2B statements, credit and commercial terms.
 *
 * The terms panel renders the account's commercial build-up line by line —
 * supplier rate, net-rate discount, agency markup, agency commission, platform
 * commission, platform margin — from the same `priceB2B` + commission-rule
 * engine a real booking through this account would use. Nothing here is a
 * separate calculation.
 */
export function B2BStatements() {
  const scope = useDomainScope();
  const actor = useDomainActor();
  const accounts = useB2BAccounts();
  const [accountId, setAccountId] = useState<string>("");
  const [from, setFrom] = useState(isoIn(-180));
  const [to, setTo] = useState(isoIn(0));
  const [sampleRate, setSampleRate] = useState("1000");

  const rows = accounts.rows;
  const selected = accountId || rows[0]?.id || "";
  const account = rows.find((a) => a.id === selected);

  const credit = useCreditStatus(selected || undefined);
  const terms = useQuery({
    queryKey: ["b2b", "terms", selected, sampleRate],
    queryFn: () => b2bService.terms(selected, Number(sampleRate) || 1_000),
    enabled: Boolean(selected),
    staleTime: 5_000,
  });
  const subUsers = useQuery<B2BSubUser[]>({
    queryKey: ["b2b", "sub-users", selected],
    queryFn: () => b2bService.subUsers(selected),
    enabled: Boolean(selected),
    staleTime: 30_000,
  });
  const statement = useQuery({
    queryKey: ["b2b", "statement", selected, from, to],
    queryFn: () => b2bService.statement(selected, from, to),
    enabled: Boolean(selected),
    staleTime: 5_000,
  });

  const c = credit.data;
  const st = statement.data;
  const currency = account?.currency ?? "USD";

  const invoiceColumns: ColumnDef<B2BInvoice>[] = [
    { id: "number", header: "Invoice", cell: (row) => row.number },
    { id: "issued", header: "Issued", cell: (row) => formatDate(row.issuedAt) },
    { id: "due", header: "Due", cell: (row) => formatDate(row.dueAt) },
    {
      id: "total",
      header: "Total",
      align: "right",
      cell: (row) => formatCurrency(row.total, row.currency),
    },
    {
      id: "paid",
      header: "Paid",
      align: "right",
      cell: (row) => formatCurrency(row.paid, row.currency),
    },
    {
      id: "balance",
      header: "Balance",
      align: "right",
      cell: (row) => (
        <span className={cn("font-semibold tabular-nums", row.balance > 0 && "text-danger")}>
          {formatCurrency(row.balance, row.currency)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge
          tone={
            row.status === "paid"
              ? "success"
              : row.status === "overdue"
                ? "danger"
                : row.status === "part_paid"
                  ? "warning"
                  : "neutral"
          }
        >
          {row.status.replace(/_/g, " ")}
        </StatusBadge>
      ),
    },
  ];

  const subUserColumns: ColumnDef<B2BSubUser>[] = [
    {
      id: "name",
      header: "User",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{row.name}</p>
          <p className="truncate text-xs text-muted">{row.email}</p>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (row) => (
        <Badge size="sm" variant={row.role === "owner" ? "accent" : "neutral"}>
          {row.role}
        </Badge>
      ),
    },
    {
      id: "limit",
      header: "Per-booking limit",
      align: "right",
      cell: (row) =>
        row.bookingLimit > 0 ? (
          <span className="tabular-nums text-body">
            {formatCurrency(row.bookingLimit, currency)}
          </span>
        ) : (
          <span className="text-xs text-muted">Account limit</span>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <StatusBadge tone={row.status === "active" ? "success" : "warning"}>
          {row.status}
        </StatusBadge>
      ),
    },
  ];

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No B2B accounts"
        description="Create an agency or corporate account to see its statement."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel flush>
        <PanelHeader
          title="Account & period"
          description="Statements, credit position and commercial terms."
        />
        <PanelBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Account"
              value={selected}
              onChange={(e) => setAccountId(e.target.value)}
              options={rows.map((a) => ({ value: a.id, label: `${a.name} (${a.code})` }))}
              disabled={Boolean(scope.organizationId)}
            />
            <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Input
              label="Sample public rate"
              type="number"
              value={sampleRate}
              onChange={(e) => setSampleRate(e.target.value)}
              hint="Used by the terms preview"
            />
          </div>
        </PanelBody>
      </Panel>

      {/* ---- credit ------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Credit limit"
          icon="Landmark"
          value={c ? formatCurrency(c.creditLimit, c.currency) : "—"}
          hint={account ? TIER_LABELS[account.tier] : undefined}
        />
        <StatCard
          label="Used"
          icon="Coins"
          value={c ? formatCurrency(c.creditUsed, c.currency) : "—"}
          hint={c ? `${c.utilization.toFixed(0)}% utilised` : undefined}
        />
        <StatCard
          label="Available"
          icon="PiggyBank"
          value={c ? formatCurrency(c.available, c.currency) : "—"}
          hint="Enforced at booking time"
        />
        <StatCard
          label="Overdue"
          icon="TriangleAlert"
          value={c ? formatCurrency(c.overdue, c.currency) : "—"}
          hint={c?.dueAt ? `Next due ${formatDate(c.dueAt)}` : "Nothing overdue"}
        />
      </div>

      {c && c.creditLimit > 0 && (
        <div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
            role="img"
            aria-label={`Credit utilisation ${c.utilization.toFixed(0)} percent`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                c.utilization > 90
                  ? "bg-danger"
                  : c.utilization > 70
                    ? "bg-warning"
                    : "bg-primary",
              )}
              style={{ width: `${Math.min(100, c.utilization)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {formatCurrency(c.creditUsed, c.currency)} of{" "}
            {formatCurrency(c.creditLimit, c.currency)} used ·{" "}
            {formatCurrency(c.available, c.currency)} available. A booking that would
            exceed the limit is rejected before it is created.
          </p>
        </div>
      )}

      {c?.blocked && (
        <Alert tone="danger" title="Account cannot book on credit">
          {account?.name} is {account?.status}. Bookings on account are blocked until it is
          reactivated.
        </Alert>
      )}

      {/* ---- commercial terms --------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel flush>
          <PanelHeader
            title="Commercial terms"
            description={
              account
                ? `${MODEL_LABELS[account.commercialModel]} · settlement ${account.settlementTerm.replace("_", " ")}`
                : undefined
            }
            actions={
              account && account.subscriptionFee > 0 ? (
                <Can anyPermission={["b2b:update", "finance:update"]}>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Receipt className="size-4" />}
                    onClick={async () => {
                      await b2bService.chargeSubscription(account.id, actor);
                      toast.success(
                        `Charged ${formatCurrency(account.subscriptionFee, currency)} for ${account.tier} access`,
                      );
                    }}
                  >
                    Charge subscription
                  </Button>
                </Can>
              ) : undefined
            }
          />
          <PanelBody>
            <dl className="space-y-2">
              {(terms.data?.lines ?? []).map((line, index) => (
                <div
                  key={`${line.label}-${index}`}
                  className="flex items-baseline justify-between gap-4 border-b border-line pb-1.5"
                >
                  <dt className="text-sm text-body">{line.label}</dt>
                  <dd
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      line.tone === "negative"
                        ? "text-danger"
                        : line.tone === "positive"
                          ? "text-primary-700"
                          : "text-ink",
                    )}
                  >
                    {line.tone === "negative" ? "−" : ""}
                    {formatCurrency(line.amount, currency)}
                  </dd>
                </div>
              ))}
            </dl>
            {terms.data && (
              <p className="mt-3 text-xs text-muted">
                {terms.data.resolution.explanation} The agency keeps{" "}
                {formatCurrency(terms.data.pricing.agencyEarning, currency)}; Otithee keeps{" "}
                {formatCurrency(terms.data.platformMargin, currency)}.
              </p>
            )}
            {account && account.subscriptionFee > 0 && (
              <p className="mt-2 text-xs text-muted">
                {TIER_LABELS[account.tier]} access —{" "}
                {formatCurrency(account.subscriptionFee, currency)} per quarter
                {account.subscriptionRenewsAt
                  ? `, renews ${formatDate(account.subscriptionRenewsAt)}`
                  : ""}
                . Simulated: no recurring billing exists in the prototype.
              </p>
            )}
          </PanelBody>
        </Panel>

        <Panel flush>
          <PanelHeader
            title="Statement"
            description={`${formatDate(from)} → ${formatDate(to)}`}
            actions={
              <Can anyPermission={["finance:export", "b2b:read"]}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="size-4" />}
                  disabled={!st?.invoices.length}
                  onClick={() => {
                    exportToCsv<B2BInvoice>(`statement-${account?.code ?? "b2b"}`, st?.invoices ?? [], [
                      { header: "Invoice", value: (r) => r.number },
                      { header: "Issued", value: (r) => formatDate(r.issuedAt) },
                      { header: "Due", value: (r) => formatDate(r.dueAt) },
                      { header: "Net", value: (r) => r.netAmount.toFixed(2) },
                      { header: "Markup", value: (r) => r.markup.toFixed(2) },
                      { header: "Taxes", value: (r) => r.taxes.toFixed(2) },
                      { header: "Total", value: (r) => r.total.toFixed(2) },
                      { header: "Paid", value: (r) => r.paid.toFixed(2) },
                      { header: "Balance", value: (r) => r.balance.toFixed(2) },
                      { header: "Status", value: (r) => r.status },
                    ]);
                    toast.success("Statement exported");
                  }}
                >
                  Export
                </Button>
              </Can>
            }
          />
          <PanelBody>
            <dl className="space-y-2">
              <StatementLine label="Opening balance" value={st?.opening} currency={currency} />
              <StatementLine label="Charges this period" value={st?.charges} currency={currency} />
              <StatementLine label="Payments received" value={st?.payments} currency={currency} negative />
              <div className="flex items-baseline justify-between gap-4 border-t-2 border-line pt-2">
                <dt className="text-sm font-semibold text-ink">Closing balance</dt>
                <dd className="text-sm font-bold tabular-nums text-ink">
                  {st ? formatCurrency(st.closing, currency) : "—"}
                </dd>
              </div>
            </dl>
            <dl className="mt-4 space-y-2 border-t border-line pt-4">
              <StatementLine label="Bookings" value={st?.bookingCount} currency="" plain />
              <StatementLine label="Gross booked value" value={st?.grossValue} currency={currency} />
              <StatementLine label="Net rate value" value={st?.netValue} currency={currency} />
              <StatementLine label="Agency markup" value={st?.markup} currency={currency} />
              <StatementLine
                label="Platform margin"
                value={st?.platformMargin}
                currency={currency}
                accent
              />
            </dl>
          </PanelBody>
        </Panel>
      </div>

      {/* ---- invoices & sub-users ------------------------------------------ */}
      <Panel flush>
        <PanelHeader
          title="Invoices in period"
          description={
            st ? `${formatNumber(st.invoices.length)} invoice(s) issued` : undefined
          }
        />
        <DataTable<B2BInvoice>
          columns={invoiceColumns}
          rows={st?.invoices ?? []}
          getRowId={(row) => row.id}
          loading={statement.isLoading}
          caption="B2B invoices"
          emptyState={
            <EmptyState
              title="No invoices in this period"
              description="Widen the date range to see earlier statements."
            />
          }
        />
      </Panel>

      <Panel flush>
        <PanelHeader
          title="Account users"
          description="Named agents who book under this account, and their per-booking ceiling."
        />
        <DataTable<B2BSubUser>
          columns={subUserColumns}
          rows={subUsers.data ?? []}
          getRowId={(row) => row.id}
          loading={subUsers.isLoading}
          caption="B2B account users"
          emptyState={<EmptyState title="No users on this account" />}
        />
      </Panel>
    </div>
  );
}

function StatementLine({
  label,
  value,
  currency,
  negative,
  accent,
  plain,
}: {
  label: string;
  value?: number;
  currency: string;
  negative?: boolean;
  accent?: boolean;
  plain?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-body">{label}</dt>
      <dd
        className={cn(
          "text-sm font-semibold tabular-nums",
          negative ? "text-danger" : accent ? "text-primary-700" : "text-ink",
        )}
      >
        {value === undefined
          ? "—"
          : plain
            ? formatNumber(value)
            : `${negative && value > 0 ? "−" : ""}${formatCurrency(value, currency)}`}
      </dd>
    </div>
  );
}
