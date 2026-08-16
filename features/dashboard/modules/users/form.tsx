"use client";

import { useState } from "react";
import { getErrorMessage } from "../../data";
import { useZodForm, applyServerErrors } from "../../forms";
import {
  Alert,
  Button,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
} from "../../ui";
import { statusOptions } from "../../lib/status";
import { useRoles } from "../access/hooks";
import { userSchema } from "./schemas";
import { useCreateUser, useUpdateUser } from "./hooks";
import { USER_STATUSES, type User } from "./types";

interface UserFormProps {
  /** Present ⇒ edit mode. */
  initial?: User;
  onDone: () => void;
  onCancel: () => void;
}

/** UserForm — one validated form for both invite (create) and edit. */
export function UserForm({ initial, onDone, onCancel }: UserFormProps) {
  const create = useCreateUser();
  const update = useUpdateUser();
  // Live registry: custom roles are assignable the moment they're created.
  const roles = useRoles();
  const roleOptions = (roles.data ?? []).map((r) => ({ value: r.id, label: r.label }));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isEdit = Boolean(initial);
  const pending = create.isPending || update.isPending;

  const form = useZodForm(userSchema, {
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      roleId: initial?.roleId ?? "staff",
      status: initial?.status ?? "invited",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      if (initial) await update.mutateAsync({ id: initial.id, input: values });
      else await create.mutateAsync(values);
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) {
        setSubmitError(getErrorMessage(error));
      }
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-card border border-line bg-surface px-6 py-2"
    >
      {submitError && (
        <Alert tone="danger" title="Couldn't save user" className="my-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Identity" description="Name and sign-in email.">
        <FormGrid cols={2}>
          <Input
            label="Full name"
            required
            {...form.register("name")}
            error={form.formState.errors.name?.message}
          />
          <Input
            label="Email"
            type="email"
            required
            {...form.register("email")}
            error={form.formState.errors.email?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Access" description="Role and account status.">
        <FormGrid cols={2}>
          <Select
            label="Role"
            options={roleOptions}
            disabled={roles.isLoading}
            hint={roles.isLoading ? "Loading roles…" : undefined}
            {...form.register("roleId")}
            error={form.formState.errors.roleId?.message}
          />
          <Select
            label="Status"
            options={statusOptions(USER_STATUSES)}
            {...form.register("status")}
            error={form.formState.errors.status?.message}
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          {isEdit ? "Save changes" : "Invite user"}
        </Button>
      </FormActions>
    </form>
  );
}
