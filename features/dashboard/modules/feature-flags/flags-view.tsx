"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "../../data";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Drawer,
  EmptyState,
  Input,
  Switch,
  TableSkeleton,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { useRbac } from "../../rbac/rbac-provider";
import type { FeatureFlagRecord } from "../../feature-flags/flag-store";
import type { RoleId } from "../../rbac/types";
import { useRoles } from "../access/hooks";
import {
  useFeatureFlagRecords,
  useResetAllFlags,
  useResetFlag,
  useSetFlagEnabled,
  useSetFlagRoles,
} from "./hooks";

/**
 * FeatureFlagsAdmin — the workspace's feature switchboard.
 *
 * Two controls per flag, because they answer different questions: **enabled**
 * turns the capability on for the workspace, **roles** decides who it exists
 * for. Both take effect immediately — the sidebar loses the entry, the route
 * returns "feature unavailable", and any component gated on the flag disappears
 * — which is the whole point: the "off" direction is now exercised rather than
 * assumed.
 */
export function FeatureFlagsAdmin() {
  const flags = useFeatureFlagRecords();
  const roles = useRoles();
  const setEnabled = useSetFlagEnabled();
  const setRoles = useSetFlagRoles();
  const resetOne = useResetFlag();
  const resetAll = useResetAllFlags();
  const { user, can } = useRbac();

  const [query, setQuery] = useState("");
  const [targeting, setTargeting] = useState<FeatureFlagRecord | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = flags.data ?? [];
    if (!q) return all;
    return all.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q),
    );
  }, [flags.data, query]);

  const groups = useMemo(() => {
    const byGroup = new Map<string, FeatureFlagRecord[]>();
    for (const row of rows) {
      byGroup.set(row.group, [...(byGroup.get(row.group) ?? []), row]);
    }
    return [...byGroup.entries()];
  }, [rows]);

  const writable = can("settings:update");
  const modified = (flags.data ?? []).filter((f) => f.modified).length;

  const toggle = async (flag: FeatureFlagRecord, enabled: boolean) => {
    try {
      await setEnabled.mutateAsync({ key: flag.key, enabled });
      toast.success(`${flag.label} ${enabled ? "enabled" : "disabled"}`, {
        description: enabled
          ? "The module is available again."
          : "Its menu entry and route are now blocked for everyone.",
      });
    } catch (error) {
      toast.error("Couldn't update flag", { description: getErrorMessage(error) });
    }
  };

  if (flags.isLoading) return <TableSkeleton rows={6} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {flags.data?.length ?? 0} flags · {modified} changed from the shipped defaults
        </p>
        <div className="flex items-center gap-2">
          <Input
            aria-label="Search feature flags"
            placeholder="Search flags…"
            leftIcon={<Search className="size-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:w-64"
          />
          <Can anyPermission={["settings:update"]}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="size-4" />}
              disabled={modified === 0}
              loading={resetAll.isPending}
              onClick={async () => {
                await resetAll.mutateAsync();
                toast.success("Feature flags reset");
              }}
            >
              Reset all
            </Button>
          </Can>
        </div>
      </div>

      {!writable && (
        <Alert tone="info" title="Read-only">
          Viewing the flag state requires `settings:read`; changing it requires
          `settings:update`.
        </Alert>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No flags match"
          description={`Nothing matched “${query}”.`}
        />
      ) : (
        groups.map(([group, items]) => (
          <section key={group} className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {group}
            </h3>
            <div className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
              {items.map((flag) => {
                const appliesToMe =
                  flag.enabled &&
                  (flag.roles.length === 0 || flag.roles.includes(user.roleId));
                return (
                  <div
                    key={flag.key}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink">{flag.label}</p>
                        <Badge size="sm" variant="neutral">
                          {flag.key}
                        </Badge>
                        {flag.modified && (
                          <Badge size="sm" variant="outline">
                            Changed
                          </Badge>
                        )}
                        {!appliesToMe && (
                          <Badge size="sm" variant="danger">
                            Off for your role
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-body">{flag.description}</p>
                      <p className="mt-1 text-xs text-muted">
                        Enforced at: {flag.gates}
                        {flag.roles.length > 0 && (
                          <>
                            {" · "}
                            {flag.roles.length} role{flag.roles.length === 1 ? "" : "s"}
                          </>
                        )}
                        {flag.updatedBy && <> · last changed by {flag.updatedBy}</>}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Can anyPermission={["settings:update"]}>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Users className="size-4" />}
                          onClick={() => setTargeting(flag)}
                        >
                          {flag.roles.length === 0 ? "All roles" : `${flag.roles.length} roles`}
                        </Button>
                        {flag.modified && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Reset ${flag.label}`}
                            onClick={() => resetOne.mutate(flag.key)}
                          >
                            <RotateCcw className="size-4" />
                          </Button>
                        )}
                      </Can>
                      <Switch
                        label=""
                        aria-label={`${flag.label} enabled`}
                        checked={flag.enabled}
                        disabled={!writable || setEnabled.isPending}
                        onChange={(e) => toggle(flag, e.target.checked)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      <Drawer
        open={Boolean(targeting)}
        onClose={() => setTargeting(null)}
        size="md"
        title={targeting ? `Roles — ${targeting.label}` : "Roles"}
      >
        {targeting && (
          <div className="flex flex-col gap-4 px-1 pb-4">
            <Alert tone="info" title="Role targeting">
              With no roles selected the flag applies to everyone. Selecting roles makes
              the feature exist for those roles only — a second gate on top of
              permissions.
            </Alert>

            <div className="flex flex-col gap-2">
              {(roles.data ?? []).map((role) => {
                const checked = targeting.roles.includes(role.id);
                return (
                  <Checkbox
                    key={role.id}
                    label={role.label}
                    hint={role.id}
                    checked={checked}
                    disabled={setRoles.isPending}
                    onChange={async () => {
                      const next: RoleId[] = checked
                        ? targeting.roles.filter((r) => r !== role.id)
                        : [...targeting.roles, role.id];
                      try {
                        const updated = await setRoles.mutateAsync({
                          key: targeting.key,
                          roles: next,
                        });
                        setTargeting(
                          updated.find((f) => f.key === targeting.key) ?? null,
                        );
                      } catch (error) {
                        toast.error("Couldn't update targeting", {
                          description: getErrorMessage(error),
                        });
                      }
                    }}
                  />
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={targeting.roles.length === 0 || setRoles.isPending}
              onClick={async () => {
                const updated = await setRoles.mutateAsync({
                  key: targeting.key,
                  roles: [],
                });
                setTargeting(updated.find((f) => f.key === targeting.key) ?? null);
                toast.success(`${targeting.label} applies to every role`);
              }}
            >
              Clear targeting
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
