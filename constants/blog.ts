/**
 * Editorial pools for the blog details layer. Pure data — the deterministic
 * builder in `lib/blog-detail` assembles an article body, tags and comments from
 * these using a slug-seeded pick, so mock posts stay lean and every render is
 * SSR-stable. A real CMS would replace both this file and the builder.
 */

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=200&q=80`;

/** Opening paragraphs — one leads every article. */
export const INTRO_POOL: string[] = [
  "There's a particular kind of magic in planning a trip well — the anticipation, the small decisions that shape a whole journey. This guide gathers what we've learned so your next departure starts on the right foot.",
  "Great travel rarely happens by accident. Behind every effortless-looking trip is a handful of smart choices made early, and that's exactly what we want to unpack here.",
  "Whether it's your first big adventure or your fiftieth, the fundamentals of a memorable trip stay surprisingly consistent. Let's walk through them together.",
];

/** Body sections — the builder picks three per article and orders them stably. */
export const BODY_SECTIONS: {
  heading: string;
  paragraphs: string[];
  list?: string[];
}[] = [
  {
    heading: "Start with the shape of the trip",
    paragraphs: [
      "Before comparing prices or reading a single review, decide what the trip is actually for. A restful escape, a packed city break and a slow cultural immersion all call for different choices — and knowing which one you're planning removes most of the second-guessing later.",
      "Sketch the rough arc first: how many nights, roughly which regions, and the one or two experiences you'd be disappointed to miss. Everything else can flex around that skeleton.",
    ],
  },
  {
    heading: "Book the anchors, keep the edges loose",
    paragraphs: [
      "Lock in the things that genuinely sell out or swing wildly in price — flights, the first night's stay, any marquee experience — and leave the rest open. Over-planning is the fastest way to turn a holiday into an itinerary you're merely executing.",
    ],
    list: [
      "Reserve refundable rates where you can, so plans can breathe.",
      "Leave at least one unscheduled day per week for the unexpected.",
      "Save a shortlist of restaurants rather than fixed reservations.",
    ],
  },
  {
    heading: "Pack for the trip you're actually taking",
    paragraphs: [
      "The most common packing mistake is preparing for a hypothetical version of the trip — the formal dinner you won't attend, the weather that won't happen. Pack for the plan you made, plus one flexible layer, and you'll carry less and stress less.",
    ],
  },
  {
    heading: "Build in room to slow down",
    paragraphs: [
      "The moments travellers remember are rarely the ones on the checklist. They're the long lunch that ran two hours over, the wrong turn that led somewhere better. Protect that space deliberately — it doesn't appear on its own.",
    ],
  },
  {
    heading: "Travel light on logistics",
    paragraphs: [
      "Keep everything you'll need under pressure in one place: confirmations, addresses, a rough map of each day. When arrival day is smooth, the whole trip feels calmer, and you spend your attention on the place instead of the paperwork.",
    ],
  },
];

/** Pull-quotes dropped mid-article. */
export const QUOTE_POOL: { text: string; cite?: string }[] = [
  {
    text: "The best trips leave room for the plans you didn't make.",
    cite: "StayOra travel desk",
  },
  {
    text: "Travel isn't about seeing everything — it's about being somewhere completely.",
  },
];

/** Closing paragraph — one ends every article. */
export const OUTRO_POOL: string[] = [
  "None of this needs to be perfect. Get the anchors right, stay curious, and let the trip become its own thing once you're there — that's where the good stories come from.",
  "Plan enough to feel free, not enough to feel scheduled. Then go — the rest tends to look after itself.",
];

/** Tag vocabulary the builder samples from, alongside each post's category. */
export const TAG_POOL: string[] = [
  "Travel tips",
  "Planning",
  "Budget",
  "Solo travel",
  "Family",
  "Adventure",
  "City breaks",
  "Food",
  "Culture",
  "Sustainable",
];

/** Sample reader comments. */
export const COMMENT_POOL: {
  author: string;
  avatar?: string;
  date: string;
  body: string;
}[] = [
  {
    author: "Hannah Blake",
    avatar: img("photo-1544005313-94ddf0286df2"),
    date: "2026-06-22",
    body: "Saved this before our trip and the 'anchors vs edges' idea completely changed how we planned. We actually had time to relax for once.",
  },
  {
    author: "Marcus Lee",
    avatar: img("photo-1506794778202-cad84cf45f1d"),
    date: "2026-06-20",
    body: "The packing section is so true. I always over-pack for a version of the trip that never happens. Trying the single-layer rule next time.",
  },
  {
    author: "Elena Fischer",
    date: "2026-06-18",
    body: "Great read — practical without being preachy. Would love a follow-up on travelling with kids specifically.",
  },
];
