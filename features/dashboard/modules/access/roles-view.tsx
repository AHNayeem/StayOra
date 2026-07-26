import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../../ui";
import { ROLE_LIST } from "../../rbac/roles";
import { RESOURCES, type Resource } from "../../rbac/permissions";
import { resourceCoverage, grantCount, type Coverage } from "./matrix";

const COVERAGE_META: Record<Coverage, { dot: string; title: string }> = {
  full: { dot: "bg-primary", title: "Full access" },
  partial: { dot: "bg-accent", title: "Partial access" },
  none: { dot: "bg-line", title: "No access" },
};

function CoverageDot({ coverage }: { coverage: Coverage }) {
  const meta = COVERAGE_META[coverage];
  return (
    <span className="inline-flex items-center justify-center" title={meta.title}>
      <span className={cn("size-2.5 rounded-full", meta.dot)} aria-hidden="true" />
      <span className="sr-only">{meta.title}</span>
    </span>
  );
}

/**
 * RolesView — the role catalogue and a role × resource coverage matrix, both
 * derived from the RBAC seed (see {@link ROLE_LIST}). Read-only for now; a role
 * editor would mutate the same seed once the API is wired.
 */
export function RolesView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ROLE_LIST.map((role) => {
          const grants = grantCount(role);
          return (
            <div
              key={role.id}
              className="flex flex-col rounded-card border border-line bg-surface p-5 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-field bg-primary-50 text-primary-700">
                  <Shield className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{role.label}</p>
                  <p className="text-xs text-muted">{role.id}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-body">{role.description}</p>
              <div className="mt-4">
                <Badge variant={grants === Infinity ? "primary" : "neutral"}>
                  {grants === Infinity ? "All permissions" : `${grants} permission groups`}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-card border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-semibold text-ink">Coverage matrix</h2>
            <p className="text-sm text-muted">Resource access by role.</p>
          </div>
          <div className="hidden items-center gap-4 text-xs text-muted sm:flex">
            {(["full", "partial", "none"] as const).map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <CoverageDot coverage={c} />
                {COVERAGE_META[c].title}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-2xl border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="sticky left-0 bg-surface px-5 py-3 text-left font-medium text-muted">
                  Resource
                </th>
                {ROLE_LIST.map((role) => (
                  <th
                    key={role.id}
                    className="px-3 py-3 text-center font-medium text-muted"
                  >
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((resource: Resource) => (
                <tr key={resource} className="border-b border-line last:border-0">
                  <td className="sticky left-0 bg-surface px-5 py-2.5 font-medium text-ink">
                    {resource}
                  </td>
                  {ROLE_LIST.map((role) => (
                    <td key={role.id} className="px-3 py-2.5 text-center">
                      <CoverageDot coverage={resourceCoverage(role, resource)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
