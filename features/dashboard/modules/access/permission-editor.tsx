"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "../../data";
import { Alert, Badge, Button, Drawer, Input } from "../../ui";
import { ACTIONS, PERMISSION_WILDCARD, RESOURCES } from "../../rbac/permissions";
import type { Permission } from "../../rbac/types";
import type { RoleRecord } from "../../rbac/role-service";
import { useUpdateRolePermissions } from "./hooks";

/**
 * Does this permission set grant `resource:action`, honouring the wildcards it
 * stores? The editor works on the *un-expanded* list a role actually holds, so
 * ticking every action on a resource collapses to `resource:*` — which is what
 * an admin means, and what keeps the stored grant readable.
 */
function grants(permissions: Set<Permission>, resource: string, action: string): boolean {
  return (
    permissions.has(PERMISSION_WILDCARD) ||
    permissions.has(`${resource}:*`) ||
    permissions.has(`${resource}:${action}`)
  );
}

/** Collapse `resource:read|create|…` (all of them) down to `resource:*`. */
function normalize(permissions: Set<Permission>): Permission[] {
  if (permissions.has(PERMISSION_WILDCARD)) return [PERMISSION_WILDCARD];
  const out: Permission[] = [];
  for (const resource of RESOURCES) {
    const held = ACTIONS.filter((action) => permissions.has(`${resource}:${action}`));
    if (permissions.has(`${resource}:*`) || held.length === ACTIONS.length) {
      out.push(`${resource}:*`);
    } else {
      out.push(...held.map((action) => `${resource}:${action}`));
    }
  }
  return out;
}

/** Expand a stored list into the concrete set the checkboxes work against. */
function toConcreteSet(permissions: Permission[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const permission of permissions) {
    if (permission === PERMISSION_WILDCARD) {
      set.add(PERMISSION_WILDCARD);
      for (const resource of RESOURCES) {
        for (const action of ACTIONS) set.add(`${resource}:${action}`);
      }
      continue;
    }
    const [resource, action] = permission.split(":");
    if (action === "*") {
      for (const a of ACTIONS) set.add(`${resource}:${a}`);
    } else {
      set.add(permission);
    }
  }
  return set;
}

interface PermissionEditorProps {
  role: RoleRecord | null;
  onClose: () => void;
}

/**
 * The permission assignment surface: every resource × action, ticked or not,
 * for one role. Saving replaces the role's grants in a single write, so the
 * sidebar, route guards and action buttons all change together on the next
 * render — there is no separate "apply" step to forget.
 */
export function PermissionEditor({ role, onClose }: PermissionEditorProps) {
  const save = useUpdateRolePermissions();
  const [draft, setDraft] = useState<Set<Permission>>(new Set());
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Seed the draft the first time a given role opens the drawer.
  if (role && loadedFor !== role.id) {
    setLoadedFor(role.id);
    setDraft(toConcreteSet(role.permissions));
    setDirty(false);
    setError(null);
    setQuery("");
  }

  const superuser = draft.has(PERMISSION_WILDCARD);
  const resources = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESOURCES.filter((resource) => !q || resource.includes(q));
  }, [query]);

  const granted = useMemo(() => normalize(draft), [draft]);

  const toggle = (resource: string, action: string) => {
    setDirty(true);
    setDraft((prev) => {
      const next = new Set(prev);
      // Leaving superuser mode has to materialise the concrete grants first,
      // otherwise unticking one box would silently drop everything else.
      if (next.has(PERMISSION_WILDCARD)) {
        next.delete(PERMISSION_WILDCARD);
        for (const r of RESOURCES) for (const a of ACTIONS) next.add(`${r}:${a}`);
      }
      const key = `${resource}:${action}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleResource = (resource: string, on: boolean) => {
    setDirty(true);
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(PERMISSION_WILDCARD)) {
        next.delete(PERMISSION_WILDCARD);
        for (const r of RESOURCES) for (const a of ACTIONS) next.add(`${r}:${a}`);
      }
      for (const action of ACTIONS) {
        if (on) next.add(`${resource}:${action}`);
        else next.delete(`${resource}:${action}`);
      }
      return next;
    });
  };

  const submit = async () => {
    if (!role) return;
    setError(null);
    try {
      await save.mutateAsync({ id: role.id, permissions: granted });
      toast.success(`Permissions updated for ${role.label}`, {
        description: "Menu, routes and actions now reflect the new grants.",
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Drawer
      open={Boolean(role)}
      onClose={onClose}
      size="lg"
      title={role ? `Permissions — ${role.label}` : "Permissions"}
    >
      {role && (
        <div className="flex flex-col gap-4 px-1 pb-4">
          {error && (
            <Alert tone="danger" title="Couldn't save permissions">
              {error}
            </Alert>
          )}

          {superuser && (
            <Alert tone="warning" title="This role holds every permission">
              `*:*` grants everything, including future resources. Unticking any box
              replaces it with an explicit grant list.
            </Alert>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {superuser ? "All" : granted.length} grants ·{" "}
              {RESOURCES.length} resources × {ACTIONS.length} actions
            </p>
            <Input
              aria-label="Filter resources"
              placeholder="Filter resources…"
              leftIcon={<Search className="size-4" />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:w-64"
            />
          </div>

          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-2xl border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted/50">
                  <th className="px-4 py-2.5 text-left font-medium text-muted">Resource</th>
                  {ACTIONS.map((action) => (
                    <th key={action} className="px-2 py-2.5 text-center font-medium text-muted">
                      {action}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-medium text-muted">All</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => {
                  const all = ACTIONS.every((a) => grants(draft, resource, a));
                  return (
                    <tr key={resource} className="border-b border-line last:border-0">
                      <td className="px-4 py-2 font-medium text-ink">{resource}</td>
                      {ACTIONS.map((action) => (
                        <td key={action} className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            className="size-4 accent-(--color-primary)"
                            checked={grants(draft, resource, action)}
                            onChange={() => toggle(resource, action)}
                            aria-label={`${resource}:${action}`}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => toggleResource(resource, !all)}
                          className={cn(
                            "rounded-pill px-2 py-0.5 text-xs font-medium transition-colors",
                            all
                              ? "bg-primary-50 text-primary-700"
                              : "text-muted hover:bg-surface-muted hover:text-ink",
                          )}
                        >
                          {all ? "clear" : "grant"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {resources.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              No resource matches “{query}”.
            </p>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <ShieldCheck className="mr-1 inline size-3.5" aria-hidden="true" />
              Stored grants
            </p>
            <div className="flex flex-wrap gap-1.5">
              {granted.length === 0 ? (
                <span className="text-sm text-muted">
                  No permissions — this role can&rsquo;t sign in to anything.
                </span>
              ) : (
                granted.slice(0, 40).map((p) => (
                  <Badge key={p} size="sm" variant={p.endsWith(":*") ? "accent" : "neutral"}>
                    {p}
                  </Badge>
                ))
              )}
              {granted.length > 40 && (
                <Badge size="sm">+{granted.length - 40} more</Badge>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              loading={save.isPending}
              disabled={!dirty || granted.length === 0}
            >
              Save permissions
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
