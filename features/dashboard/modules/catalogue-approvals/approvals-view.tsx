"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Plus, RotateCcw, Send, XCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { VERTICAL_LABELS, type BookingVertical } from "@/types/booking";
import {
  CATALOGUE_STATUS_LABELS,
  CATALOGUE_STATUS_TONES,
  CATALOGUE_STATUS_VALUES,
  IN_REVIEW_STATUSES,
  countCatalogue,
  publishBlockers,
  type CatalogueItem,
  type CatalogueStatus,
} from "@/features/dashboard/domain";
import { getErrorMessage } from "../../data";
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Modal,
  Select,
  StatCard,
  StatusBadge,
  Tag,
} from "../../ui";
import { EmptyState, NoResults } from "../../components/state-views";
import { useRbac } from "../../rbac/rbac-provider";
import { useRoleView } from "../../domain/use-domain";
import { formatCurrency, formatDate, formatDateTime } from "../../lib/format";
import { useMerchant } from "../merchants/hooks";
import { ReasonDialog } from "../merchants/review-dialogs";
import {
  useCatalogue,
  usePublishCatalogueItem,
  useReviewCatalogueItem,
  useSubmitCatalogueItem,
  useUnpublishCatalogueItem,
} from "./hooks";
import { CatalogueItemForm } from "./item-form";

type Decision = { item: CatalogueItem; to: "action_required" | "rejected" };

/**
 * Catalogue approvals — one screen, two audiences.
 *
 * A merchant sees their own products and moves them draft → submitted →
 * published; the platform sees the review queue and decides. Both read the same
 * records through the same service, which is what connects "product created" to
 * "listing on sale".
 */
export function CatalogueApprovalsView() {
  const { user } = useRbac();
  const { isMerchant } = useRoleView();
  const catalogue = useCatalogue();
  const merchant = useMerchant(isMerchant ? (user.merchantId ?? "") : "");

  const [status, setStatus] = useState<CatalogueStatus | "">("");
  const [vertical, setVertical] = useState<BookingVertical | "">("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CatalogueItem | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [timelineFor, setTimelineFor] = useState<CatalogueItem | null>(null);

  const submitItem = useSubmitCatalogueItem();
  const publishItem = usePublishCatalogueItem();
  const unpublishItem = useUnpublishCatalogueItem();
  const review = useReviewCatalogueItem();

  const items = catalogue.data ?? [];
  const counts = useMemo(() => countCatalogue(items), [items]);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (!status || item.status === status) && (!vertical || item.vertical === vertical),
      ),
    [items, status, vertical],
  );

  const blockers = merchant.data ? publishBlockers(merchant.data) : [];

  const run = async (label: string, work: Promise<unknown>) => {
    try {
      await work;
      toast.success(label);
    } catch (error) {
      toast.error("Couldn't complete that", { description: getErrorMessage(error) });
    }
  };

  if (catalogue.isLoading && items.length === 0) return <ListSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      {isMerchant && blockers.length > 0 && (
        <Alert tone="warning" title="You can't publish yet">
          <ul className="mt-1 space-y-1">
            {blockers.map((b) => (
              <li key={b}>· {b}</li>
            ))}
          </ul>
          <Link href="/dashboard/onboarding" className="mt-2 inline-block font-medium underline">
            Finish onboarding
          </Link>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published" value={String(counts.published)} icon="CheckCircle2" />
        <StatCard
          label="In review"
          value={String(counts.submitted + counts.underReview)}
          icon="Clock"
          hint={isMerchant ? "With the platform" : "Waiting on you"}
        />
        <StatCard
          label="Needs work"
          value={String(counts.actionRequired + counts.rejected)}
          icon="AlertTriangle"
        />
        <StatCard label="Drafts" value={String(counts.draft)} icon="FileText" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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
          <Select
            aria-label="Filter by product"
            value={vertical}
            onChange={(e) => setVertical(e.target.value as BookingVertical | "")}
            options={[
              { value: "", label: "All products" },
              ...Object.entries(VERTICAL_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            wrapperClassName="w-48"
          />
          {!isMerchant && (
            <Button
              size="sm"
              variant={status === "submitted" ? "primary" : "outline"}
              onClick={() => setStatus(status === "submitted" ? "" : "submitted")}
            >
              Review queue ({counts.submitted + counts.underReview})
            </Button>
          )}
        </div>

        {isMerchant && (
          <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>
            New listing
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        items.length === 0 ? (
          <EmptyState
            title={isMerchant ? "No listings yet" : "Nothing in the catalogue"}
            description={
              isMerchant
                ? "Create your first listing and submit it for review."
                : "No merchant has submitted a product yet."
            }
            action={
              isMerchant ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  New listing
                </Button>
              ) : undefined
            }
          />
        ) : (
          <NoResults />
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-line bg-surface p-4 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="truncate text-sm font-semibold text-ink hover:underline"
                    onClick={() => setTimelineFor(item)}
                  >
                    {item.title}
                  </button>
                  <StatusBadge tone={CATALOGUE_STATUS_TONES[item.status]}>
                    {CATALOGUE_STATUS_LABELS[item.status]}
                  </StatusBadge>
                  {item.version > 1 && <Badge variant="neutral">v{item.version}</Badge>}
                  {item.origin === "seed" && <Tag variant="soft">Launch catalogue</Tag>}
                </div>
                <p className="mt-1 text-xs text-muted">
                  {VERTICAL_LABELS[item.vertical]} · {item.city}
                  {item.country ? `, ${item.country}` : ""} ·{" "}
                  {formatCurrency(item.basePrice, item.currency)}
                  {!isMerchant && ` · ${item.merchantName}`}
                </p>
                {item.reviewNote && (
                  <p className="mt-2 text-xs font-medium text-danger">{item.reviewNote}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  Updated {formatDate(item.updatedAt)}
                  {item.submittedAt && ` · submitted ${formatDate(item.submittedAt)}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isMerchant ? (
                  <>
                    {(item.status === "draft" ||
                      item.status === "action_required" ||
                      item.status === "unpublished") && (
                      <Button
                        size="sm"
                        leftIcon={<Send className="size-4" />}
                        loading={submitItem.isPending}
                        onClick={() =>
                          run("Submitted for review", submitItem.mutateAsync(item.id))
                        }
                      >
                        Submit
                      </Button>
                    )}
                    {item.status === "approved" && (
                      <Button
                        size="sm"
                        leftIcon={<Eye className="size-4" />}
                        loading={publishItem.isPending}
                        onClick={() => run("Published", publishItem.mutateAsync(item.id))}
                      >
                        Publish
                      </Button>
                    )}
                    {item.status === "published" && (
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<EyeOff className="size-4" />}
                        loading={unpublishItem.isPending}
                        onClick={() =>
                          run("Taken down", unpublishItem.mutateAsync({ id: item.id }))
                        }
                      >
                        Unpublish
                      </Button>
                    )}
                    {item.origin === "merchant" && !IN_REVIEW_STATUSES.includes(item.status) && (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                        Edit
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {item.status === "submitted" && (
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<RotateCcw className="size-4" />}
                        loading={review.isPending}
                        onClick={() =>
                          run("Review started", review.mutateAsync({ id: item.id, to: "under_review" }))
                        }
                      >
                        Start review
                      </Button>
                    )}
                    {IN_REVIEW_STATUSES.includes(item.status) && (
                      <>
                        <Button
                          size="sm"
                          leftIcon={<CheckCircle2 className="size-4" />}
                          loading={review.isPending}
                          onClick={() =>
                            run(
                              "Approved and published",
                              review.mutateAsync({ id: item.id, to: "approved", publish: true }),
                            )
                          }
                        >
                          Approve &amp; publish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          loading={review.isPending}
                          onClick={() =>
                            run("Approved", review.mutateAsync({ id: item.id, to: "approved" }))
                          }
                        >
                          Approve only
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<RotateCcw className="size-4" />}
                          onClick={() => setDecision({ item, to: "action_required" })}
                        >
                          Request changes
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<XCircle className="size-4" />}
                          onClick={() => setDecision({ item, to: "rejected" })}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {item.status === "published" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<EyeOff className="size-4" />}
                        onClick={() => setDecision({ item, to: "action_required" })}
                      >
                        Request changes
                      </Button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Merchant: create / edit */}
      <Drawer
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        size="lg"
        title={editing ? `Edit ${editing.title}` : "New listing"}
      >
        {(creating || editing) && merchant.data && (
          <CatalogueItemForm
            merchant={merchant.data}
            item={editing ?? undefined}
            onDone={() => {
              setCreating(false);
              setEditing(null);
            }}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        )}
      </Drawer>

      {/* Admin: a decision that has to carry a reason */}
      <ReasonDialog
        open={Boolean(decision)}
        title={
          decision
            ? `${decision.to === "rejected" ? "Reject" : "Request changes to"} "${decision.item.title}"`
            : "Decision"
        }
        description="The merchant sees this on their listing and in their notifications."
        confirmLabel={decision?.to === "rejected" ? "Reject" : "Request changes"}
        loading={review.isPending}
        onClose={() => setDecision(null)}
        onConfirm={async (note) => {
          if (!decision) return;
          await run(
            decision.to === "rejected" ? "Rejected" : "Changes requested",
            review.mutateAsync({ id: decision.item.id, to: decision.to, note }),
          );
          setDecision(null);
        }}
      />

      <TimelineModal item={timelineFor} onClose={() => setTimelineFor(null)} />
    </div>
  );
}

function TimelineModal({ item, onClose }: { item: CatalogueItem | null; onClose: () => void }) {
  if (!item) return null;
  return (
    <Modal open onClose={onClose} title={item.title} description="Review history">
      <ol className="relative space-y-4 border-l border-line pl-5">
        {[...item.timeline].reverse().map((event) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-[1.4rem] top-1 size-2.5 rounded-full bg-primary ring-4 ring-surface" />
            <p className="text-sm font-medium text-ink">{event.label}</p>
            <p className="text-xs text-muted">
              {event.actor} · {formatDateTime(event.at)}
            </p>
            {event.note && <p className="mt-1 text-xs text-body">{event.note}</p>}
          </li>
        ))}
      </ol>
    </Modal>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-card bg-surface-muted" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-card bg-surface-muted" />
      ))}
    </div>
  );
}
