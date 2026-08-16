"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  Copy,
  Lock,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Listing } from "@/types/catalog";
import {
  BOOKING_VERTICALS,
  VERTICAL_LABELS,
  type BookingVertical,
} from "@/types/booking";
import {
  CANCELLATION_POLICIES,
  MEAL_PLANS,
  MEAL_PLAN_LABELS,
  RATE_PLAN_STATUS_LABELS,
  describeAdjustment,
  type CancellationPolicyId,
  type MealPlan,
  type PricingRule,
  type RatePlan,
  type RatePlanId,
  type RatePlanInput,
} from "../../domain";
import { ConfirmDialog } from "../../crud";
import { formatCurrency } from "../../lib/format";
import { Can } from "../../rbac/permission-guard";
import {
  Alert,
  Button,
  EmptyState,
  FormGrid,
  FormSection,
  Input,
  Modal,
  NoResults,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  Switch,
  TableSkeleton,
  Textarea,
  Tooltip,
} from "../../ui";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  useCreateRatePlan,
  useDeleteRatePlan,
  useDuplicateRatePlan,
  usePricingRules,
  useRatePlans,
  useUpdateRatePlan,
} from "./hooks";

const STATUS_TONES = {
  active: "success",
  inactive: "warning",
  archived: "neutral",
} as const;

function emptyPlan(currency: string): RatePlanInput {
  return {
    name: "",
    description: "",
    priceFactor: 1,
    currency,
    cancellationPolicyId: "moderate",
    mealPlan: "none",
    refundable: true,
    minStay: 1,
    maxStay: 30,
    closedToArrival: [],
    closedToDeparture: [],
    minAdvanceDays: 0,
    maxAdvanceDays: 0,
    status: "active",
    verticals: [],
    propertyIds: [],
    roomTypeIds: [],
    inclusions: [],
  };
}

/**
 * Rate plans — the packages a property actually sells.
 *
 * A plan is a multiplier on the effective nightly rate plus the terms that come
 * with it (meals, refundability, stay limits, how far ahead it may be booked).
 * The four the product ships with can be disabled but never deleted: bookings
 * reference them by id, and a dangling reference would break their detail page.
 */
export function RatePlansView({
  listings,
  currency = "USD",
}: {
  listings: Listing[];
  currency?: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RatePlan["status"] | "">("");
  const [editing, setEditing] = useState<RatePlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RatePlan | null>(null);

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      includeArchived: true,
    }),
    [search, status],
  );

  const plans = useRatePlans(query);
  const all = useRatePlans({ includeArchived: true });
  // Every active rule, so each row can show which ones single it out. Rules
  // with an empty rate-plan scope reach every plan and are counted separately.
  const rules = usePricingRules({ status: "active" });
  const create = useCreateRatePlan();
  const update = useUpdateRatePlan();
  const duplicate = useDuplicateRatePlan();
  const remove = useDeleteRatePlan();

  const rows = plans.data ?? [];
  const everything = all.data ?? [];

  const submit = async (input: RatePlanInput) => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input });
        toast.success("Rate plan saved", { description: `${input.name} is up to date.` });
      } else {
        await create.mutateAsync(input);
        toast.success("Rate plan created", {
          description: `${input.name} is ${input.status === "active" ? "on sale" : "saved but not selling"}.`,
        });
      }
      setEditing(null);
      setCreating(false);
    } catch (error) {
      toast.error("Couldn't save the rate plan", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const toggle = async (plan: RatePlan) => {
    const next = plan.status === "active" ? "inactive" : "active";
    try {
      await update.mutateAsync({ id: plan.id, input: { status: next } });
      toast.success(next === "active" ? "Rate plan enabled" : "Rate plan disabled", {
        description:
          next === "active"
            ? `${plan.name} is offered at checkout again.`
            : `${plan.name} is no longer offered.`,
      });
    } catch {
      toast.error("Couldn't change the rate plan");
    }
  };

  const copy = async (plan: RatePlan) => {
    try {
      const made = await duplicate.mutateAsync(plan.id);
      toast.success("Rate plan duplicated", {
        description: `${made.name} was created disabled — edit it before selling it.`,
      });
    } catch {
      toast.error("Couldn't duplicate the rate plan");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      const result = await remove.mutateAsync(pendingDelete.id);
      toast.success(result.archived ? "Rate plan archived" : "Rate plan deleted", {
        description: result.archived
          ? `${pendingDelete.name} ships with the product, so it was archived rather than deleted — existing bookings still resolve it.`
          : `${pendingDelete.name} is gone.`,
      });
    } catch {
      toast.error("Couldn't remove the rate plan");
    } finally {
      setPendingDelete(null);
    }
  };

  const counts = {
    active: everything.filter((p) => p.status === "active").length,
    inactive: everything.filter((p) => p.status === "inactive").length,
    custom: everything.filter((p) => !p.builtIn).length,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="On sale" value={String(counts.active)} icon="TicketCheck" />
        <StatCard label="Disabled" value={String(counts.inactive)} icon="Pause" />
        <StatCard label="Your own plans" value={String(counts.custom)} icon="Layers" />
        <StatCard label="Total" value={String(everything.length)} icon="Percent" />
      </div>

      <Panel>
        <PanelHeader
          title="Rate plans"
          description="Each plan prices against the room's effective nightly rate and carries its own terms."
          actions={
            <Can anyPermission={["catalog:update"]}>
              <Button
                size="sm"
                leftIcon={<Plus className="size-4" />}
                onClick={() => {
                  setEditing(null);
                  setCreating(true);
                }}
              >
                New rate plan
              </Button>
            </Can>
          }
        />
        <PanelBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Plan name"
              leftIcon={<Search className="size-4" />}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as RatePlan["status"] | "")
              }
              options={[
                { value: "", label: "Every status" },
                { value: "active", label: "On sale" },
                { value: "inactive", label: "Disabled" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </div>

          {plans.isLoading ? (
            <TableSkeleton rows={5} />
          ) : everything.length === 0 ? (
            <EmptyState
              title="No rate plans"
              description="Create one and it becomes selectable at checkout immediately."
            />
          ) : rows.length === 0 ? (
            <NoResults query={search.trim() || undefined} />
          ) : (
            <div className="-mx-5 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-3xl text-sm">
                <caption className="sr-only">Rate plans and their terms</caption>
                <thead className="border-y border-line bg-surface-muted/50 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Board</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Terms</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Sold on</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Pricing rules</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((plan) => (
                    <tr
                      key={plan.id}
                      className={cn(plan.status !== "active" && "opacity-70")}
                    >
                      <td className="px-4 py-3">
                        <p className="flex items-center gap-1.5 font-medium text-ink">
                          {plan.name}
                          {plan.builtIn && (
                            <Tooltip content="Ships with the product — can be disabled but not deleted.">
                              <Lock className="size-3 text-muted" aria-hidden="true" />
                            </Tooltip>
                          )}
                        </p>
                        <p className="text-xs text-muted">{plan.description}</p>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink">
                        {plan.baseRate !== undefined ? (
                          <>
                            {formatCurrency(plan.baseRate, plan.currency)}
                            <span className="block text-xs text-muted">contracted</span>
                          </>
                        ) : (
                          <>
                            ×{plan.priceFactor.toFixed(2)}
                            <span className="block text-xs text-muted">
                              {plan.priceFactor === 1
                                ? "the room rate"
                                : plan.priceFactor > 1
                                  ? `+${Math.round((plan.priceFactor - 1) * 100)}%`
                                  : `−${Math.round((1 - plan.priceFactor) * 100)}%`}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-body">
                        {MEAL_PLAN_LABELS[plan.mealPlan]}
                      </td>
                      <td className="px-4 py-3 text-xs text-body">
                        <span className="block">
                          {plan.minStay}–{plan.maxStay} nights
                        </span>
                        <span className="block text-muted">
                          {plan.refundable ? "Refundable" : "Non-refundable"}
                          {plan.minAdvanceDays > 0 &&
                            ` · ${plan.minAdvanceDays}+ days ahead`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-body">
                        {plan.verticals.length === 0 ? (
                          <span className="text-muted">Every vertical</span>
                        ) : (
                          plan.verticals.map((v) => VERTICAL_LABELS[v]).join(", ")
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <AttachedRules planId={plan.id} rules={rules.data ?? []} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={STATUS_TONES[plan.status]}>
                          {RATE_PLAN_STATUS_LABELS[plan.status]}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <Can anyPermission={["catalog:update"]}>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip
                              content={plan.status === "active" ? "Disable" : "Enable"}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`${plan.status === "active" ? "Disable" : "Enable"} ${plan.name}`}
                                disabled={update.isPending}
                                onClick={() => toggle(plan)}
                              >
                                {plan.status === "active" ? (
                                  <Pause className="size-4" aria-hidden="true" />
                                ) : (
                                  <Play className="size-4" aria-hidden="true" />
                                )}
                              </Button>
                            </Tooltip>
                            <Tooltip content="Duplicate">
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Duplicate ${plan.name}`}
                                disabled={duplicate.isPending}
                                onClick={() => copy(plan)}
                              >
                                <Copy className="size-4" aria-hidden="true" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Edit">
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Edit ${plan.name}`}
                                onClick={() => {
                                  setCreating(false);
                                  setEditing(plan);
                                }}
                              >
                                <Pencil className="size-4" aria-hidden="true" />
                              </Button>
                            </Tooltip>
                            <Tooltip content={plan.builtIn ? "Archive" : "Delete"}>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`${plan.builtIn ? "Archive" : "Delete"} ${plan.name}`}
                                onClick={() => setPendingDelete(plan)}
                              >
                                {plan.builtIn ? (
                                  <Archive className="size-4" aria-hidden="true" />
                                ) : (
                                  <Trash2 className="size-4 text-danger" aria-hidden="true" />
                                )}
                              </Button>
                            </Tooltip>
                          </div>
                        </Can>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelBody>
      </Panel>

      <RatePlanForm
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        plan={editing}
        listings={listings}
        currency={currency}
        onSubmit={submit}
        saving={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        confirmLabel={pendingDelete?.builtIn ? "Archive" : "Delete"}
        title={`${pendingDelete?.builtIn ? "Archive" : "Delete"} ${pendingDelete?.name ?? "this plan"}?`}
        message={
          pendingDelete?.builtIn
            ? "This plan ships with the product and existing bookings point at it, so it will be archived rather than deleted. It stops being offered immediately."
            : "It will stop being offered at checkout straight away. Bookings already made keep their terms."
        }
      />
    </div>
  );
}

/**
 * The pricing rules that reach a plan.
 *
 * A rule with an empty rate-plan scope applies to every plan, so it is reported
 * as a count rather than a list — otherwise every row would show the same
 * dozen rules and the column would say nothing. Rules that name this plan
 * specifically are the interesting ones, and are listed.
 */
function AttachedRules({ planId, rules }: { planId: RatePlanId; rules: PricingRule[] }) {
  const specific = rules.filter((rule) => rule.scope.ratePlanIds.includes(planId));
  const universal = rules.filter((rule) => rule.scope.ratePlanIds.length === 0).length;

  if (specific.length === 0) {
    return (
      <span className="text-muted">
        {universal} platform {universal === 1 ? "rule" : "rules"}
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-0.5">
      {specific.slice(0, 3).map((rule) => (
        <span key={rule.id} className="flex items-center gap-1 text-body">
          <Sparkles className="size-3 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">
            {rule.name}
            <span className="text-muted">
              {" "}
              {describeAdjustment("", rule.adjustment, rule.calculationMode).trim()}
            </span>
          </span>
        </span>
      ))}
      {specific.length > 3 && (
        <span className="text-muted">+{specific.length - 3} more</span>
      )}
      <span className="text-muted">plus {universal} platform</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function RatePlanForm({
  open,
  onClose,
  plan,
  listings,
  currency,
  onSubmit,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  plan: RatePlan | null;
  listings: Listing[];
  currency: string;
  onSubmit: (input: RatePlanInput) => Promise<unknown>;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<RatePlanInput>(() =>
    plan ? toInput(plan) : emptyPlan(currency),
  );
  const [contracted, setContracted] = useState(plan?.baseRate !== undefined);
  const [inclusions, setInclusions] = useState((plan?.inclusions ?? []).join("\n"));
  const [submitted, setSubmitted] = useState(false);

  const key = plan?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (open && key !== lastKey) {
    setLastKey(key);
    setDraft(plan ? toInput(plan) : emptyPlan(currency));
    setContracted(plan?.baseRate !== undefined);
    setInclusions((plan?.inclusions ?? []).join("\n"));
    setSubmitted(false);
  }

  const patch = (next: Partial<RatePlanInput>) =>
    setDraft((prev) => ({ ...prev, ...next }));

  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Give the rate plan a name.");
  if (!contracted && (!Number.isFinite(draft.priceFactor) || draft.priceFactor <= 0)) {
    errors.push("The price factor must be greater than zero.");
  }
  if (contracted && (!Number.isFinite(draft.baseRate ?? NaN) || (draft.baseRate ?? 0) <= 0)) {
    errors.push("Enter the contracted nightly rate.");
  }
  if (draft.maxStay > 0 && draft.maxStay < draft.minStay) {
    errors.push("Maximum stay is shorter than the minimum.");
  }
  if (
    draft.maxAdvanceDays > 0 &&
    draft.maxAdvanceDays < draft.minAdvanceDays
  ) {
    errors.push("The booking window closes before it opens.");
  }

  const submit = async () => {
    setSubmitted(true);
    if (errors.length > 0) return;
    await onSubmit({
      ...draft,
      baseRate: contracted ? draft.baseRate : undefined,
      priceFactor: contracted ? 1 : draft.priceFactor,
      inclusions: inclusions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan ? `Edit ${plan.name}` : "New rate plan"}
      description="Plans price against the room's effective nightly rate, after the pricing rules have run."
      size="xl"
      dismissible={!saving}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} loading={saving}>
            {plan ? "Save changes" : "Create plan"}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {submitted && errors.length > 0 && (
          <Alert tone="danger" title="This plan can't be saved yet">
            <ul className="list-disc space-y-0.5 pl-4">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Alert>
        )}

        <FormSection title="Basics">
          <FormGrid>
            <Input
              label="Name"
              required
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="Corporate rate"
            />
            <Select
              label="Status"
              value={draft.status}
              onChange={(event) =>
                patch({ status: event.target.value as RatePlan["status"] })
              }
              options={[
                { value: "active", label: "On sale" },
                { value: "inactive", label: "Disabled" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </FormGrid>
          <Textarea
            rows={2}
            label="Description"
            hint="Travellers read this on the rate card."
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </FormSection>

        <FormSection
          title="Price"
          description="Either a multiplier on the room's rate, or an absolute contracted rate that replaces it."
        >
          <Switch
            checked={contracted}
            onChange={(event) => setContracted(event.target.checked)}
            label="Contracted nightly rate"
            hint="Pricing rules still apply on top unless you scope them away from this plan."
          />
          <FormGrid>
            {contracted ? (
              <Input
                type="number"
                min={0}
                step="0.01"
                label={`Nightly rate (${draft.currency})`}
                value={String(draft.baseRate ?? "")}
                onChange={(event) => patch({ baseRate: Number(event.target.value) })}
              />
            ) : (
              <Input
                type="number"
                min={0}
                step="0.01"
                label="Price factor"
                hint="1 = the room rate, 0.86 = 14% cheaper, 1.14 = 14% dearer."
                value={String(draft.priceFactor)}
                onChange={(event) => patch({ priceFactor: Number(event.target.value) })}
              />
            )}
            <Input
              label="Currency"
              hint="The platform's base currency unless this plan is quoted in another."
              value={draft.currency}
              onChange={(event) =>
                patch({ currency: event.target.value.toUpperCase().slice(0, 3) })
              }
            />
          </FormGrid>
        </FormSection>

        <FormSection title="What's included">
          <FormGrid>
            <Select
              label="Board"
              value={draft.mealPlan}
              onChange={(event) => patch({ mealPlan: event.target.value as MealPlan })}
              options={MEAL_PLANS.map((value) => ({
                value,
                label: MEAL_PLAN_LABELS[value],
              }))}
            />
            <Select
              label="Cancellation policy"
              value={draft.cancellationPolicyId}
              onChange={(event) =>
                patch({
                  cancellationPolicyId: event.target.value as CancellationPolicyId,
                  refundable: event.target.value !== "non_refundable",
                })
              }
              options={Object.values(CANCELLATION_POLICIES).map((policy) => ({
                value: policy.id,
                label: policy.label,
              }))}
            />
          </FormGrid>
          <Switch
            checked={draft.refundable}
            onChange={(event) => patch({ refundable: event.target.checked })}
            label="Refundable"
            hint="Shown as a badge on the rate card."
          />
          <Textarea
            rows={3}
            label="Inclusions"
            hint="One per line. Rendered as ticks on the rate card."
            value={inclusions}
            onChange={(event) => setInclusions(event.target.value)}
            placeholder={"Breakfast for all guests\nFree cancellation up to 5 days before"}
          />
        </FormSection>

        <FormSection
          title="Booking restrictions"
          description="Checked at quote time — a stay that breaks one is blocked with the reason."
        >
          <FormGrid>
            <Input
              type="number"
              min={1}
              label="Minimum stay (nights)"
              value={String(draft.minStay)}
              onChange={(event) => patch({ minStay: Number(event.target.value) })}
            />
            <Input
              type="number"
              min={1}
              label="Maximum stay (nights)"
              value={String(draft.maxStay)}
              onChange={(event) => patch({ maxStay: Number(event.target.value) })}
            />
            <Input
              type="number"
              min={0}
              label="Must book at least this far ahead (days)"
              hint="0 for no restriction."
              value={String(draft.minAdvanceDays)}
              onChange={(event) => patch({ minAdvanceDays: Number(event.target.value) })}
            />
            <Input
              type="number"
              min={0}
              label="…and at most (days)"
              hint="0 for no restriction."
              value={String(draft.maxAdvanceDays)}
              onChange={(event) => patch({ maxAdvanceDays: Number(event.target.value) })}
            />
          </FormGrid>
          <WeekdayPicker
            label="Closed to arrival"
            hint="Stays may not start on these weekdays."
            selected={draft.closedToArrival}
            onChange={(closedToArrival) => patch({ closedToArrival })}
          />
          <WeekdayPicker
            label="Closed to departure"
            hint="Stays may not end on these weekdays."
            selected={draft.closedToDeparture}
            onChange={(closedToDeparture) => patch({ closedToDeparture })}
          />
        </FormSection>

        <FormSection
          title="Where it's sold"
          description="Leave a list empty to sell it everywhere."
        >
          <ChipPicker
            label="Verticals"
            options={BOOKING_VERTICALS.filter((v) => v !== "flights").map((v) => ({
              value: v,
              label: VERTICAL_LABELS[v],
            }))}
            selected={draft.verticals}
            onChange={(verticals) =>
              patch({ verticals: verticals as BookingVertical[] })
            }
          />
          <ChipPicker
            label="Properties"
            options={listings.map((l) => ({ value: l.id, label: l.title }))}
            selected={draft.propertyIds}
            onChange={(propertyIds) => patch({ propertyIds })}
          />
        </FormSection>
      </div>
    </Modal>
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function WeekdayPicker({
  label,
  hint,
  selected,
  onChange,
}: {
  label: string;
  hint: string;
  selected: number[];
  onChange: (next: number[]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {WEEKDAYS.map((day, index) => {
          const on = selected.includes(index);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(on ? selected.filter((d) => d !== index) : [...selected, index])
              }
              className={cn(
                "rounded-pill border px-3 py-1 text-xs font-medium transition-colors",
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
  );
}

function ChipPicker({
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

function toInput(plan: RatePlan): RatePlanInput {
  const {
    id: _id,
    builtIn: _b,
    createdAt: _c,
    updatedAt: _u,
    updatedBy: _by,
    includesBreakfast: _ib,
    ...rest
  } = structuredClone(plan);
  void _id;
  void _b;
  void _c;
  void _u;
  void _by;
  void _ib;
  return rest;
}
