/**
 * Catalogue review state at boot.
 *
 * The launch catalogue is live, so the store records **only the deviations** —
 * a handful of listings parked mid-review plus a few merchant-created drafts.
 * Anything without an entry here is treated as published (see
 * `publishedWorkflow`), which is why adding a listing to `constants/listings`
 * still just works.
 */

import {
  publishedWorkflow,
  seedCatalogueStatics,
  type CatalogueEvent,
  type CatalogueStatic,
  type CatalogueStatus,
  type CatalogueWorkflow,
} from "./catalogue";

const REF = Date.UTC(2026, 7, 11);
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(REF - daysAgo * DAY).toISOString();

function event(
  n: number,
  at: string,
  status: CatalogueStatus,
  label: string,
  actor: string,
  note?: string,
): CatalogueEvent {
  return { id: `cate_seed_${n}`, at, status, label, actor, note };
}

let counter = 0;

function workflow(
  status: CatalogueStatus,
  daysAgo: number,
  extra: Partial<CatalogueWorkflow> = {},
): CatalogueWorkflow {
  counter += 1;
  const at = iso(daysAgo);
  return {
    status,
    version: extra.version ?? 1,
    createdAt: iso(daysAgo + 12),
    updatedAt: at,
    submittedAt: iso(daysAgo + 2),
    timeline: [
      event(counter * 10 + 1, iso(daysAgo + 12), "draft", "Draft created", "Merchant"),
      event(counter * 10 + 2, iso(daysAgo + 2), "submitted", "Submitted for review", "Merchant"),
      ...(extra.reviewNote
        ? [
            event(
              counter * 10 + 3,
              at,
              status,
              status === "rejected" ? "Rejected" : "Changes requested",
              extra.reviewedBy ?? "Catalogue Team",
              extra.reviewNote,
            ),
          ]
        : status === "under_review"
          ? [event(counter * 10 + 3, at, "under_review", "Review started", "Catalogue Team")]
          : []),
    ],
    ...extra,
  };
}

/**
 * Park a few real listings mid-review so the admin queue and the merchant's
 * "in review" view have content on a fresh install.
 */
export function seedCatalogueWorkflow(): Record<string, CatalogueWorkflow> {
  counter = 0;
  const statics = seedCatalogueStatics();
  const out: Record<string, CatalogueWorkflow> = {};

  // Deterministic picks: the first listing of a few different verticals.
  const pick = (vertical: string, offset: number): CatalogueStatic | undefined =>
    statics.filter((s) => s.vertical === vertical)[offset];

  const parked: [CatalogueStatic | undefined, CatalogueWorkflow][] = [
    [pick("hotels", 6), workflow("submitted", 3)],
    [pick("hotels", 9), workflow("under_review", 1)],
    [
      pick("apartments", 4),
      workflow("action_required", 2, {
        reviewedAt: iso(2),
        reviewedBy: "Catalogue Team",
        reviewNote:
          "The cover photo shows a different building to the address given. Please upload photos of the actual unit.",
        version: 1,
      }),
    ],
    [
      pick("tours", 3),
      workflow("rejected", 5, {
        reviewedAt: iso(5),
        reviewedBy: "Catalogue Team",
        reviewNote:
          "The itinerary duplicates an existing listing from the same merchant. Merge them and resubmit one product.",
      }),
    ],
    [
      pick("resorts", 5),
      workflow("approved", 1, {
        reviewedAt: iso(1),
        reviewedBy: "Catalogue Team",
      }),
    ],
    [
      pick("activities", 2),
      workflow("unpublished", 8, {
        status: "unpublished",
        unpublishedAt: iso(8),
        reviewNote: "Taken down by the merchant for the low season.",
      }),
    ],
  ];

  for (const [item, wf] of parked) {
    if (item) out[item.id] = wf;
  }
  return out;
}

/** A couple of products a merchant started but never submitted. */
export function seedCatalogueDrafts(): (CatalogueStatic & CatalogueWorkflow)[] {
  return [
    {
      id: "cat_draft_1",
      merchantId: "mrc_azure",
      propertyId: "mrc_azure_prp_3",
      vertical: "hotels",
      title: "Azure Bay Bangkok Riverside — Club Floor",
      slug: "azure-bay-bangkok-riverside-club-floor",
      summary:
        "Club-floor rooms with lounge access, evening canapés and a dedicated riverside check-in desk.",
      city: "Bangkok",
      country: "Thailand",
      basePrice: 210,
      currency: "USD",
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      origin: "merchant",
      status: "draft",
      version: 1,
      createdAt: iso(4),
      updatedAt: iso(2),
      timeline: [event(901, iso(4), "draft", "Draft created", "Marco Silva")],
    },
    {
      id: "cat_draft_2",
      merchantId: "mrc_palm",
      propertyId: "mrc_palm_prp_1",
      vertical: "resorts",
      title: "Palm Grove Overwater Villa — Half Board",
      slug: "palm-grove-overwater-villa-half-board",
      summary:
        "Overwater villa with a private deck, half-board dining and a complimentary sunset cruise on arrival.",
      city: "Maldives",
      country: "Maldives",
      basePrice: 640,
      currency: "USD",
      image:
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
      origin: "merchant",
      status: "submitted",
      version: 2,
      createdAt: iso(10),
      updatedAt: iso(1),
      submittedAt: iso(1),
      timeline: [
        event(911, iso(10), "draft", "Draft created", "Ibrahim Naseem"),
        event(912, iso(6), "submitted", "Submitted for review", "Ibrahim Naseem"),
        event(
          913,
          iso(4),
          "action_required",
          "Changes requested",
          "Catalogue Team",
          "Board basis was missing from the description.",
        ),
        event(914, iso(1), "submitted", "Resubmitted for review", "Ibrahim Naseem"),
      ],
    },
  ];
}

export { publishedWorkflow };
