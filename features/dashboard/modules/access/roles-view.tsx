"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  KeyRound,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "../../data";
import { ConfirmDialog } from "../../crud";
import {
  Badge,
  Button,
  CardSkeleton,
  EmptyState,
  Input,
  Panel,
  PanelHeader,
} from "../../ui";
import { Alert } from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { useRbac } from "../../rbac/rbac-provider";
import { RESOURCES, type Resource } from "../../rbac/permissions";
import type { RoleRecord } from "../../rbac/role-service";
import { resourceCoverage, grantCount, type Coverage } from "./matrix";
import { useDeleteRole, useResetRole, useRoles } from "./hooks";
import { PermissionEditor } from "./permission-editor";
import { RoleForm, type RoleFormMode } from "./role-form";

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
 * RolesView — the role manager.
 *
 * Roles used to be a read-only matrix rendered from a compile-time constant.
 * They are now runtime data: create a role, clone one to start from an existing
 * grant set, edit permissions, or reset a shipped role back to what it came
 * with. Every change goes through {@link roleService}, and the shell re-derives
 * the signed-in principal's grants immediately — so editing your own role
 * changes your own sidebar on the spot, which is exactly the feedback an admin
 * needs before rolling a change out.
 */
export function RolesView() {
  const roles = useRoles();
  const remove = useDeleteRole();
  const reset = useResetRole();
  const { user, can } = useRbac();

  const [query, setQuery] = useState("");
  const [formMode, setFormMode] = useState<RoleFormMode | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<RoleRecord | null>(null);
  const [deleting, setDeleting] = useState<RoleRecord | null>(null);
  const [resetting, setResetting] = useState<RoleRecord | null>(null);

  const all = useMemo(() => roles.data ?? [], [roles.data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (role) =>
        role.label.toLowerCase().includes(q) ||
        role.id.toLowerCase().includes(q) ||
        role.description.toLowerCase().includes(q),
    );
  }, [all, query]);

  const writable = can("roles:update");
  const customCount = all.filter((r) => !r.builtIn).length;

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`${deleting.label} deleted`);
      setDeleting(null);
    } catch (error) {
      toast.error("Couldn't delete role", { description: getErrorMessage(error) });
    }
  };

  const confirmReset = async () => {
    if (!resetting) return;
    try {
      await reset.mutateAsync(resetting.id);
      toast.success(`${resetting.label} restored to its shipped permissions`);
      setResetting(null);
    } catch (error) {
      toast.error("Couldn't reset role", { description: getErrorMessage(error) });
    }
  };

  if (roles.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {all.length} roles · {customCount} custom · your role is{" "}
          <strong className="font-semibold text-ink">{user.roleId}</strong>
        </p>
        <div className="flex items-center gap-2">
          <Input
            aria-label="Search roles"
            placeholder="Search roles…"
            leftIcon={<Search className="size-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:w-64"
          />
          <Can anyPermission={["roles:create"]}>
            <Button size="sm" onClick={() => setFormMode({ kind: "create" })}>
              <Plus className="size-4" aria-hidden="true" />
              New role
            </Button>
          </Can>
        </div>
      </div>

      {!writable && (
        <Alert tone="info" title="Read-only">
          Your role can view the access model but not change it. `roles:update` is
          required to edit permissions.
        </Alert>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No roles match"
          description={`Nothing matched “${query}”. Clear the search to see every role.`}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((role) => {
            const grants = grantCount(role);
            return (
              <div
                key={role.id}
                className="flex flex-col rounded-card border border-line bg-surface p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-field bg-primary-50 text-primary-700">
                      <Shield className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{role.label}</p>
                      <p className="truncate text-xs text-muted">{role.id}</p>
                    </div>
                  </div>
                  {!role.builtIn ? (
                    <Badge size="sm" variant="accent">
                      Custom
                    </Badge>
                  ) : role.modified ? (
                    <Badge size="sm" variant="outline">
                      Modified
                    </Badge>
                  ) : null}
                </div>

                <p className="mt-3 line-clamp-3 text-sm text-body">{role.description}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant={grants === Infinity ? "primary" : "neutral"}>
                    {grants === Infinity ? "All permissions" : `${grants} permission groups`}
                  </Badge>
                  {role.id === user.roleId && <Badge size="sm">Your role</Badge>}
                </div>

                <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  <Can anyPermission={["roles:update"]}>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<KeyRound className="size-4" />}
                      onClick={() => setEditingPermissions(role)}
                    >
                      Permissions
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${role.label}`}
                      onClick={() => setFormMode({ kind: "edit", role })}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </Can>
                  <Can anyPermission={["roles:create"]}>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Clone ${role.label}`}
                      onClick={() => setFormMode({ kind: "clone", source: role })}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </Can>
                  {role.builtIn ? (
                    role.modified && (
                      <Can anyPermission={["roles:update"]}>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Reset ${role.label}`}
                          onClick={() => setResetting(role)}
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      </Can>
                    )
                  ) : (
                    <Can anyPermission={["roles:delete"]}>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${role.label}`}
                        onClick={() => setDeleting(role)}
                      >
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </Can>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Panel flush>
        <PanelHeader
          title="Coverage matrix"
          description="Resource access by role — full, partial or none."
          actions={
            <div className="hidden items-center gap-4 text-xs text-muted sm:flex">
              {(["full", "partial", "none"] as const).map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <CoverageDot coverage={c} />
                  {COVERAGE_META[c].title}
                </span>
              ))}
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-2xl border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="sticky left-0 bg-surface px-5 py-3 text-left font-medium text-muted">
                  Resource
                </th>
                {all.map((role) => (
                  <th key={role.id} className="px-3 py-3 text-center font-medium text-muted">
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
                  {all.map((role) => (
                    <td key={role.id} className="px-3 py-2.5 text-center">
                      <CoverageDot coverage={resourceCoverage(role, resource)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <RoleForm mode={formMode} roles={all} onClose={() => setFormMode(null)} />

      <PermissionEditor
        role={editingPermissions}
        onClose={() => setEditingPermissions(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        tone="danger"
        title="Delete this role?"
        message={
          <>
            Users holding{" "}
            <strong className="font-semibold text-ink">{deleting?.label}</strong> fall back
            to the least-privileged role until they are reassigned.
          </>
        }
        confirmLabel="Delete role"
      />

      <ConfirmDialog
        open={Boolean(resetting)}
        onClose={() => setResetting(null)}
        onConfirm={confirmReset}
        loading={reset.isPending}
        tone="primary"
        title="Reset to shipped permissions?"
        message={
          <>
            <strong className="font-semibold text-ink">{resetting?.label}</strong> returns
            to the permissions it ships with. Custom grants are discarded.
          </>
        }
        confirmLabel="Reset role"
      />
    </div>
  );
}
