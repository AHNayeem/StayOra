"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Ban, Plus, RotateCcw, UserCog, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "../../data";
import { ResourceListView, RowActions } from "../../crud";
import { Button, Select, buttonVariants } from "../../ui";
import { DropdownItem, DropdownSeparator } from "../../ui/dropdown-menu";
import { Can } from "../../rbac/permission-guard";
import type { ActiveFilter } from "../../ui/filter-bar";
import { labelMap, statusOptions } from "../../lib/status";
import { useMerchants, useSetMerchantStatus } from "./hooks";
import { ReasonDialog } from "./review-dialogs";
import { MERCHANT_STATUSES, type Merchant, type MerchantStatus } from "./types";

const statusLabel = labelMap(MERCHANT_STATUSES);

/** Decisions that must carry a written reason before they are applied. */
const NEEDS_REASON: MerchantStatus[] = ["rejected", "action_required", "suspended"];

/**
 * Merchants list — the platform's merchant register and review queue.
 *
 * Every action here goes through the domain merchant service, so approving from
 * this table updates the merchant's own dashboard, their onboarding checklist,
 * what they may publish and their notification feed in the same write.
 */
export function MerchantsList() {
  const router = useRouter();
  const setStatus = useSetMerchantStatus();
  const [reasonFor, setReasonFor] = useState<{ row: Merchant; status: MerchantStatus } | null>(null);

  const apply = async (row: Merchant, status: MerchantStatus, note?: string) => {
    try {
      await setStatus.mutateAsync({ id: row.id, status, note });
      toast.success(`${row.name} → ${statusLabel[status].toLowerCase()}`);
    } catch (error) {
      toast.error("Couldn't update merchant", { description: getErrorMessage(error) });
      throw error;
    }
  };

  const request = (row: Merchant, status: MerchantStatus) => {
    if (NEEDS_REASON.includes(status)) setReasonFor({ row, status });
    else void apply(row, status);
  };

  const impersonate = (row: Merchant) =>
    toast.info("Impersonation session started", {
      description: `You're now viewing the platform as ${row.name} (demo).`,
    });

  const list = useMerchants((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onView={() => router.push(`/dashboard/merchants/${row.id}`)}
      viewPermission={["merchants:read"]}
      extra={
        <>
          <Can anyPermission={["merchants:approve"]}>
            {(row.status === "submitted" || row.status === "under_review") && (
              <>
                {row.status === "submitted" && (
                  <DropdownItem
                    icon={<RotateCcw />}
                    onSelect={() => request(row, "under_review")}
                  >
                    Start review
                  </DropdownItem>
                )}
                <DropdownItem icon={<CheckCircle2 />} onSelect={() => request(row, "approved")}>
                  Approve
                </DropdownItem>
                <DropdownItem icon={<RotateCcw />} onSelect={() => request(row, "action_required")}>
                  Request changes
                </DropdownItem>
                <DropdownItem icon={<XCircle />} onSelect={() => request(row, "rejected")}>
                  Reject
                </DropdownItem>
              </>
            )}
            {row.status === "approved" && (
              <DropdownItem icon={<Ban />} onSelect={() => request(row, "suspended")}>
                Suspend
              </DropdownItem>
            )}
            {row.status === "suspended" && (
              <DropdownItem icon={<CheckCircle2 />} onSelect={() => request(row, "approved")}>
                Reinstate
              </DropdownItem>
            )}
          </Can>
          <Can anyPermission={["merchants:impersonate"]}>
            <DropdownItem icon={<UserCog />} onSelect={() => impersonate(row)}>
              Impersonate
            </DropdownItem>
          </Can>
          <DropdownSeparator />
        </>
      }
    />
  ));

  const status = list.filters.status ?? "";
  const activeFilters: ActiveFilter[] = status
    ? [{ key: "status", label: `Status: ${statusLabel[status as MerchantStatus]}` }]
    : [];

  const bulkApprove = async (ids: string[]) => {
    const rows = list.rows.filter((r) => ids.includes(r.id));
    let failed = 0;
    for (const row of rows) {
      try {
        await setStatus.mutateAsync({ id: row.id, status: "approved" });
      } catch {
        failed += 1;
      }
    }
    if (failed) {
      toast.warning(`${failed} of ${rows.length} could not be approved`, {
        description: "They still have outstanding verification steps.",
      });
    } else {
      toast.success(`${rows.length} merchants approved`);
    }
    list.clearSelection();
  };

  return (
    <>
      <ResourceListView<Merchant>
        list={list}
        searchPlaceholder="Search merchant, contact or country…"
        activeFilters={activeFilters}
        filterControls={
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => list.setFilter("status", e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...statusOptions(MERCHANT_STATUSES)]}
            wrapperClassName="w-48"
          />
        }
        primaryAction={
          <Can anyPermission={["merchants:create"]}>
            <Link href="/dashboard/merchants/create" className={buttonVariants({ size: "sm" })}>
              <Plus className="size-4" aria-hidden="true" />
              Invite merchant
            </Link>
          </Can>
        }
        bulkActions={(ids) => (
          <Can anyPermission={["merchants:approve"]}>
            <Button
              variant="outline"
              size="sm"
              loading={setStatus.isPending}
              onClick={() => bulkApprove(ids)}
            >
              Approve
            </Button>
          </Can>
        )}
        caption="Merchants"
      />

      <ReasonDialog
        open={Boolean(reasonFor)}
        title={
          reasonFor
            ? `${statusLabel[reasonFor.status]} — ${reasonFor.row.name}`
            : "Decision"
        }
        description="The merchant sees this note on their onboarding screen and in their notifications."
        confirmLabel={reasonFor ? statusLabel[reasonFor.status] : "Confirm"}
        loading={setStatus.isPending}
        onClose={() => setReasonFor(null)}
        onConfirm={async (note) => {
          if (!reasonFor) return;
          await apply(reasonFor.row, reasonFor.status, note);
          setReasonFor(null);
        }}
      />
    </>
  );
}
