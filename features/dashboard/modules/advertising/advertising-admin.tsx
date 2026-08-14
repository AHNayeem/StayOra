"use client";

import { useState } from "react";
import { CircleCheck, CirclePause, CirclePlay, Download, Plus, Receipt, X } from "lucide-react";
import { ResourceListView, RowActions } from "../../crud";
import {
  Alert,
  Button,
  CHART_COLORS,
  CategoryBarChart,
  ChartCard,
  DonutChart,
  DropdownItem,
  Input,
  Modal,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { toast } from "@/lib/toast";
import { exportToCsv } from "../../lib/export-csv";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "../../lib/format";
import {
  AD_PLACEMENTS,
  CAMPAIGN_STATUS_LABELS,
  PLACEMENT_LABELS,
  PRICING_MODEL_LABELS,
  campaignPerformance,
  spendExplanation,
  type AdCampaign,
  type AdCampaignInput,
  type AdPlacement,
  type AdPricingModel,
} from "../../domain/advertising";
import { DESTINATION_OPTIONS } from "../../domain/seed";
import { PRODUCT_KIND_LABELS } from "../bookings/types";
import type { ProductKind } from "../../domain/types";
import {
  useAdvertisers,
  useAdvertisingSummary,
  useBillCampaign,
  useCampaigns,
  useCreateCampaign,
  useSetCampaignStatus,
} from "./hooks";

/**
 * Advertising administration.
 *
 * The workflow a demo needs: a merchant's campaign arrives for review, an
 * operator approves it, it starts serving into a real storefront placement,
 * delivery accumulates, and the unbilled spend is recognised as platform
 * revenue when it is billed. Spend is always derived from the campaign's own
 * metrics by its pricing model, so it can never disagree with what was served.
 */
export function AdvertisingAdmin() {
  const summary = useAdvertisingSummary();
  const advertisers = useAdvertisers();
  const setStatus = useSetCampaignStatus();
  const bill = useBillCampaign();
  const create = useCreateCampaign();
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<AdCampaign | null>(null);

  const list = useCampaigns((row) => (
    <RowActions
      label={`Actions for ${row.name}`}
      onView={() => setDetail(row)}
      viewPermission={["promotions:read"]}
      extra={
        <Can anyPermission={["promotions:update", "promotions:approve"]}>
          {row.status === "pending_review" && (
            <>
              <DropdownItem
                icon={<CircleCheck />}
                onSelect={async () => {
                  await setStatus.mutateAsync({ id: row.id, status: "active" });
                  toast.success(`${row.name} approved and serving`);
                }}
              >
                Approve
              </DropdownItem>
              <DropdownItem
                icon={<X />}
                danger
                onSelect={async () => {
                  await setStatus.mutateAsync({ id: row.id, status: "rejected" });
                  toast.success(`${row.name} rejected`);
                }}
              >
                Reject
              </DropdownItem>
            </>
          )}
          {row.status === "active" && (
            <DropdownItem
              icon={<CirclePause />}
              onSelect={async () => {
                await setStatus.mutateAsync({ id: row.id, status: "paused" });
                toast.success(`${row.name} paused`);
              }}
            >
              Pause
            </DropdownItem>
          )}
          {(row.status === "paused" || row.status === "scheduled") && (
            <DropdownItem
              icon={<CirclePlay />}
              onSelect={async () => {
                await setStatus.mutateAsync({ id: row.id, status: "active" });
                toast.success(`${row.name} is serving`);
              }}
            >
              Resume
            </DropdownItem>
          )}
          {campaignPerformance(row).unbilled > 0 && (
            <DropdownItem
              icon={<Receipt />}
              onSelect={async () => {
                const result = await bill.mutateAsync(row.id);
                toast.success(
                  `Billed ${formatCurrency(result?.amount ?? 0, row.currency)} — recognised as advertising revenue`,
                );
              }}
            >
              Bill unbilled spend
            </DropdownItem>
          )}
        </Can>
      }
    />
  ));

  const s = summary.data;
  const currency = s?.currency ?? "USD";

  const handleExport = () => {
    exportToCsv<AdCampaign>("ad-campaigns", list.rows, [
      { header: "Reference", value: (r) => r.reference },
      { header: "Campaign", value: (r) => r.name },
      { header: "Advertiser", value: (r) => r.advertiserName },
      { header: "Placement", value: (r) => PLACEMENT_LABELS[r.placement] },
      { header: "Pricing model", value: (r) => r.pricingModel.toUpperCase() },
      { header: "Rate", value: (r) => r.rate.toFixed(2) },
      { header: "Budget", value: (r) => r.budget.toFixed(2) },
      { header: "Spend", value: (r) => campaignPerformance(r).spend.toFixed(2) },
      { header: "Billed", value: (r) => r.billed.toFixed(2) },
      { header: "Impressions", value: (r) => r.metrics.impressions },
      { header: "Clicks", value: (r) => r.metrics.clicks },
      { header: "Conversions", value: (r) => r.metrics.conversions },
      { header: "Attributed value", value: (r) => r.metrics.attributedValue.toFixed(2) },
      { header: "Start", value: (r) => formatDate(r.startAt) },
      { header: "End", value: (r) => formatDate(r.endAt) },
      { header: "Status", value: (r) => CAMPAIGN_STATUS_LABELS[r.status] },
    ]);
    toast.success(`Exported ${list.rows.length} campaigns`);
  };

  return (
    <div className="flex flex-col gap-5">
      {(s?.pendingReview ?? 0) > 0 && (
        <Alert tone="warning" title={`${s!.pendingReview} campaign(s) awaiting review`}>
          A campaign only serves once it is approved. Sponsored placements are always
          labelled as such in the storefront.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Advertising revenue"
          icon="Megaphone"
          value={s ? formatCurrency(s.billed, currency) : "—"}
          hint={s ? `${formatCurrency(s.unbilled, currency)} unbilled` : undefined}
        />
        <StatCard
          label="Campaign spend"
          icon="Coins"
          value={s ? formatCurrency(s.spend, currency) : "—"}
          hint={s ? `of ${formatCurrency(s.budget, currency)} committed` : undefined}
        />
        <StatCard
          label="Delivery"
          icon="Target"
          value={s ? formatNumber(s.impressions) : "—"}
          hint={s ? `${formatNumber(s.clicks)} clicks · ${formatNumber(s.conversions)} bookings` : undefined}
        />
        <StatCard
          label="Attributed bookings"
          icon="TrendingUp"
          value={s ? formatCurrency(s.attributedValue, currency) : "—"}
          hint={
            s && s.spend > 0
              ? `${(s.attributedValue / s.spend).toFixed(1)}× return on ad spend`
              : undefined
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Spend by placement"
          description="Where advertisers put their budget"
          loading={summary.isLoading}
          empty={summary.isSuccess && !s?.byPlacement.length}
        >
          <CategoryBarChart
            data={(s?.byPlacement ?? []).map((r) => ({ name: r.label, value: r.value }))}
            xKey="name"
            valueKey="value"
            label="Spend"
            horizontal
            height={280}
            valueFormatter={(v) => formatCurrency(v, currency)}
          />
        </ChartCard>
        <ChartCard
          title="By pricing model"
          description="CPC / CPM / flat / CPA"
          loading={summary.isLoading}
          empty={summary.isSuccess && !s?.byModel.length}
        >
          <DonutChart
            data={(s?.byModel ?? []).map((r, i) => ({
              name: r.key.toUpperCase(),
              value: r.value,
              color: [
                CHART_COLORS.primary,
                CHART_COLORS.accent,
                CHART_COLORS.violet,
                CHART_COLORS.teal,
              ][i % 4],
            }))}
            height={260}
            valueFormatter={(v) => formatCurrency(v, currency)}
            centerLabel="Total spend"
            centerValue={s ? formatCurrency(s.spend, currency) : undefined}
          />
        </ChartCard>
      </div>

      <ResourceListView<AdCampaign>
        list={list}
        searchPlaceholder="Search campaign or advertiser…"
        selectable={false}
        caption="Advertising campaigns"
        onRowClick={(row) => setDetail(row)}
        filterControls={
          <>
            <Select
              aria-label="Filter by status"
              value={list.filters.status ?? ""}
              onChange={(e) => list.setFilter("status", e.target.value)}
              options={[
                { value: "", label: "All statuses" },
                ...Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
              wrapperClassName="w-44"
            />
            <Select
              aria-label="Filter by placement"
              value={list.filters.placement ?? ""}
              onChange={(e) => list.setFilter("placement", e.target.value)}
              options={[
                { value: "", label: "All placements" },
                ...AD_PLACEMENTS.map((p) => ({ value: p, label: PLACEMENT_LABELS[p] })),
              ]}
              wrapperClassName="w-56"
            />
          </>
        }
        primaryAction={
          <div className="flex gap-2">
            <Can anyPermission={["finance:export", "promotions:read"]}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Download className="size-4" />}
                onClick={handleExport}
                disabled={list.rows.length === 0}
              >
                Export CSV
              </Button>
            </Can>
            <Can anyPermission={["promotions:create"]}>
              <Button
                size="sm"
                leftIcon={<Plus className="size-4" />}
                onClick={() => setCreating(true)}
              >
                New campaign
              </Button>
            </Can>
          </div>
        }
      />

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail?.name}
        description={detail ? `${detail.advertiserName} · ${detail.reference}` : undefined}
      >
        {detail && <CampaignDetail campaign={detail} />}
      </Modal>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        size="lg"
        title="New campaign"
        description="Campaigns start in review; nothing serves until it is approved."
      >
        <CampaignForm
          advertisers={(advertisers.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
          pending={create.status === "pending"}
          onSubmit={async (values) => {
            await create.mutateAsync(values);
            toast.success("Campaign created and sent for review");
            setCreating(false);
          }}
        />
      </Modal>
    </div>
  );
}

function CampaignDetail({ campaign }: { campaign: AdCampaign }) {
  const perf = campaignPerformance(campaign);
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-line p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Creative</p>
        <p className="mt-2 text-sm font-semibold text-ink">{campaign.creativeHeadline}</p>
        <p className="text-sm text-body">{campaign.creativeBody}</p>
        <p className="mt-2 text-xs text-muted">
          Rendered in {PLACEMENT_LABELS[campaign.placement]}, always labelled
          &ldquo;Sponsored&rdquo;.
        </p>
      </div>

      <Panel flush>
        <PanelHeader title="Performance" description={perf.explanation} />
        <PanelBody>
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            <Metric label="Impressions" value={formatNumber(campaign.metrics.impressions)} />
            <Metric label="Clicks" value={formatNumber(campaign.metrics.clicks)} />
            <Metric label="Click-through rate" value={formatPercent(perf.ctr)} />
            <Metric label="Conversion rate" value={formatPercent(perf.cvr)} />
            <Metric label="Attributed bookings" value={formatNumber(campaign.metrics.conversions)} />
            <Metric
              label="Attributed value"
              value={formatCurrency(campaign.metrics.attributedValue, campaign.currency)}
            />
            <Metric label="Effective CPC" value={formatCurrency(perf.cpc, campaign.currency)} />
            <Metric label="Effective CPA" value={formatCurrency(perf.cpa, campaign.currency)} />
            <Metric label="Return on ad spend" value={`${perf.roas.toFixed(1)}×`} />
            <Metric
              label="Budget used"
              value={`${perf.budgetUsed.toFixed(0)}% of ${formatCurrency(campaign.budget, campaign.currency)}`}
            />
          </dl>
        </PanelBody>
      </Panel>

      <Panel flush>
        <PanelHeader title="Billing" description={PRICING_MODEL_LABELS[campaign.pricingModel]} />
        <PanelBody>
          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            <Metric label="Spend" value={formatCurrency(perf.spend, campaign.currency)} />
            <Metric label="Billed" value={formatCurrency(campaign.billed, campaign.currency)} />
            <Metric
              label="Unbilled"
              value={formatCurrency(perf.unbilled, campaign.currency)}
            />
            <Metric label="Calculation" value={spendExplanation(campaign)} />
          </dl>
          <p className="mt-3 text-xs text-muted">
            Only billed spend is recognised as platform revenue. Unbilled spend is
            pipeline.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line pb-1.5">
      <dt className="text-sm text-body">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

const TODAY = new Date().toISOString().slice(0, 10);

function CampaignForm({
  advertisers,
  pending,
  onSubmit,
}: {
  advertisers: { value: string; label: string }[];
  pending: boolean;
  onSubmit: (values: AdCampaignInput) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [advertiserId, setAdvertiserId] = useState(advertisers[0]?.value ?? "");
  const [placement, setPlacement] = useState<AdPlacement>("search_sponsored");
  const [pricingModel, setPricingModel] = useState<AdPricingModel>("cpc");
  const [rate, setRate] = useState("1.20");
  const [budget, setBudget] = useState("1000");
  const [startAt, setStartAt] = useState(TODAY);
  const [endAt, setEndAt] = useState(TODAY);
  const [vertical, setVertical] = useState<ProductKind | "">("");
  const [destination, setDestination] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");

  const valid =
    name.trim().length > 2 && advertiserId && headline.trim().length > 2 && Number(budget) > 0;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        void onSubmit({
          name: name.trim(),
          advertiserId,
          placement,
          pricingModel,
          rate: Number(rate) || 0,
          budget: Number(budget) || 0,
          currency: "USD",
          startAt: new Date(`${startAt}T00:00:00.000Z`).toISOString(),
          endAt: new Date(`${endAt}T23:59:59.999Z`).toISOString(),
          status: "pending_review",
          targetVerticals: vertical ? [vertical] : [],
          targetDestinations: destination ? [destination] : [],
          creativeHeadline: headline.trim(),
          creativeBody: body.trim(),
          priority: 50,
        });
      }}
    >
      <Input label="Campaign name" required value={name} onChange={(e) => setName(e.target.value)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Advertiser"
          value={advertiserId}
          onChange={(e) => setAdvertiserId(e.target.value)}
          options={advertisers}
        />
        <Select
          label="Placement"
          value={placement}
          onChange={(e) => setPlacement(e.target.value as AdPlacement)}
          options={AD_PLACEMENTS.map((p) => ({ value: p, label: PLACEMENT_LABELS[p] }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Pricing model"
          value={pricingModel}
          onChange={(e) => setPricingModel(e.target.value as AdPricingModel)}
          options={Object.entries(PRICING_MODEL_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <Input
          label={pricingModel === "cpa" ? "Commission (%)" : "Rate (USD)"}
          type="number"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <Input
          label="Budget (USD)"
          type="number"
          step="1"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          hint="Spend never exceeds this"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Starts" type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        <Input label="Ends" type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Target vertical"
          value={vertical}
          onChange={(e) => setVertical(e.target.value as ProductKind | "")}
          options={[
            { value: "", label: "All verticals" },
            ...Object.entries(PRODUCT_KIND_LABELS).map(([value, label]) => ({
              value,
              label: String(label),
            })),
          ]}
        />
        <Select
          label="Target destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          options={[
            { value: "", label: "All destinations" },
            ...DESTINATION_OPTIONS.map((d) => ({ value: d, label: d })),
          ]}
        />
      </div>

      <Input
        label="Creative headline"
        required
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
      />
      <Input label="Creative body" value={body} onChange={(e) => setBody(e.target.value)} />

      <div className="flex justify-end">
        <Button type="submit" disabled={!valid || pending} loading={pending}>
          Create campaign
        </Button>
      </div>
    </form>
  );
}
