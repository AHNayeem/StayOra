"use client";

import { useMemo, useState } from "react";
import { KeyRound, Search } from "lucide-react";
import { Badge, Input } from "../../ui";
import { ACTIONS, RESOURCES, perm } from "../../rbac/permissions";

/** Actions that read vs. mutate — drives the badge tone in the catalogue. */
const WRITE_ACTIONS = new Set(["create", "update", "delete", "approve", "impersonate"]);

/**
 * PermissionsView — the fine-grained permission catalogue: every
 * `resource:action` string the dashboard understands, grouped by resource and
 * filterable. This is the *shape* the RBAC layer and (later) the API share; a
 * role decides which of these a user actually holds (see {@link RolesView}).
 */
export function PermissionsView() {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESOURCES.map((resource) => ({
      resource,
      permissions: ACTIONS.map((action) => perm(resource, action)).filter((p) =>
        q ? p.includes(q) : true,
      ),
    })).filter((g) => g.permissions.length > 0);
  }, [query]);

  const total = RESOURCES.length * ACTIONS.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {total} permissions across {RESOURCES.length} resources ×{" "}
          {ACTIONS.length} actions.
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
        <div className="rounded-card border border-line bg-surface px-5 py-10 text-center text-sm text-muted">
          No permissions match “{query}”.
        </div>
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
                      <Badge
                        variant={WRITE_ACTIONS.has(action) ? "accent" : "neutral"}
                        size="sm"
                      >
                        {action}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
