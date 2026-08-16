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
import { platformSettingsService } from "../../domain/platform-settings-service";
import { usePlatformConfig } from "../../domain/use-platform-config";
import { useDomainActor } from "../../domain/use-domain";

/** `datetime-local` wants `YYYY-MM-DDTHH:mm`, not a full ISO string. */
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * MaintenanceView — the platform maintenance-mode control.
 *
 * The switch is enforced: `MaintenanceGate` wraps the public layout, so turning
 * this on genuinely replaces the storefront with the maintenance screen while
 * signed-in staff keep browsing. The message and the expected end time shown to
 * visitors are the ones typed here.
 */
export function MaintenanceView() {
  const config = usePlatformConfig();
  const actor = useDomainActor();
  const [draft, setDraft] = useState(config.maintenance);
  const [saving, setSaving] = useState(false);

  // Adjust-during-render rather than an effect: the stored section is the source
  // of truth and only changes on a save, another tab or a reset.
  const [seen, setSeen] = useState(config.maintenance);
  if (seen !== config.maintenance) {
    setSeen(config.maintenance);
    setDraft(config.maintenance);
  }

  const save = async () => {
    setSaving(true);
    try {
      await platformSettingsService.update(
        "maintenance",
        {
          ...draft,
          startedAt: draft.enabled ? (draft.startedAt ?? new Date().toISOString()) : undefined,
        },
        actor,
      );
      toast.saved("Maintenance settings");
    } catch (error) {
      toast.error("Not saved", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const live = config.maintenance.enabled;

  return (
    <div className="flex flex-col gap-6">
      <Alert
        tone={live ? "warning" : "success"}
        title={live ? "Maintenance mode is ON" : "Platform is live"}
      >
        {live
          ? "The public storefront is showing the maintenance page to visitors. Signed-in staff still see the site and the dashboard."
          : "All surfaces are serving traffic normally."}
      </Alert>

      <div className="rounded-card border border-line bg-surface px-6 py-2">
        <FormSection
          title="Maintenance mode"
          description="Take the public storefront offline while keeping the admin dashboard reachable."
        >
          <Switch
            label="Enable maintenance mode"
            hint="Guests see the maintenance page; staff with a dashboard session keep full access."
            checked={draft.enabled}
            onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
          />
          <Switch
            label="Keep the dashboard reachable"
            hint="Off would take the admin surfaces down with the storefront."
            checked={draft.allowDashboard}
            onChange={(e) => setDraft((d) => ({ ...d, allowDashboard: e.target.checked }))}
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
              value={draft.message}
              onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Expected window"
          description="Optional — visitors see when you expect to be back. Leave blank to toggle manually."
        >
          <FormGrid cols={2}>
            <Input
              label="Started"
              type="datetime-local"
              value={toLocalInput(draft.startedAt)}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  startedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                }))
              }
            />
            <Input
              label="Expected back"
              type="datetime-local"
              value={toLocalInput(draft.endsAt)}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  endsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                }))
              }
            />
          </FormGrid>
        </FormSection>

        <FormActions>
          <Can anyPermission={["system:update"]}>
            <Button size="sm" onClick={() => void save()} loading={saving}>
              Save changes
            </Button>
          </Can>
        </FormActions>
      </div>
    </div>
  );
}
