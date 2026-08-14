/**
 * Advertising — merchant promotion, sponsored placements and the revenue they
 * generate.
 *
 * This is not an ad network. There is no auction, no bidding, no targeting
 * graph and no real-time serving; a campaign's eligibility for a placement is a
 * plain predicate, and delivery is "the highest-priority eligible campaign with
 * budget left". What *is* modelled properly is the commercial side, because
 * that is what the business needs to be able to reason about:
 *
 *   advertiser → campaign → placement → budget → pricing model → spend → revenue
 *
 * Spend is derived from the campaign's own metrics by its pricing model, so it
 * can never disagree with what was delivered. Revenue is only recognised when a
 * campaign is *billed*, which is what writes an entry to the revenue ledger —
 * unbilled spend is shown separately as pipeline.
 */

import { money } from "./money";
import { getState, mutate, nextId, nextReference } from "./store";
import type { ProductKind } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdvertiserType =
  | "merchant"
  | "hotel"
  | "resort"
  | "restaurant"
  | "tour_operator"
  | "transport"
  | "insurance"
  | "travel_brand";

export interface Advertiser {
  id: string;
  name: string;
  type: AdvertiserType;
  /** Set when the advertiser is also a platform merchant. */
  merchantId?: string;
  contactName: string;
  contactEmail: string;
  status: "active" | "paused";
  createdAt: string;
}

/** Where a campaign can run. Each maps to a real surface in the storefront. */
export const AD_PLACEMENTS = [
  "homepage_featured",
  "search_sponsored",
  "category_featured",
  "destination_promo",
  "banner",
  "campaign_card",
  "email_push",
  "sponsored_deal",
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  homepage_featured: "Homepage featured listing",
  search_sponsored: "Sponsored search result",
  category_featured: "Category featured placement",
  destination_promo: "Destination page promotion",
  banner: "Banner",
  campaign_card: "Campaign card",
  email_push: "Email / push placement",
  sponsored_deal: "Sponsored deal",
};

/** Placements that render inside the customer storefront today. */
export const LIVE_PLACEMENTS: readonly AdPlacement[] = [
  "homepage_featured",
  "search_sponsored",
  "destination_promo",
  "sponsored_deal",
];

export type AdPricingModel = "cpc" | "cpm" | "flat" | "cpa";

export const PRICING_MODEL_LABELS: Record<AdPricingModel, string> = {
  cpc: "CPC — cost per click",
  cpm: "CPM — cost per 1,000 impressions",
  flat: "Featured placement — flat fee",
  cpa: "CPA — commission on attributed bookings",
};

export type CampaignStatus =
  | "draft"
  | "pending_review"
  | "scheduled"
  | "active"
  | "paused"
  | "completed"
  | "rejected";

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  scheduled: "Scheduled",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  rejected: "Rejected",
};

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  /** Bookings attributed to the campaign. */
  conversions: number;
  /** Booking value attributed to the campaign — the CPA base. */
  attributedValue: number;
}

export interface AdCampaign {
  id: string;
  reference: string;
  name: string;
  advertiserId: string;
  advertiserName: string;
  placement: AdPlacement;
  pricingModel: AdPricingModel;
  /**
   * The rate: USD per click (`cpc`), per 1,000 impressions (`cpm`), the whole
   * fee (`flat`), or a percentage of attributed booking value (`cpa`).
   */
  rate: number;
  /** Total the advertiser has committed. Spend never exceeds it. */
  budget: number;
  currency: string;
  startAt: string;
  endAt: string;
  status: CampaignStatus;
  /** Verticals the campaign may serve against; empty = all. */
  targetVerticals: ProductKind[];
  /** Destinations the campaign may serve against; empty = all. */
  targetDestinations: string[];
  /** Listing/merchant the placement links to. */
  landingSlug?: string;
  landingVertical?: ProductKind;
  creativeHeadline: string;
  creativeBody: string;
  creativeImage?: string;
  metrics: CampaignMetrics;
  /** Spend already recognised as revenue. */
  billed: number;
  /** Higher wins when several campaigns are eligible for a placement. */
  priority: number;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewNote?: string;
}

// ---------------------------------------------------------------------------
// Spend
// ---------------------------------------------------------------------------

/**
 * What a campaign has spent, from its own metrics. Always capped at budget —
 * a prototype that let spend run past the committed budget would be lying
 * about the one control an advertiser actually has.
 */
export function campaignSpend(campaign: AdCampaign): number {
  const { metrics: m, rate } = campaign;
  let raw: number;
  switch (campaign.pricingModel) {
    case "cpc":
      raw = m.clicks * rate;
      break;
    case "cpm":
      raw = (m.impressions / 1_000) * rate;
      break;
    case "cpa":
      raw = m.attributedValue * (rate / 100);
      break;
    default:
      // A flat placement is charged in full once it starts delivering.
      raw = m.impressions > 0 || campaign.status === "completed" ? rate : 0;
  }
  return money(Math.min(campaign.budget, Math.max(0, raw)));
}

/** How the spend figure was arrived at, shown verbatim in the admin UI. */
export function spendExplanation(campaign: AdCampaign): string {
  const { metrics: m, rate } = campaign;
  switch (campaign.pricingModel) {
    case "cpc":
      return `${m.clicks.toLocaleString()} clicks × $${rate.toFixed(2)} CPC`;
    case "cpm":
      return `${m.impressions.toLocaleString()} impressions ÷ 1,000 × $${rate.toFixed(2)} CPM`;
    case "cpa":
      return `$${m.attributedValue.toFixed(2)} attributed bookings × ${rate}%`;
    default:
      return `Flat placement fee $${rate.toFixed(2)}`;
  }
}

/** Everything the campaign table and detail panel need, derived in one place. */
export interface CampaignPerformance {
  spend: number;
  /** Spend not yet recognised as revenue. */
  unbilled: number;
  budgetUsed: number;
  /** Click-through rate as a 0–1 ratio. */
  ctr: number;
  /** Conversion rate on clicks, 0–1. */
  cvr: number;
  /** Effective cost per click. */
  cpc: number;
  /** Effective cost per acquisition. */
  cpa: number;
  /** Return on ad spend — attributed value ÷ spend. */
  roas: number;
  explanation: string;
}

export function campaignPerformance(campaign: AdCampaign): CampaignPerformance {
  const spend = campaignSpend(campaign);
  const { metrics: m } = campaign;
  return {
    spend,
    unbilled: money(Math.max(0, spend - campaign.billed)),
    budgetUsed: campaign.budget > 0 ? money((spend / campaign.budget) * 100) : 0,
    ctr: m.impressions > 0 ? m.clicks / m.impressions : 0,
    cvr: m.clicks > 0 ? m.conversions / m.clicks : 0,
    cpc: m.clicks > 0 ? money(spend / m.clicks) : 0,
    cpa: m.conversions > 0 ? money(spend / m.conversions) : 0,
    roas: spend > 0 ? money(m.attributedValue / spend) : 0,
    explanation: spendExplanation(campaign),
  };
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export interface PlacementContext {
  vertical?: ProductKind;
  destination?: string;
  /** Evaluation time (ISO). Defaults to now. */
  at?: string;
  /** How many slots the surface has. */
  limit?: number;
}

/** Is the campaign eligible to serve into this context right now? */
export function campaignEligible(
  campaign: AdCampaign,
  placement: AdPlacement,
  ctx: PlacementContext = {},
): boolean {
  if (campaign.status !== "active") return false;
  if (campaign.placement !== placement) return false;
  const t = new Date(ctx.at ?? new Date().toISOString()).getTime();
  if (t < new Date(campaign.startAt).getTime()) return false;
  if (t > new Date(campaign.endAt).getTime()) return false;
  if (campaignSpend(campaign) >= campaign.budget) return false;
  if (
    ctx.vertical &&
    campaign.targetVerticals.length > 0 &&
    !campaign.targetVerticals.includes(ctx.vertical)
  ) {
    return false;
  }
  if (
    ctx.destination &&
    campaign.targetDestinations.length > 0 &&
    !campaign.targetDestinations.some(
      (d) => d.toLowerCase() === ctx.destination!.toLowerCase(),
    )
  ) {
    return false;
  }
  return true;
}

/**
 * The campaigns that should render in a placement, best first.
 *
 * Read-only: serving a placement must never mutate the store, or SSR and the
 * client would disagree. Impressions are recorded by the surface itself, once,
 * on the client.
 */
export function sponsoredFor(
  placement: AdPlacement,
  ctx: PlacementContext = {},
): AdCampaign[] {
  return getState()
    .adCampaigns.filter((c) => campaignEligible(c, placement, ctx))
    .sort((a, b) => b.priority - a.priority || b.rate - a.rate)
    .slice(0, ctx.limit ?? 3);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export type AdCampaignInput = Omit<
  AdCampaign,
  "id" | "reference" | "advertiserName" | "metrics" | "billed" | "createdAt" | "updatedAt"
>;

export const adService = {
  advertisers(): Advertiser[] {
    return getState().advertisers;
  },

  advertiser(id: string): Advertiser | undefined {
    return getState().advertisers.find((a) => a.id === id);
  },

  createAdvertiser(input: Omit<Advertiser, "id" | "createdAt">): Advertiser {
    const advertiser: Advertiser = {
      ...input,
      id: nextId("adv"),
      createdAt: new Date().toISOString(),
    };
    mutate((draft) => draft.advertisers.unshift(advertiser));
    return advertiser;
  },

  campaigns(): AdCampaign[] {
    return getState().adCampaigns;
  },

  campaign(id: string): AdCampaign | undefined {
    return getState().adCampaigns.find((c) => c.id === id);
  },

  campaignsFor(advertiserId: string): AdCampaign[] {
    return getState().adCampaigns.filter((c) => c.advertiserId === advertiserId);
  },

  create(input: AdCampaignInput): AdCampaign {
    const now = new Date().toISOString();
    const advertiser = adService.advertiser(input.advertiserId);
    const campaign: AdCampaign = {
      ...input,
      id: nextId("cmp"),
      reference: nextReference("ADS", 71_000),
      advertiserName: advertiser?.name ?? "Unknown advertiser",
      metrics: { impressions: 0, clicks: 0, conversions: 0, attributedValue: 0 },
      billed: 0,
      createdAt: now,
      updatedAt: now,
    };
    mutate((draft) => draft.adCampaigns.unshift(campaign));
    return campaign;
  },

  update(
    id: string,
    patch: Partial<AdCampaignInput>,
  ): { before: AdCampaign; after: AdCampaign } | undefined {
    return mutate((draft) => {
      const row = draft.adCampaigns.find((c) => c.id === id);
      if (!row) return undefined;
      const before = structuredClone(row);
      Object.assign(row, patch);
      if (patch.advertiserId) {
        row.advertiserName =
          draft.advertisers.find((a) => a.id === patch.advertiserId)?.name ??
          row.advertiserName;
      }
      row.updatedAt = new Date().toISOString();
      return { before, after: structuredClone(row) };
    });
  },

  /** Move a campaign through review/serving states. */
  setStatus(
    id: string,
    status: CampaignStatus,
    options: { by?: string; note?: string } = {},
  ): AdCampaign | undefined {
    return mutate((draft) => {
      const row = draft.adCampaigns.find((c) => c.id === id);
      if (!row) return undefined;
      row.status = status;
      row.updatedAt = new Date().toISOString();
      if (options.by) row.reviewedBy = options.by;
      if (options.note) row.reviewNote = options.note;
      return structuredClone(row);
    });
  },

  /** Record delivery. Clamped so a campaign can't spend past its budget. */
  recordEvent(
    id: string,
    event: "impression" | "click" | "conversion",
    payload: { value?: number; count?: number } = {},
  ): AdCampaign | undefined {
    const count = Math.max(1, payload.count ?? 1);
    return mutate((draft) => {
      const row = draft.adCampaigns.find((c) => c.id === id);
      if (!row || row.status !== "active") return undefined;
      if (campaignSpend(row) >= row.budget) return structuredClone(row);
      if (event === "impression") row.metrics.impressions += count;
      if (event === "click") row.metrics.clicks += count;
      if (event === "conversion") {
        row.metrics.conversions += count;
        row.metrics.attributedValue = money(
          row.metrics.attributedValue + (payload.value ?? 0),
        );
      }
      row.updatedAt = new Date().toISOString();
      if (campaignSpend(row) >= row.budget) row.status = "completed";
      return structuredClone(row);
    });
  },

  /**
   * Recognise a campaign's unbilled spend. Returns the amount so the caller can
   * write the matching revenue-ledger entry.
   */
  bill(id: string): { campaign: AdCampaign; amount: number } | undefined {
    return mutate((draft) => {
      const row = draft.adCampaigns.find((c) => c.id === id);
      if (!row) return undefined;
      const amount = money(Math.max(0, campaignSpend(row) - row.billed));
      if (amount <= 0) return { campaign: structuredClone(row), amount: 0 };
      row.billed = money(row.billed + amount);
      row.updatedAt = new Date().toISOString();
      return { campaign: structuredClone(row), amount };
    });
  },

  /** Roll-up for the advertising dashboard. */
  summary() {
    const rows = getState().adCampaigns;
    const perf = rows.map((c) => ({ campaign: c, ...campaignPerformance(c) }));
    const sum = (of: (p: (typeof perf)[number]) => number) =>
      money(perf.reduce((n, p) => n + of(p), 0));
    return {
      currency: "USD",
      campaigns: rows.length,
      active: rows.filter((c) => c.status === "active").length,
      scheduled: rows.filter((c) => c.status === "scheduled").length,
      paused: rows.filter((c) => c.status === "paused").length,
      completed: rows.filter((c) => c.status === "completed").length,
      pendingReview: rows.filter((c) => c.status === "pending_review").length,
      advertisers: getState().advertisers.length,
      budget: money(rows.reduce((n, c) => n + c.budget, 0)),
      spend: sum((p) => p.spend),
      billed: money(rows.reduce((n, c) => n + c.billed, 0)),
      unbilled: sum((p) => p.unbilled),
      impressions: rows.reduce((n, c) => n + c.metrics.impressions, 0),
      clicks: rows.reduce((n, c) => n + c.metrics.clicks, 0),
      conversions: rows.reduce((n, c) => n + c.metrics.conversions, 0),
      attributedValue: money(
        rows.reduce((n, c) => n + c.metrics.attributedValue, 0),
      ),
    };
  },
};
