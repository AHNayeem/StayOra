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
          <Input label="Platform name" defaultValue="StayOra" />
          <Input label="Support email" type="email" defaultValue="support@stayora.app" />
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
            defaultValue="https://api.stayora.app/webhooks/events"
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

const TABS: TabItem[] = [
  { key: "general", label: "General", content: <GeneralPanel /> },
  { key: "notifications", label: "Notifications", content: <NotificationsPanel /> },
  { key: "integrations", label: "Integrations", content: <IntegrationsPanel /> },
  { key: "flags", label: "Feature flags", content: <FlagsPanel /> },
];

/** SettingsView — tabbed platform settings (general, notifications, integrations, flags). */
export function SettingsView() {
  return <Tabs items={TABS} />;
}
