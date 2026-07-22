"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/features/i18n";
import { setSetting, useSettings, type AccountSettings } from "@/features/account/settings-store";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { language, currency, languages, currencies, setLanguage, setCurrency } = useLocale();
  const settings = useSettings();

  return (
    <div>
      <AccountPageHeader
        title="Settings"
        description="Control your regional preferences and how we keep in touch."
      />

      <div className="max-w-2xl space-y-6">
        {/* Regional */}
        <SettingsCard title="Regional" description="Applied across the site instantly.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="set-lang" className="mb-1.5 block text-sm font-medium text-ink">
                Language
              </label>
              <select
                id="set-lang"
                value={language.code}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputClass}
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="set-currency" className="mb-1.5 block text-sm font-medium text-ink">
                Currency
              </label>
              <select
                id="set-currency"
                value={currency.code}
                onChange={(e) => setCurrency(e.target.value)}
                className={inputClass}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <ToggleRow
            settingKey="currencyAutoDetect"
            value={settings.currencyAutoDetect}
            title="Auto-detect currency"
            description="Use my location to pick a currency when I visit."
          />
        </SettingsCard>

        {/* Email */}
        <SettingsCard title="Email notifications">
          <ToggleRow
            settingKey="emailBookingUpdates"
            value={settings.emailBookingUpdates}
            title="Booking updates"
            description="Confirmations, reminders and itinerary changes."
          />
          <ToggleRow
            settingKey="emailPromotions"
            value={settings.emailPromotions}
            title="Deals & promotions"
            description="Personalised offers and price drops."
          />
          <ToggleRow
            settingKey="emailNewsletter"
            value={settings.emailNewsletter}
            title="Newsletter"
            description="Travel inspiration, once a month."
          />
        </SettingsCard>

        {/* Push & SMS */}
        <SettingsCard title="Push & SMS">
          <ToggleRow
            settingKey="pushMessages"
            value={settings.pushMessages}
            title="Message alerts"
            description="Push me when a host replies."
          />
          <ToggleRow
            settingKey="pushDeals"
            value={settings.pushDeals}
            title="Deal alerts"
            description="Push me about limited-time offers."
          />
          <ToggleRow
            settingKey="smsReminders"
            value={settings.smsReminders}
            title="SMS trip reminders"
            description="Text me the day before a trip starts."
          />
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function ToggleRow({
  settingKey,
  value,
  title,
  description,
}: {
  settingKey: keyof AccountSettings;
  value: boolean;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-3 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={title}
        onClick={() => setSetting(settingKey, !value)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          value ? "bg-primary" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
            value ? "translate-x-5.5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-field border border-line bg-surface px-3.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25";
