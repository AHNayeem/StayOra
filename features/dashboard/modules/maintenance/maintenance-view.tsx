"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import {
  Alert,
  Button,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Switch,
  Textarea,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";

/**
 * MaintenanceView — the platform maintenance-mode control. A single client
 * surface (no list/service): toggling the switch previews the guest-facing
 * banner live, while "Save" mocks the ~450ms persistence a real settings
 * endpoint would perform. Swapping the mock save for a PATCH is the only change.
 */
export function MaintenanceView() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState(
    "We're carrying out scheduled maintenance and will be back shortly. Thanks for your patience.",
  );
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    // Mirror the ~450ms latency used across the dashboard stubs.
    setTimeout(() => {
      setSaving(false);
      toast.saved("Maintenance settings");
    }, 450);
  };

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone={enabled ? "warning" : "success"}
        title={enabled ? "Maintenance mode is ON" : "Platform is live"}
      >
        {enabled
          ? "The public storefront shows the maintenance page. Admins can still sign in to the dashboard."
          : "All surfaces are serving traffic normally."}
      </Alert>

      <div className="rounded-card border border-line bg-surface px-6 py-2">
        <FormSection
          title="Maintenance mode"
          description="Take the public storefront offline while keeping the admin dashboard reachable."
        >
          <Switch
            label="Enable maintenance mode"
            hint="Guests see the maintenance page; the dashboard and API stay available to signed-in staff."
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        </FormSection>

        <FormSection
          title="Guest message"
          description="Shown on the maintenance page. Keep it short and reassuring."
        >
          <FormGrid cols={1}>
            <Textarea
              label="Message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Scheduled window"
          description="Optional — announce a window ahead of time. Leave blank to toggle manually."
        >
          <FormGrid cols={2}>
            <Input label="Starts" type="datetime-local" />
            <Input label="Ends" type="datetime-local" />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Allowlist"
          description="IP addresses that keep full access to the storefront during maintenance."
        >
          <FormGrid cols={1}>
            <Textarea
              label="Allowed IPs"
              rows={2}
              hint="One per line — e.g. office and QA egress addresses."
              className="font-mono"
              defaultValue={"203.0.113.24\n198.51.100.7"}
            />
          </FormGrid>
        </FormSection>

        <FormActions>
          <Can anyPermission={["system:update"]}>
            <Button size="sm" onClick={save} loading={saving}>
              Save changes
            </Button>
          </Can>
        </FormActions>
      </div>
    </div>
  );
}
