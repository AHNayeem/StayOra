/**
 * Merchant self-serve advertising.
 *
 * The advertising engine (advertisers, campaigns, placements, spend, billing)
 * already existed for the admin side; this is the merchant's shop window onto
 * it. Nothing about how spend or revenue is calculated is duplicated here — it
 * all still runs through `advertising.ts`.
 *
 * **Mock billing only.** No charge is attempted; spend becomes platform revenue
 * through the same `advertisingService.bill` path the admin screen uses.
 */

import {
  AD_PLACEMENTS,
  LIVE_PLACEMENTS,
  adService,
  campaignPerformance,
  type AdCampaign,
  type AdPlacement,
  type AdPricingModel,
  type Advertiser,
  type CampaignPerformance,
} from "./advertising";
import { planFor, withinLimit, type Merchant } from "./merchants";
import { money } from "./money";
import {
  SCOPE_NONE,
  SYSTEM_ACTOR,
  delay,
  forbidden,
  invalid,
  notFound,
  notify,
  recordAudit,
  type DomainScope,
} from "./service-kit";
import { getState, mutate } from "./store";
import type { DomainActor, ProductKind } from "./types";

/** Placements a merchant may buy directly. Admin-only surfaces are excluded. */
export const MERCHANT_PLACEMENTS: readonly AdPlacement[] = AD_PLACEMENTS.filter(
  (p) => LIVE_PLACEMENTS.includes(p) || p === "category_featured",
);

/**
 * The rate card. Fixed, published rates rather than an auction — a prototype
 * that simulated bidding would be inventing a market that does not exist.
 */
export const AD_RATE_CARD: Record<
  AdPricingModel,
  { rate: number; unit: string; minimumBudget: number; description: string }
> = {
  cpc: {
    rate: 0.85,
    unit: "per click",
    minimumBudget: 100,
    description: "Pay only when a traveller clicks through to your listing.",
  },
  cpm: {
    rate: 6.5,
    unit: "per 1,000 impressions",
    minimumBudget: 150,
    description: "Buy reach across search and category pages.",
  },
  flat: {
    rate: 450,
    unit: "flat fee",
    minimumBudget: 450,
    description: "A fixed featured placement for the whole campaign window.",
  },
  cpa: {
    rate: 6,
    unit: "% of attributed bookings",
    minimumBudget: 200,
    description: "Pay a share of the booking value your campaign brings in.",
  },
};

export interface SpendEstimate {
  pricingModel: AdPricingModel;
  rate: number;
  budget: number;
  /** Units the budget buys — clicks, thousands of impressions, or bookings. */
  units: number;
  unitLabel: string;
  /** What the merchant is told they might get. Rough, and labelled as such. */
  estimatedImpressions: number;
  estimatedClicks: number;
  explanation: string;
}

/**
 * What a budget buys, at published rates.
 *
 * Deliberately arithmetic, not a forecast: it divides the budget by the rate
 * card and applies one stated click-through assumption. No modelling is implied.
 */
export const ASSUMED_CTR = 0.02;

export function estimateSpend(
  pricingModel: AdPricingModel,
  budget: number,
  rate = AD_RATE_CARD[pricingModel].rate,
): SpendEstimate {
  const safeBudget = Math.max(0, budget);
  switch (pricingModel) {
    case "cpc": {
      const clicks = rate > 0 ? Math.floor(safeBudget / rate) : 0;
      return {
        pricingModel,
        rate,
        budget: safeBudget,
        units: clicks,
        unitLabel: "clicks",
        estimatedClicks: clicks,
        estimatedImpressions: Math.round(clicks / ASSUMED_CTR),
        explanation: `$${safeBudget} ÷ $${rate.toFixed(2)} per click`,
      };
    }
    case "cpm": {
      const thousands = rate > 0 ? safeBudget / rate : 0;
      const impressions = Math.round(thousands * 1000);
      return {
        pricingModel,
        rate,
        budget: safeBudget,
        units: Math.round(thousands),
        unitLabel: "× 1,000 impressions",
        estimatedImpressions: impressions,
        estimatedClicks: Math.round(impressions * ASSUMED_CTR),
        explanation: `$${safeBudget} ÷ $${rate.toFixed(2)} per 1,000 impressions`,
      };
    }
    case "cpa": {
      const attributed = rate > 0 ? money(safeBudget / (rate / 100)) : 0;
      return {
        pricingModel,
        rate,
        budget: safeBudget,
        units: attributed,
        unitLabel: "of attributed booking value",
        estimatedImpressions: 0,
        estimatedClicks: 0,
        explanation: `$${safeBudget} buys ${rate}% of $${attributed.toLocaleString()} in bookings`,
      };
    }
    default:
      return {
        pricingModel,
        rate,
        budget: safeBudget,
        units: 1,
        unitLabel: "placement",
        estimatedImpressions: 0,
        estimatedClicks: 0,
        explanation: `Flat fee of $${rate.toFixed(2)} for the campaign window`,
      };
  }
}

export interface MerchantCampaignInput {
  name: string;
  placement: AdPlacement;
  pricingModel: AdPricingModel;
  budget: number;
  startAt: string;
  endAt: string;
  creativeHeadline: string;
  creativeBody: string;
  /** Listing the placement links to. */
  landingSlug?: string;
  landingVertical?: ProductKind;
  targetDestinations?: string[];
}

/** The advertiser record for a merchant, created on first use. */
export function advertiserForMerchant(merchant: Merchant): Advertiser {
  const existing = getState().advertisers.find((a) => a.merchantId === merchant.id);
  if (existing) return existing;
  return adService.createAdvertiser({
    name: merchant.name,
    type: "merchant",
    merchantId: merchant.id,
    contactName: merchant.contactName,
    contactEmail: merchant.email,
    status: "active",
  });
}

/** Campaigns belonging to one merchant. */
export function campaignsForMerchant(merchantId: string): AdCampaign[] {
  const advertiser = getState().advertisers.find((a) => a.merchantId === merchantId);
  if (!advertiser) return [];
  return getState().adCampaigns.filter((c) => c.advertiserId === advertiser.id);
}

/** Campaigns that count against the plan's live-campaign ceiling. */
const LIVE_STATUSES = ["pending_review", "scheduled", "active", "paused"] as const;

export const merchantAdvertisingService = {
  async list(merchantId: string): Promise<(AdCampaign & { performance: CampaignPerformance })[]> {
    const rows = campaignsForMerchant(merchantId).map((c) => ({
      ...c,
      performance: campaignPerformance(c),
    }));
    return delay(rows, 120);
  },

  /** What the merchant may buy, given their plan. */
  eligibility(merchant: Merchant): { allowed: boolean; reason?: string; used: number; limit: number } {
    const plan = planFor(merchant);
    const limit = plan.limits.activeCampaigns;
    const used = campaignsForMerchant(merchant.id).filter((c) =>
      (LIVE_STATUSES as readonly string[]).includes(c.status),
    ).length;

    if (merchant.status !== "approved") {
      return { allowed: false, reason: "Your merchant account has to be approved first.", used, limit };
    }
    if (!plan.unlocks.includes("self_serve_advertising")) {
      return {
        allowed: false,
        reason: `Advertising is available on Professional and Premium. You're on ${plan.name}.`,
        used,
        limit,
      };
    }
    if (!withinLimit(limit, used)) {
      return {
        allowed: false,
        reason: `Your ${plan.name} plan allows ${limit} live campaigns. Pause or complete one first.`,
        used,
        limit,
      };
    }
    return { allowed: true, used, limit };
  },

  /**
   * Submit a campaign for platform review.
   *
   * A merchant can never self-approve: campaigns land in `pending_review` and
   * the platform decides, exactly as the admin advertising screen expects.
   */
  async create(
    merchantId: string,
    input: MerchantCampaignInput,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<AdCampaign> {
    if (scope.merchantId && scope.merchantId !== merchantId) {
      forbidden("You can only run campaigns for your own account.");
    }
    const merchant = getState().merchants.find((m) => m.id === merchantId) ?? notFound("Merchant");
    const check = merchantAdvertisingService.eligibility(merchant);
    if (!check.allowed) forbidden(check.reason!);

    const card = AD_RATE_CARD[input.pricingModel];
    if (!input.name.trim()) invalid("Give the campaign a name.");
    if (input.budget < card.minimumBudget) {
      invalid(`The minimum budget for this pricing model is $${card.minimumBudget}.`);
    }
    if (new Date(input.endAt) <= new Date(input.startAt)) {
      invalid("The campaign has to end after it starts.");
    }
    if (!input.creativeHeadline.trim()) invalid("Write a headline for the placement.");

    const advertiser = advertiserForMerchant(merchant);
    const campaign = adService.create({
      name: input.name.trim(),
      advertiserId: advertiser.id,
      placement: input.placement,
      pricingModel: input.pricingModel,
      rate: card.rate,
      budget: input.budget,
      currency: "USD",
      startAt: input.startAt,
      endAt: input.endAt,
      status: "pending_review",
      targetVerticals: merchant.verticals,
      targetDestinations: input.targetDestinations ?? [],
      landingSlug: input.landingSlug,
      landingVertical: input.landingVertical,
      creativeHeadline: input.creativeHeadline.trim(),
      creativeBody: input.creativeBody.trim(),
      priority: 5,
    });

    recordAudit({
      actor,
      action: "create",
      entity: "ad_campaign",
      entityId: campaign.id,
      entityLabel: campaign.name,
      summary: `${merchant.name} submitted campaign ${campaign.name} — ${input.pricingModel.toUpperCase()}, budget $${input.budget}`,
      to: "pending_review",
    });
    notify({
      category: "advertising",
      audience: ["admin"],
      title: "Campaign awaiting review",
      body: `${merchant.name} submitted "${campaign.name}" with a $${input.budget} budget.`,
      href: "/dashboard/advertising",
      tone: "neutral",
    });
    return delay(campaign);
  },

  /** Merchant-side pause/resume. Anything else is the platform's call. */
  async setRunning(
    merchantId: string,
    campaignId: string,
    running: boolean,
    actor: DomainActor = SYSTEM_ACTOR,
    scope: DomainScope = SCOPE_NONE,
  ): Promise<AdCampaign> {
    if (scope.merchantId && scope.merchantId !== merchantId) {
      forbidden("You can only manage your own campaigns.");
    }
    const owned = campaignsForMerchant(merchantId).some((c) => c.id === campaignId);
    if (!owned) notFound("Campaign");

    const campaign = mutate((draft) => {
      const row = draft.adCampaigns.find((c) => c.id === campaignId)!;
      if (running && row.status !== "paused") {
        forbidden("Only a paused campaign can be resumed.");
      }
      if (!running && row.status !== "active" && row.status !== "scheduled") {
        forbidden("Only a running campaign can be paused.");
      }
      row.status = running ? "active" : "paused";
      row.updatedAt = new Date().toISOString();
      return structuredClone(row);
    });

    recordAudit({
      actor,
      action: "status_change",
      entity: "ad_campaign",
      entityId: campaignId,
      entityLabel: campaign.name,
      summary: `${campaign.name} ${running ? "resumed" : "paused"} by the merchant`,
      to: campaign.status,
    });
    return delay(campaign, 160);
  },
};
