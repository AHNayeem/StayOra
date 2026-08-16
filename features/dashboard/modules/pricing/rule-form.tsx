"use client";

import { useMemo, useState } from "react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import type { Listing } from "@/types/catalog";
import { BOOKING_VERTICALS, VERTICAL_LABELS, type BookingVertical } from "@/types/booking";
import {
  ADJUSTMENT_TYPE_LABELS,
  CALCULATION_MODE_LABELS,
  PRICING_RULE_TYPES,
  PRICING_RULE_TYPE_HINTS,
  PRICING_RULE_TYPE_LABELS,
  adjustmentTypesFor,
  allRatePlans,
  validateRule,
  type AdjustmentType,
  type CalculationMode,
  type PricingRule,
  type PricingRuleInput,
  type PricingRuleType,
  type RuleProblem,
} from "../../domain";
import {
  Alert,
  Button,
  FormGrid,
  FormSection,
  Input,
  Modal,
  Select,
  Switch,
  Textarea,
} from "../../ui";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Sensible starting values per rule kind.
 *
 * Priority is the important one: the defaults encode the house conflict order —
 * holidays beat seasons beat demand beat weekends — so a merchant who never
 * touches the field still gets a coherent rule book.
 */
const DEFAULTS: Record<
  PricingRuleType,
  { priority: number; stackable: boolean; percent: number; mode: CalculationMode }
> = {
  holiday: { priority: 100, stackable: false, percent: 40, mode: "base_relative" },
  season: { priority: 50, stackable: true, percent: 25, mode: "base_relative" },
  demand: { priority: 40, stackable: true, percent: 15, mode: "base_relative" },
  booking_window: { priority: 30, stackable: true, percent: -10, mode: "base_relative" },
  length_of_stay: { priority: 25, stackable: true, percent: -10, mode: "base_relative" },
  weekend: { priority: 20, stackable: true, percent: 18, mode: "base_relative" },
  guest: { priority: 15, stackable: true, percent: 25, mode: "base_relative" },
  discount: { priority: 10, stackable: true, percent: 10, mode: "base_relative" },
};

export function emptyRule(type: PricingRuleType = "season"): PricingRuleInput {
  const preset = DEFAULTS[type];
  return {
    name: "",
    description: "",
    type,
    scope: { propertyIds: [], roomTypeIds: [], ratePlanIds: [], verticals: [] },
    condition: {},
    adjustment: {
      type: type === "guest" ? "fixed" : "percent",
      value: type === "guest" ? 25 : preset.percent,
    },
    priority: preset.priority,
    stackable: preset.stackable,
    calculationMode: preset.mode,
    status: "active",
    minStay: 0,
    maxStay: 0,
    closedToArrival: false,
    closedToDeparture: false,
  };
}

/** Which condition fields a rule kind actually uses. */
function fieldsFor(type: PricingRuleType) {
  return {
    dates: type === "season" || type === "holiday" || type === "discount",
    weekdays: type === "weekend" || type === "season",
    occupancy: type === "demand",
    leadTime: type === "booking_window",
    nights: type === "length_of_stay" || type === "discount",
    guests: type === "guest",
  };
}

interface RuleFormProps {
  open: boolean;
  onClose: () => void;
  /** Editing an existing rule, or `null` to create one. */
  rule: PricingRule | null;
  /** Rules the new one might overlap — drives the warnings. */
  existing: PricingRule[];
  /** Properties in scope, for the "applies to" picker. */
  listings: Listing[];
  onSubmit: (input: PricingRuleInput) => Promise<unknown>;
  saving?: boolean;
}

/**
 * Create or edit a pricing rule.
 *
 * The form only shows the condition fields the chosen rule kind uses — a
 * length-of-stay rule has no business asking for an occupancy band — and it
 * validates through the same {@link validateRule} the service does, so a rule
 * can never be rejected by the service in a way the form didn't warn about.
 */
export function RuleForm({
  open,
  onClose,
  rule,
  existing,
  listings,
  onSubmit,
  saving = false,
}: RuleFormProps) {
  const [draft, setDraft] = useState<PricingRuleInput>(() =>
    rule ? toInput(rule) : emptyRule(),
  );
  const [submitted, setSubmitted] = useState(false);

  // Re-seed when the dialog is pointed at a different rule.
  const key = rule?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (open && key !== lastKey) {
    setLastKey(key);
    setDraft(rule ? toInput(rule) : emptyRule());
    setSubmitted(false);
  }

  const problems = useMemo(
    () => validateRule(draft, existing, rule?.id),
    [draft, existing, rule?.id],
  );
  const errors = problems.filter((p) => p.severity === "error");
  const warnings = problems.filter((p) => p.severity === "warning");
  const show = fieldsFor(draft.type);
  const plans = allRatePlans();

  const patch = (next: Partial<PricingRuleInput>) =>
    setDraft((prev) => ({ ...prev, ...next }));
  const patchCondition = (next: Partial<PricingRuleInput["condition"]>) =>
    setDraft((prev) => ({ ...prev, condition: { ...prev.condition, ...next } }));

  const changeType = (type: PricingRuleType) => {
    const preset = DEFAULTS[type];
    setDraft((prev) => ({
      ...prev,
      type,
      priority: preset.priority,
      stackable: preset.stackable,
      calculationMode: preset.mode,
      // Conditions belonging to the old kind would silently never match.
      condition: {},
      adjustment: {
        type: adjustmentTypesFor(type).includes(prev.adjustment.type)
          ? prev.adjustment.type
          : adjustmentTypesFor(type)[0],
        value: prev.adjustment.value,
      },
    }));
  };

  const submit = async () => {
    setSubmitted(true);
    if (errors.length > 0) return;
    await onSubmit(draft);
  };

  const errorFor = (field: string) =>
    submitted ? errors.find((p) => p.field === field)?.message : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? `Edit ${rule.name}` : "New pricing rule"}
      description="Rules are evaluated by priority. Higher runs first; a rule that doesn't stack stops the ones behind it."
      size="xl"
      dismissible={!saving}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} loading={saving}>
            {rule ? "Save changes" : "Create rule"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {submitted && errors.length > 0 && (
          <Alert tone="danger" title="This rule can't be saved yet">
            <ul className="list-disc space-y-0.5 pl-4">
              {errors.map((problem, index) => (
                <li key={`${problem.field}:${index}`}>{problem.message}</li>
              ))}
            </ul>
          </Alert>
        )}

        <FormSection title="What kind of rule">
          <fieldset>
            <legend className="sr-only">Rule type</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PRICING_RULE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={draft.type === type}
                  onClick={() => changeType(type)}
                  className={cn(
                    "rounded-field border p-3 text-left transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    draft.type === type
                      ? "border-primary bg-primary-50"
                      : "border-line hover:border-primary/50",
                  )}
                >
                  <span className="block text-sm font-medium text-ink">
                    {PRICING_RULE_TYPE_LABELS[type]}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {PRICING_RULE_TYPE_HINTS[type]}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        </FormSection>

        <FormSection title="Details">
          <FormGrid>
            <Input
              label="Name"
              required
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              error={errorFor("name")}
              placeholder="Winter peak season"
            />
            <Select
              label="Status"
              value={draft.status}
              onChange={(event) =>
                patch({ status: event.target.value as PricingRule["status"] })
              }
              options={[
                { value: "active", label: "Active — applies to quotes" },
                { value: "paused", label: "Paused — kept but ignored" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </FormGrid>
          <Textarea
            rows={2}
            label="Description"
            hint="Why this rule exists. Your team reads it, travellers never do."
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </FormSection>

        <FormSection
          title="When it applies"
          description="Every condition you set must hold. Leave a field empty to place no restriction."
        >
          {show.dates && (
            <FormGrid>
              <Input
                type="date"
                label="From"
                value={draft.condition.dateFrom ?? ""}
                onChange={(event) =>
                  patchCondition({ dateFrom: event.target.value || undefined })
                }
                error={errorFor("condition.dateFrom")}
              />
              <Input
                type="date"
                label="To"
                min={draft.condition.dateFrom || undefined}
                value={draft.condition.dateTo ?? ""}
                onChange={(event) =>
                  patchCondition({ dateTo: event.target.value || undefined })
                }
                error={errorFor("condition.dateTo")}
              />
            </FormGrid>
          )}

          {show.weekdays && (
            <fieldset>
              <legend className="text-sm font-medium text-ink">
                {draft.type === "weekend"
                  ? "Weekend days"
                  : "Only these weekdays (leave empty for all)"}
              </legend>
              {draft.type === "weekend" && (
                <p className="mt-0.5 text-xs text-muted">
                  Leave every day unselected to inherit the weekend from the property&rsquo;s
                  pricing configuration — the usual choice, so changing the market changes
                  this rule with it.
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {WEEKDAY_LABELS.map((label, index) => {
                  const on = (draft.condition.weekdays ?? []).includes(index);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        patchCondition({
                          weekdays: on
                            ? (draft.condition.weekdays ?? []).filter((d) => d !== index)
                            : [...(draft.condition.weekdays ?? []), index],
                        })
                      }
                      className={cn(
                        "rounded-pill border px-3 py-1 text-xs font-medium transition-colors",
                        on
                          ? "border-primary bg-primary text-white"
                          : "border-line bg-surface text-body hover:border-primary",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {show.occupancy && (
            <FormGrid>
              <Input
                type="number"
                min={0}
                max={100}
                label="Occupancy from (%)"
                value={percentValue(draft.condition.occupancyMin)}
                onChange={(event) =>
                  patchCondition({ occupancyMin: percentInput(event.target.value) })
                }
                error={errorFor("condition.occupancyMin")}
              />
              <Input
                type="number"
                min={0}
                max={101}
                label="Occupancy up to (%)"
                hint="Exclusive, so bands can sit side by side. Use 101 for the top band."
                value={percentValue(draft.condition.occupancyMax)}
                onChange={(event) =>
                  patchCondition({ occupancyMax: percentInput(event.target.value) })
                }
                error={errorFor("condition.occupancyMax")}
              />
            </FormGrid>
          )}

          {show.leadTime && (
            <FormGrid>
              <Input
                type="number"
                min={0}
                label="Booked at least this many days ahead"
                value={numberValue(draft.condition.leadTimeMinDays)}
                onChange={(event) =>
                  patchCondition({ leadTimeMinDays: numberInput(event.target.value) })
                }
              />
              <Input
                type="number"
                min={0}
                label="…and at most"
                value={numberValue(draft.condition.leadTimeMaxDays)}
                onChange={(event) =>
                  patchCondition({ leadTimeMaxDays: numberInput(event.target.value) })
                }
              />
            </FormGrid>
          )}

          {show.nights && (
            <FormGrid>
              <Input
                type="number"
                min={1}
                label="Minimum nights"
                value={numberValue(draft.condition.nightsMin)}
                onChange={(event) =>
                  patchCondition({ nightsMin: numberInput(event.target.value) })
                }
              />
              <Input
                type="number"
                min={1}
                label="Maximum nights"
                value={numberValue(draft.condition.nightsMax)}
                onChange={(event) =>
                  patchCondition({ nightsMax: numberInput(event.target.value) })
                }
              />
            </FormGrid>
          )}

          {show.guests && (
            <FormGrid>
              <Input
                type="number"
                min={1}
                label="Applies from this many guests"
                hint="A fixed amount is charged per guest above the two the rate covers, per night."
                value={numberValue(draft.condition.guestsMin)}
                onChange={(event) =>
                  patchCondition({ guestsMin: numberInput(event.target.value) })
                }
              />
              <Input
                type="number"
                min={1}
                label="…up to"
                value={numberValue(draft.condition.guestsMax)}
                onChange={(event) =>
                  patchCondition({ guestsMax: numberInput(event.target.value) })
                }
              />
            </FormGrid>
          )}

          {!show.dates &&
            !show.weekdays &&
            !show.occupancy &&
            !show.leadTime &&
            !show.nights &&
            !show.guests && (
              <p className="flex items-start gap-2 text-sm text-muted">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                This rule kind has no extra conditions — it applies wherever its scope
                reaches.
              </p>
            )}
        </FormSection>

        <FormSection title="What it does">
          <FormGrid>
            <Select
              label="Adjustment"
              value={draft.adjustment.type}
              onChange={(event) =>
                patch({
                  adjustment: {
                    ...draft.adjustment,
                    type: event.target.value as AdjustmentType,
                  },
                })
              }
              options={adjustmentTypesFor(draft.type).map((type) => ({
                value: type,
                label: ADJUSTMENT_TYPE_LABELS[type],
              }))}
            />
            <Input
              type="number"
              step="0.01"
              label={
                draft.adjustment.type === "percent"
                  ? "Percent (negative discounts)"
                  : draft.adjustment.type === "multiplier"
                    ? "Multiplier"
                    : "Amount"
              }
              value={String(draft.adjustment.value)}
              onChange={(event) =>
                patch({
                  adjustment: {
                    ...draft.adjustment,
                    value: Number(event.target.value),
                  },
                })
              }
              error={errorFor("adjustment.value")}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Priority & conflicts"
          description="When several rules match the same night, this decides what happens."
        >
          <FormGrid>
            <Input
              type="number"
              min={0}
              max={1000}
              label="Priority"
              hint="Higher runs first. Holidays 100, seasons 50, demand 40, weekends 20."
              value={String(draft.priority)}
              onChange={(event) => patch({ priority: Number(event.target.value) })}
              error={errorFor("priority")}
            />
            <Select
              label="Measured against"
              value={draft.calculationMode}
              onChange={(event) =>
                patch({ calculationMode: event.target.value as CalculationMode })
              }
              options={Object.entries(CALCULATION_MODE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </FormGrid>
          <Switch
            checked={draft.stackable}
            onChange={(event) => patch({ stackable: event.target.checked })}
            label="Stacks with other rules"
            hint={
              draft.stackable
                ? "Lower-priority rules still get a turn after this one."
                : "This rule is the last to run — everything behind it is skipped."
            }
          />
          <FormGrid>
            <Input
              type="number"
              min={0}
              label="Minimum stay it imposes (0 = none)"
              value={String(draft.minStay)}
              onChange={(event) => patch({ minStay: Number(event.target.value) })}
            />
            <Input
              type="number"
              min={0}
              label="Maximum stay (0 = none)"
              value={String(draft.maxStay)}
              onChange={(event) => patch({ maxStay: Number(event.target.value) })}
              error={errorFor("maxStay")}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Applies to"
          description="Leave a list empty to apply everywhere."
        >
          <MultiPicker
            label="Properties"
            options={listings.map((l) => ({ value: l.id, label: l.title }))}
            selected={draft.scope.propertyIds}
            onChange={(propertyIds) =>
              patch({ scope: { ...draft.scope, propertyIds } })
            }
          />
          <MultiPicker
            label="Rate plans"
            options={plans.map((p) => ({ value: p.id, label: p.name }))}
            selected={draft.scope.ratePlanIds}
            onChange={(ratePlanIds) => patch({ scope: { ...draft.scope, ratePlanIds } })}
          />
          <MultiPicker
            label="Verticals"
            options={BOOKING_VERTICALS.filter((v) => v !== "flights").map((v) => ({
              value: v,
              label: VERTICAL_LABELS[v],
            }))}
            selected={draft.scope.verticals}
            onChange={(verticals) =>
              patch({
                scope: { ...draft.scope, verticals: verticals as BookingVertical[] },
              })
            }
          />
        </FormSection>

        {warnings.length > 0 && (
          <Alert tone="warning" title="Worth a look before you save">
            <ul className="space-y-1">
              {warnings.map((problem, index) => (
                <li key={`${problem.field}:${index}`} className="flex items-start gap-1.5">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {problem.message}
                </li>
              ))}
            </ul>
          </Alert>
        )}
      </div>
    </Modal>
  );
}

function MultiPicker({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">
        {label}
        <span className="ml-1.5 font-normal text-muted">
          {selected.length === 0 ? "· all" : `· ${selected.length} selected`}
        </span>
      </legend>
      <div className="mt-2 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-field border border-line p-2">
        {options.length === 0 ? (
          <p className="p-1 text-xs text-muted">Nothing to choose from.</p>
        ) : (
          options.map((option) => {
            const on = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange(
                    on
                      ? selected.filter((v) => v !== option.value)
                      : [...selected, option.value],
                  )
                }
                className={cn(
                  "max-w-full truncate rounded-pill border px-3 py-1 text-xs font-medium transition-colors",
                  on
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-surface text-body hover:border-primary",
                )}
              >
                {option.label}
              </button>
            );
          })
        )}
      </div>
    </fieldset>
  );
}

function toInput(rule: PricingRule): PricingRuleInput {
  const { id: _id, createdAt: _c, updatedAt: _u, updatedBy: _b, ...rest } =
    structuredClone(rule);
  void _id;
  void _c;
  void _u;
  void _b;
  return rest;
}

/** Occupancy is stored 0–1 and edited 0–100 — one conversion, in one place. */
function percentValue(value: number | undefined): string {
  return value === undefined ? "" : String(Math.round(value * 100));
}

function percentInput(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value / 100 : undefined;
}

function numberValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function numberInput(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** Small inline reminder used by the list view when a rule can never fire. */
export function RuleWarning({ problems }: { problems: RuleProblem[] }) {
  if (problems.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-700">
      <CircleAlert className="size-3.5" aria-hidden="true" />
      {problems[0].message}
    </span>
  );
}
