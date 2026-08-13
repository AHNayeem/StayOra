/**
 * The editorial workflow: transitions, version history, scheduled publishing.
 *
 * This layer sits on top of the existing `cmsService` rather than replacing it
 * — the service still owns the page rows, this owns *how a page is allowed to
 * move* and what it looked like before it moved. Every operation writes an
 * entry to the platform audit trail, so a publish is visible in Activity next
 * to a refund approval or a rate change.
 */

import { auditService, type DomainActor } from "../../domain";
import { cmsService } from "./service";
import type { CmsPage, CmsStatus, CmsVersion } from "./types";

/** Which moves the workflow allows, keyed by the state you are leaving. */
export const CMS_TRANSITIONS: Record<CmsStatus, CmsStatus[]> = {
  draft: ["review"],
  review: ["draft", "scheduled", "published"],
  scheduled: ["review", "published"],
  published: ["draft"],
};

/** Button copy for each move, from the state it is made in. */
export const TRANSITION_LABEL: Record<CmsStatus, string> = {
  draft: "Return to draft",
  review: "Submit for review",
  scheduled: "Schedule publish",
  published: "Approve & publish",
};

export function canTransition(from: CmsStatus, to: CmsStatus): boolean {
  return CMS_TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// Version history
// ---------------------------------------------------------------------------

/**
 * pageId → snapshots, newest first. Module-scoped like the page store itself,
 * so history lives exactly as long as the pages it describes.
 */
const versions = new Map<string, CmsVersion[]>();
let versionSeq = 0;

function snapshotOf(page: CmsPage, savedBy: string, note: string): CmsVersion {
  versionSeq += 1;
  return {
    id: `cmsv_${versionSeq}`,
    pageId: page.id,
    version: page.version,
    title: page.title,
    slug: page.slug,
    type: page.type,
    author: page.author,
    excerpt: page.excerpt,
    body: page.body,
    status: page.status,
    savedAt: new Date().toISOString(),
    savedBy,
    note,
  };
}

/**
 * Record what a page looked like *before* it is changed. Callers snapshot the
 * previous state, then write the new one — so version N in history is always
 * the content that produced it, never the content that replaced it.
 */
export function recordVersion(page: CmsPage, savedBy: string, note: string): CmsVersion {
  const entry = snapshotOf(page, savedBy, note);
  versions.set(page.id, [entry, ...(versions.get(page.id) ?? [])]);
  return entry;
}

/** History for one page, newest first. */
export function listVersions(pageId: string): CmsVersion[] {
  return versions.get(pageId) ?? [];
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

function audit(
  page: CmsPage,
  actor: DomainActor,
  action: Parameters<typeof auditService.record>[0]["action"],
  summary: string,
  from?: string,
  to?: string,
): void {
  auditService.record({
    actor,
    action,
    entity: "cms_page",
    entityId: page.id,
    entityLabel: page.title,
    summary,
    from,
    to,
  });
}

/** Audit an edit and snapshot the pre-edit content. Called by the form hooks. */
export function recordEdit(previous: CmsPage, next: CmsPage, actor: DomainActor): void {
  recordVersion(previous, actor.name, `Edited by ${actor.name}`);
  audit(next, actor, "update", `Updated content for “${next.title}” (v${next.version}).`);
}

export function recordCreate(page: CmsPage, actor: DomainActor): void {
  recordVersion(page, actor.name, "Created");
  audit(page, actor, "create", `Created page “${page.title}”.`);
}

export function recordDelete(page: CmsPage, actor: DomainActor): void {
  versions.delete(page.id);
  audit(page, actor, "delete", `Deleted page “${page.title}”.`);
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export interface TransitionInput {
  page: CmsPage;
  to: CmsStatus;
  actor: DomainActor;
  /** Required when moving to `scheduled` — when the page should go live. */
  publishAt?: string;
}

export class CmsWorkflowError extends Error {}

/**
 * Move a page through the workflow. Rejects illegal moves rather than coercing
 * them, because "publish straight from draft" is exactly the mistake the
 * workflow exists to prevent.
 */
export async function transition({
  page,
  to,
  actor,
  publishAt,
}: TransitionInput): Promise<CmsPage> {
  if (!canTransition(page.status, to)) {
    throw new CmsWorkflowError(
      `A ${page.status} page cannot move straight to ${to}.`,
    );
  }
  if (to === "scheduled" && !publishAt) {
    throw new CmsWorkflowError("Choose a date and time before scheduling.");
  }

  recordVersion(page, actor.name, `${page.status} → ${to}`);

  const now = new Date().toISOString();
  const patch: Partial<CmsPage> = { status: to, updatedAt: now };
  if (to === "review") patch.submittedBy = actor.name;
  if (to === "scheduled") {
    patch.publishAt = publishAt;
    patch.reviewedBy = actor.name;
  }
  if (to === "published") {
    patch.publishedAt = now;
    patch.reviewedBy = actor.name;
    patch.publishAt = undefined;
  }
  if (to === "draft") {
    patch.publishAt = undefined;
    patch.publishedAt = undefined;
  }

  const next = await cmsService.update(page.id, patch);
  audit(
    next,
    actor,
    to === "published" ? "approve" : "status_change",
    to === "scheduled"
      ? `Scheduled “${page.title}” to publish on ${new Date(publishAt!).toLocaleString()}.`
      : `Moved “${page.title}” from ${page.status} to ${to}.`,
    page.status,
    to,
  );
  return next;
}

/**
 * Restore a previous version's content onto the page, as a new version.
 *
 * The page returns to `draft`: content that was approved three revisions ago
 * has not been approved *now*, so it goes back through review like anything
 * else.
 */
export async function restoreVersion(
  page: CmsPage,
  version: CmsVersion,
  actor: DomainActor,
): Promise<CmsPage> {
  recordVersion(page, actor.name, `Replaced by restore of v${version.version}`);

  const next = await cmsService.update(page.id, {
    title: version.title,
    slug: version.slug,
    type: version.type,
    author: version.author,
    excerpt: version.excerpt,
    body: version.body,
    status: "draft",
    version: page.version + 1,
    publishAt: undefined,
    publishedAt: undefined,
    updatedAt: new Date().toISOString(),
  });

  audit(
    next,
    actor,
    "update",
    `Restored “${page.title}” to version ${version.version} (now v${next.version}).`,
    `v${page.version}`,
    `v${next.version}`,
  );
  return next;
}

// ---------------------------------------------------------------------------
// Scheduled publishing
// ---------------------------------------------------------------------------

/**
 * Publish every scheduled page whose time has come.
 *
 * A cron job's job, done at read time — the same trick the inventory engine
 * uses to expire holds. Runs before every list read, so a schedule that fell
 * due while nobody was looking is applied the moment somebody looks.
 * Returns the pages it published.
 */
export async function runDueSchedules(
  actor: DomainActor,
  nowMs = Date.now(),
): Promise<CmsPage[]> {
  const rows = cmsService.peek?.() ?? [];
  const due = rows.filter(
    (p) => p.status === "scheduled" && p.publishAt && Date.parse(p.publishAt) <= nowMs,
  );

  const published: CmsPage[] = [];
  for (const page of due) {
    recordVersion(page, "Scheduler", "scheduled → published");
    const now = new Date(nowMs).toISOString();
    const next = await cmsService.update(page.id, {
      status: "published",
      publishedAt: now,
      publishAt: undefined,
      updatedAt: now,
    });
    audit(
      next,
      actor,
      "status_change",
      `“${page.title}” published automatically on schedule.`,
      "scheduled",
      "published",
    );
    published.push(next);
  }
  return published;
}
