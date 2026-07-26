"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import {
  Avatar,
  Badge,
  Button,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  Switch,
  Textarea,
} from "../../ui";
import { useRbac } from "../../rbac/rbac-provider";
import { ROLE_LIST } from "../../rbac/roles";

const roleLabel = Object.fromEntries(ROLE_LIST.map((r) => [r.id, r.label]));
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

function useMockSave(label: string) {
  const [saving, setSaving] = useState(false);
  const save = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.saved(label);
    }, 450);
  };
  return { saving, save };
}

/** ProfileView — the signed-in user's account details, security and preferences. */
export function ProfileView() {
  const { user } = useRbac();
  const details = useMockSave("Profile");
  const security = useMockSave("Security settings");
  const prefs = useMockSave("Preferences");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
        <Avatar name={user.name} src={user.avatarUrl} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-ink">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <div className="mt-1.5">
            <Badge variant="primary" size="sm">
              {roleLabel[user.roleId] ?? user.roleId}
            </Badge>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-line bg-surface px-6 py-2">
        <FormSection title="Profile details" description="How you appear across the dashboard.">
          <FormGrid cols={2}>
            <Input label="Full name" defaultValue={user.name} />
            <Input label="Email" type="email" defaultValue={user.email} />
            <Input label="Phone" defaultValue="+1 (555) 010-2288" />
            <Input label="Job title" defaultValue={roleLabel[user.roleId] ?? ""} />
          </FormGrid>
          <FormGrid cols={1}>
            <Textarea
              label="Bio"
              rows={3}
              defaultValue="Platform administrator at StayOra."
            />
          </FormGrid>
        </FormSection>
        <FormActions>
          <Button size="sm" onClick={details.save} loading={details.saving}>
            Save profile
          </Button>
        </FormActions>
      </div>

      <div className="rounded-card border border-line bg-surface px-6 py-2">
        <FormSection title="Password" description="Use a strong, unique password.">
          <FormGrid cols={2}>
            <Input label="Current password" type="password" autoComplete="current-password" />
            <span className="hidden sm:block" aria-hidden="true" />
            <Input label="New password" type="password" autoComplete="new-password" />
            <Input label="Confirm new password" type="password" autoComplete="new-password" />
          </FormGrid>
        </FormSection>
        <FormSection title="Two-factor authentication" description="Add a second step at sign-in.">
          <Switch label="Enable authenticator app (TOTP)" hint="Recommended for admin accounts." />
        </FormSection>
        <FormActions>
          <Button size="sm" onClick={security.save} loading={security.saving}>
            Update security
          </Button>
        </FormActions>
      </div>

      <div className="rounded-card border border-line bg-surface px-6 py-2">
        <FormSection title="Preferences" description="Language and notification defaults.">
          <FormGrid cols={2}>
            <Select label="Language" options={LANGUAGES} defaultValue="en" />
          </FormGrid>
          <div className="mt-4 flex flex-col gap-4">
            <Switch label="Product & feature emails" defaultChecked />
            <Switch label="Weekly activity digest" />
          </div>
        </FormSection>
        <FormActions>
          <Button size="sm" onClick={prefs.save} loading={prefs.saving}>
            Save preferences
          </Button>
        </FormActions>
      </div>
    </div>
  );
}
