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
  Input,
  Select,
  StatCard,
  StatusBadge,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, statusOptions, toneMap } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { getErrorMessage } from "../../data";
import { toast } from "@/lib/toast";
import type { B2BInvoice, B2BInvoiceStatus } from "../../domain/types";
import { useRbac } from "../../rbac/rbac-provider";
import { useB2BInvoices, useB2BSummary, usePayInvoice } from "./hooks";
import { B2B_INVOICE_STATUSES } from "./types";

const statusLabel = labelMap(B2B_INVOICE_STATUSES);
const statusTone = toneMap(B2B_INVOICE_STATUSES);

/**
 * Consolidated B2B invoices.
 *
 * A B2B booking isn't paid at checkout — it's invoiced to the account and settled
 * on terms. Recording a payment here releases the account's credit, which is the
 * loop that makes the credit meter on the accounts page meaningful.
 */
export function B2BInvoicesList() {
  const { can } = useRbac();
  const summary = useB2BSummary();
  const pay = usePayInvoice();
  const [selected, setSelected] = useState<B2BInvoice | null>(null);
  const [amount, setAmount] = useState("");
  const canManage = can("b2b:update");

  const recordPayment = async (invoice: B2BInvoice, value: number) => {
    try {
      const next = await pay.mutateAsync({ id: invoice.id, amount: value });
      toast.success(`Payment recorded on ${invoice.number}`, {
        description: `Balance now ${formatCurrency(next.balance, next.currency)}.`,
      });
      setAmount("");
      setSelected(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const list = useB2BInvoices((row) => (
    <RowActions
      label={`Actions for ${row.number}`}
      onView={() => setSelected(row)}
      viewPermission={["b2b:read"]}
      extra={
        canManage && row.balance > 0 ? (
          <>
            <DropdownItem
              disabled={pay.isPending}
              onSelect={() => void recordPayment(row, row.balance)}
            >
              Mark fully paid
            </DropdownItem>
            <DropdownItem onSelect={() => setSelected(row)}>
              Record part payment…
            </DropdownItem>
          </>
        ) : null
      }
    />
  ));

  const { status = "" } = list.filters;
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as B2BInvoiceStatus]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<B2BInvoice>("b2b-invoices", list.rows, [
      { header: "Number", value: (r) => r.number },
      { header: "Account", value: (r) => r.accountName },
      { header: "Issued", value: (r) => formatDate(r.issuedAt) },
      { header: "Due", value: (r) => formatDate(r.dueAt) },
      { header: "Bookings", value: (r) => r.bookingIds.length },
      { header: "Net", value: (r) => formatCurrency(r.netAmount, r.currency) },
      { header: "Markup", value: (r) => formatCurrency(r.markup, r.currency) },
      { header: "Taxes", value: (r) => formatCurrency(r.taxes, r.currency) },
      { header: "Total", value: (r) => formatCurrency(r.total, r.currency) },
      { header: "Paid", value: (r) => formatCurrency(r.paid, r.currency) },
      { header: "Balance", value: (r) => formatCurrency(r.balance, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
    ]);
    toast.success(`Exported ${list.rows.length} invoices`);
  };

  const s = summary.data;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Invoiced"
          icon="Receipt"
          value={s ? formatCurrency(s.invoiced, s.currency) : "—"}
        />
        <StatCard
          label="Outstanding"
          icon="Landmark"
          value={s ? formatCurrency(s.outstanding, s.currency) : "—"}
        />
        <StatCard
          label="Overdue"
          icon="TriangleAlert"
          value={s ? formatCurrency(s.overdue, s.currency) : "—"}
          hint="Past agreed settlement terms"
        />
      </div>

      <ResourceListView<B2BInvoice>
        list={list}
        searchPlaceholder="Search invoice number or account…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(B2B_INVOICE_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
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
        caption="B2B invoices"
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="md"
        title={selected ? `Invoice ${selected.number}` : "Invoice"}
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge tone={statusTone[selected.status]}>
                {statusLabel[selected.status]}
              </StatusBadge>
              <span className="text-sm text-muted">
                Issued {formatDate(selected.issuedAt)} · due {formatDate(selected.dueAt)}
              </span>
            </div>

            <p className="text-sm text-body">
              {selected.accountName} · {selected.bookingIds.length} bookings consolidated
            </p>

            <dl className="divide-y divide-line rounded-card border border-line p-4">
              <Row label="Net (agency rate)" value={selected.netAmount} currency={selected.currency} />
              <Row label="Agency markup" value={selected.markup} currency={selected.currency} />
              <Row label="Taxes" value={selected.taxes} currency={selected.currency} />
              <Row label="Invoice total" value={selected.total} currency={selected.currency} strong />
              <Row label="Paid" value={selected.paid} currency={selected.currency} />
              <Row label="Balance due" value={selected.balance} currency={selected.currency} strong />
            </dl>

            {selected.status === "overdue" && (
              <Alert tone="danger" title="Overdue">
                This invoice is past its settlement terms. New bookings on credit may be
                blocked until it is cleared.
              </Alert>
            )}

            {canManage && selected.balance > 0 && (
              <div className="space-y-3 border-t border-line pt-4">
                <Input
                  label="Payment amount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={String(selected.balance)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  hint={`Balance ${formatCurrency(selected.balance, selected.currency)}`}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    loading={pay.isPending}
                    onClick={() =>
                      void recordPayment(selected, Number(amount) || selected.balance)
                    }
                  >
                    Record payment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={pay.isPending}
                    onClick={() => void recordPayment(selected, selected.balance)}
                  >
                    Settle in full
                  </Button>
                </div>
              </div>
            )}

            <Link
              href="/dashboard/b2b/bookings"
              className="block text-sm font-medium text-primary hover:underline"
            >
              View the bookings on this invoice →
            </Link>
          </div>
        )}
      </Drawer>
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
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className={strong ? "text-sm font-semibold text-ink" : "text-sm text-body"}>
        {label}
      </dt>
      <dd
        className={
          strong
            ? "text-base font-bold tabular-nums text-ink"
            : "text-sm font-medium tabular-nums text-ink"
        }
      >
        {formatCurrency(value, currency)}
      </dd>
    </div>
  );
}
