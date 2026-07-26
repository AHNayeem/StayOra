"use client";

import { useState } from "react";
import { CheckCircle2, EyeOff, Plus } from "lucide-react";
import { ConfirmDialog, ResourceListView, RowActions } from "../../crud";
import { Button, Drawer, Select, StatCard, StatCardSkeleton } from "../../ui";
import { DropdownItem } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { formatNumber } from "../../lib/format";
import { labelMap, statusOptions } from "../../lib/status";
import { toast } from "@/lib/toast";
import {
  useDeleteTestimonial,
  useSetTestimonialStatus,
  useTestimonials,
  useTestimonialSummary,
} from "./hooks";
import { TestimonialForm } from "./form";
import { TESTIMONIAL_STATUSES, type Testimonial } from "./types";

const statusLabel = labelMap(TESTIMONIAL_STATUSES);

/** Testimonials — KPIs, status facet, create/edit, publish/hide toggle, delete. */
export function TestimonialList() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [deleting, setDeleting] = useState<Testimonial | null>(null);
  const del = useDeleteTestimonial();
  const setStatus = useSetTestimonialStatus();
  const summary = useTestimonialSummary();

  const list = useTestimonials((row) => {
    const published = row.status === "published";
    return (
      <RowActions
        label={`Actions for ${row.author}`}
        onEdit={() => setEditing(row)}
        onDelete={() => setDeleting(row)}
        editPermission={["cms:update"]}
        deletePermission={["cms:delete"]}
        extra={
          <Can anyPermission={["cms:update"]}>
            <DropdownItem
              icon={published ? <EyeOff /> : <CheckCircle2 />}
              onSelect={() =>
                void setStatus
                  .mutateAsync({ id: row.id, status: published ? "hidden" : "published" })
                  .then(() =>
                    toast.success(published ? "Testimonial hidden" : "Testimonial published"),
                  )
              }
            >
              {published ? "Hide" : "Publish"}
            </DropdownItem>
          </Can>
        }
      />
    );
  });

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as Testimonial["status"]]}` }]
    : [];

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await del.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.isLoading || !summary.data ? (
          Array.from({ length: 4 }, (_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total" value={formatNumber(summary.data.total)} icon="MessageSquareQuote" />
            <StatCard label="Published" value={formatNumber(summary.data.published)} icon="CircleCheck" />
            <StatCard label="Pending review" value={formatNumber(summary.data.pending)} icon="CircleAlert" />
            <StatCard label="Avg. rating" value={`${summary.data.averageRating.toFixed(1)} / 5`} icon="Star" />
          </>
        )}
      </div>

      <ResourceListView<Testimonial>
        list={list}
        searchPlaceholder="Search author, role or quote…"
        activeFilters={activeFilters}
        selectable={false}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[
              { value: "", label: "All statuses" },
              ...statusOptions(TESTIMONIAL_STATUSES),
            ]}
            wrapperClassName="w-44"
          />
        }
        primaryAction={
          <Can anyPermission={["cms:create"]}>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add testimonial
            </Button>
          </Can>
        }
        caption="Testimonials"
      />

      <Drawer
        open={creating || Boolean(editing)}
        onClose={closeForm}
        size="lg"
        title={editing ? "Edit testimonial" : "New testimonial"}
      >
        {(creating || editing) && (
          <TestimonialForm
            initial={editing ?? undefined}
            onDone={closeForm}
            onCancel={closeForm}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title="Delete testimonial?"
        message={
          <>
            The testimonial from{" "}
            <strong className="font-semibold text-ink">{deleting?.author}</strong> will be
            permanently removed. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete testimonial"
      />
    </>
  );
}
