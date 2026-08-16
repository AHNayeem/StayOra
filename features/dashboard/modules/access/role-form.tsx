"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "../../data";
import { Alert, Button, Input, Modal, Select, Textarea } from "../../ui";
import type { RoleRecord } from "../../rbac/role-service";
import { useCloneRole, useCreateRole, useUpdateRole } from "./hooks";

export type RoleFormMode =
  | { kind: "create" }
  | { kind: "clone"; source: RoleRecord }
  | { kind: "edit"; role: RoleRecord };

interface RoleFormProps {
  mode: RoleFormMode | null;
  /** Roles offered as a starting point when creating from scratch. */
  roles: RoleRecord[];
  onClose: () => void;
}

const TITLES: Record<RoleFormMode["kind"], string> = {
  create: "New role",
  clone: "Clone role",
  edit: "Edit role",
};

/**
 * Create, clone or rename a role.
 *
 * Permissions are deliberately *not* edited here — a new role starts from a
 * template's grants and is then tuned in the permission editor, which keeps
 * "what is this role called" and "what may it do" as two decisions instead of
 * one overwhelming form.
 */
export function RoleForm({ mode, roles, onClose }: RoleFormProps) {
  const create = useCreateRole();
  const clone = useCloneRole();
  const update = useUpdateRole();

  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [basedOn, setBasedOn] = useState("vendor");
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Reset the fields whenever the dialog opens for a different subject.
  const subject =
    mode?.kind === "edit"
      ? `edit:${mode.role.id}`
      : mode?.kind === "clone"
        ? `clone:${mode.source.id}`
        : mode
          ? "create"
          : null;

  if (subject && loadedFor !== subject) {
    setLoadedFor(subject);
    setError(null);
    if (mode?.kind === "edit") {
      setLabel(mode.role.label);
      setDescription(mode.role.description);
    } else if (mode?.kind === "clone") {
      setLabel(`${mode.source.label} (copy)`);
      setDescription(`Cloned from ${mode.source.label}.`);
    } else {
      setLabel("");
      setDescription("");
      setBasedOn("vendor");
    }
  }

  const pending = create.isPending || clone.isPending || update.isPending;
  const valid = label.trim().length >= 3;

  const submit = async () => {
    if (!mode || !valid) return;
    setError(null);
    try {
      if (mode.kind === "edit") {
        await update.mutateAsync({
          id: mode.role.id,
          input: { label: label.trim(), description: description.trim() },
        });
        toast.saved("Role");
      } else if (mode.kind === "clone") {
        const created = await clone.mutateAsync({
          id: mode.source.id,
          label: label.trim(),
          description: description.trim(),
        });
        toast.success(`${created.label} created`, {
          description: `Starts with ${mode.source.label}'s permissions — tune them next.`,
        });
      } else {
        const template = roles.find((r) => r.id === basedOn);
        const created = await create.mutateAsync({
          label: label.trim(),
          description: description.trim() || "Custom role.",
          permissions: template ? [...template.permissions] : ["dashboard:read", "profile:*"],
          basedOn: template?.id,
        });
        toast.success(`${created.label} created`);
      }
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Modal
      open={Boolean(mode)}
      onClose={onClose}
      size="md"
      title={mode ? TITLES[mode.kind] : "Role"}
      description={
        mode?.kind === "edit"
          ? "Renaming a role doesn't change who holds it."
          : "Roles start from a template's permissions; refine them afterwards."
      }
    >
      {mode && (
        <div className="flex flex-col gap-4">
          {error && (
            <Alert tone="danger" title="Couldn't save role">
              {error}
            </Alert>
          )}

          <Input
            label="Role name"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Night Auditor"
            hint={
              mode.kind === "edit"
                ? `Identifier: ${mode.role.id}`
                : "The identifier is derived from the name."
            }
          />

          <Textarea
            label="Description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this role is for, and what it deliberately can't do."
          />

          {mode.kind === "create" && (
            <Select
              label="Start from"
              value={basedOn}
              onChange={(e) => setBasedOn(e.target.value)}
              options={roles.map((r) => ({ value: r.id, label: r.label }))}
              hint="The new role copies this one's permissions."
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} loading={pending} disabled={!valid}>
              {mode.kind === "edit" ? "Save changes" : "Create role"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
