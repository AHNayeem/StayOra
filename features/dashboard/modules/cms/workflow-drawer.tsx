"use client";

import { useState } from "react";
import {
  CalendarClock,
  Check,
  Eye,
  History,
  RotateCcw,
  Send,
  Undo2,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "../../data";
import { Alert, Button, Panel, StatusBadge } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { formatDateTime } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import { listVersions, useRestoreCmsVersion, useTransitionCmsPage } from "./hooks";
import { CMS_TRANSITIONS } from "./workflow";
import { CMS_STATUSES, type CmsPage, type CmsStatus, type CmsVersion } from "./types";

const statusTone = toneMap(CMS_STATUSES);
const statusLabel = labelMap(CMS_STATUSES);

/** Icon + copy for each move, keyed by the state being moved *into*. */
const MOVES: Record<CmsStatus, { label: string; icon: typeof Send }> = {
  draft: { label: "Return to draft", icon: Undo2 },
  review: { label: "Submit for review", icon: Send },
  scheduled: { label: "Schedule publish", icon: CalendarClock },
  published: { label: "Approve & publish", icon: Check },
};

/** `datetime-local` wants "YYYY-MM-DDTHH:mm" — a day out is a sensible default. */
function defaultSchedule(): string {
  const when = new Date(Date.now() + 86_400_000);
  return new Date(when.getTime() - when.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

interface WorkflowDrawerProps {
  page: CmsPage | null;
  onClose: () => void;
}

/**
 * The editorial surface for one page: where it is in the workflow, what it
 * looks like right now, and everything it used to look like.
 *
 * Publishing sits behind `cms:approve` while editing only needs `cms:update`,
 * so "who may write" and "who may release" stay separable — the entire point
 * of putting a review step in the middle.
 */
export function CmsWorkflowDrawer({ page, onClose }: WorkflowDrawerProps) {
  const [tab, setTab] = useState<"workflow" | "preview" | "history">("workflow");
  const [publishAt, setPublishAt] = useState(defaultSchedule);
  const [error, setError] = useState<string | null>(null);
  const move = useTransitionCmsPage();
  const restore = useRestoreCmsVersion();

  const versions = page ? listVersions(page.id) : [];
  const targets = page ? CMS_TRANSITIONS[page.status] : [];

  const runMove = async (to: CmsStatus) => {
    if (!page) return;
    setError(null);
    try {
      await move.mutateAsync({
        page,
        to,
        publishAt: to === "scheduled" ? new Date(publishAt).toISOString() : undefined,
      });
      toast.success(
        to === "scheduled"
          ? `Scheduled for ${formatDateTime(new Date(publishAt).toISOString())}`
          : `Moved to ${statusLabel[to].toLowerCase()}`,
        { description: page.title },
      );
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const runRestore = async (version: CmsVersion) => {
    if (!page) return;
    setError(null);
    try {
      await restore.mutateAsync({ page, version });
      toast.success(`Restored version ${version.version}`, {
        description: "The page is back in draft for review.",
      });
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <Drawer
      open={Boolean(page)}
      onClose={onClose}
      size="lg"
      title={page ? page.title : "Page"}
    >
      {page && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusTone[page.status]}>
              {statusLabel[page.status]}
            </StatusBadge>
            <span className="font-mono text-xs text-muted">
              v{page.version} · /{page.slug}
            </span>
          </div>

          <div role="tablist" aria-label="Page workflow" className="flex gap-1 border-b border-line">
            {(
              [
                ["workflow", "Workflow", History],
                ["preview", "Preview", Eye],
                ["history", `History (${versions.length})`, History],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`cms-tab-${key}`}
                aria-selected={tab === key}
                aria-controls={`cms-panel-${key}`}
                onClick={() => setTab(key)}
                className={
                  tab === key
                    ? "-mb-px border-b-2 border-primary px-3 py-2 text-sm font-semibold text-primary"
                    : "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted hover:text-ink"
                }
              >
                {label}
              </button>
            ))}
          </div>

          {error && (
            <Alert tone="danger" title="That move isn't allowed">
              {error}
            </Alert>
          )}

          {tab === "workflow" && (
            <div
              role="tabpanel"
              id="cms-panel-workflow"
              aria-labelledby="cms-tab-workflow"
              className="flex flex-col gap-4"
            >
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Fact label="Author" value={page.author} />
                <Fact label="Last updated" value={formatDateTime(page.updatedAt)} />
                {page.submittedBy && <Fact label="Submitted by" value={page.submittedBy} />}
                {page.reviewedBy && <Fact label="Approved by" value={page.reviewedBy} />}
                {page.publishAt && (
                  <Fact label="Scheduled for" value={formatDateTime(page.publishAt)} />
                )}
                {page.publishedAt && (
                  <Fact label="Published" value={formatDateTime(page.publishedAt)} />
                )}
              </dl>

              {targets.includes("scheduled") && (
                <Panel>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-ink">Publish at</span>
                    <input
                      type="datetime-local"
                      value={publishAt}
                      onChange={(e) => setPublishAt(e.target.value)}
                      className="h-10 rounded-field border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />
                    <span className="text-xs text-muted">
                      The page goes live on its own once this passes — no further
                      approval is asked for.
                    </span>
                  </label>
                </Panel>
              )}

              <div className="flex flex-wrap gap-2">
                {targets.map((to) => {
                  const { label, icon: Icon } = MOVES[to];
                  const needsApproval = to === "published" || to === "scheduled";
                  const button = (
                    <Button
                      key={to}
                      size="sm"
                      variant={to === "published" ? "primary" : "outline"}
                      loading={move.isPending}
                      onClick={() => runMove(to)}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {label}
                    </Button>
                  );
                  return needsApproval ? (
                    <Can key={to} anyPermission={["cms:approve"]}>
                      {button}
                    </Can>
                  ) : (
                    button
                  );
                })}
              </div>
            </div>
          )}

          {tab === "preview" && (
            <div
              role="tabpanel"
              id="cms-panel-preview"
              aria-labelledby="cms-tab-preview"
            >
              <p className="mb-3 text-xs text-muted">
                Preview of the current draft — this is what the public page renders
                once it is published.
              </p>
              <article className="rounded-card border border-line bg-surface-muted p-6">
                <p className="font-mono text-xs text-muted">otithee.com/{page.slug}</p>
                <h3 className="mt-2 text-h3">{page.title}</h3>
                <p className="mt-1 text-sm italic text-muted">{page.excerpt}</p>
                <div className="mt-4 space-y-3 text-sm text-body">
                  {page.body.split(/\n{2,}/).map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </article>
            </div>
          )}

          {tab === "history" && (
            <div
              role="tabpanel"
              id="cms-panel-history"
              aria-labelledby="cms-tab-history"
            >
              {versions.length === 0 ? (
                <p className="rounded-card border border-dashed border-line p-6 text-center text-sm text-muted">
                  No earlier versions yet — history starts at the first edit.
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {versions.map((version) => (
                    <li
                      key={version.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          v{version.version} · {version.title}
                        </p>
                        <p className="text-xs text-muted">
                          {version.note} · {version.savedBy} ·{" "}
                          {formatDateTime(version.savedAt)}
                        </p>
                      </div>
                      <Can anyPermission={["cms:update"]}>
                        <Button
                          size="sm"
                          variant="outline"
                          loading={restore.isPending}
                          onClick={() => runRestore(version)}
                        >
                          <RotateCcw className="size-4" aria-hidden="true" />
                          Restore
                        </Button>
                      </Can>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}
