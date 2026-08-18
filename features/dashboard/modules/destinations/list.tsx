"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ExternalLink, EyeOff, Plus, RotateCcw, Send } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { buttonVariants, Select, StatCard, StatCardSkeleton } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { destinationEditHref, destinationHref } from "@/features/destinations/links";
import { toast } from "@/lib/toast";
import {
  useDeleteDestination,
  useDestinationList,
  useDestinationSummary,
  useSetDestinationStatus,
} from "./hooks";
import { getDestinationCountryOptions } from "./service";
import { DESTINATION_STATUSES, type Destination } from "./types";

const statusLabel = labelMap(DESTINATION_STATUSES);

/**
 * Destinations list — KPIs, status/country facets and the lifecycle actions.
 *
 * Create and edit are full pages rather than a drawer: a destination carries long
 * copy, a gallery and three list fields, which a 400px drawer can't hold
 * comfortably.
 *
 * Archive is offered before delete, and delete is only offered for destinations
 * that were never published — removing a live destination breaks every link to
 * its slug, which is exactly the failure this module was built to fix.
 */
export function DestinationList() {
  const router = useRouter();
  const [archiving, setArchiving] = useState<Destination | null>(null);
  const [deleting, setDeleting] = useState<Destination | null>(null);

  const setStatus = useSetDestinationStatus();
  const del = useDeleteDestination();
  const summary = useDestinationSummary();

  const runStatus = (row: Destination, status: Destination["status"], message: string) =>
    void setStatus
      .mutateAsync({ id: row.id, status })
      .then(() => toast.success(message))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "That change wasn't allowed."),
      );

  const list = useDestinationList((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onView={() => router.push(destinationHref(row))}
      onEdit={() => router.push(destinationEditHref(row))}
      // Only a destination that never went live may be hard-deleted.
      onDelete={row.status === "draft" ? () => setDeleting(row) : undefined}
      viewPermission={["cms:read"]}
      editPermission={["cms:update"]}
      deletePermission={["cms:delete"]}
      extra={
        <Can anyPermission={["cms:update"]}>
          {row.status !== "published" && (
            <DropdownItem
              icon={row.status === "archived" ? <RotateCcw /> : <Send />}
              onSelect={() =>
                row.status === "archived"
                  ? runStatus(row, "draft", `${row.name} restored to draft`)
                  : runStatus(row, "published", `${row.name} is live`)
              }
            >
              {row.status === "archived" ? "Restore to draft" : "Publish"}
            </DropdownItem>
          )}
          {row.status === "published" && (
            <DropdownItem
              icon={<EyeOff />}
              onSelect={() => runStatus(row, "draft", `${row.name} unpublished`)}
            >
              Unpublish
            </DropdownItem>
          )}
          {row.status !== "archived" && (
            <DropdownItem icon={<Archive />} onSelect={() => setArchiving(row)}>
              Archive
            </DropdownItem>
          )}
        </Can>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const country = list.filters.country ?? "";
  const featured = list.filters.featured ?? "";

  const activeFilters: ActiveFilter[] = [
    ...(status
      ? [{ key: "status", label: `Status: ${statusLabel[status as Destination["status"]]}` }]
      : []),
    ...(country ? [{ key: "country", label: `Country: ${country}` }] : []),
    ...(featured === "true" ? [{ key: "featured", label: "Featured only" }] : []),
  ];

  const confirmArchive = async () => {
    if (!archiving) return;
    await setStatus.mutateAsync({ id: archiving.id, status: "archived" });
    toast.success(`${archiving.name} archived and removed from the public site`);
    setArchiving(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    toast.success(`${deleting.name} deleted`);
    setDeleting(null);
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Destinations" value={formatNumber(summary.data.total)} icon="MapPin" />
            <StatCard label="Published" value={formatNumber(summary.data.published)} icon="CircleCheck" />
            <StatCard label="Drafts" value={formatNumber(summary.data.draft)} icon="Clock" />
            <StatCard label="Countries" value={formatNumber(summary.data.countries)} icon="Globe" />
          </>
        )}
      </div>

      <ResourceListView<Destination>
        list={list}
        searchPlaceholder="Search name, country or slug…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => list.setFilter("status", event.target.value)}
              options={[
                { value: "", label: "All statuses" },
                ...statusOptions(DESTINATION_STATUSES),
              ]}
              wrapperClassName="w-40"
            />
            <Select
              aria-label="Filter by country"
              value={country}
              onChange={(event) => list.setFilter("country", event.target.value)}
              options={[
                { value: "", label: "All countries" },
                ...getDestinationCountryOptions().map((name) => ({ value: name, label: name })),
              ]}
              wrapperClassName="w-48"
            />
            <Select
              aria-label="Filter by featured"
              value={featured}
              onChange={(event) => list.setFilter("featured", event.target.value)}
              options={[
                { value: "", label: "Featured & not" },
                { value: "true", label: "Featured only" },
                { value: "false", label: "Not featured" },
              ]}
              wrapperClassName="w-44"
            />
          </>
        }
        primaryAction={
          <Can anyPermission={["cms:create"]}>
            <Link
              href="/dashboard/destinations/new"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Create destination
            </Link>
          </Can>
        }
        caption="Destinations"
      />

      <ConfirmDialog
        open={Boolean(archiving)}
        onClose={() => setArchiving(null)}
        onConfirm={confirmArchive}
        loading={setStatus.isPending}
        tone="danger"
        title="Archive destination?"
        message={
          <>
            <strong className="font-semibold text-ink">{archiving?.name}</strong> will be
            removed from <code className="font-mono text-xs">/destinations</code> and its
            own page will stop resolving. Nothing is deleted — you can restore it to draft
            at any time.
          </>
        }
        confirmLabel="Archive destination"
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete draft destination?"
        message={
          <>
            <strong className="font-semibold text-ink">{deleting?.name}</strong> and all its
            copy, imagery and SEO settings will be permanently removed. This can&apos;t be
            undone — archive it instead if you may want it back.
          </>
        }
        confirmLabel="Delete destination"
      />

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted">
        <ExternalLink className="size-3.5" aria-hidden="true" />
        Published destinations appear immediately on{" "}
        <Link href="/destinations" className="underline hover:text-primary">
          /destinations
        </Link>
        .
      </p>
    </>
  );
}
