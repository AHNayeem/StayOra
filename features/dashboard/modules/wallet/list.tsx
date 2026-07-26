"use client";

import { Download, Send } from "lucide-react";
import { toast } from "@/lib/toast";
import { ResourceListView, RowActions } from "../../crud";
import { Button, Select, StatCard, StatCardSkeleton } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatCurrency, formatDate } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { useWallets, useWalletSummary } from "./hooks";
import { WALLET_STATUSES, type MerchantWallet } from "./types";

const statusLabel = labelMap(WALLET_STATUSES);

/** Merchant wallets — held/available KPIs, status facet, per-wallet payout release. */
export function WalletList() {
  const summary = useWalletSummary();

  const releasePayout = (row: MerchantWallet) =>
    toast.success("Payout queued", {
      description: `${formatCurrency(row.available, row.currency)} to ${row.merchant} will settle in 1–2 business days (demo).`,
    });

  const list = useWallets((row) => (
    <RowActions
      label={`Actions for ${row.merchant}`}
      extra={
        <Can anyPermission={["finance:update"]}>
          <DropdownItem
            icon={<Send />}
            disabled={row.status !== "active" || row.available <= 0}
            onSelect={() => releasePayout(row)}
          >
            Release payout
          </DropdownItem>
        </Can>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as MerchantWallet["status"]]}` }]
    : [];

  const handleExport = () => {
    exportToCsv<MerchantWallet>("wallets", list.rows, [
      { header: "Merchant", value: (r) => r.merchant },
      { header: "Available", value: (r) => formatCurrency(r.available, r.currency) },
      { header: "Pending", value: (r) => formatCurrency(r.pending, r.currency) },
      { header: "Reserved", value: (r) => formatCurrency(r.reserved, r.currency) },
      { header: "Lifetime", value: (r) => formatCurrency(r.lifetimeEarnings, r.currency) },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Last activity", value: (r) => formatDate(r.lastActivity) },
    ]);
  };

  const s = summary.data;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.isLoading || !s ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Total held"
              value={formatCurrency(s.totalHeld, s.currency)}
              icon="Wallet"
              hint="Available + pending + reserved"
            />
            <StatCard
              label="Available"
              value={formatCurrency(s.totalAvailable, s.currency)}
              icon="Coins"
              hint="Ready for payout"
            />
            <StatCard
              label="Pending"
              value={formatCurrency(s.totalPending, s.currency)}
              icon="PiggyBank"
              hint="In settlement window"
            />
            <StatCard
              label="Active wallets"
              value={String(s.activeWallets)}
              icon="Landmark"
            />
          </>
        )}
      </div>

      <ResourceListView<MerchantWallet>
        list={list}
        searchPlaceholder="Search merchant…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(WALLET_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <Can permissions={["finance:export"]}>
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
        caption="Merchant wallets"
      />
    </div>
  );
}
