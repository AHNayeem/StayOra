"use client";

import type { AIBlock } from "@/types/ai";
import { BookingDraftBlock } from "./booking-draft-block";
import { BudgetBlock } from "./budget-block";
import { ComparisonBlock } from "./comparison-block";
import { FlightBlock } from "./flight-block";
import { ItineraryBlock } from "./itinerary-block";
import { ListingBlock } from "./listing-block";
import { BookingsBlock, FactsBlock, NoticeBlock, ReviewsBlock, VisaBlock } from "./misc-blocks";
import { TripPlanBlock } from "./trip-plan-block";

/**
 * BlockRenderer — the single switch from an {@link AIBlock} to a component.
 *
 * This is the seam that keeps the provider swappable: a real LLM adds
 * capability by emitting a new block variant, and only this file and one new
 * renderer change. The chat, the panel and the page are untouched.
 */
export function BlockRenderer({
  block,
  onAsk,
}: {
  block: AIBlock;
  /** Send a follow-up question on the traveller's behalf. */
  onAsk?: (prompt: string) => void;
}) {
  switch (block.kind) {
    case "listings":
      return (
        <ListingBlock
          block={block}
          onAsk={onAsk}
          onCompare={onAsk ? () => onAsk("Compare these") : undefined}
        />
      );
    case "flights":
      return (
        <FlightBlock
          block={block}
          onCompare={onAsk ? () => onAsk("Compare these flights") : undefined}
        />
      );
    case "comparison":
      return <ComparisonBlock block={block} />;
    case "trip-plan":
      return <TripPlanBlock block={block} />;
    case "itinerary":
      return <ItineraryBlock block={block} onAsk={onAsk} />;
    case "budget":
      return <BudgetBlock block={block} />;
    case "booking-draft":
      return <BookingDraftBlock block={block} />;
    case "bookings":
      return <BookingsBlock block={block} />;
    case "visa":
      return <VisaBlock block={block} />;
    case "reviews":
      return <ReviewsBlock block={block} />;
    case "facts":
      return <FactsBlock block={block} />;
    case "notice":
      return <NoticeBlock block={block} />;
    default:
      return null;
  }
}

export { AiText } from "./ai-text";
