"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, Pause, Play, Plus } from "lucide-react";
import { z } from "zod";
import { toast } from "@/lib/toast";
import {
  AD_RATE_CARD,
  ASSUMED_CTR,
  CAMPAIGN_STATUS_LABELS,
  MERCHANT_PLACEMENTS,
  PLACEMENT_LABELS,
  PRICING_MODEL_LABELS,
  estimateSpend,
  merchantAdvertisingService,
  type AdCampaign,
  type AdPricingModel,
  type CampaignPerformance,
  type CampaignStatus,
  type Merchant,
} from "@/features/dashboard/domain";
import { getErrorMessage, useMutation, useQuery } from "../../data";
import { applyServerErrors, useZodForm } from "../../forms";
import {
  Alert,
  Badge,
  Button,
  Drawer,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
} from "../../ui";
import { EmptyState } from "../../components/state-views";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { formatCurrency, formatDate, formatNumber } from "../../lib/format";
import { useOwnMerchant } from "./use-merchant";
import { NoMerchantAccount, WorkspaceSkeleton } from "./no-merchant";

type CampaignRow = AdCampaign & { performance: CampaignPerformance };

const CAMPAIGN_TONES: Record<CampaignStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  pending_review: "info",
  scheduled: "info",
  active: "success",
  paused: "warning",
  completed: "neutral",
  rejected: "danger",
};

const adKeys = {
  all: ["merchant-advertising"] as const,
  list: (merchantId: string) => ["merchant-advertising", merchantId] as const,
};

function useMerchantCampaigns(merchantId: string) {
  return useQuery<CampaignRow[]>({
    queryKey: adKeys.list(merchantId),
    queryFn: () => merchantAdvertisingService.list(merchantId),
    enabled: Boolean(merchantId),
  });
}

/**
 * Merchant self-serve advertising.
 *
 * The billing engine already existed on the admin side; this is the shop window
 * onto it. A merchant buys at published rates, sees the arithmetic behind the
 * estimate, and submits — the platform still reviews every campaign.
 */
export function MerchantAdvertisingView() {
  const { merchantId, data: merchant, isLoading } = useOwnMerchant();
  const campaigns = useMerchantCampaigns(merchantId ?? "");
  const [creating, setCreating] = useState(false);

  const actor = useDomainActor();
  const scope = useDomainScope();
  const setRunning = useMutation<AdCampaign, { campaignId: string; running: boolean }>({
    mutationFn: ({ campaignId, running }) =>
      merchantAdvertisingService.setRunning(merchantId!, campaignId, running, actor, scope),
    invalidateKeys: [adKeys.all],
  });

  const eligibility = useMemo(
    () => (merchant ? merchantAdvertisingService.eligibility(merchant) : null),
    [merchant],
  );

  if (!merchantId) return <NoMerchantAccount />;
  if (isLoading && !merchant) return <WorkspaceSkeleton />;
  if (!merchant) return <NoMerchantAccount />;

  const rows = campaigns.data ?? [];
  const totalSpend = rows.reduce((n, c) => n + c.performance.spend, 0);
  const totalBudget = rows.reduce((n, c) => n + c.budget, 0);
  const clicks = rows.reduce((n, c) => n + c.metrics.clicks, 0);
  const attributed = rows.reduce((n, c) => n + c.metrics.attributedValue, 0);

  return (
    <div className="flex flex-col gap-6">
      <Alert tone="info" title="Demo billing">
        Campaigns are billed against the seeded delivery data. No payment method is taken and no
        real impressions are bought.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Campaigns" value={String(rows.length)} icon="Megaphone" />
        <StatCard
          label="Spend"
          value={formatCurrency(totalSpend, "USD")}
          icon="Wallet"
          hint={`of ${formatCurrency(totalBudget, "USD")} committed`}
        />
        <StatCard label="Clicks" value={formatNumber(clicks)} icon="MousePointerClick" />
        <StatCard
          label="Attributed bookings"
          value={formatCurrency(attributed, "USD")}
          icon="LineChart"
          hint={totalSpend > 0 ? `${(attributed / totalSpend).toFixed(1)}× ROAS` : undefined}
        />
      </div>

      {eligibility && !eligibility.allowed && (
        <Alert tone="warning" title="You can't start a campaign yet">
          {eligibility.reason}
          <Link
            href="/dashboard/merchant/subscription"
            className="mt-2 inline-block font-medium underline"
          >
            Compare plans
          </Link>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">
          Your campaigns
          {eligibility && eligibility.limit !== -1 && (
            <span className="ml-2 text-xs font-normal text-muted">
              {eligibility.used} of {eligibility.limit} live
            </span>
          )}
        </h2>
        <Button
          size="sm"
          leftIcon={<Plus className="size-4" />}
          disabled={!eligibility?.allowed}
          onClick={() => setCreating(true)}
        >
          New campaign
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Promote a listing on the homepage, in search results or on a destination page."
          action={
            <Button size="sm" disabled={!eligibility?.allowed} onClick={() => setCreating(true)}>
              Create your first campaign
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((campaign) => (
            <li
              key={campaign.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-line bg-surface p-4 shadow-card"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Megaphone className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  <p className="truncate text-sm font-semibold text-ink">{campaign.name}</p>
                  <StatusBadge tone={CAMPAIGN_TONES[campaign.status]}>
                    {CAMPAIGN_STATUS_LABELS[campaign.status]}
                  </StatusBadge>
                  <Badge variant="neutral">{campaign.reference}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {PLACEMENT_LABELS[campaign.placement]} ·{" "}
                  {PRICING_MODEL_LABELS[campaign.pricingModel]} · {formatDate(campaign.startAt)} →{" "}
                  {formatDate(campaign.endAt)}
                </p>
                {campaign.reviewNote && (
                  <p className="mt-2 text-xs font-medium text-danger">{campaign.reviewNote}</p>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label="Spend" value={formatCurrency(campaign.performance.spend, "USD")} />
                  <Metric
                    label="Budget used"
                    value={`${Math.round(campaign.performance.budgetUsed)}%`}
                  />
                  <Metric label="Clicks" value={formatNumber(campaign.metrics.clicks)} />
                  <Metric
                    label="Attributed"
                    value={formatCurrency(campaign.metrics.attributedValue, "USD")}
                  />
                </dl>
                <p className="mt-2 text-xs text-muted">{campaign.performance.explanation}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(campaign.status === "active" || campaign.status === "scheduled") && (
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Pause className="size-4" />}
                    loading={setRunning.isPending}
                    onClick={() =>
                      void setRunning
                        .mutateAsync({ campaignId: campaign.id, running: false })
                        .then(() => toast.success("Campaign paused"))
                        .catch((e) => toast.error("Couldn't pause", { description: getErrorMessage(e) }))
                    }
                  >
                    Pause
                  </Button>
                )}
                {campaign.status === "paused" && (
                  <Button
                    size="sm"
                    leftIcon={<Play className="size-4" />}
                    loading={setRunning.isPending}
                    onClick={() =>
                      void setRunning
                        .mutateAsync({ campaignId: campaign.id, running: true })
                        .then(() => toast.success("Campaign resumed"))
                        .catch((e) => toast.error("Couldn't resume", { description: getErrorMessage(e) }))
                    }
                  >
                    Resume
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={creating} onClose={() => setCreating(false)} size="lg" title="New campaign">
        {creating && <CampaignForm merchant={merchant} onDone={() => setCreating(false)} />}
      </Drawer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}

const campaignSchema = z
  .object({
    name: z.string().trim().min(3, "Give the campaign a name."),
    placement: z.string().min(1, "Choose a placement."),
    pricingModel: z.enum(["cpc", "cpm", "flat", "cpa"]),
    budget: z.coerce.number().positive("Enter a budget."),
    startAt: z.string().min(1, "Choose a start date."),
    endAt: z.string().min(1, "Choose an end date."),
    creativeHeadline: z.string().trim().min(4, "Write a headline."),
    creativeBody: z.string().trim().min(10, "Write a short body line."),
    landingSlug: z.string().trim().optional(),
  })
  .refine((v) => new Date(v.endAt) > new Date(v.startAt), {
    message: "The campaign has to end after it starts.",
    path: ["endAt"],
  })
  .refine((v) => v.budget >= AD_RATE_CARD[v.pricingModel].minimumBudget, {
    message: "This pricing model has a higher minimum budget.",
    path: ["budget"],
  });

type CampaignValues = z.infer<typeof campaignSchema>;

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

function CampaignForm({ merchant, onDone }: { merchant: Merchant; onDone: () => void }) {
  const actor = useDomainActor();
  const scope = useDomainScope();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const create = useMutation<AdCampaign, CampaignValues>({
    mutationFn: (values) =>
      merchantAdvertisingService.create(
        merchant.id,
        {
          name: values.name,
          placement: values.placement as (typeof MERCHANT_PLACEMENTS)[number],
          pricingModel: values.pricingModel,
          budget: values.budget,
          startAt: new Date(values.startAt).toISOString(),
          endAt: new Date(values.endAt).toISOString(),
          creativeHeadline: values.creativeHeadline,
          creativeBody: values.creativeBody,
          landingSlug: values.landingSlug || undefined,
        },
        actor,
        scope,
      ),
    invalidateKeys: [adKeys.all],
  });

  const form = useZodForm(campaignSchema, {
    defaultValues: {
      name: "",
      placement: MERCHANT_PLACEMENTS[0],
      pricingModel: "cpc" as AdPricingModel,
      budget: AD_RATE_CARD.cpc.minimumBudget,
      startAt: today(),
      endAt: inDays(30),
      creativeHeadline: "",
      creativeBody: "",
      landingSlug: "",
    },
  });

  const pricingModel = (form.watch("pricingModel") ?? "cpc") as AdPricingModel;
  const budget = Number(form.watch("budget")) || 0;
  const card = AD_RATE_CARD[pricingModel];
  const estimate = estimateSpend(pricingModel, budget);

  const onSubmit = form.handleSubmit(async (values: CampaignValues) => {
    setSubmitError(null);
    try {
      await create.mutateAsync(values);
      toast.success("Campaign submitted", { description: "The platform reviews it before it runs." });
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="px-1">
      {submitError && (
        <Alert tone="danger" title="Couldn't create the campaign" className="mb-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Campaign" description="Where it runs and how you pay for it.">
        <FormGrid cols={2}>
          <Input label="Name" required {...form.register("name")} error={form.formState.errors.name?.message} />
          <Select
            label="Placement"
            options={MERCHANT_PLACEMENTS.map((p) => ({ value: p, label: PLACEMENT_LABELS[p] }))}
            {...form.register("placement")}
            error={form.formState.errors.placement?.message}
          />
          <Select
            label="Pricing model"
            options={(["cpc", "cpm", "flat", "cpa"] as AdPricingModel[]).map((m) => ({
              value: m,
              label: PRICING_MODEL_LABELS[m],
            }))}
            {...form.register("pricingModel")}
            error={form.formState.errors.pricingModel?.message}
          />
          <Input
            label="Budget (USD)"
            type="number"
            min={card.minimumBudget}
            step={10}
            required
            {...form.register("budget")}
            error={form.formState.errors.budget?.message}
            hint={`Minimum ${formatCurrency(card.minimumBudget, "USD")}.`}
          />
          <Input
            label="Starts"
            type="date"
            required
            {...form.register("startAt")}
            error={form.formState.errors.startAt?.message}
          />
          <Input
            label="Ends"
            type="date"
            required
            {...form.register("endAt")}
            error={form.formState.errors.endAt?.message}
          />
        </FormGrid>

        <div className="mt-4 rounded-field border border-line bg-surface-muted p-4">
          <p className="text-xs font-semibold text-ink">Estimated delivery</p>
          <p className="mt-1 text-sm text-body">
            {estimate.explanation} ={" "}
            <strong className="font-semibold text-ink">
              {formatNumber(estimate.units)} {estimate.unitLabel}
            </strong>
          </p>
          {estimate.estimatedImpressions > 0 && (
            <p className="mt-1 text-xs text-muted">
              Roughly {formatNumber(estimate.estimatedImpressions)} impressions and{" "}
              {formatNumber(estimate.estimatedClicks)} clicks, assuming a{" "}
              {(ASSUMED_CTR * 100).toFixed(1)}% click-through rate. This is arithmetic on the rate
              card, not a forecast.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">{card.description}</p>
        </div>
      </FormSection>

      <FormSection title="Creative" description="What travellers see in the placement.">
        <FormGrid cols={1}>
          <Input
            label="Headline"
            required
            {...form.register("creativeHeadline")}
            error={form.formState.errors.creativeHeadline?.message}
          />
          <Textarea
            label="Body"
            rows={3}
            required
            {...form.register("creativeBody")}
            error={form.formState.errors.creativeBody?.message}
          />
          <Input
            label="Links to (listing slug)"
            placeholder="azure-bay-boutique-hotel"
            {...form.register("landingSlug")}
            error={form.formState.errors.landingSlug?.message}
            hint="Optional — where a click lands."
          />
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={create.isPending}>
          Submit for review
        </Button>
      </FormActions>
    </form>
  );
}
