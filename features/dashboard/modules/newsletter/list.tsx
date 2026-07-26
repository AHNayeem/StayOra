"use client";

import { useState } from "react";
import { Download, MailX } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Select, StatCard, StatCardSkeleton } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatDate, formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { exportToCsv } from "../../lib/export-csv";
import { toast } from "@/lib/toast";
import {
  useDeleteSubscriber,
  useNewsletterSummary,
  useSetSubscriberStatus,
  useSubscribers,
} from "./hooks";
import {
  SUBSCRIBER_SOURCES,
  SUBSCRIBER_STATUSES,
  type Subscriber,
} from "./types";

const statusLabel = labelMap(SUBSCRIBER_STATUSES);
const sourceLabel = labelMap(SUBSCRIBER_SOURCES);

/** Newsletter audience — KPIs, status/source facets, unsubscribe, remove, export. */
export function NewsletterList() {
  const [deleting, setDeleting] = useState<Subscriber | null>(null);
  const del = useDeleteSubscriber();
  const setStatus = useSetSubscriberStatus();
  const summary = useNewsletterSummary();

  const list = useSubscribers((row) => (
    <RowActions
      label={`Actions for ${row.email}`}
      onDelete={() => setDeleting(row)}
      deletePermission={["cms:delete"]}
      extra={
        <Can anyPermission={["cms:update"]}>
          <DropdownItem
            icon={<MailX />}
            disabled={row.status !== "subscribed"}
            onSelect={() =>
              void setStatus
                .mutateAsync({ id: row.id, status: "unsubscribed" })
                .then(() => toast.success("Subscriber unsubscribed"))
            }
          >
            Unsubscribe
          </DropdownItem>
        </Can>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const source = list.filters.source ?? "";
  const activeFilters: ActiveFilter[] = [
    ...(status ? [{ key: "status", label: `Status: ${statusLabel[status as Subscriber["status"]]}` }] : []),
    ...(source ? [{ key: "source", label: `Source: ${sourceLabel[source as Subscriber["source"]]}` }] : []),
  ];

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  const handleExport = () => {
    exportToCsv<Subscriber>("newsletter-subscribers", list.rows, [
      { header: "Email", value: (r) => r.email },
      { header: "Name", value: (r) => r.name },
      { header: "Status", value: (r) => statusLabel[r.status] },
      { header: "Source", value: (r) => sourceLabel[r.source] },
      { header: "Joined", value: (r) => formatDate(r.joinedAt) },
    ]);
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Subscribed" value={formatNumber(summary.data.subscribed)} icon="MailCheck" />
            <StatCard label="New (30 days)" value={formatNumber(summary.data.newThisMonth)} icon="TrendingUp" />
            <StatCard label="Unsubscribed" value={formatNumber(summary.data.unsubscribed)} icon="Mail" />
            <StatCard label="Bounced" value={formatNumber(summary.data.bounced)} icon="MailX" />
          </>
        )}
      </div>

      <ResourceListView<Subscriber>
        list={list}
        searchPlaceholder="Search email or name…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => list.setFilter("status", e.target.value)}
              options={[{ value: "", label: "All statuses" }, ...statusOptions(SUBSCRIBER_STATUSES)]}
              wrapperClassName="w-44"
            />
            <Select
              aria-label="Filter by source"
              value={source}
              onChange={(e) => list.setFilter("source", e.target.value)}
              options={[{ value: "", label: "All sources" }, ...statusOptions(SUBSCRIBER_SOURCES)]}
              wrapperClassName="w-44"
            />
          </>
        }
        primaryAction={
          <Can anyPermission={["cms:export"]}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="size-4" />}
              onClick={handleExport}
              disabled={list.rows.length === 0}
            >
              Export
            </Button>
          </Can>
        }
        caption="Newsletter subscribers"
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Remove subscriber?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.email}</strong> will be
            permanently removed from the audience. To stop emails without deleting history,
            use Unsubscribe instead. This can&apos;t be undone.
          </>
        }
        confirmLabel="Remove subscriber"
      />
    </>
  );
}
