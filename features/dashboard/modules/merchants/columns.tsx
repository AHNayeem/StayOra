import type { ColumnDef } from "../../crud";
import { StatusBadge, Tag } from "../../ui";
import { formatDate, formatNumber, formatPercent } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { KYC_STATUSES, MERCHANT_STATUSES, type Merchant } from "./types";
import { MERCHANT_PLANS } from "@/features/dashboard/domain";

const statusTone = toneMap(MERCHANT_STATUSES);
const statusLabel = labelMap(MERCHANT_STATUSES);
const kycTone = toneMap(KYC_STATUSES);
const kycLabel = labelMap(KYC_STATUSES);

export const merchantColumns: ColumnDef<Merchant>[] = [
  {
    accessorKey: "name",
    header: "Merchant",
    enableHiding: false,
    meta: { label: "Merchant" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{row.original.name}</p>
        <p className="truncate text-xs text-muted">{row.original.email}</p>
      </div>
    ),
  },
  {
    accessorKey: "verticals",
    header: "Supplies",
    meta: { label: "Supplies" },
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.verticals.slice(0, 2).map((v) => (
          <Tag key={v} variant="soft">
            {v}
          </Tag>
        ))}
        {row.original.verticals.length > 2 && (
          <Tag variant="soft">+{row.original.verticals.length - 2}</Tag>
        )}
      </div>
    ),
  },
  {
    accessorKey: "country",
    header: "Country",
    meta: { label: "Country" },
    cell: ({ row }) => <span className="text-body">{row.original.country}</span>,
  },
  {
    accessorKey: "properties",
    header: "Properties",
    meta: { label: "Properties", align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums">{formatNumber(row.original.properties.length)}</span>
    ),
  },
  {
    accessorKey: "commissionRate",
    header: "Commission",
    meta: { label: "Commission", align: "right" },
    // Percent, e.g. 12 → "12%". The domain stores one unit everywhere.
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatPercent(row.original.commissionRate, { fromRatio: false })}
      </span>
    ),
  },
  {
    id: "plan",
    header: "Plan",
    meta: { label: "Plan" },
    cell: ({ row }) => (
      <span className="text-body">{MERCHANT_PLANS[row.original.subscription.planId].name}</span>
    ),
  },
  {
    id: "kyc",
    header: "KYC",
    meta: { label: "KYC" },
    cell: ({ row }) => (
      <StatusBadge tone={kycTone[row.original.kyc.status]}>
        {kycLabel[row.original.kyc.status]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { label: "Status" },
    cell: ({ row }) => (
      <StatusBadge tone={statusTone[row.original.status]}>
        {statusLabel[row.original.status]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Applied",
    meta: { label: "Applied" },
    cell: ({ row }) => <span className="text-muted">{formatDate(row.original.createdAt)}</span>,
  },
];
