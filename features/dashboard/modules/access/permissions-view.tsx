"use client";

import { useMemo, useState } from "react";
import { KeyRound, Search, Shield } from "lucide-react";
import { Badge, Drawer, EmptyState, Input } from "../../ui";
import { ACTIONS, RESOURCES, perm } from "../../rbac/permissions";
import { rolesHolding } from "../../rbac/role-service";
import type { Permission } from "../../rbac/types";
import { useRoles } from "./hooks";

/** Actions that read vs. mutate — drives the badge tone in the catalogue. */
const WRITE_ACTIONS = new Set(["create", "update", "delete", "approve", "impersonate"]);

/** What each action means, so the catalogue explains itself. */
const ACTION_MEANING: Record<string, string> = {
  read: "View records and their details.",
  create: "Add new records.",
  update: "Change existing records.",
  delete: "Remove records permanently.",
  approve: "Make the decision on a record awaiting review.",
  export: "Download records as CSV.",
  impersonate: "Act on the platform as another account.",
};

/**
 * PermissionsView — the fine-grained permission catalogue: every
 * `resource:action` string the dashboard understands, grouped by resource and
 * filterable. Selecting one shows what it means and, more usefully, exactly
 * which roles currently hold it — the question an admin actually arrives with.
 */
export function PermissionsView() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Permission | null>(null);
  const roles = useRoles();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESOURCES.map((resource) => ({
      resource,
      permissions: ACTIONS.map((action) => perm(resource, action)).filter((p) =>
        q ? p.includes(q) : true,
      ),
    })).filter((g) => g.permissions.length > 0);
  }, [query]);

  const holders = useMemo(
    () => (selected ? rolesHolding(selected, roles.data ?? []) : []),
    [selected, roles.data],
  );

  const total = RESOURCES.length * ACTIONS.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {total} permissions across {RESOURCES.length} resources ×{" "}
          {ACTIONS.length} actions. Select one to see which roles hold it.
        </p>
        <Input
          aria-label="Search permissions"
          placeholder="Search permissions…"
          leftIcon={<Search className="size-4" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:w-72"
        />
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="No permissions match"
          description={`Nothing matched “${query}”. Try a resource or action name.`}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.resource}
              className="rounded-card border border-line bg-surface p-5 shadow-card"
            >
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-primary" aria-hidden="true" />
                <h3 className="font-semibold text-ink">{group.resource}</h3>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {group.permissions.map((p) => {
                  const action = p.split(":")[1];
                  return (
                    <li key={p}>
                      <button
                        type="button"
                        onClick={() => setSelected(p)}
                        className="rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        aria-label={`Details for ${p}`}
                      >
                        <Badge
                          variant={WRITE_ACTIONS.has(action) ? "accent" : "neutral"}
                          size="sm"
                        >
                          {action}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        size="md"
        title={selected ?? "Permission"}
      >
        {selected && (
          <div className="flex flex-col gap-5 px-1 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                What it grants
              </p>
              <p className="mt-1 text-sm text-body">
                {ACTION_MEANING[selected.split(":")[1]] ?? "A scoped capability."}{" "}
                Applies to the{" "}
                <strong className="font-semibold text-ink">{selected.split(":")[0]}</strong>{" "}
                resource only.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Held by {holders.length} of {roles.data?.length ?? 0} roles
              </p>
              {holders.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  No role holds this permission — nothing in the product can perform it
                  today.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-2">
                  {holders.map((role) => (
                    <li
                      key={role.id}
                      className="flex items-center gap-3 rounded-field border border-line px-3 py-2"
                    >
                      <Shield className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">
                          {role.label}
                        </span>
                        <span className="block truncate text-xs text-muted">{role.id}</span>
                      </span>
                      {!role.builtIn && (
                        <Badge size="sm" variant="accent" className="ml-auto">
                          Custom
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-muted">
              Grants are edited per role on the Roles screen — permissions themselves are
              the fixed vocabulary both the UI and the API check against.
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
