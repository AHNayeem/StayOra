import type { Metadata } from "next";
import { ReviewsView } from "./reviews-view";

export const metadata: Metadata = { title: "Reviews" };

/**
 * Reviews the traveller has written, plus prompts for completed bookings they
 * can still review. Both come from the platform review store, so a moderator's
 * decision is visible here without a second copy of the data.
 */
export default function ReviewsPage() {
  return <ReviewsView />;
}
