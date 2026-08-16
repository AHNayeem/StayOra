"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import { CURRENCIES, LANGUAGES, TIMEZONES } from "@/constants/geo";
import {
  Alert,
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
import { platformSettingsService } from "../../domain/platform-settings-service";
import { usePlatformConfig } from "../../domain/use-platform-config";
import type { PlatformConfig } from "../../domain/platform-config";
import { useDomainActor } from "../../domain/use-domain";
import { Can } from "../../rbac/permission-guard";
import { FeatureFlagsAdmin } from "../feature-flags";
import { fxRateBoard } from "../../domain/fx";

const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }));
const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ value: l.code, label: l.name }));
const TIMEZONE_OPTIONS = TIMEZONES.map((t) => ({ value: t.id, label: `${t.label} (${t.offset})` }));

/**
 * Shared save plumbing.
 *
 * Every panel edits one section of the stored {@link PlatformConfig} through
 * `platformSettingsService.update`, which validates, persists, writes an audit
 * entry and notifies. Nothing here is a mock timer any more — the values these
 * forms write are the values `money.ts`, `fx.ts` and the maintenance guard read
 * on their next call.
 */
function useSection<K extends keyof PlatformConfig>(section: K) {
  const config = usePlatformConfig();
  const actor = useDomainActor();
  const [draft, setDraft] = useState<PlatformConfig[K]>(config[section]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync when the stored config changes underneath us (a save, another tab,
  // a reset). Adjusting state during render is the supported way to derive from
  // props/stores — an effect here would cost an extra render pass.
  const [seen, setSeen] = useState(config[section]);
  if (seen !== config[section]) {
    setSeen(config[section]);
    setDraft(config[section]);
  }

  const set = <F extends keyof PlatformConfig[K]>(field: F, value: PlatformConfig[K][F]) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const save = async (label: string) => {
    setSaving(true);
    setError(null);
    try {
      await platformSettingsService.update(section, draft, actor);
      toast.saved(label);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save.";
      setError(message);
      toast.error("Not saved", { description: message });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => setDraft(platformSettingsService.defaults()[section]);

  return { draft, set, save, saving, error, reset, dirty: draft !== config[section] };
}

/** Percentage input over a stored 0–1 fraction. */
function PercentInput({
  label,
  hint,
  value,
  onChange,
  max = 100,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (fraction: number) => void;
  max?: number;
}) {
  return (
    <Input
      label={label}
      hint={hint}
      type="number"
      inputMode="decimal"
      step="0.01"
      min={0}
      max={max}
      value={Number((value * 100).toFixed(2))}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
    />
  );
}

function GeneralPanel() {
  const { draft, set, save, saving, error } = useSection("general");
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-2">
      {error && <Alert tone="danger" title="Not saved">{error}</Alert>}
      <FormSection title="Platform" description="Branding and defaults for the whole tenant.">
        <FormGrid cols={2}>
          <Input
            label="Platform name"
            value={draft.platformName}
            onChange={(e) => set("platformName", e.target.value)}
          />
          <Input
            label="Support email"
            type="email"
            value={draft.supportEmail}
            onChange={(e) => set("supportEmail", e.target.value)}
          />
          <Select
            label="Base currency"
            hint="Every amount is stored in this currency; others are converted at the FX rate."
            options={CURRENCY_OPTIONS}
            value={draft.baseCurrency}
            onChange={(e) => set("baseCurrency", e.target.value)}
          />
          <Select
            label="Default language"
            options={LANGUAGE_OPTIONS}
            value={draft.defaultLanguage}
            onChange={(e) => set("defaultLanguage", e.target.value)}
          />
          <Select
            label="Timezone"
            options={TIMEZONE_OPTIONS}
            value={draft.timezone}
            onChange={(e) => set("timezone", e.target.value)}
          />
        </FormGrid>
      </FormSection>
      <FormActions>
        <Can anyPermission={["settings:update"]}>
          <Button size="sm" onClick={() => void save("General settings")} loading={saving}>
            Save changes
          </Button>
        </Can>
      </FormActions>
    </div>
  );
}

/**
 * Economics — the panel that used to be decorative.
 *
 * These four numbers plus the per-product commission table are what
 * `priceBooking` charges with. Changing the tax rate here changes the next
 * quote on the storefront; existing bookings keep the figures they were priced
 * with, which is why nothing recalculates historically.
 */
function EconomicsPanel() {
  const { draft, set, save, saving, error, reset } = useSection("economics");
  const setProductRate = (kind: string, rate: number) =>
    set("commissionByProduct", { ...draft.commissionByProduct, [kind]: rate } as typeof draft.commissionByProduct);

  return (
    <div className="rounded-card border border-line bg-surface px-6 py-2">
      {error && <Alert tone="danger" title="Not saved">{error}</Alert>}
      <Alert tone="info" title="These numbers price every new booking">
        Quotes, commission, settlements and refunds all read this section. Bookings already
        taken keep the figures they were priced with.
      </Alert>
      <FormSection title="Charges" description="Applied to the net sale at quote time.">
        <FormGrid cols={2}>
          <PercentInput
            label="Tax rate (%)"
            hint="Applied to the net sale."
            value={draft.taxRate}
            onChange={(v) => set("taxRate", v)}
            max={50}
          />
          <PercentInput
            label="Service fee (%)"
            hint="Platform fee charged to the customer. Membership can waive it."
            value={draft.platformFeeRate}
            onChange={(v) => set("platformFeeRate", v)}
            max={25}
          />
          <Input
            label="Default commission (%)"
            hint="Used when a merchant has no negotiated rate and no rule matches."
            type="number"
            step="0.5"
            min={0}
            max={60}
            value={draft.defaultCommissionRate}
            onChange={(e) => set("defaultCommissionRate", Number(e.target.value))}
          />
          <PercentInput
            label="Cancellation admin share (%)"
            hint="The platform's share of a cancellation fee. The rest stays with the merchant."
            value={draft.cancellationAdminShare}
            onChange={(v) => set("cancellationAdminShare", v)}
          />
        </FormGrid>
      </FormSection>
      <FormSection
        title="Commission by product"
        description="The fallback rate per vertical. Commission rules and negotiated merchant rates still win over these."
      >
        <FormGrid cols={3}>
          {Object.entries(draft.commissionByProduct).map(([kind, rate]) => (
            <Input
              key={kind}
              label={kind}
              type="number"
              step="0.5"
              min={0}
              max={60}
              value={rate}
              onChange={(e) => setProductRate(kind, Number(e.target.value))}
            />
          ))}
        </FormGrid>
      </FormSection>
      <FormActions>
        <Can anyPermission={["settings:update"]}>
          <Button size="sm" onClick={() => void save("Platform economics")} loading={saving}>
            Save changes
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            Restore defaults
          </Button>
        </Can>
      </FormActions>
    </div>
  );
}

/** FX — spread and lock window, plus the resulting rate board. */
function FxPanel() {
  const { draft, set, save, saving, error } = useSection("fx");
  const board = fxRateBoard().slice(0, 8);
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-2">
      {error && <Alert tone="danger" title="Not saved">{error}</Alert>}
      <FormSection
        title="Rate policy"
        description="The margin added to the mid-market rate, and how long a quoted rate is honoured at checkout."
      >
        <FormGrid cols={2}>
          <Input
            label="Spread (%)"
            type="number"
            step="0.1"
            min={0}
            max={10}
            value={draft.spreadPercent}
            onChange={(e) => set("spreadPercent", Number(e.target.value))}
          />
          <Input
            label="Rate lock (minutes)"
            hint="After this, checkout re-quotes rather than honouring a stale rate."
            type="number"
            min={5}
            max={240}
            value={draft.lockMinutes}
            onChange={(e) => set("lockMinutes", Number(e.target.value))}
          />
        </FormGrid>
      </FormSection>
      <FormSection title="Rate board" description="What customers are quoted right now.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2">Currency</th>
                <th className="py-2">Mid</th>
                <th className="py-2">Quoted</th>
                <th className="py-2">Spread</th>
              </tr>
            </thead>
            <tbody>
              {board.map((rate) => (
                <tr key={rate.currency} className="border-t border-line">
                  <td className="py-2 font-medium text-ink">{rate.currency}</td>
                  <td className="py-2 text-body">{rate.mid}</td>
                  <td className="py-2 text-body">{rate.rate}</td>
                  <td className="py-2 text-body">{rate.spreadPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormSection>
      <FormActions>
        <Can anyPermission={["settings:update"]}>
          <Button size="sm" onClick={() => void save("FX settings")} loading={saving}>
            Save changes
          </Button>
        </Can>
      </FormActions>
    </div>
  );
}

/**
 * Delivery — how the prototype simulates sending.
 *
 * Nothing leaves the browser; these controls decide how convincingly the
 * delivery log behaves, and the copy says so plainly.
 */
function NotificationsPanel() {
  const { draft, set, save, saving, error } = useSection("delivery");
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-2">
      {error && <Alert tone="danger" title="Not saved">{error}</Alert>}
      <Alert tone="warning" title="Simulated delivery">
        This prototype never contacts a real email, SMS or push provider. Messages move
        through queued → sent → delivered on a simulated clock so the delivery log,
        preferences and templates behave as they would in production.
      </Alert>
      <FormSection title="Simulation" description="How the mock delivery pipeline behaves.">
        <div className="flex flex-col gap-4">
          <Switch
            label="Progress messages over time"
            hint="Off marks everything delivered the moment it is sent."
            checked={draft.simulate}
            onChange={(e) => set("simulate", e.target.checked)}
          />
        </div>
        <FormGrid cols={2}>
          <Input
            label="Failure rate (%)"
            hint="Share of simulated sends that bounce, so failure handling is demonstrable."
            type="number"
            min={0}
            max={100}
            value={draft.failureRatePercent}
            onChange={(e) => set("failureRatePercent", Number(e.target.value))}
          />
          <Input
            label="Step (seconds)"
            hint="Simulated time between queued → sent → delivered."
            type="number"
            min={1}
            max={600}
            value={draft.stepSeconds}
            onChange={(e) => set("stepSeconds", Number(e.target.value))}
          />
        </FormGrid>
      </FormSection>
      <FormActions>
        <Can anyPermission={["settings:update"]}>
          <Button size="sm" onClick={() => void save("Delivery settings")} loading={saving}>
            Save changes
          </Button>
        </Can>
      </FormActions>
    </div>
  );
}

function IntegrationsPanel() {
  const { draft, set, save, saving, error } = useSection("integrations");
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-2">
      {error && <Alert tone="danger" title="Not saved">{error}</Alert>}
      <Alert tone="info" title="Mock adapters">
        Each switch selects which mock adapter the prototype uses. No provider credentials
        exist and no request leaves the browser — a real deployment swaps the adapter behind
        the same contract.
      </Alert>
      <FormSection title="Providers" description="What a deployment would connect.">
        <div className="flex flex-col gap-4">
          <Switch
            label="Card payments"
            hint="Mock gateway: 4242… approves, …3220 triggers 3-D Secure, …0002 declines."
            checked={draft.payments}
            onChange={(e) => set("payments", e.target.checked)}
          />
          <Switch
            label="Transactional email"
            hint="Simulated email delivery into the outbox."
            checked={draft.email}
            onChange={(e) => set("email", e.target.checked)}
          />
          <Switch
            label="SMS"
            hint="Simulated SMS delivery into the outbox."
            checked={draft.sms}
            onChange={(e) => set("sms", e.target.checked)}
          />
          <Switch
            label="Analytics"
            hint="Feeds the in-app telemetry log."
            checked={draft.analytics}
            onChange={(e) => set("analytics", e.target.checked)}
          />
        </div>
      </FormSection>
      <FormSection title="Webhooks" description="Where a deployment would POST platform events.">
        <FormGrid cols={1}>
          <Input
            label="Webhook URL"
            type="url"
            className="font-mono"
            value={draft.webhookUrl}
            onChange={(e) => set("webhookUrl", e.target.value)}
          />
        </FormGrid>
      </FormSection>
      <FormActions>
        <Can anyPermission={["settings:update"]}>
          <Button size="sm" onClick={() => void save("Integration settings")} loading={saving}>
            Save changes
          </Button>
        </Can>
      </FormActions>
    </div>
  );
}

/**
 * Feature flags.
 *
 * This panel used to render unbacked switches that reset on reload. It now hosts
 * the real switchboard: each flag is stored, role-targetable and enforced by the
 * menu, the route table and the components that read it.
 */
function FlagsPanel() {
  return (
    <div className="rounded-card border border-line bg-surface px-6 py-5">
      <FeatureFlagsAdmin />
    </div>
  );
}

/**
 * Demo-data panel.
 *
 * Every mutation the prototype makes — bookings, refund decisions, offers,
 * settlements, B2B payments, and now every dashboard module's own records — is
 * persisted to local storage so it survives a reload. This is how you get back
 * to the seeded state.
 */
function DemoDataPanel() {
  const actor = useDomainActor();
  const [resetting, setResetting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const reset = () => {
    setResetting(true);
    platformService.resetDemoData(actor);
    toast.success("Demo data reset", {
      description:
        "Bookings, refunds, offers, settlements, module records and platform settings are back to the seeded state.",
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
            bundles, B2B accounts and invoices — plus every dashboard module&apos;s records,
            platform settings and localization edits.
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
  { key: "economics", label: "Economics", content: <EconomicsPanel /> },
  { key: "fx", label: "FX", content: <FxPanel /> },
  { key: "notifications", label: "Delivery", content: <NotificationsPanel /> },
  { key: "integrations", label: "Integrations", content: <IntegrationsPanel /> },
  { key: "flags", label: "Feature flags", content: <FlagsPanel /> },
  { key: "demo-data", label: "Demo data", content: <DemoDataPanel /> },
];

/** SettingsView — tabbed platform settings, all of it stored and enforced. */
export function SettingsView() {
  return <Tabs items={TABS} />;
}
