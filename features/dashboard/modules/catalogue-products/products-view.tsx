"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Send,
  Upload,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { VERTICAL_LABELS, type BookingVertical } from "@/types/booking";
import { listingHref } from "@/constants/verticals";
import {
  CATALOGUE_STATUS_LABELS,
  CATALOGUE_STATUS_TONES,
  CATALOGUE_STATUS_VALUES,
  type CatalogueItem,
  type CatalogueStatus,
} from "@/features/dashboard/domain";
import { getErrorMessage } from "../../data";
import { Alert, Button, Drawer, Input, Select, StatCard, StatusBadge } from "../../ui";
import { EmptyState, NoResults } from "../../components/state-views";
import { Can } from "../../rbac/permission-guard";
import { useRbac } from "../../rbac/rbac-provider";
import { useRoleView } from "../../domain/use-domain";
import { formatCurrency, formatDate } from "../../lib/format";
import { useMerchant } from "../merchants/hooks";
import {
  useCatalogue,
  usePublishCatalogueItem,
  useSubmitCatalogueItem,
  useUnpublishCatalogueItem,
} from "../catalogue-approvals/hooks";
import { CatalogueItemForm } from "../catalogue-approvals/item-form";
import { BulkImportDialog, toCsv, downloadCsv } from "./bulk";

/**
 * One vertical's products — the canonical catalogue, not a parallel dataset.
 *
 * Before this screen existed, "Hotels" in the dashboard managed 16 invented
 * rows that the storefront could not see, while the site sold listings from
 * `constants/listings`. Both are now the same records: this list reads
 * `catalogueService`, so creating a hotel here and getting it approved makes it
 * bookable on the public site, and unpublishing it takes it down.
 *
 * The screen is scoped by role for free — a merchant sees only their own
 * products because `useCatalogue` passes the domain scope.
 */
export function CatalogueProductsView({ vertical }: { vertical: BookingVertical }) {
  const { user } = useRbac();
  const { isMerchant } = useRoleView();
  const catalogue = useCatalogue();
  const merchant = useMerchant(isMerchant ? (user.merchantId ?? "") : "");
  const submit = useSubmitCatalogueItem();
  const publish = usePublishCatalogueItem();
  const unpublish = useUnpublishCatalogueItem();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CatalogueStatus | "">("");
  const [editing, setEditing] = useState<CatalogueItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  const all = useMemo(
    () => (catalogue.data ?? []).filter((item) => item.vertical === vertical),
    [catalogue.data, vertical],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter(
      (item) =>
        (!status || item.status === status) &&
        (!term ||
          `${item.title} ${item.city} ${item.country} ${item.merchantName}`
            .toLowerCase()
            .includes(term)),
    );
  }, [all, search, status]);

  const live = all.filter((item) => item.status === "published").length;
  const inReview = all.filter((item) =>
    ["submitted", "under_review"].includes(item.status),
  ).length;
  const drafts = all.filter((item) => item.status === "draft").length;

  const act = async (label: string, run: () => Promise<unknown>) => {
    try {
      await run();
      toast.success(label);
    } catch (error) {
      toast.error("That didn't work", { description: getErrorMessage(error) });
    }
  };

  const exportCsv = () => {
    downloadCsv(`${vertical}-catalogue.csv`, toCsv(all));
    toast.success(`Exported ${all.length} ${VERTICAL_LABELS[vertical]}`);
  };

  if (catalogue.isLoading) {
    return <p className="py-12 text-center text-sm text-muted">Loading catalogue…</p>;
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Products" value={String(all.length)} icon="LayoutGrid" />
        <StatCard label="Live on site" value={String(live)} icon="CircleCheck" />
        <StatCard label="In review" value={String(inReview)} icon="Clock" />
        <StatCard label="Drafts" value={String(drafts)} icon="FileText" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          aria-label={`Search ${VERTICAL_LABELS[vertical]}`}
          placeholder="Search title, city or merchant…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          wrapperClassName="min-w-56 flex-1"
        />
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value as CatalogueStatus | "")}
          options={[
            { value: "", label: "All statuses" },
            ...CATALOGUE_STATUS_VALUES.map((s) => ({
              value: s,
              label: CATALOGUE_STATUS_LABELS[s],
            })),
          ]}
          wrapperClassName="w-48"
        />
        <Can anyPermission={["catalog:read"]}>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={all.length === 0}>
            <Download className="size-4" aria-hidden="true" /> Export
          </Button>
        </Can>
        <Can anyPermission={["catalog:create"]}>
          <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
            <Upload className="size-4" aria-hidden="true" /> Import
          </Button>
          {merchant.data && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden="true" /> New listing
            </Button>
          )}
        </Can>
      </div>

      {!isMerchant && (
        <Alert tone="info" title="One catalogue" className="mb-4">
          These are the same records the public site sells. Publishing puts a product on
          sale; unpublishing removes it from search and detail pages immediately.
        </Alert>
      )}

      {all.length === 0 ? (
        <EmptyState
          title={`No ${VERTICAL_LABELS[vertical].toLowerCase()} yet`}
          description="Create a listing, submit it for review and publish it to put it on sale."
        />
      ) : rows.length === 0 ? (
        <NoResults query={search} />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[52rem] text-sm">
            <caption className="sr-only">{VERTICAL_LABELS[vertical]}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{item.title}</p>
                    <p className="line-clamp-1 text-xs text-muted">{item.summary}</p>
                  </td>
                  <td className="px-4 py-3 text-body">{item.merchantName}</td>
                  <td className="px-4 py-3 text-body">
                    {item.city}, {item.country}
                  </td>
                  <td className="px-4 py-3 text-body">
                    {formatCurrency(item.basePrice, item.currency || "USD")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={CATALOGUE_STATUS_TONES[item.status]}>
                      {CATALOGUE_STATUS_LABELS[item.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-body">{formatDate(item.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {item.status === "published" && (
                        <Link
                          href={listingHref(item)}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          target="_blank"
                        >
                          View <ExternalLink className="size-3" aria-hidden="true" />
                        </Link>
                      )}
                      <Can anyPermission={["catalog:update"]}>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                          <Pencil className="size-3.5" aria-hidden="true" /> Edit
                        </Button>
                        {["draft", "action_required", "unpublished"].includes(item.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              act("Submitted for review", () => submit.mutateAsync(item.id))
                            }
                          >
                            <Send className="size-3.5" aria-hidden="true" /> Submit
                          </Button>
                        )}
                        {item.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() => act("Published", () => publish.mutateAsync(item.id))}
                          >
                            <Eye className="size-3.5" aria-hidden="true" /> Publish
                          </Button>
                        )}
                        {item.status === "published" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              act("Removed from sale", () =>
                                unpublish.mutateAsync({ id: item.id }),
                              )
                            }
                          >
                            <EyeOff className="size-3.5" aria-hidden="true" /> Unpublish
                          </Button>
                        )}
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Edit listing" : "New listing"}
        size="lg"
      >
        {merchant.data ? (
          <CatalogueItemForm
            merchant={merchant.data}
            item={editing ?? undefined}
            onDone={() => {
              setCreating(false);
              setEditing(null);
              void catalogue.refetch();
            }}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        ) : (
          <Alert tone="info" title="Choose a merchant">
            Platform staff create listings from the merchant&apos;s own workspace, so the
            product has an owner to settle against. Open the merchant and use “New listing”
            there.
          </Alert>
        )}
      </Drawer>

      <BulkImportDialog
        open={importing}
        vertical={vertical}
        merchantId={merchant.data?.id}
        onClose={() => setImporting(false)}
        onDone={() => {
          setImporting(false);
          void catalogue.refetch();
        }}
      />
    </>
  );
}
