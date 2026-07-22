/**
 * Seeded traveler-account dataset.
 *
 * One cohesive personal history for the demo traveler: bookings point at real
 * catalog listings, and invoices, payments, reviews, threads, notifications,
 * coupons and the rewards ledger are all derived from those bookings so the
 * numbers reconcile (a payment exists for every paid booking, an invoice for
 * every trip, etc.). Everything is generated from a fixed seed at module load —
 * no `Date.now()` / `Math.random()` — so server and client render identically.
 *
 * A real backend replaces this whole module; the {@link "@/services/account"}
 * seam and the UI stay unchanged.
 */

import type {
  AccountNotification,
  Coupon,
  Invoice,
  MessageThread,
  PaymentTxn,
  RewardEntry,
  SavedCard,
  SavedTraveler,
  TravelerBooking,
  TravelerReview,
} from "@/types/traveler";
import type { Listing } from "@/types/catalog";
import type { BookingStatus } from "@/types/traveler";
import { SeededRandom, MOCK_EPOCH_MS, hashString } from "@/lib/random";
import { SEED_ACCOUNTS } from "@/constants/accounts";
import {
  ACTIVITIES,
  APARTMENTS,
  CONVENTION_HALLS,
  HOTELS,
  RESORTS,
  SHARED_ROOMS,
  TOURS,
  TRANSPORT,
  VISAS,
} from "@/constants/listings";

const TRAVELER = SEED_ACCOUNTS[0];
const DAY = 86_400_000;

const ALL_LISTINGS: Listing[] = [
  ...HOTELS,
  ...APARTMENTS,
  ...RESORTS,
  ...SHARED_ROOMS,
  ...CONVENTION_HALLS,
  ...TRANSPORT,
  ...TOURS,
  ...ACTIVITIES,
  ...VISAS,
];

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY).toISOString();
}

/** Deterministic base-36 reference token from a seed number. */
function ref(prefix: string, seed: number): string {
  return `${prefix}-${(seed >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6)}`;
}

/** How many nights/units a stay in this vertical typically runs. */
function nightsFor(listing: Listing, rng: SeededRandom): number {
  switch (listing.vertical) {
    case "hotels":
    case "apartments":
    case "resorts":
    case "shared-rooms":
      return rng.int(2, 9);
    case "tours":
      return listing.durationDays;
    case "convention-hall":
      return rng.int(1, 3);
    default:
      // transport, activities, visa — single-day
      return 1;
  }
}

const STATUS_PLAN: BookingStatus[] = [
  "upcoming",
  "upcoming",
  "upcoming",
  "pending",
  "completed",
  "completed",
  "completed",
  "completed",
  "completed",
  "completed",
  "completed",
  "completed",
  "completed",
  "cancelled",
  "cancelled",
  "completed",
];

const CANCELLATION_POLICIES = [
  "Free cancellation up to 48 hours before check-in.",
  "Free cancellation up to 7 days before arrival, then 50% charge.",
  "Non-refundable — best available rate.",
  "Flexible: full refund up to 24 hours before start.",
];

const COMPANIONS = [
  "James Thompson",
  "Mia Thompson",
  "Olivia Carter",
  "Noah Bennett",
  "Sophia Reyes",
];

// ---------------------------------------------------------------------------
// Bookings — the spine everything else derives from.
// ---------------------------------------------------------------------------

function buildBookings(): TravelerBooking[] {
  const rng = new SeededRandom("stayora:bookings:v1");
  const pool = rng.shuffle(ALL_LISTINGS).slice(0, STATUS_PLAN.length);

  return pool.map((listing, i) => {
    const status = STATUS_PLAN[i];
    const seed = hashString(`${listing.id}:${i}`);
    const local = new SeededRandom(seed);

    const nights = nightsFor(listing, local);
    // Anchor dates so "upcoming" lands comfortably in the future of the epoch.
    const checkIn =
      status === "upcoming"
        ? local.isoDate(MOCK_EPOCH_MS, 210, 470)
        : status === "pending"
          ? local.isoDate(MOCK_EPOCH_MS, 30, 160)
          : local.isoDate(MOCK_EPOCH_MS, -430, -25);
    const checkOut = addDays(checkIn, nights);

    const rooms =
      listing.vertical === "hotels" || listing.vertical === "resorts"
        ? local.int(1, 2)
        : 1;
    const guests = local.int(1, 4);
    const nightly = listing.price.amount;
    const totalUsd = Math.round(nightly * nights * rooms + local.int(0, 60));

    const reviewed = status === "completed" && local.bool(0.6);
    const bookedAt = addDays(checkIn, -local.int(9, 60));

    const guestNames = [
      TRAVELER.name,
      ...local.pickMany(COMPANIONS, Math.max(0, guests - 1)),
    ];

    const id = `bkg_${String(i + 1).padStart(3, "0")}`;
    return {
      id,
      reference: ref("SO", seed),
      listingId: listing.id,
      listingSlug: listing.slug,
      vertical: listing.vertical,
      title: listing.title,
      image: listing.image,
      location: listing.location.label,
      checkIn,
      checkOut,
      nights,
      guests,
      rooms,
      status,
      totalUsd,
      paymentMethod: local.bool(0.7) ? "Visa •••• 4242" : "Mastercard •••• 8319",
      invoiceId: `inv_${String(i + 1).padStart(3, "0")}`,
      bookedAt,
      reviewed,
      guestNames,
      specialRequests: local.bool(0.35)
        ? local.pick([
            "Late check-in around 11pm.",
            "High floor with a city view if possible.",
            "Vegetarian breakfast for two.",
            "Airport pickup requested.",
          ])
        : undefined,
      cancellationPolicy: local.pick(CANCELLATION_POLICIES),
    } satisfies TravelerBooking;
  });
}

const BOOKINGS = buildBookings();

// ---------------------------------------------------------------------------
// Invoices — one per non-cancelled booking (cancelled → refunded/void).
// ---------------------------------------------------------------------------

function buildInvoices(): Invoice[] {
  return BOOKINGS.map((b, i) => {
    const rng = new SeededRandom(hashString(`inv:${b.id}`));
    const subtotalUsd = Math.round((b.totalUsd / 1.14) * 100) / 100;
    const taxesUsd = Math.round(subtotalUsd * 0.1 * 100) / 100;
    const feesUsd = Math.round((b.totalUsd - subtotalUsd - taxesUsd) * 100) / 100;
    const discountUsd = rng.bool(0.3) ? rng.int(10, 80) : 0;

    const status =
      b.status === "cancelled"
        ? rng.bool(0.6)
          ? "refunded"
          : "void"
        : b.status === "pending"
          ? "due"
          : "paid";

    return {
      id: b.invoiceId,
      number: `INV-2026-${String(i + 1).padStart(4, "0")}`,
      bookingId: b.id,
      bookingRef: b.reference,
      title: b.title,
      issuedAt: b.bookedAt,
      dueAt: addDays(b.bookedAt, 7),
      status,
      subtotalUsd,
      taxesUsd,
      feesUsd: Math.max(0, feesUsd),
      discountUsd,
      totalUsd: Math.max(0, b.totalUsd - discountUsd),
      billTo: {
        name: TRAVELER.name,
        email: TRAVELER.email,
        country: TRAVELER.country,
      },
    } satisfies Invoice;
  });
}

const INVOICES = buildInvoices();

// ---------------------------------------------------------------------------
// Payments — a charge per paid booking, a refund for refunded cancellations.
// ---------------------------------------------------------------------------

function buildPayments(): PaymentTxn[] {
  const txns: PaymentTxn[] = [];
  BOOKINGS.forEach((b, i) => {
    const invoice = INVOICES[i];
    const brand = b.paymentMethod.startsWith("Visa") ? "visa" : "mastercard";

    if (invoice.status === "paid" || invoice.status === "refunded") {
      txns.push({
        id: `pay_${String(i + 1).padStart(3, "0")}c`,
        bookingId: b.id,
        bookingRef: b.reference,
        description: `Payment · ${b.title}`,
        method: b.paymentMethod,
        brand,
        amountUsd: invoice.totalUsd,
        type: "charge",
        status: "succeeded",
        date: b.bookedAt,
      });
    }
    if (invoice.status === "refunded") {
      txns.push({
        id: `pay_${String(i + 1).padStart(3, "0")}r`,
        bookingId: b.id,
        bookingRef: b.reference,
        description: `Refund · ${b.title}`,
        method: b.paymentMethod,
        brand,
        amountUsd: invoice.totalUsd,
        type: "refund",
        status: "refunded",
        date: addDays(b.bookedAt, 3),
      });
    }
    if (invoice.status === "due") {
      txns.push({
        id: `pay_${String(i + 1).padStart(3, "0")}p`,
        bookingId: b.id,
        bookingRef: b.reference,
        description: `Pending authorization · ${b.title}`,
        method: b.paymentMethod,
        brand,
        amountUsd: invoice.totalUsd,
        type: "charge",
        status: "pending",
        date: b.bookedAt,
      });
    }
  });
  return txns.sort((a, z) => (a.date < z.date ? 1 : -1));
}

const PAYMENTS = buildPayments();

// ---------------------------------------------------------------------------
// Reviews the traveler has written (from reviewed completed bookings).
// ---------------------------------------------------------------------------

const REVIEW_TITLES = [
  "Exactly as pictured — would return",
  "A wonderful stay",
  "Great value, minor niggles",
  "Unforgettable experience",
  "Comfortable and central",
  "Smooth from start to finish",
  "Better than expected",
];

const REVIEW_BODIES = [
  "The location was perfect and the host was incredibly responsive. Everything was spotless on arrival and check-in couldn't have been easier.",
  "We had a fantastic time. The photos don't quite do it justice — the views were even better in person and the amenities were top notch.",
  "Solid choice for the price. A couple of small things could be improved, but nothing that would stop us booking again.",
  "One of the highlights of our whole trip. Well organised, friendly staff, and worth every penny.",
  "Clean, quiet and close to everything we wanted to see. Would happily recommend to friends.",
];

function buildReviews(): TravelerReview[] {
  return BOOKINGS.filter((b) => b.reviewed).map((b, i) => {
    const rng = new SeededRandom(hashString(`rev:${b.id}`));
    const createdAt = addDays(b.checkOut, rng.int(2, 20));
    const withResponse = rng.bool(0.5);
    return {
      id: `rvw_${String(i + 1).padStart(3, "0")}`,
      listingId: b.listingId,
      listingSlug: b.listingSlug,
      vertical: b.vertical,
      listingTitle: b.title,
      listingImage: b.image,
      bookingRef: b.reference,
      rating: rng.int(3, 5),
      title: rng.pick(REVIEW_TITLES),
      body: rng.pick(REVIEW_BODIES),
      createdAt,
      helpfulCount: rng.int(0, 34),
      response: withResponse
        ? {
            author: "Property host",
            body: "Thank you so much for the kind words — we'd love to welcome you back on your next visit!",
            date: addDays(createdAt, rng.int(1, 6)),
          }
        : undefined,
    } satisfies TravelerReview;
  });
}

const REVIEWS = buildReviews();

// ---------------------------------------------------------------------------
// Message threads.
// ---------------------------------------------------------------------------

function buildThreads(): MessageThread[] {
  const hostBookings = BOOKINGS.filter(
    (b) => b.status === "upcoming" || b.status === "completed",
  ).slice(0, 4);

  const threads: MessageThread[] = hostBookings.map((b, i) => {
    const local = new SeededRandom(hashString(`thr:${b.id}`));
    const base = addDays(b.bookedAt, local.int(1, 5));
    const unread = i === 0 ? local.int(1, 2) : local.bool(0.3) ? 1 : 0;
    const messages: MessageThread["messages"] = [
      {
        id: `${b.id}-m1`,
        from: "me",
        authorName: TRAVELER.name,
        body: `Hi! Looking forward to my stay at ${b.title}. Is early check-in possible?`,
        sentAt: base,
      },
      {
        id: `${b.id}-m2`,
        from: "them",
        authorName: `${b.location.split(",")[0]} Host`,
        body: "Hello and welcome! Early check-in from 12pm should be no problem. I'll send door codes the day before.",
        sentAt: addDays(base, 1),
      },
      {
        id: `${b.id}-m3`,
        from: "me",
        authorName: TRAVELER.name,
        body: "Perfect, thank you so much!",
        sentAt: addDays(base, 1),
      },
    ];
    return {
      id: `thr_${String(i + 1).padStart(3, "0")}`,
      subject: b.title,
      counterpart: {
        name: `${b.location.split(",")[0]} Host`,
        role: "Host",
        avatar: `https://i.pravatar.cc/120?img=${11 + i}`,
      },
      bookingRef: b.reference,
      listingTitle: b.title,
      lastMessageAt: messages[messages.length - 1].sentAt,
      unread,
      messages,
    } satisfies MessageThread;
  });

  // A support thread.
  const supportBase = new SeededRandom("stayora:support").isoDate(MOCK_EPOCH_MS, 40, 120);
  threads.push({
    id: "thr_support",
    subject: "Refund status for cancelled booking",
    counterpart: { name: "StayOra Support", role: "Support", avatar: undefined },
    lastMessageAt: addDays(supportBase, 1),
    unread: 1,
    messages: [
      {
        id: "sup-m1",
        from: "me",
        authorName: TRAVELER.name,
        body: "Hi, I cancelled a booking last week — when should I expect the refund?",
        sentAt: supportBase,
      },
      {
        id: "sup-m2",
        from: "them",
        authorName: "StayOra Support",
        body: "Thanks for reaching out! Your refund has been processed and should land within 5–7 business days. Let us know if there's anything else.",
        sentAt: addDays(supportBase, 1),
      },
    ],
  });

  return threads.sort((a, z) => (a.lastMessageAt < z.lastMessageAt ? 1 : -1));
}

const THREADS = buildThreads();

// ---------------------------------------------------------------------------
// Notifications.
// ---------------------------------------------------------------------------

function buildNotifications(): AccountNotification[] {
  const rng = new SeededRandom("stayora:notifs:v1");
  const items: AccountNotification[] = [];

  BOOKINGS.filter((b) => b.status === "upcoming")
    .slice(0, 3)
    .forEach((b, i) =>
      items.push({
        id: `ntf_bk_${i}`,
        type: "booking",
        title: "Trip coming up",
        body: `Your stay at ${b.title} starts soon. Tap to view your itinerary.`,
        date: addDays(b.checkIn, -rng.int(3, 10)),
        read: false,
        href: `/account/bookings/${b.id}`,
      }),
    );

  BOOKINGS.filter((b) => b.status === "completed" && !b.reviewed)
    .slice(0, 2)
    .forEach((b, i) =>
      items.push({
        id: `ntf_rv_${i}`,
        type: "review",
        title: "How was your trip?",
        body: `Leave a review for ${b.title} and earn 50 reward points.`,
        date: addDays(b.checkOut, rng.int(1, 4)),
        read: rng.bool(0.4),
        href: "/account/reviews",
      }),
    );

  const promos = [
    ["Weekend flash sale", "Save up to 25% on city stays booked this weekend.", "/search?q=city"],
    ["You've earned Gold perks", "Enjoy free room upgrades and late checkout on your next stay.", "/account/rewards"],
    ["A coupon just for you", "Use WELCOME15 for 15% off your next tour.", "/account/coupons"],
  ] as const;
  promos.forEach(([title, body, href], i) =>
    items.push({
      id: `ntf_pr_${i}`,
      type: "promo",
      title,
      body,
      date: rng.isoDate(MOCK_EPOCH_MS, 20, 150),
      read: rng.bool(0.5),
      href,
    }),
  );

  items.push({
    id: "ntf_pay_0",
    type: "payment",
    title: "Payment received",
    body: "We've received your payment. Your invoice is ready to download.",
    date: rng.isoDate(MOCK_EPOCH_MS, 30, 120),
    read: true,
    href: "/account/invoices",
  });
  items.push({
    id: "ntf_sys_0",
    type: "system",
    title: "New login to your account",
    body: "A new sign-in was detected from Chrome on macOS. Not you? Review your security settings.",
    date: rng.isoDate(MOCK_EPOCH_MS, 10, 60),
    read: false,
    href: "/account/security",
  });

  return items.sort((a, z) => (a.date < z.date ? 1 : -1));
}

const NOTIFICATIONS = buildNotifications();

// ---------------------------------------------------------------------------
// Coupons, rewards ledger, saved cards & travelers.
// ---------------------------------------------------------------------------

const COUPONS: Coupon[] = [
  {
    id: "cpn_001",
    code: "WELCOME15",
    title: "15% off your next booking",
    description: "New-member welcome offer. Applies to stays and tours.",
    kind: "percent",
    value: 15,
    minSpendUsd: 100,
    expiresAt: new Date(MOCK_EPOCH_MS + 300 * DAY).toISOString(),
    status: "active",
    scope: "Stays & tours",
  },
  {
    id: "cpn_002",
    code: "GOLD50",
    title: "$50 Gold-tier travel credit",
    description: "A thank-you for reaching Gold status.",
    kind: "fixed",
    value: 50,
    minSpendUsd: 250,
    expiresAt: new Date(MOCK_EPOCH_MS + 210 * DAY).toISOString(),
    status: "active",
    scope: "All bookings",
  },
  {
    id: "cpn_003",
    code: "SUMMER20",
    title: "20% off summer resorts",
    description: "Seasonal offer on selected resort stays.",
    kind: "percent",
    value: 20,
    minSpendUsd: 300,
    expiresAt: new Date(MOCK_EPOCH_MS + 90 * DAY).toISOString(),
    status: "active",
    scope: "Resorts",
  },
  {
    id: "cpn_004",
    code: "TOURS10",
    title: "$10 off any tour",
    description: "Used on your Kyoto cultural tour.",
    kind: "fixed",
    value: 10,
    expiresAt: new Date(MOCK_EPOCH_MS - 40 * DAY).toISOString(),
    status: "used",
    scope: "Tours",
  },
  {
    id: "cpn_005",
    code: "FEB25",
    title: "25% off winter getaways",
    description: "Offer window has closed.",
    kind: "percent",
    value: 25,
    expiresAt: new Date(MOCK_EPOCH_MS - 120 * DAY).toISOString(),
    status: "expired",
    scope: "Stays",
  },
  {
    id: "cpn_006",
    code: "FREECAB",
    title: "Free airport transfer",
    description: "One complimentary standard airport transfer.",
    kind: "fixed",
    value: 35,
    expiresAt: new Date(MOCK_EPOCH_MS + 150 * DAY).toISOString(),
    status: "active",
    scope: "Transport",
  },
];

function buildRewards(): RewardEntry[] {
  const entries: RewardEntry[] = [];
  const completed = BOOKINGS.filter((b) => b.status === "completed");
  completed.forEach((b, i) => {
    entries.push({
      id: `rwd_e_${i}`,
      date: addDays(b.checkOut, 1),
      description: `Points earned · ${b.title}`,
      direction: "earned",
      points: Math.max(50, Math.round(b.totalUsd / 5)),
      bookingRef: b.reference,
    });
  });
  const rng = new SeededRandom("stayora:rewards:v1");
  entries.push({
    id: "rwd_bonus_0",
    date: rng.isoDate(MOCK_EPOCH_MS, -200, -120),
    description: "Welcome bonus",
    direction: "bonus",
    points: 500,
  });
  entries.push({
    id: "rwd_bonus_1",
    date: rng.isoDate(MOCK_EPOCH_MS, -90, -30),
    description: "Gold tier upgrade bonus",
    direction: "bonus",
    points: 1000,
  });
  entries.push({
    id: "rwd_redeem_0",
    date: rng.isoDate(MOCK_EPOCH_MS, -60, -10),
    description: "Redeemed for $50 travel credit",
    direction: "redeemed",
    points: 5000,
  });
  return entries.sort((a, z) => (a.date < z.date ? 1 : -1));
}

const REWARDS = buildRewards();

const SEED_SAVED_CARDS: SavedCard[] = [
  {
    id: "card_001",
    brand: "visa",
    last4: "4242",
    expMonth: 11,
    expYear: 2028,
    holder: TRAVELER.name,
    isDefault: true,
    billingCountry: TRAVELER.country,
  },
  {
    id: "card_002",
    brand: "mastercard",
    last4: "8319",
    expMonth: 4,
    expYear: 2027,
    holder: TRAVELER.name,
    isDefault: false,
    billingCountry: TRAVELER.country,
  },
];

const SEED_SAVED_TRAVELERS: SavedTraveler[] = [
  {
    id: "trv_001",
    fullName: TRAVELER.name,
    relationship: "Self",
    email: TRAVELER.email,
    phone: TRAVELER.phone,
    nationality: TRAVELER.country,
    dateOfBirth: "1992-06-14",
    passportNumber: "X1234567",
    passportExpiry: "2030-08-01",
    isPrimary: true,
  },
  {
    id: "trv_002",
    fullName: "James Thompson",
    relationship: "Spouse",
    email: "james.t@example.com",
    nationality: "US",
    dateOfBirth: "1990-02-03",
    passportNumber: "X7654321",
    passportExpiry: "2029-05-20",
    isPrimary: false,
  },
  {
    id: "trv_003",
    fullName: "Mia Thompson",
    relationship: "Child",
    nationality: "US",
    dateOfBirth: "2015-09-30",
    isPrimary: false,
  },
];

/** Default wishlist — a handful of listings, by id (persisted store seeds from this). */
const WISHLIST_SEED_IDS: string[] = new SeededRandom("stayora:wishlist:v1")
  .shuffle(ALL_LISTINGS)
  .slice(0, 6)
  .map((l) => l.id);

export const ACCOUNT_DATA = {
  bookings: BOOKINGS,
  invoices: INVOICES,
  payments: PAYMENTS,
  reviews: REVIEWS,
  threads: THREADS,
  notifications: NOTIFICATIONS,
  coupons: COUPONS,
  rewards: REWARDS,
  savedCards: SEED_SAVED_CARDS,
  savedTravelers: SEED_SAVED_TRAVELERS,
  wishlistSeedIds: WISHLIST_SEED_IDS,
};
