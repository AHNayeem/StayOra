import type { CmsPage, CmsStatus } from "./types";

/** [title, slug, type, one-line excerpt]. */
const PAGES: [string, string, string, string][] = [
  ["Home", "home", "Page", "The front door — hero search, featured stays and live deals."],
  ["About us", "about", "Page", "Who Otithee is, where we operate and how we vet partners."],
  ["Contact", "contact", "Page", "Support channels, office addresses and response times."],
  ["Terms of service", "terms", "Legal", "The contract between Otithee and every traveller."],
  ["Privacy policy", "privacy", "Legal", "What we collect, why we keep it and how to have it erased."],
  ["Top 10 beach resorts", "blog/top-beach-resorts", "Blog", "Ten shorelines worth the flight, ranked by our editors."],
  ["How to book a group stay", "blog/group-stays", "Blog", "Rooming lists, deposits and the paperwork nobody warns you about."],
  ["Travel FAQ", "faq/travel", "FAQ", "Visas, luggage, check-in windows and the questions behind them."],
  ["Refund FAQ", "faq/refunds", "FAQ", "When money comes back, how fast, and to which card."],
  ["Partner with us", "partners", "Landing", "Why properties list with Otithee and what commission looks like."],
  ["Careers", "careers", "Page", "Open roles across engineering, operations and partner success."],
  ["City guides: London", "blog/london-guide", "Blog", "Where to stay in London by neighbourhood, budget and mood."],
];

const AUTHORS = ["AH Nayeem", "Ben Silva", "Chen Wong", "Dana Meyer"];

/**
 * A spread across the workflow so the board is demoable from the first load:
 * drafts to edit, pages awaiting approval, one queued for release, and live
 * pages with history behind them.
 */
const STATUSES: CmsStatus[] = ["published", "draft", "review", "scheduled"];

const EPOCH = Date.UTC(2026, 4, 1);

function iso(dayOffset: number): string {
  return new Date(EPOCH + dayOffset * 86_400_000).toISOString();
}

/** Believable filler body — three paragraphs derived from the page's own topic. */
function body(title: string, excerpt: string): string {
  return [
    `${excerpt}`,
    `This page is part of the Otithee content set. It is edited in the dashboard, moves through draft → review → published, and every save is versioned so an earlier wording can always be restored.`,
    `Content authored for “${title}” is served to the public site from the same record an editor sees here — there is no second copy to keep in step.`,
  ].join("\n\n");
}

export const CMS_PAGES_SEED: CmsPage[] = PAGES.map(
  ([title, slug, type, excerpt], i) => {
    const status = STATUSES[i % STATUSES.length];
    const updatedAt = iso((i * 6) % 80);
    return {
      id: `cms_${400 + i}`,
      title,
      slug,
      type,
      author: AUTHORS[i % AUTHORS.length],
      status,
      excerpt,
      body: body(title, excerpt),
      version: 1 + (i % 3),
      updatedAt,
      ...(status === "scheduled"
        ? // Far enough out that the sweep leaves it alone until an operator
          // shortens it — a schedule that fires on first render demos nothing.
          { publishAt: iso(((i * 6) % 80) + 21) }
        : {}),
      ...(status === "published" ? { publishedAt: updatedAt } : {}),
      ...(status === "review" || status === "scheduled"
        ? { submittedBy: AUTHORS[(i + 1) % AUTHORS.length] }
        : {}),
      ...(status === "scheduled"
        ? { reviewedBy: AUTHORS[(i + 2) % AUTHORS.length] }
        : {}),
    };
  },
);
