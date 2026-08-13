/**
 * Demo data for the engagement, support, reviews and messaging collections.
 *
 * Like `seed.ts` this is fully deterministic — derived from the booking seed so
 * every review points at a stay that really happened, every loyalty entry has a
 * booking behind it, and the demo traveller owns bookings in every lifecycle
 * state the brief lists.
 */

import { BOOKINGS_SEED } from "./seed";
import type { Booking, BookingStatus, CustomerRef } from "./types";
import type { LoyaltyEntry, Referral, WalletCoupon } from "./engagement";
import { POINTS_PER_USD, REFERRAL_REWARD_POINTS, referralCodeFor } from "./engagement";
import type { PlatformReview } from "./reviews";
import type { SupportTicket } from "./support";
import { SLA_HOURS } from "./support";
import type { OutboundMessage } from "./messaging";

/** The traveller every customer-facing demo signs in as. */
export const DEMO_CUSTOMER: CustomerRef = {
  id: "cus_traveler_demo",
  name: "Ava Thompson",
  email: "traveler@otithee.com",
};

export const DEMO_CUSTOMER_PHONE = "+1 415 555 0142";

/** Anchor for every relative timestamp below — never a wall-clock read. */
const NOW = new Date("2026-08-11T09:00:00.000Z").getTime();
const DAY = 86_400_000;

function iso(daysFromNow: number, hour = 10): string {
  const d = new Date(NOW + daysFromNow * DAY);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

/**
 * Lifecycle states the demo traveller should personally own, so a client demo
 * can open one account and see every screen state without editing data.
 */
const DEMO_STATUSES: BookingStatus[] = [
  "confirmed",
  "payment_pending",
  "completed",
  "checked_in",
  "cancellation_requested",
  "cancelled",
  "refund_pending",
  "refunded",
  "failed",
];

/**
 * Re-point a spread of seeded bookings at the demo traveller.
 *
 * Mutates the *cloned* booking list the store builds, never the frozen seed.
 * Returns the bookings that now belong to the demo customer.
 */
export function assignDemoCustomer(bookings: Booking[]): Booking[] {
  const claimed: Booking[] = [];
  for (const status of DEMO_STATUSES) {
    // Two of each state where the dataset allows it — enough to exercise lists.
    const matches = bookings
      .filter((b) => b.status === status && b.segment === "b2c" && b.customer.id !== DEMO_CUSTOMER.id)
      .slice(0, status === "confirmed" || status === "completed" ? 2 : 1);
    for (const booking of matches) {
      booking.customer = { ...DEMO_CUSTOMER };
      booking.channel = "web";
      booking.travelers = booking.travelers.map((traveler, index) =>
        index === 0
          ? {
              ...traveler,
              fullName: DEMO_CUSTOMER.name,
              email: DEMO_CUSTOMER.email,
              phone: DEMO_CUSTOMER_PHONE,
            }
          : traveler,
      );
      claimed.push(booking);
    }
  }
  return claimed;
}

// ---------------------------------------------------------------------------
// Loyalty
// ---------------------------------------------------------------------------

export function buildLoyaltySeed(demoBookings: Booking[]): LoyaltyEntry[] {
  const entries: LoyaltyEntry[] = [];
  let n = 0;

  // A joining bonus keeps the ledger from starting at zero.
  entries.push({
    id: `lyl_seed_${(n += 1)}`,
    customerEmail: DEMO_CUSTOMER.email,
    at: iso(-420),
    direction: "bonus",
    points: 1_000,
    description: "Welcome bonus — thanks for joining Otithee",
    expiresAt: iso(310),
  });

  for (const booking of demoBookings) {
    if (booking.status !== "completed" && booking.status !== "refunded") continue;
    const points = Math.round(booking.money.netSale * POINTS_PER_USD * 1.3);
    entries.push({
      id: `lyl_seed_${(n += 1)}`,
      customerEmail: DEMO_CUSTOMER.email,
      at: booking.endAt,
      direction: "earned",
      points,
      description: `${booking.productTitle} — ${booking.nights || 1} night stay`,
      bookingId: booking.id,
      bookingRef: booking.reference,
      expiresAt: new Date(new Date(booking.endAt).getTime() + 730 * DAY).toISOString(),
    });
    if (booking.status === "refunded") {
      entries.push({
        id: `lyl_seed_${(n += 1)}`,
        customerEmail: DEMO_CUSTOMER.email,
        at: new Date(new Date(booking.endAt).getTime() + DAY).toISOString(),
        direction: "reversed",
        points,
        description: `Points reversed — ${booking.reference} refunded`,
        bookingId: booking.id,
        bookingRef: booking.reference,
      });
    }
  }

  entries.push(
    {
      id: `lyl_seed_${(n += 1)}`,
      customerEmail: DEMO_CUSTOMER.email,
      at: iso(-180),
      direction: "bonus",
      points: 2_500,
      description: "Gold tier anniversary bonus",
      expiresAt: iso(550),
    },
    {
      id: `lyl_seed_${(n += 1)}`,
      customerEmail: DEMO_CUSTOMER.email,
      at: iso(-96),
      direction: "redeemed",
      points: 1_500,
      description: "Redeemed against Marina View Residences",
    },
    {
      id: `lyl_seed_${(n += 1)}`,
      customerEmail: DEMO_CUSTOMER.email,
      at: iso(-30),
      direction: "bonus",
      points: 3_400,
      description: "Summer campaign double points",
      expiresAt: iso(700),
    },
  );

  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

// ---------------------------------------------------------------------------
// Wallet coupons
// ---------------------------------------------------------------------------

export const WALLET_COUPONS_SEED: WalletCoupon[] = [
  {
    id: "wcp_seed_1",
    code: "WELCOME15",
    customerEmail: DEMO_CUSTOMER.email,
    campaign: "welcome",
    title: "15% off your first stay",
    description: "A thank-you for joining. Valid on any stay over $150.",
    discountType: "percent",
    value: 15,
    minSpend: 150,
    maxDiscount: 120,
    products: ["hotels", "resorts", "apartments"],
    issuedAt: iso(-420),
    expiresAt: iso(120),
    usageLimit: 1,
    used: 0,
    status: "active",
  },
  {
    id: "wcp_seed_2",
    code: "MISSYOU40",
    customerEmail: DEMO_CUSTOMER.email,
    campaign: "win_back",
    title: "$40 off — we've missed you",
    description: "It's been a while. Take $40 off your next trip over $300.",
    discountType: "fixed",
    value: 40,
    minSpend: 300,
    maxDiscount: 0,
    products: [],
    issuedAt: iso(-45),
    expiresAt: iso(45),
    usageLimit: 1,
    used: 0,
    status: "active",
  },
  {
    id: "wcp_seed_3",
    code: "BDAY2026",
    customerEmail: DEMO_CUSTOMER.email,
    campaign: "birthday",
    title: "Birthday treat — 10% off",
    description: "Happy birthday! 10% off anything, up to $80.",
    discountType: "percent",
    value: 10,
    minSpend: 0,
    maxDiscount: 80,
    products: [],
    issuedAt: iso(-14),
    expiresAt: iso(16),
    usageLimit: 1,
    used: 0,
    status: "active",
  },
  {
    id: "wcp_seed_4",
    code: "TOURS25",
    customerEmail: DEMO_CUSTOMER.email,
    campaign: "campaign",
    title: "$25 off tours & activities",
    description: "Explore more — $25 off any tour or activity over $120.",
    discountType: "fixed",
    value: 25,
    minSpend: 120,
    maxDiscount: 0,
    products: ["tours", "activities"],
    issuedAt: iso(-60),
    expiresAt: iso(30),
    usageLimit: 1,
    used: 0,
    status: "active",
  },
  {
    id: "wcp_seed_5",
    code: "SPRING20",
    customerEmail: DEMO_CUSTOMER.email,
    campaign: "campaign",
    title: "Spring escape — 20% off",
    description: "Used on your Bangkok trip earlier this year.",
    discountType: "percent",
    value: 20,
    minSpend: 200,
    maxDiscount: 150,
    products: [],
    issuedAt: iso(-200),
    expiresAt: iso(-120),
    usageLimit: 1,
    used: 1,
    status: "used",
  },
];

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export const REFERRALS_SEED: Referral[] = [
  {
    id: "ref_seed_1",
    code: referralCodeFor(DEMO_CUSTOMER.email),
    referrerEmail: DEMO_CUSTOMER.email,
    inviteeEmail: "jordan.pierce@example.com",
    inviteeName: "Jordan Pierce",
    invitedAt: iso(-120),
    status: "rewarded",
    rewardPoints: REFERRAL_REWARD_POINTS,
    rewardedAt: iso(-96),
    bookingRef: "SO-24031",
  },
  {
    id: "ref_seed_2",
    code: referralCodeFor(DEMO_CUSTOMER.email),
    referrerEmail: DEMO_CUSTOMER.email,
    inviteeEmail: "meera.kapoor@example.com",
    inviteeName: "Meera Kapoor",
    invitedAt: iso(-38),
    status: "booked",
    rewardPoints: REFERRAL_REWARD_POINTS,
    bookingRef: "SO-24077",
  },
  {
    id: "ref_seed_3",
    code: referralCodeFor(DEMO_CUSTOMER.email),
    referrerEmail: DEMO_CUSTOMER.email,
    inviteeEmail: "tom.andersen@example.com",
    inviteeName: "Tom Andersen",
    invitedAt: iso(-12),
    status: "signed_up",
    rewardPoints: REFERRAL_REWARD_POINTS,
  },
  {
    id: "ref_seed_4",
    code: referralCodeFor(DEMO_CUSTOMER.email),
    referrerEmail: DEMO_CUSTOMER.email,
    inviteeEmail: "priya.n@example.com",
    invitedAt: iso(-4),
    status: "invited",
    rewardPoints: REFERRAL_REWARD_POINTS,
  },
];

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

const REVIEW_PHOTOS = [
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=600&q=70",
];

const REVIEW_COPY: { title: string; body: string; scores: number[] }[] = [
  {
    title: "Exactly what the photos promised",
    body: "Spotless room, genuinely warm staff and a location you can walk everywhere from. Breakfast was better than it needed to be. The only nitpick is that the lift is slow at 8am.",
    scores: [5, 5, 5, 4, 5],
  },
  {
    title: "Great stay, small hiccup at check-in",
    body: "Our room wasn't ready until nearly 4pm, but the team apologised properly and upgraded us. After that it was excellent — comfortable bed, quiet at night, superb shower.",
    scores: [5, 4, 4, 4, 5],
  },
  {
    title: "Good value for the area",
    body: "Not luxurious, but clean and very well located. Would happily book again for a short trip where I'm out all day.",
    scores: [4, 5, 4, 5, 4],
  },
  {
    title: "Beautiful property, service let it down",
    body: "The grounds and pool are stunning and worth the price on their own. Restaurant service was slow every evening though, and nobody seemed to own the problem.",
    scores: [4, 5, 2, 3, 4],
  },
  {
    title: "Would come back tomorrow",
    body: "Third time staying here. Consistent every visit — that's rare. The staff remember you, which makes a real difference on a work trip.",
    scores: [5, 4, 5, 4, 5],
  },
  {
    title: "Comfortable but noisy",
    body: "Everything inside the room was fine. Unfortunately the road outside is busy until late, and the windows aren't double glazed. Ask for a room at the back.",
    scores: [4, 3, 4, 4, 3],
  },
];

const REVIEW_AUTHORS = [
  "Nadia Rahman",
  "Peter Ellison",
  "Aisha Karim",
  "Daniel Okafor",
  "Sophie Laurent",
  "Rahul Menon",
  "Elena Petrova",
  "Marcus Chen",
];

/** Slugify a product title the same way the catalogue does. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Catalogue listings the seeded reviews are pinned to.
 *
 * Seed bookings carry generated product titles, so their derived slugs would
 * match no real listing and every detail page would open with an empty reviews
 * block. Anchoring the first few reviews to hero listings from the catalogue
 * means the public pages show verified-stay reviews out of the box; the rest
 * keep their derived slug and populate the moderation queue and the customer's
 * own review list. New reviews always carry the booking's real listing slug.
 */
const CATALOG_ANCHORS: { slug: string; vertical: Booking["productKind"]; title: string }[] = [
  { slug: "the-grand-marina-resort", vertical: "hotels", title: "The Grand Marina Hotel" },
  { slug: "azure-bay-boutique-hotel", vertical: "hotels", title: "Azure Bay Boutique Hotel" },
  { slug: "cityscape-central-hotel", vertical: "hotels", title: "Cityscape Central Hotel" },
  { slug: "palm-lagoon-all-inclusive", vertical: "resorts", title: "Palm Lagoon All-Inclusive" },
  { slug: "emerald-hills-spa-resort", vertical: "resorts", title: "Emerald Hills Spa Resort" },
  { slug: "sunlit-loft-old-town", vertical: "apartments", title: "Sunlit Loft, Old Town" },
  { slug: "riverside-studio-apartment", vertical: "apartments", title: "Riverside Studio Apartment" },
  { slug: "backpackers-social-hub", vertical: "shared-rooms", title: "Backpackers Social Hub" },
  { slug: "highlights-of-tuscany-guided-tour", vertical: "tours", title: "Highlights of Tuscany" },
  { slug: "sunset-catamaran-cruise", vertical: "activities", title: "Sunset Catamaran Cruise" },
  { slug: "grand-horizon-ballroom", vertical: "convention-hall", title: "Grand Horizon Ballroom" },
  { slug: "private-airport-transfer-sedan", vertical: "transport", title: "Private Airport Transfer" },
];

export function buildReviewsSeed(bookings: Booking[]): PlatformReview[] {
  const completed = bookings
    .filter((b) => b.status === "completed" && b.productKind !== "combo")
    .slice(0, 26);

  return completed.map((booking, index) => {
    const copy = REVIEW_COPY[index % REVIEW_COPY.length];
    const isDemoCustomer = booking.customer.email === DEMO_CUSTOMER.email;
    const author = isDemoCustomer
      ? DEMO_CUSTOMER.name
      : REVIEW_AUTHORS[index % REVIEW_AUTHORS.length];
    const photos =
      index % 3 === 0
        ? [
            {
              id: `rvp_${index}_1`,
              url: REVIEW_PHOTOS[index % REVIEW_PHOTOS.length],
              caption: "Our room",
            },
            {
              id: `rvp_${index}_2`,
              url: REVIEW_PHOTOS[(index + 1) % REVIEW_PHOTOS.length],
              caption: "View from the balcony",
            },
          ]
        : [];

    const [cleanliness, location, service, value, comfort] = copy.scores;
    const rating =
      Math.round((copy.scores.reduce((s, n) => s + n, 0) / copy.scores.length) * 10) / 10;

    // Two reviews per anchor listing, then fall back to the booking's own slug.
    const anchor = CATALOG_ANCHORS[Math.floor(index / 2)];

    // Most reviews are live; a couple queue for moderation so the admin
    // moderation screen has real work waiting.
    const status: PlatformReview["status"] =
      index % 9 === 4 ? "pending" : index % 13 === 7 ? "rejected" : "published";

    return {
      id: `rev_seed_${index + 1}`,
      listingId: `lst_${anchor?.slug ?? slugify(booking.productTitle)}`,
      listingSlug: anchor?.slug ?? slugify(booking.productTitle),
      listingTitle: anchor?.title ?? booking.productTitle,
      vertical:
        anchor?.vertical === "combo" || !anchor
          ? booking.productKind === "combo"
            ? "hotels"
            : booking.productKind
          : anchor.vertical,
      merchantId: booking.merchant.id,
      merchantName: booking.merchant.name,
      bookingId: booking.id,
      bookingRef: booking.reference,
      customerEmail: booking.customer.email,
      authorName: author,
      authorAvatar: `https://i.pravatar.cc/80?img=${(index % 60) + 1}`,
      rating,
      aspects: { cleanliness, location, service, value, comfort },
      title: copy.title,
      body: copy.body,
      photos,
      verifiedStay: true,
      stayedAt: booking.endAt,
      createdAt: new Date(new Date(booking.endAt).getTime() + 2 * DAY).toISOString(),
      status,
      helpful: (index * 7) % 23,
      reports:
        index % 11 === 3
          ? [{ by: "guest@example.com", reason: "Suspected spam", at: iso(-6) }]
          : [],
      response:
        index % 4 === 1
          ? {
              authorName: booking.merchant.name,
              body: "Thank you for taking the time to write this — I've shared it with the team, and we're already working on the point you raised. We hope to welcome you back soon.",
              at: new Date(new Date(booking.endAt).getTime() + 4 * DAY).toISOString(),
            }
          : undefined,
    } satisfies PlatformReview;
  });
}

// ---------------------------------------------------------------------------
// Support tickets
// ---------------------------------------------------------------------------

const AGENTS = [
  { id: "usr_support_1", name: "Imran Hossain" },
  { id: "usr_support_2", name: "Clara Whitfield" },
  { id: "usr_support_3", name: "Tobias Lang" },
];

export function buildTicketsSeed(bookings: Booking[]): SupportTicket[] {
  const tickets: SupportTicket[] = [];
  let n = 0;

  const make = (input: Omit<SupportTicket, "id" | "reference" | "slaDueAt">): SupportTicket => {
    n += 1;
    return {
      ...input,
      id: `tkt_seed_${n}`,
      reference: `TKT-${5_200 + n}`,
      slaDueAt: new Date(
        new Date(input.createdAt).getTime() + SLA_HOURS[input.priority] * 3_600_000,
      ).toISOString(),
    };
  };

  const demoRefundBooking = bookings.find(
    (b) => b.customer.email === DEMO_CUSTOMER.email && b.status === "refund_pending",
  );
  const demoConfirmed = bookings.find(
    (b) => b.customer.email === DEMO_CUSTOMER.email && b.status === "confirmed",
  );

  if (demoRefundBooking) {
    tickets.push(
      make({
        subject: `Where is my refund for ${demoRefundBooking.reference}?`,
        category: "refund",
        priority: "high",
        status: "pending_customer",
        requesterName: DEMO_CUSTOMER.name,
        requesterEmail: DEMO_CUSTOMER.email,
        bookingId: demoRefundBooking.id,
        bookingRef: demoRefundBooking.reference,
        merchantId: demoRefundBooking.merchant.id,
        merchantName: demoRefundBooking.merchant.name,
        assigneeId: AGENTS[0].id,
        assigneeName: AGENTS[0].name,
        channel: "web",
        createdAt: iso(-3, 9),
        updatedAt: iso(-2, 14),
        firstResponseAt: iso(-3, 12),
        messages: [
          {
            id: "tmg_seed_1",
            from: "customer",
            authorName: DEMO_CUSTOMER.name,
            body: "I cancelled this booking three days ago and the refund still hasn't appeared. Could you check where it is?",
            at: iso(-3, 9),
            internal: false,
            attachments: [],
          },
          {
            id: "tmg_seed_2",
            from: "agent",
            authorName: AGENTS[0].name,
            body: "Hi Ava — thanks for flagging this. Your refund was approved and has left us; it's now with your bank. They typically take 5–10 working days to post it. I'll keep this ticket open until you confirm you've seen it.",
            at: iso(-3, 12),
            internal: false,
            attachments: [],
          },
          {
            id: "tmg_seed_3",
            from: "agent",
            authorName: AGENTS[0].name,
            body: "Finance confirmed the payout batch cleared on our side. No action needed unless she chases again after the 10th working day.",
            at: iso(-2, 14),
            internal: true,
            attachments: [],
          },
        ],
      }),
    );
  }

  if (demoConfirmed) {
    tickets.push(
      make({
        subject: "Can I get a late check-out?",
        category: "booking",
        priority: "low",
        status: "resolved",
        requesterName: DEMO_CUSTOMER.name,
        requesterEmail: DEMO_CUSTOMER.email,
        bookingId: demoConfirmed.id,
        bookingRef: demoConfirmed.reference,
        merchantId: demoConfirmed.merchant.id,
        merchantName: demoConfirmed.merchant.name,
        assigneeId: AGENTS[1].id,
        assigneeName: AGENTS[1].name,
        channel: "web",
        createdAt: iso(-9, 11),
        updatedAt: iso(-8, 10),
        firstResponseAt: iso(-9, 15),
        resolvedAt: iso(-8, 10),
        satisfaction: { rating: 5, comment: "Sorted in a couple of hours, thank you!", at: iso(-8, 11) },
        messages: [
          {
            id: "tmg_seed_4",
            from: "customer",
            authorName: DEMO_CUSTOMER.name,
            body: "Our flight isn't until the evening — is a 4pm check-out possible?",
            at: iso(-9, 11),
            internal: false,
            attachments: [],
          },
          {
            id: "tmg_seed_5",
            from: "agent",
            authorName: AGENTS[1].name,
            body: "I've asked the property and they've confirmed 4pm check-out at no charge. It's noted on your booking — just mention it at reception.",
            at: iso(-9, 15),
            internal: false,
            attachments: [],
          },
        ],
      }),
    );
  }

  // A spread of other customers' tickets so the admin inbox is realistic.
  const others = bookings
    .filter((b) => b.customer.email !== DEMO_CUSTOMER.email)
    .slice(0, 14);

  const templates: {
    subject: string;
    category: SupportTicket["category"];
    priority: SupportTicket["priority"];
    body: string;
  }[] = [
    {
      subject: "Payment taken twice",
      category: "payment",
      priority: "urgent",
      body: "My card shows two charges for the same booking. Please refund the duplicate as soon as you can.",
    },
    {
      subject: "Need to change my dates",
      category: "cancellation",
      priority: "medium",
      body: "My meeting moved — can I shift this booking forward by two days?",
    },
    {
      subject: "Room was not as described",
      category: "property",
      priority: "high",
      body: "We booked a sea view and were given a room facing the car park. Nobody at reception would help.",
    },
    {
      subject: "Invoice needs my company details",
      category: "account",
      priority: "low",
      body: "Could you reissue the invoice with our VAT number on it? Details attached.",
    },
    {
      subject: "Cancellation fee seems wrong",
      category: "refund",
      priority: "high",
      body: "The policy said free cancellation up to 5 days out and I cancelled 6 days out, but I've been charged.",
    },
    {
      subject: "No confirmation email",
      category: "booking",
      priority: "medium",
      body: "The booking shows in my account but I never received the confirmation email. Can you resend it?",
    },
    {
      subject: "Airport transfer didn't arrive",
      category: "property",
      priority: "urgent",
      body: "We waited 50 minutes and eventually took a taxi. I'd like the transfer refunded.",
    },
  ];

  others.forEach((booking, index) => {
    const template = templates[index % templates.length];
    const createdOffset = -(index + 1) * 1.4;
    const status: SupportTicket["status"] =
      index % 5 === 0
        ? "open"
        : index % 5 === 1
          ? "pending_agent"
          : index % 5 === 2
            ? "pending_customer"
            : index % 5 === 3
              ? "resolved"
              : "closed";
    const answered = status !== "open" && status !== "pending_agent";
    const agent = AGENTS[index % AGENTS.length];

    tickets.push(
      make({
        subject: template.subject,
        category: template.category,
        priority: template.priority,
        status,
        requesterName: booking.customer.name,
        requesterEmail: booking.customer.email,
        bookingId: booking.id,
        bookingRef: booking.reference,
        merchantId: booking.merchant.id,
        merchantName: booking.merchant.name,
        assigneeId: index % 4 === 0 ? undefined : agent.id,
        assigneeName: index % 4 === 0 ? undefined : agent.name,
        channel: index % 3 === 0 ? "email" : index % 7 === 0 ? "whatsapp" : "web",
        createdAt: iso(createdOffset, 9),
        updatedAt: iso(createdOffset + (answered ? 0.4 : 0), 13),
        firstResponseAt: answered ? iso(createdOffset + 0.2, 11) : undefined,
        resolvedAt: status === "resolved" || status === "closed" ? iso(createdOffset + 0.5, 15) : undefined,
        messages: [
          {
            id: `tmg_seed_o${index}_1`,
            from: "customer",
            authorName: booking.customer.name,
            body: template.body,
            at: iso(createdOffset, 9),
            internal: false,
            attachments:
              index % 6 === 3
                ? [{ id: `att_${index}`, name: "receipt.pdf", size: 184_320, kind: "document" }]
                : [],
          },
          ...(answered
            ? [
                {
                  id: `tmg_seed_o${index}_2`,
                  from: "agent" as const,
                  authorName: agent.name,
                  body: "Thanks for getting in touch — I've picked this up and I'm looking into it now. I'll come back to you with an update shortly.",
                  at: iso(createdOffset + 0.2, 11),
                  internal: false,
                  attachments: [],
                },
              ]
            : []),
        ],
      }),
    );
  });

  return tickets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ---------------------------------------------------------------------------
// Outbound messages (delivery log + customer inbox)
// ---------------------------------------------------------------------------

export function buildOutboxSeed(demoBookings: Booking[]): OutboundMessage[] {
  const rows: OutboundMessage[] = [];
  let n = 0;

  const push = (message: Omit<OutboundMessage, "id">) => {
    n += 1;
    rows.push({ ...message, id: `msg_seed_${n}` });
  };

  for (const booking of demoBookings.slice(0, 6)) {
    const at = booking.createdAt;
    const total = `$${booking.money.total.toFixed(2)}`;
    const dates = `${booking.startAt.slice(0, 10)} → ${booking.endAt.slice(0, 10)}`;

    push({
      templateKey: "booking_confirmed",
      channel: "email",
      category: "booking",
      to: DEMO_CUSTOMER.email,
      customerEmail: DEMO_CUSTOMER.email,
      subject: `Your booking ${booking.reference} is confirmed`,
      body: `Hi Ava, your booking at ${booking.productTitle} is confirmed.\n\nReference: ${booking.reference}\nDates: ${dates}\nTotal: ${total}`,
      status: "delivered",
      createdAt: at,
      deliveredAt: at,
      bookingId: booking.id,
      bookingRef: booking.reference,
      href: `/account/bookings/${booking.id}`,
    });
    push({
      templateKey: "booking_confirmed",
      channel: "inapp",
      category: "booking",
      to: DEMO_CUSTOMER.email,
      customerEmail: DEMO_CUSTOMER.email,
      subject: `Your booking ${booking.reference} is confirmed`,
      body: `${booking.productTitle} is confirmed for ${dates}.`,
      status: booking.status === "confirmed" ? "delivered" : "read",
      createdAt: at,
      deliveredAt: at,
      readAt: booking.status === "confirmed" ? undefined : at,
      bookingId: booking.id,
      bookingRef: booking.reference,
      href: `/account/bookings/${booking.id}`,
    });
  }

  const upcoming = demoBookings.find((b) => b.status === "confirmed");
  if (upcoming) {
    push({
      templateKey: "pre_arrival",
      channel: "inapp",
      category: "reminder",
      to: DEMO_CUSTOMER.email,
      customerEmail: DEMO_CUSTOMER.email,
      subject: `See you soon at ${upcoming.productTitle}`,
      body: `Your stay starts ${upcoming.startAt.slice(0, 10)}. Check-in from 3pm — bring photo ID for every guest.`,
      status: "delivered",
      createdAt: iso(-1, 8),
      deliveredAt: iso(-1, 8),
      bookingId: upcoming.id,
      bookingRef: upcoming.reference,
      href: `/account/bookings/${upcoming.id}`,
    });
  }

  const completed = demoBookings.find((b) => b.status === "completed");
  if (completed) {
    push({
      templateKey: "review_invite",
      channel: "inapp",
      category: "review",
      to: DEMO_CUSTOMER.email,
      customerEmail: DEMO_CUSTOMER.email,
      subject: `How was ${completed.productTitle}?`,
      body: "A short review helps other travellers — and earns you loyalty points.",
      status: "delivered",
      createdAt: iso(-5, 10),
      deliveredAt: iso(-5, 10),
      bookingId: completed.id,
      bookingRef: completed.reference,
      href: `/account/reviews`,
    });
  }

  // A failed send so the admin delivery log has a red row to investigate.
  push({
    templateKey: "payment_failed",
    channel: "sms",
    category: "payment",
    to: DEMO_CUSTOMER_PHONE,
    customerEmail: DEMO_CUSTOMER.email,
    subject: "We couldn't take payment",
    body: "Payment failed. Retry to keep your dates.",
    status: "failed",
    createdAt: iso(-7, 16),
    failureReason: "Handset unreachable (simulated)",
  });

  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Build every extra collection from one cloned booking list. */
export function buildExtras(bookings: Booking[]) {
  const demoBookings = assignDemoCustomer(bookings);
  return {
    loyalty: buildLoyaltySeed(demoBookings),
    walletCoupons: structuredClone(WALLET_COUPONS_SEED),
    referrals: structuredClone(REFERRALS_SEED),
    reviews: buildReviewsSeed(bookings),
    tickets: buildTicketsSeed(bookings),
    outbox: buildOutboxSeed(demoBookings),
  };
}

/** Re-export so callers don't reach into `seed.ts` for the booking list. */
export { BOOKINGS_SEED };
