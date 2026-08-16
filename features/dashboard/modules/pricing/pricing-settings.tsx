"use client";

import { useState } from "react";
import { RotateCcw, Save, ShieldAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { Listing } from "@/types/catalog";
import {
  PRICING_RULE_TYPE_LABELS,
  describeAdjustment,
  type PricingConfiguration,
  type PricingConfigurationInput,
} from "../../domain";
import { formatDateTime } from "../../lib/format";
import { Can } from "../../rbac/permission-guard";
import {
  Alert,
  Button,
  FormGrid,
  FormSection,
  Input,
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
  Select,
  StatusBadge,
  Switch,
  TableSkeleton,
} from "../../ui";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  useClearPricingConfig,
  usePricingAnomalies,
  usePricingConfig,
  usePricingConfigs,
  useSavePricingConfig,
} from "./hooks";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Platform pricing settings — the admin half of dynamic pricing.
 *
 * Three things live here that are properties of a *market* rather than of a
 * rule: which weekdays the weekend is, whether dynamic pricing is switched on
 * at all, and how far a rule is allowed to move a rate. Plus the review list:
 * configurations that are almost always a mistake, each with its reason.
 *
 * Per-property overrides sit alongside, so a merchant in a different market can
 * have a different weekend without the platform default changing.
 */
export function PricingSettings({ listings }: { listings: Listing[] }) {
  const [scopeId, setScopeId] = useState<string | null>(null);
  const config = usePricingConfig(scopeId ?? undefined);
  const configs = usePricingConfigs();
  const save = useSavePricingConfig();
  const clear = useClearPricingConfig();
  const anomalies = usePricingAnomalies();

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Pricing configuration"
          description="The platform default, or an override for one property."
          actions={
            <Select
              aria-label="Configuration scope"
              value={scopeId ?? ""}
              onChange={(event) => setScopeId(event.target.value || null)}
              options={[
                { value: "", label: "Platform default" },
                ...listings.map((l) => ({ value: l.id, label: l.title })),
              ]}
              wrapperClassName="w-64"
            />
          }
        />
        {config.isLoading || !config.data ? (
          <PanelBody>
            <TableSkeleton rows={4} />
          </PanelBody>
        ) : (
          <ConfigEditor
            key={`${scopeId ?? "global"}:${config.data.updatedAt}`}
            scopeId={scopeId}
            scopeLabel={
              scopeId
                ? (listings.find((l) => l.id === scopeId)?.title ?? scopeId)
                : "Platform default"
            }
            config={config.data}
            /** True when this property has no row of its own yet. */
            inherited={Boolean(scopeId) && config.data.scopeId !== scopeId}
            saving={save.isPending}
            clearing={clear.isPending}
            onSave={async (patch) => {
              try {
                await save.mutateAsync({ scopeId, patch });
                toast.success("Pricing configuration saved", {
                  description: "The next quote uses it immediately.",
                });
              } catch (error) {
                toast.error("Couldn't save", {
                  description: error instanceof Error ? error.message : undefined,
                });
              }
            }}
            onClear={async () => {
              if (!scopeId) return;
              try {
                await clear.mutateAsync(scopeId);
                toast.success("Back to the platform default", {
                  description: "This property no longer has its own configuration.",
                });
              } catch (error) {
                toast.error("Couldn't reset", {
                  description: error instanceof Error ? error.message : undefined,
                });
              }
            }}
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader
          title="Per-property overrides"
          description="Properties that price differently from the platform default."
        />
        <PanelBody className="p-0">
          {(configs.data ?? []).filter((c) => c.scopeId !== null).length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted">
              Every property follows the platform default.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {(configs.data ?? [])
                .filter((c) => c.scopeId !== null)
                .map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink">
                        {listings.find((l) => l.id === row.scopeId)?.title ?? row.label}
                      </p>
                      <p className="text-xs text-muted">
                        Weekend{" "}
                        {row.weekendDays.map((d) => WEEKDAYS[d].slice(0, 3)).join(", ") ||
                          "none"}{" "}
                        · updated {formatDateTime(row.updatedAt)} by {row.updatedBy}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={row.enabled ? "success" : "warning"}>
                        {row.enabled ? "Dynamic pricing on" : "Off"}
                      </StatusBadge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setScopeId(row.scopeId)}
                      >
                        Edit
                      </Button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title={
            <span className="flex items-center gap-2">
              <ShieldAlert className="size-4" aria-hidden="true" />
              Unusual configurations
            </span>
          }
          description="Rules that are almost always a mistake. Nothing is blocked — these are for review."
          actions={
            <Link href="/dashboard/catalog/pricing/rules">
              <Button variant="outline" size="sm">
                Open rules
              </Button>
            </Link>
          }
        />
        <PanelBody>
          {anomalies.isLoading ? (
            <TableSkeleton rows={3} />
          ) : (anomalies.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">
              Nothing stands out. Every active rule is within the usual bounds.
            </p>
          ) : (
            <ul className="space-y-2">
              {(anomalies.data ?? []).map(({ rule, reason }, index) => (
                <li
                  key={`${rule.id}:${index}`}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-field border border-warning/40 bg-warning/5 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-ink">
                      <TriangleAlert
                        className="size-4 shrink-0 text-amber-600"
                        aria-hidden="true"
                      />
                      {rule.name}
                      <StatusBadge tone="neutral">
                        {PRICING_RULE_TYPE_LABELS[rule.type]}
                      </StatusBadge>
                    </p>
                    <p className="mt-0.5 text-sm text-body">{reason}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                    {describeAdjustment("", rule.adjustment, rule.calculationMode).trim()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}

function ConfigEditor({
  scopeId,
  scopeLabel,
  config,
  inherited,
  saving,
  clearing,
  onSave,
  onClear,
}: {
  scopeId: string | null;
  scopeLabel: string;
  config: PricingConfiguration;
  inherited: boolean;
  saving: boolean;
  clearing: boolean;
  onSave: (patch: Partial<PricingConfigurationInput>) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<PricingConfiguration>(config);
  const patch = (next: Partial<PricingConfiguration>) =>
    setDraft((prev) => ({ ...prev, ...next }));

  const errors: string[] = [];
  if (draft.weekendDays.length === 0) {
    errors.push("Pick at least one weekend day, or the weekend rule can never fire.");
  }
  if (draft.maxRateFactor <= draft.minRateFactor) {
    errors.push("The rate ceiling must be above the floor.");
  }

  return (
    <>
      <PanelBody className="space-y-0">
        {inherited && (
          <Alert tone="info" title={`${scopeLabel} follows the platform default`}>
            Saving here creates an override for this property only. Everything else keeps
            using the default.
          </Alert>
        )}
        {errors.length > 0 && (
          <Alert tone="danger" title="Fix these before saving">
            <ul className="list-disc space-y-0.5 pl-4">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Alert>
        )}

        <FormSection
          title="Dynamic pricing"
          description="The master switch. Off means base rates and manual overrides only."
        >
          <Switch
            checked={draft.enabled}
            onChange={(event) => patch({ enabled: event.target.checked })}
            label="Dynamic pricing enabled"
            hint="Seasons, holidays, weekends, demand, booking window, length of stay and guest rules."
          />
          <Switch
            checked={draft.demandPricingEnabled}
            onChange={(event) => patch({ demandPricingEnabled: event.target.checked })}
            label="Demand pricing"
            hint="Moves the rate with how full a night already is. The noisiest rule kind — switchable on its own."
            disabled={!draft.enabled}
          />
          <Switch
            checked={draft.guestPricingEnabled}
            onChange={(event) => patch({ guestPricingEnabled: event.target.checked })}
            label="Guest-based pricing"
            hint="Charges for guests beyond the two a rate covers. Not something every property does."
            disabled={!draft.enabled}
          />
        </FormSection>

        <FormSection
          title="Weekend days"
          description="Not every market runs Saturday–Sunday. Weekend rules read this."
        >
          <fieldset>
            <legend className="sr-only">Weekend days</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day, index) => {
                const on = draft.weekendDays.includes(index);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      patch({
                        weekendDays: on
                          ? draft.weekendDays.filter((d) => d !== index)
                          : [...draft.weekendDays, index].sort((a, b) => a - b),
                      })
                    }
                    className={cn(
                      "rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      on
                        ? "border-primary bg-primary text-white"
                        : "border-line bg-surface text-body hover:border-primary",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </FormSection>

        <FormSection
          title="Guard rails"
          description="However the rules stack, a night can never leave this band. It is what stops a misconfigured rule producing a free room."
        >
          <FormGrid cols={3}>
            <Input
              type="number"
              min={0}
              max={1}
              step="0.05"
              label="Floor (× base rate)"
              value={String(draft.minRateFactor)}
              onChange={(event) => patch({ minRateFactor: Number(event.target.value) })}
            />
            <Input
              type="number"
              min={1}
              max={10}
              step="0.1"
              label="Ceiling (× base rate)"
              value={String(draft.maxRateFactor)}
              onChange={(event) => patch({ maxRateFactor: Number(event.target.value) })}
            />
            <Input
              type="number"
              min={0}
              step="1"
              label="Round to nearest"
              hint="0 keeps cents. 1 rounds to whole units."
              value={String(draft.roundingIncrement)}
              onChange={(event) =>
                patch({ roundingIncrement: Number(event.target.value) })
              }
            />
          </FormGrid>
          <Input
            label="Currency"
            hint="The currency rates are stored and quoted in for this scope."
            value={draft.currency}
            onChange={(event) =>
              patch({ currency: event.target.value.toUpperCase().slice(0, 3) })
            }
          />
        </FormSection>
      </PanelBody>

      <PanelFooter className="flex flex-wrap items-center gap-2">
        <Can anyPermission={["settings:update", "catalog:update"]}>
          <Button
            size="sm"
            leftIcon={<Save className="size-4" />}
            loading={saving}
            disabled={errors.length > 0}
            onClick={() =>
              onSave({
                enabled: draft.enabled,
                demandPricingEnabled: draft.demandPricingEnabled,
                guestPricingEnabled: draft.guestPricingEnabled,
                weekendDays: draft.weekendDays,
                minRateFactor: draft.minRateFactor,
                maxRateFactor: draft.maxRateFactor,
                roundingIncrement: draft.roundingIncrement,
                currency: draft.currency,
                label: scopeLabel,
              })
            }
          >
            Save configuration
          </Button>
          {scopeId && !inherited && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RotateCcw className="size-4" />}
              loading={clearing}
              onClick={onClear}
            >
              Use the platform default
            </Button>
          )}
        </Can>
        <span className="ml-auto text-xs text-muted">
          Last changed {formatDateTime(config.updatedAt)} by {config.updatedBy}
        </span>
      </PanelFooter>
    </>
  );
}
