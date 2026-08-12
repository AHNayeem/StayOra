"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import {
  Button,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  Switch,
  Tabs,
  type TabItem,
} from "../../ui";
import { platformService } from "../../domain/services";
import { useDomainActor } from "../../domain/use-domain";
import { KNOWN_FEATURE_FLAGS } from "../../feature-flags/flags";
import { useFeatureFlags } from "../../feature-flags/feature-flags-provider";

const CURRENCIES = ["USD", "EUR", "GBP", "AED"].map((v) => ({ value: v, label: v }));
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];
const TIMEZONES = [
  "UTC", "America/New_York", "Europe/London", "Asia/Dubai", "Asia/Tokyo",
].map((v) => ({ value: v, label: v }));

const FLAG_LABELS: Record<string, string> = {
  analytics: "Analytics module",
  "command-palette": "Command palette (⌘K)",
  "org-switcher": "Organization switcher",
  "merchant-switcher": "Merchant switcher",
  messages: "Messages & inbox",
};

/** Save handler shared by every panel — a mock that confirms via toast. */
function useMockSave(label: string) {
  const [saving, setSaving] = useState(false);
  const save = () => {
    setSaving(true);
    // Mirror the ~450ms service latency used across the dashboard stubs.
    setTimeout(() => {
      setSaving(false);
      toast.saved(label);
    }, 450);
  };
  return { saving, save };
}

function GeneralPanel() {
  const { saving, save } = useMockSave("General settings");
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-2">
      <FormSection title="Platform" description="Branding and defaults for the whole tenant.">
        <FormGrid cols={2}>
          <Input label="Platform name" defaultValue="Otithee" />
          <Input label="Support email" type="email" defaultValue="support@otithee.app" />
          <Select label="Default currency" options={CURRENCIES} defaultValue="USD" />
          <Select label="Default language" options={LANGUAGES} defaultValue="en" />
          <Select label="Timezone" options={TIMEZONES} defaultValue="UTC" />
        </FormGrid>
      </FormSection>
      <FormActions>
        <Button size="sm" onClick={save} loading={saving}>
          Save changes
        </Button>
      </FormActions>
    </div>
  );
}

function NotificationsPanel() {
  const { saving, save } = useMockSave("Notification settings");
  const items = [
    { key: "booking", label: "Booking confirmations", hint: "Email guests when a booking is confirmed.", on: true },
    { key: "payout", label: "Payout alerts", hint: "Notify merchants when a payout is sent.", on: true },
    { key: "refund", label: "Refund requests", hint: "Alert finance on new refund requests.", on: true },
    { key: "digest", label: "Weekly digest", hint: "A Monday summary of platform activity.", on: false },
    { key: "marketing", label: "Marketing updates", hint: "Product and campaign announcements.", on: false },
  ];
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-2">
      <FormSection title="Email notifications" description="Choose which events send email.">
        <div className="flex flex-col gap-4">
          {items.map((it) => (
            <Switch key={it.key} label={it.label} hint={it.hint} defaultChecked={it.on} />
          ))}
        </div>
      </FormSection>
      <FormActions>
        <Button size="sm" onClick={save} loading={saving}>
          Save changes
        </Button>
      </FormActions>
    </div>
  );
}

function IntegrationsPanel() {
  const { saving, save } = useMockSave("Integration settings");
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-2">
      <FormSection title="Payments & email" description="Connected service providers.">
        <div className="flex flex-col gap-4">
          <Switch label="Stripe" hint="Card payments and payouts." defaultChecked />
          <Switch label="Mailgun" hint="Transactional email delivery." defaultChecked />
          <Switch label="Twilio" hint="SMS notifications." />
          <Switch label="Google Analytics" hint="Web analytics tracking." defaultChecked />
        </div>
      </FormSection>
      <FormSection title="Webhooks" description="Where we POST platform events.">
        <FormGrid cols={1}>
          <Input
            label="Webhook URL"
            type="url"
            className="font-mono"
            defaultValue="https://api.otithee.app/webhooks/events"
          />
        </FormGrid>
      </FormSection>
      <FormActions>
        <Button size="sm" onClick={save} loading={saving}>
          Save changes
        </Button>
      </FormActions>
    </div>
  );
}

function FlagsPanel() {
  const { isEnabled } = useFeatureFlags();
  const { saving, save } = useMockSave("Feature flags");
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-2">
      <FormSection
        title="Feature flags"
        description="Turn whole modules on or off for this tenant."
      >
        <div className="flex flex-col gap-4">
          {KNOWN_FEATURE_FLAGS.map((flag) => (
            <Switch
              key={flag}
              label={FLAG_LABELS[flag] ?? flag}
              hint={flag}
              defaultChecked={isEnabled(flag)}
            />
          ))}
        </div>
      </FormSection>
      <FormActions>
        <Button size="sm" onClick={save} loading={saving}>
          Save changes
        </Button>
      </FormActions>
    </div>
  );
}

/**
 * Demo-data panel.
 *
 * Every mutation the prototype makes — bookings, refund decisions, offers,
 * settlements, B2B payments — is persisted to local storage so it survives a
 * reload. This is how you get back to the seeded state.
 */
function DemoDataPanel() {
  const actor = useDomainActor();
  const [resetting, setResetting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const reset = () => {
    setResetting(true);
    platformService.resetDemoData(actor);
    toast.success("Demo data reset", {
      description: "Bookings, refunds, offers, settlements and B2B accounts are back to the seeded state.",
    });
    setConfirming(false);
    setResetting(false);
    // Full reload so every cached query re-reads the restored dataset.
    window.location.reload();
  };

  return (
    <div className="pt-2">
      <FormSection
        title="Prototype data"
        description="Changes you make are stored in this browser so demos survive a refresh. Nothing leaves the device."
      >
        <div className="rounded-card border border-line bg-surface-muted/50 p-4">
          <p className="text-sm text-body">
            Resetting restores the seeded dataset: ~96 bookings across every lifecycle
            state, their refunds, commission entries, settlement batches, offers, combo
            bundles, B2B accounts and invoices.
          </p>
        </div>
        <FormActions>
          <Button
            variant={confirming ? "danger" : "outline"}
            size="sm"
            loading={resetting}
            onClick={() => (confirming ? reset() : setConfirming(true))}
          >
            {confirming ? "Yes, reset everything" : "Reset demo data"}
          </Button>
          {confirming && (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          )}
        </FormActions>
      </FormSection>
    </div>
  );
}

const TABS: TabItem[] = [
  { key: "general", label: "General", content: <GeneralPanel /> },
  { key: "notifications", label: "Notifications", content: <NotificationsPanel /> },
  { key: "integrations", label: "Integrations", content: <IntegrationsPanel /> },
  { key: "flags", label: "Feature flags", content: <FlagsPanel /> },
  { key: "demo-data", label: "Demo data", content: <DemoDataPanel /> },
];

/** SettingsView — tabbed platform settings (general, notifications, integrations, flags). */
export function SettingsView() {
  return <Tabs items={TABS} />;
}
