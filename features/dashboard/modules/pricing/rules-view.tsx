"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CalendarRange,
  Copy,
  Layers,
  Lock,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { Listing } from "@/types/catalog";
import { VERTICAL_LABELS } from "@/types/booking";
import {
  PRICING_RULE_STATUS_LABELS,
  PRICING_RULE_TYPES,
  PRICING_RULE_TYPE_LABELS,
  describeAdjustment,
  type PricingRule,
  type PricingRuleInput,
  type PricingRuleType,
} from "../../domain";
import { merchantForListing } from "@/features/booking";
import { ConfirmDialog } from "../../crud";
import { useDomainScope } from "../../domain/use-domain";
import { formatDate } from "../../lib/format";
import { Can } from "../../rbac/permission-guard";
import {
  Button,
  EmptyState,
  Input,
  NoResults,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  TableSkeleton,
  Tooltip,
} from "../../ui";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  useDeletePricingRule,
  useCreatePricingRule,
  useDuplicatePricingRule,
  usePricingRules,
  useSetRuleStatus,
  useUpdatePricingRule,
} from "./hooks";
import { RuleForm } from "./rule-form";

const STATUS_TONES = {
  active: "success",
  paused: "warning",
  archived: "neutral",
} as const;

/**
 * Rule management — seasons, holidays, weekends, demand, booking window,
 * length of stay, guests and discounts in one list.
 *
 * They share a list because they share a model: one polymorphic rule with a
 * priority and a stacking flag. Splitting them into eight screens would hide
 * the only thing a merchant really needs to see, which is the order they run
 * in when several match the same night.
 */
export function PricingRulesView({ listings }: { listings: Listing[] }) {
  const scope = useDomainScope();

  /**
   * A merchant manages their own properties, not the platform's.
   *
   * Rules scoped to one of their listings are theirs to change; rules with an
   * empty property scope are the platform's and reach every property, so they
   * are shown — a merchant needs to know what is moving their rates — but
   * read-only. The same row-level rule the rest of the domain applies, resolved
   * here through the catalogue join.
   */
  const visible = useMemo(
    () =>
      scope.merchantId
        ? listings.filter((l) => merchantForListing(l).id === scope.merchantId)
        : listings,
    [listings, scope.merchantId],
  );
  const ownIds = useMemo(() => new Set(visible.map((l) => l.id)), [visible]);
  const owns = useCallback(
    (rule: PricingRule) =>
      !scope.merchantId ||
      rule.scope.propertyIds.some((id) => ownIds.has(id)),
    [ownIds, scope.merchantId],
  );

  const [type, setType] = useState<PricingRuleType | "">("");
  const [status, setStatus] = useState<PricingRule["status"] | "">("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PricingRule | null>(null);

  const query = useMemo(
    () => ({
      type: type || undefined,
      status: status || undefined,
      search: search.trim() || undefined,
      includeArchived: status === "archived",
    }),
    [type, status, search],
  );

  const rules = usePricingRules(query);
  const all = usePricingRules({ includeArchived: true });
  const create = useCreatePricingRule();
  const update = useUpdatePricingRule();
  const setStatusMutation = useSetRuleStatus();
  const duplicate = useDuplicatePricingRule();
  const remove = useDeletePricingRule();

  /**
   * A merchant only sees rules that reach their own properties: their own, plus
   * the platform-wide ones that apply to everybody. A rule scoped to *another*
   * merchant's property is none of their business.
   */
  const reaches = useCallback(
    (rule: PricingRule) =>
      !scope.merchantId ||
      rule.scope.propertyIds.length === 0 ||
      rule.scope.propertyIds.some((id) => ownIds.has(id)),
    [ownIds, scope.merchantId],
  );

  const rows = useMemo(() => (rules.data ?? []).filter(reaches), [rules.data, reaches]);
  // Hoisted out of the `useMemo` below: `all.data ?? []` is a fresh array on
  // every render, which would defeat the memo it feeds.
  const everything = useMemo(
    () => (all.data ?? []).filter(reaches),
    [all.data, reaches],
  );
  const counts = useMemo(
    () => ({
      active: everything.filter((r) => r.status === "active").length,
      paused: everything.filter((r) => r.status === "paused").length,
      seasons: everything.filter((r) => r.type === "season" && r.status === "active")
        .length,
      holidays: everything.filter((r) => r.type === "holiday" && r.status === "active")
        .length,
    }),
    [everything],
  );

  const submit = async (input: PricingRuleInput) => {
    // A merchant leaving the property picker empty means "all of mine", not
    // "every property on the platform" — which is the only thing an empty
    // scope can mean to the engine. Fill it in rather than letting them
    // accidentally reprice someone else's hotel.
    const scoped: PricingRuleInput =
      scope.merchantId && input.scope.propertyIds.length === 0
        ? {
            ...input,
            scope: { ...input.scope, propertyIds: visible.map((l) => l.id) },
          }
        : input;
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, input: scoped });
        toast.success("Rule saved", { description: `${input.name} is up to date.` });
      } else {
        await create.mutateAsync(scoped);
        toast.success("Rule created", {
          description:
            input.status === "active"
              ? `${input.name} applies to quotes from now on.`
              : `${input.name} is saved but paused.`,
        });
      }
      setEditing(null);
      setCreating(false);
    } catch (error) {
      toast.error("Couldn't save the rule", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const toggle = async (rule: PricingRule) => {
    const next = rule.status === "active" ? "paused" : "active";
    try {
      await setStatusMutation.mutateAsync({ id: rule.id, status: next });
      toast.success(next === "active" ? "Rule enabled" : "Rule paused", {
        description:
          next === "active"
            ? `${rule.name} applies to quotes again.`
            : `${rule.name} is kept but ignored.`,
      });
    } catch {
      toast.error("Couldn't change the rule's status");
    }
  };

  const copy = async (rule: PricingRule) => {
    try {
      const made = await duplicate.mutateAsync(rule.id);
      toast.success("Rule duplicated", {
        description: `${made.name} was created paused — edit it before switching it on.`,
      });
    } catch {
      toast.error("Couldn't duplicate the rule");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove.mutateAsync(pendingDelete.id);
      toast.success("Rule deleted", { description: `${pendingDelete.name} is gone.` });
    } catch {
      toast.error("Couldn't delete the rule");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active rules" value={String(counts.active)} icon="Sparkles" />
        <StatCard label="Paused" value={String(counts.paused)} icon="Pause" />
        <StatCard label="Seasons" value={String(counts.seasons)} icon="CalendarCheck" />
        <StatCard label="Holidays" value={String(counts.holidays)} icon="Sunrise" />
      </div>

      <Panel>
        <PanelHeader
          title="Pricing rules"
          description="Evaluated highest priority first. A rule that doesn't stack stops everything behind it."
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
                New rule
              </Button>
            </Can>
          }
        />
        <PanelBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or description"
              leftIcon={<Search className="size-4" />}
            />
            <Select
              label="Type"
              value={type}
              onChange={(event) => setType(event.target.value as PricingRuleType | "")}
              options={[
                { value: "", label: "Every type" },
                ...PRICING_RULE_TYPES.map((value) => ({
                  value,
                  label: PRICING_RULE_TYPE_LABELS[value],
                })),
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as PricingRule["status"] | "")
              }
              options={[
                { value: "", label: "Active and paused" },
                { value: "active", label: "Active" },
                { value: "paused", label: "Paused" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </div>

          {rules.isLoading ? (
            <TableSkeleton rows={6} />
          ) : everything.length === 0 ? (
            <EmptyState
              title="No pricing rules yet"
              description="Create a season, a holiday or a weekend rule and the calendar will start moving."
            />
          ) : rows.length === 0 ? (
            <NoResults query={search.trim() || undefined} />
          ) : (
            <RuleTable
              rules={rows}
              listings={visible}
              owns={owns}
              onEdit={(rule) => {
                setCreating(false);
                setEditing(rule);
              }}
              onToggle={toggle}
              onDuplicate={copy}
              onDelete={setPendingDelete}
              busy={setStatusMutation.isPending || duplicate.isPending}
            />
          )}
        </PanelBody>
      </Panel>

      <RuleForm
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        rule={editing}
        existing={everything}
        listings={visible}
        onSubmit={submit}
        saving={create.isPending || update.isPending}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title={`Delete ${pendingDelete?.name ?? "this rule"}?`}
        message="Rates already quoted are unaffected, but every future night this rule touched will re-price without it. Pause it instead if you might want it back."
      />
    </div>
  );
}

function RuleTable({
  rules,
  listings,
  owns,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
  busy,
}: {
  rules: PricingRule[];
  listings: Listing[];
  /** False for a platform rule a merchant may see but not change. */
  owns: (rule: PricingRule) => boolean;
  onEdit: (rule: PricingRule) => void;
  onToggle: (rule: PricingRule) => void;
  onDuplicate: (rule: PricingRule) => void;
  onDelete: (rule: PricingRule) => void;
  busy: boolean;
}) {
  const titleOf = (id: string) => listings.find((l) => l.id === id)?.title ?? id;

  return (
    <div className="-mx-5 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-3xl text-sm">
        <caption className="sr-only">
          Pricing rules, in the order the engine evaluates them
        </caption>
        <thead className="border-y border-line bg-surface-muted/50 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">
              Rule
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              When
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Effect
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Priority
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Applies to
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rules.map((rule) => (
            <tr
              key={rule.id}
              className={cn(rule.status !== "active" && "opacity-70")}
            >
              <td className="px-4 py-3">
                <p className="font-medium text-ink">{rule.name}</p>
                <p className="text-xs text-muted">
                  {PRICING_RULE_TYPE_LABELS[rule.type]}
                  {rule.description ? ` · ${rule.description}` : ""}
                </p>
              </td>
              <td className="px-4 py-3 text-body">
                <ConditionSummary rule={rule} />
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    rule.adjustment.value >= 0 ? "text-amber-700" : "text-emerald-700",
                  )}
                >
                  {describeAdjustment("", rule.adjustment, rule.calculationMode).trim()}
                </span>
                <span className="block text-xs text-muted">
                  {rule.calculationMode === "base_relative"
                    ? "of the base rate"
                    : rule.calculationMode === "sequential"
                      ? "compounds"
                      : "overrides"}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="font-semibold tabular-nums text-ink">
                  {rule.priority}
                </span>
                <span className="block text-xs text-muted">
                  {rule.stackable ? "stacks" : "stops others"}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-body">
                {rule.scope.propertyIds.length > 0 ? (
                  <span title={rule.scope.propertyIds.map(titleOf).join(", ")}>
                    {rule.scope.propertyIds.length === 1
                      ? titleOf(rule.scope.propertyIds[0])
                      : `${rule.scope.propertyIds.length} properties`}
                  </span>
                ) : rule.scope.verticals.length > 0 ? (
                  rule.scope.verticals.map((v) => VERTICAL_LABELS[v]).join(", ")
                ) : (
                  <span className="text-muted">Everything</span>
                )}
                {rule.scope.ratePlanIds.length > 0 && (
                  <span className="mt-0.5 flex items-center gap-1 text-muted">
                    <Layers className="size-3" aria-hidden="true" />
                    {rule.scope.ratePlanIds.length} rate{" "}
                    {rule.scope.ratePlanIds.length === 1 ? "plan" : "plans"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge tone={STATUS_TONES[rule.status]}>
                  {PRICING_RULE_STATUS_LABELS[rule.status]}
                </StatusBadge>
              </td>
              <td className="px-4 py-3">
                {!owns(rule) ? (
                  <span className="flex items-center justify-end gap-1.5 text-xs text-muted">
                    <Lock className="size-3.5" aria-hidden="true" />
                    Platform rule
                  </span>
                ) : (
                <Can anyPermission={["catalog:update"]}>
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip content={rule.status === "active" ? "Pause" : "Enable"}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        aria-label={
                          rule.status === "active"
                            ? `Pause ${rule.name}`
                            : `Enable ${rule.name}`
                        }
                        onClick={() => onToggle(rule)}
                      >
                        {rule.status === "active" ? (
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
                        disabled={busy}
                        aria-label={`Duplicate ${rule.name}`}
                        onClick={() => onDuplicate(rule)}
                      >
                        <Copy className="size-4" aria-hidden="true" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Edit">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${rule.name}`}
                        onClick={() => onEdit(rule)}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Delete">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${rule.name}`}
                        onClick={() => onDelete(rule)}
                      >
                        <Trash2 className="size-4 text-danger" aria-hidden="true" />
                      </Button>
                    </Tooltip>
                  </div>
                </Can>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A one-line, human reading of a rule's condition. */
function ConditionSummary({ rule }: { rule: PricingRule }) {
  const c = rule.condition;
  const parts: string[] = [];

  if (c.dateFrom || c.dateTo) {
    parts.push(
      `${c.dateFrom ? formatDate(c.dateFrom) : "any date"} → ${
        c.dateTo ? formatDate(c.dateTo) : "open"
      }`,
    );
  }
  if (c.weekdays?.length) {
    parts.push(c.weekdays.map((d) => WEEKDAY_SHORT[d]).join(", "));
  } else if (rule.type === "weekend") {
    parts.push("The configured weekend");
  }
  if (c.occupancyMin !== undefined || c.occupancyMax !== undefined) {
    parts.push(
      `${Math.round((c.occupancyMin ?? 0) * 100)}–${Math.round(
        Math.min(1, c.occupancyMax ?? 1) * 100,
      )}% full`,
    );
  }
  if (c.leadTimeMinDays !== undefined || c.leadTimeMaxDays !== undefined) {
    parts.push(
      c.leadTimeMaxDays === undefined
        ? `${c.leadTimeMinDays}+ days ahead`
        : c.leadTimeMinDays === undefined
          ? `within ${c.leadTimeMaxDays} days`
          : `${c.leadTimeMinDays}–${c.leadTimeMaxDays} days ahead`,
    );
  }
  if (c.nightsMin !== undefined || c.nightsMax !== undefined) {
    parts.push(
      c.nightsMax === undefined
        ? `${c.nightsMin}+ nights`
        : c.nightsMin === undefined
          ? `up to ${c.nightsMax} nights`
          : `${c.nightsMin}–${c.nightsMax} nights`,
    );
  }
  if (c.guestsMin !== undefined || c.guestsMax !== undefined) {
    parts.push(
      c.guestsMax === undefined
        ? `${c.guestsMin}+ guests`
        : `${c.guestsMin ?? 1}–${c.guestsMax} guests`,
    );
  }

  if (parts.length === 0) {
    return <span className="text-muted">Always</span>;
  }

  return (
    <span className="flex flex-col gap-0.5 text-xs">
      {parts.map((part, index) => (
        <span key={part} className="flex items-center gap-1">
          {index === 0 && (
            <CalendarRange className="size-3 shrink-0 text-muted" aria-hidden="true" />
          )}
          {part}
        </span>
      ))}
    </span>
  );
}
