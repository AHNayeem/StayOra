import type { ColumnDef } from "../../crud";
import { StatusBadge } from "../../ui";
import { formatNumber, formatPercent } from "../../lib/format";
import type { Currency, Language } from "./types";

function enabledBadge(enabled: boolean) {
  return (
    <StatusBadge tone={enabled ? "success" : "neutral"}>
      {enabled ? "Enabled" : "Disabled"}
    </StatusBadge>
  );
}

export const languageColumns: ColumnDef<Language>[] = [
  {
    accessorKey: "name",
    header: "Language",
    enableHiding: false,
    meta: { label: "Language" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">{row.original.nativeName}</p>
      </div>
    ),
  },
  {
    accessorKey: "code",
    header: "Code",
    meta: { label: "Code" },
    cell: ({ row }) => (
      <span className="font-mono text-xs uppercase text-body">{row.original.code}</span>
    ),
  },
  {
    accessorKey: "rtl",
    header: "Direction",
    meta: { label: "Direction" },
    cell: ({ row }) => (
      <span className="text-body">{row.original.rtl ? "RTL" : "LTR"}</span>
    ),
  },
  {
    accessorKey: "coverage",
    header: "Coverage",
    meta: { label: "Coverage", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatPercent(row.original.coverage)}</span>
    ),
  },
  {
    accessorKey: "enabled",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => enabledBadge(row.original.enabled),
  },
];

export const currencyColumns: ColumnDef<Currency>[] = [
  {
    accessorKey: "name",
    header: "Currency",
    enableHiding: false,
    meta: { label: "Currency" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">
          {row.original.code} · {row.original.symbol}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "rate",
    header: "Rate (to base)",
    meta: { label: "Rate", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.rate)}</span>
    ),
  },
  {
    accessorKey: "enabled",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => enabledBadge(row.original.enabled),
  },
];
