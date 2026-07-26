import type { Subscriber, SubscriberSource, SubscriberStatus } from "./types";

/** Fixed epoch — subscribers "joined" relative to this, no module-load clock. */
export const NEWSLETTER_EPOCH = Date.UTC(2026, 6, 1);

function iso(dayOffset: number): string {
  return new Date(NEWSLETTER_EPOCH - dayOffset * 86_400_000).toISOString();
}

const FIRST = [
  "Ava", "Ben", "Chen", "Dana", "Elias", "Farah", "Grace", "Hugo",
  "Ines", "Jonas", "Kira", "Liam", "Maya", "Noah", "Omar", "Priya",
  "Quinn", "Rosa", "Sami", "Tara", "Umar", "Vera", "Will", "Xin",
  "Yara", "Zane", "Aran", "Bela", "Cyrus", "Dilan",
];
const LAST = [
  "Rahman", "Silva", "Wong", "Meyer", "Khan", "Patel", "Novak", "Haddad",
  "Clarke", "Moretti", "Larsen", "Bello",
];
const STATUSES: SubscriberStatus[] = [
  "subscribed", "subscribed", "subscribed", "subscribed", "subscribed",
  "subscribed", "unsubscribed", "subscribed", "bounced", "subscribed",
];
const SOURCES: SubscriberSource[] = ["signup_form", "checkout", "referral", "import"];

export const SUBSCRIBERS_SEED: Subscriber[] = Array.from({ length: 30 }, (_, i) => {
  const first = FIRST[i % FIRST.length];
  const last = LAST[i % LAST.length];
  return {
    id: `sub_${1100 + i}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    status: STATUSES[i % STATUSES.length],
    source: SOURCES[i % SOURCES.length],
    joinedAt: iso((i * 3) % 90),
  };
});
