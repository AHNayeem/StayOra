import type { CmsPage, CmsStatus } from "./types";

const PAGES: [string, string, string][] = [
  ["Home", "home", "Page"],
  ["About us", "about", "Page"],
  ["Contact", "contact", "Page"],
  ["Terms of service", "terms", "Page"],
  ["Privacy policy", "privacy", "Page"],
  ["Top 10 beach resorts", "blog/top-beach-resorts", "Blog"],
  ["How to book a group stay", "blog/group-stays", "Blog"],
  ["Travel FAQ", "faq/travel", "FAQ"],
  ["Refund FAQ", "faq/refunds", "FAQ"],
  ["Partner with us", "partners", "Page"],
  ["Careers", "careers", "Page"],
  ["City guides: London", "blog/london-guide", "Blog"],
];
const AUTHORS = ["Ava Rahman", "Ben Silva", "Chen Wong", "Dana Meyer"];
const STATUSES: CmsStatus[] = ["draft", "published", "scheduled"];

function iso(dayOffset: number): string {
  return new Date(Date.UTC(2026, 4, 1) + dayOffset * 86_400_000).toISOString();
}

export const CMS_PAGES_SEED: CmsPage[] = PAGES.map(([title, slug, type], i) => ({
  id: `cms_${400 + i}`,
  title,
  slug,
  type,
  author: AUTHORS[i % AUTHORS.length],
  status: STATUSES[i % STATUSES.length],
  updatedAt: iso((i * 6) % 80),
}));
