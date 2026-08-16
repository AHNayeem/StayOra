"use client";

import type { AIBlock, AIUserAction } from "@/types/ai";
import { BookingDraftBlock } from "./booking-draft-block";
import {
  AvailabilityChangeBlock,
  BookingConfirmationBlock,
  BookingErrorBlock,
  BookingProgressBlock,
  BookingRecordsBlock,
  BookingReviewBlock,
  CancellationBlock,
  PriceChangeBlock,
} from "./booking-blocks";
import { BudgetBlock } from "./budget-block";
import { ComparisonBlock } from "./comparison-block";
import { FlightBlock } from "./flight-block";
import {
  ActionRequiredBlock,
  ClarificationBlock,
  PaymentSelectionBlock,
  TravelerFormBlock,
} from "./form-blocks";
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
 *
 * Two ways back to the agent are offered: `onAsk` sends a sentence (what a
 * suggestion chip does) and `onAction` raises a structured action (what a
 * confirmation button does). Blocks that move money always use the second.
 */
export function BlockRenderer({
  block,
  onAsk,
  onAction,
  busy,
}: {
  block: AIBlock;
  /** Send a follow-up question on the traveller's behalf. */
  onAsk?: (prompt: string) => void;
  /** Raise a typed action — confirmations, payment choice, form submissions. */
  onAction?: (action: AIUserAction, label: string) => void;
  /** True while a turn is in flight; interactive blocks disable themselves. */
  busy?: boolean;
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

    // --- booking workflow ---
    case "booking-progress":
      return <BookingProgressBlock block={block} />;
    case "booking-review":
      return <BookingReviewBlock block={block} onAction={onAction} disabled={busy} />;
    case "booking-confirmation":
      return <BookingConfirmationBlock block={block} />;
    case "booking-error":
      return <BookingErrorBlock block={block} onAction={onAction} disabled={busy} />;
    case "price-change":
      return <PriceChangeBlock block={block} onAction={onAction} disabled={busy} />;
    case "availability-change":
      return <AvailabilityChangeBlock block={block} onAsk={onAsk} />;
    case "cancellation":
      return <CancellationBlock block={block} onAction={onAction} disabled={busy} />;
    case "booking-records":
      return <BookingRecordsBlock block={block} />;

    // --- input ---
    case "clarification":
      return <ClarificationBlock block={block} onAsk={onAsk} disabled={busy} />;
    case "action-required":
      return <ActionRequiredBlock block={block} />;
    case "traveler-form":
      return <TravelerFormBlock block={block} onAction={onAction} disabled={busy} />;
    case "payment-selection":
      return <PaymentSelectionBlock block={block} onAction={onAction} disabled={busy} />;

    default:
      return null;
  }
}

export { AiText } from "./ai-text";
export { ProgressTrail } from "./booking-blocks";
