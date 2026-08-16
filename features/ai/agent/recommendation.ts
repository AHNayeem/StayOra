/**
 * Recommendation scoring.
 *
 * A deterministic, inspectable stand-in for the ranking service a production
 * platform would run. The important properties are that it is **typed**,
 * **explainable** and **replaceable**: every factor is a named 0–1 signal, the
 * weights are data, and the output carries the reasons — so a recommendation
 * can always be justified from the same numbers the traveller was shown.
 *
 * Swapping in an ML service means implementing {@link RecommendationScorer};
 * nothing above this file reads the weights.
 */

import type { AIListingRef, AITripStyle } from "@/types/ai";
import type { Listing } from "@/types/catalog";

/** The signals a candidate is scored on. Each is clamped to 0–1. */
export interface ScoreFactors {
  /** How well the price fits the stated budget (1 = comfortably inside). */
  priceFit: number;
  /** Guest rating, normalised. */
  rating: number;
  /** Destination match: exact city beats same country beats elsewhere. */
  locationFit: number;
  /** Stated preferences and amenities that actually matched. */
  preferenceFit: number;
  /** Known availability for the asked-for dates (1 = confirmed bookable). */
  availability: number;
  /** Category match — the traveller asked for a resort and got one. */
  categoryFit: number;
}

export interface ScoredListing {
  ref: AIListingRef;
  score: number;
  factors: ScoreFactors;
  /** Why it ranked where it did, strongest factor first. */
  reasons: string[];
}

export interface RecommendationScorer {
  readonly id: string;
  score(input: ScoreInput): ScoredListing[];
}

/** Weights, as data so they can be tuned (or learned) without a code change. */
export const SCORE_WEIGHTS: Record<keyof ScoreFactors, number> = {
  priceFit: 0.28,
  rating: 0.24,
  locationFit: 0.18,
  preferenceFit: 0.16,
  availability: 0.08,
  categoryFit: 0.06,
};

export interface ScoreInput {
  candidates: AIListingRef[];
  /** Per-night ceiling in base USD, when the traveller gave one. */
  maxNightlyUsd?: number;
  /** Total trip budget in base USD. */
  budgetUsd?: number;
  nights?: number;
  styles?: AITripStyle[];
  amenities?: string[];
  /** City the traveller asked for, normalised lowercase. */
  city?: string;
  country?: string;
  /** Vertical the traveller named, if any. */
  vertical?: string;
  /** Ids known to be bookable on the asked dates, from a tool call. */
  availableIds?: Set<string>;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Searchable text for preference matching. */
function text(listing: Listing): string {
  const parts = [listing.title, listing.location.label, ...(listing.badges ?? [])];
  if ("amenities" in listing && Array.isArray(listing.amenities)) parts.push(...listing.amenities);
  return parts.join(" ").toLowerCase();
}

/**
 * Price fit.
 *
 * Under budget scores 1 and *stays* at 1 — a cheaper room is not automatically
 * a better one, and rewarding it would quietly turn every recommendation into
 * "the cheapest thing we have". Over budget decays sharply, because it is the
 * one constraint travellers mean literally.
 */
function priceFit(priceUsd: number, ceiling?: number): number {
  if (!ceiling || ceiling <= 0) return 0.6;
  if (priceUsd <= ceiling) return 1;
  return clamp(1 - (priceUsd - ceiling) / ceiling);
}

function locationFit(listing: Listing, city?: string, country?: string): number {
  if (!city && !country) return 0.6;
  const label = `${listing.location.city ?? ""} ${listing.location.label} ${listing.location.country ?? ""}`.toLowerCase();
  if (city && label.includes(city.toLowerCase())) return 1;
  if (country && label.includes(country.toLowerCase())) return 0.6;
  return 0.2;
}

function preferenceFit(listing: Listing, styles: AITripStyle[], amenities: string[]): number {
  const wanted = [...styles, ...amenities].map((w) => w.toLowerCase()).filter(Boolean);
  if (wanted.length === 0) return 0.6;
  const haystack = text(listing);
  const hits = wanted.filter((word) => haystack.includes(word)).length;
  return clamp(hits / wanted.length);
}

/** The deterministic scorer shipped with the prototype. */
export class DeterministicScorer implements RecommendationScorer {
  readonly id = "deterministic-v1";

  score(input: ScoreInput): ScoredListing[] {
    const nights = Math.max(1, input.nights ?? 1);
    const ceiling =
      input.maxNightlyUsd ?? (input.budgetUsd ? input.budgetUsd / nights : undefined);

    return input.candidates
      .map((ref) => {
        const listing = ref.listing;
        const factors: ScoreFactors = {
          priceFit: priceFit(listing.price.amount, ceiling),
          rating: clamp((listing.rating ?? 4) / 5),
          locationFit: locationFit(listing, input.city, input.country),
          preferenceFit: preferenceFit(listing, input.styles ?? [], input.amenities ?? []),
          availability: input.availableIds ? (input.availableIds.has(listing.id) ? 1 : 0.4) : 0.7,
          categoryFit: input.vertical ? (listing.vertical === input.vertical ? 1 : 0.4) : 0.7,
        };

        const score = (Object.keys(SCORE_WEIGHTS) as Array<keyof ScoreFactors>).reduce(
          (sum, key) => sum + factors[key] * SCORE_WEIGHTS[key],
          0,
        );

        return { ref, score, factors, reasons: explain(factors, listing, ceiling) };
      })
      .sort((a, b) => b.score - a.score || a.ref.listing.price.amount - b.ref.listing.price.amount);
  }
}

/** The two or three strongest factors, phrased from real listing facts. */
function explain(factors: ScoreFactors, listing: Listing, ceiling?: number): string[] {
  const reasons: Array<{ weight: number; text: string }> = [];
  if (factors.priceFit >= 0.99 && ceiling) {
    reasons.push({ weight: factors.priceFit * SCORE_WEIGHTS.priceFit, text: "inside your budget" });
  }
  if (factors.rating >= 0.86 && listing.rating) {
    reasons.push({
      weight: factors.rating * SCORE_WEIGHTS.rating,
      text: `${listing.rating.toFixed(1)}★ from guests`,
    });
  }
  if (factors.locationFit >= 0.99) {
    reasons.push({
      weight: factors.locationFit * SCORE_WEIGHTS.locationFit,
      text: `right in ${listing.location.city ?? listing.location.label}`,
    });
  }
  if (factors.preferenceFit >= 0.5) {
    reasons.push({
      weight: factors.preferenceFit * SCORE_WEIGHTS.preferenceFit,
      text: "matches what you asked for",
    });
  }
  return reasons
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((r) => r.text);
}

/** The scorer in use. One instance is enough — it holds no state. */
export const recommendationScorer: RecommendationScorer = new DeterministicScorer();
