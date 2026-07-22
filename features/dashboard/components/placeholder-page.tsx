"use client";

import { Construction } from "lucide-react";
import { PermissionGuard } from "../rbac/permission-guard";
import type { FeatureFlag, Permission } from "../rbac/types";
import { PageHeader } from "./page-header";
import { PermissionDenied } from "./state-views";

interface PlaceholderPageProps {
  title: string;
  description?: string;
  /** Capabilities this module will ship (shown as a checklist preview). */
  features?: string[];
  /** Phase in which this module is built out. */
  phase?: number;
  /** Access requirement — the page renders "permission denied" if unmet. */
  anyPermission?: Permission[];
  permissions?: Permission[];
  featureFlag?: FeatureFlag;
}

/**
 * Scaffolding for a not-yet-built module. Renders the standard page header and
 * a "planned" panel behind a permission guard, so every route in the sidebar is
 * reachable, RBAC-checked and visually consistent during Phase 1 review. Real
 * module content replaces this in Phases 4–5.
 */
export function PlaceholderPage({
  title,
  description,
  features,
  phase,
  anyPermission,
  permissions,
  featureFlag,
}: PlaceholderPageProps) {
  return (
    <PermissionGuard
      anyPermission={anyPermission}
      permissions={permissions}
      featureFlag={featureFlag}
      fallback={<PermissionDenied />}
    >
      <PageHeader title={title} description={description} />

      <div className="rounded-card border border-dashed border-line bg-surface p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-card bg-primary-50 text-primary-700">
            <Construction className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Module scaffolded</p>
            <p className="mt-1 text-sm text-body">
              This route is wired into navigation, routing and access control.
              {phase ? ` Full functionality lands in Phase ${phase}.` : ""}
            </p>

            {features && features.length > 0 && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-body">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
