import { createStubService } from "../../crud";
import { NEWSLETTER_EPOCH, SUBSCRIBERS_SEED } from "./data";
import type { NewsletterSummary, Subscriber } from "./types";

/** Newsletter subscribers data source (in-memory stub; repository-ready). */
export const newsletterService = createStubService<Subscriber>({
  seed: SUBSCRIBERS_SEED,
  getId: (row) => row.id,
  searchFields: ["email", "name"],
  idPrefix: "sub",
});

export const newsletterKeys = {
  all: ["cms", "newsletter"] as const,
  summary: ["cms", "newsletter", "summary"] as const,
};

/** Audience KPIs — a seam a real ESP integration can serve directly. */
export function getNewsletterSummary(): Promise<NewsletterSummary> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const rows = SUBSCRIBERS_SEED;
      const cutoff = NEWSLETTER_EPOCH - 30 * 86_400_000;
      resolve({
        subscribed: rows.filter((r) => r.status === "subscribed").length,
        unsubscribed: rows.filter((r) => r.status === "unsubscribed").length,
        bounced: rows.filter((r) => r.status === "bounced").length,
        newThisMonth: rows.filter(
          (r) => r.status === "subscribed" && new Date(r.joinedAt).getTime() >= cutoff,
        ).length,
      });
    }, 300);
  });
}
