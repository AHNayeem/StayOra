import type { Metadata } from "next";
import { getReviewableStays } from "@/services/account";
import { ReviewsView } from "./reviews-view";

export const metadata: Metadata = { title: "Reviews" };

/**
 * Reviews — the traveler's written reviews plus prompts for completed stays
 * they haven't reviewed yet. Authored reviews live in a persisted client store
 * (write/edit/delete survive reload); review prompts come from the server.
 */
export default async function ReviewsPage() {
  const reviewable = await getReviewableStays();
  return <ReviewsView reviewable={reviewable} />;
}
