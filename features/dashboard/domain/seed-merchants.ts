/**
 * The merchant dataset.
 *
 * These are the *same ten merchants* the booking seed has always referenced
 * (`mrc_azure`, `mrc_highline`, …) with the same names and the same percentage
 * commission — now carried as full {@link Merchant} records instead of a bare
 * `{id, name, commissionRate}` tuple. `MERCHANTS` in `seed.ts` is derived from
 * this file, so a booking's merchant snapshot and the admin merchant screen can
 * never drift apart again.
 *
 * Four extra applicants sit in the pre-approval states so the review queue,
 * onboarding checklist and rejection/resubmission flows have something real to
 * act on out of the box.
 */

import type { BookingVertical } from "@/types/booking";
import {
  DISCONNECTED_CHANNEL,
  MERCHANT_PLANS,
  type BusinessType,
  type ChannelConnection,
  type Merchant,
  type MerchantBankAccount,
  type MerchantContract,
  type MerchantDocument,
  type MerchantDocumentType,
  type MerchantPlanId,
  type MerchantProperty,
  type MerchantRoleId,
  type MerchantStaff,
  type MerchantStatus,
  type MerchantSubscription,
} from "./merchants";

/** Fixed clock so every derived date is deterministic across renders/SSR. */
const REF = Date.UTC(2026, 7, 11); // 2026-08-11, matching PLATFORM_NOW
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(REF - daysAgo * DAY).toISOString();
const isoAhead = (daysAhead: number) => new Date(REF + daysAhead * DAY).toISOString();

/** The agreement every merchant on the platform signs. */
export const CONTRACT_VERSION = "2026.1";

const CONTRACT_CLAUSES = [
  "Commission is charged on the net sale value of every confirmed booking.",
  "Settlements are paid per the payout term below, net of refunds and adjustments.",
  "Rates and availability supplied to Otithee must match the merchant's own channels.",
  "Cancellations follow the policy attached to each listing; the platform retains an administration share of any cancellation fee.",
  "Either party may terminate with the notice period below; outstanding settlements are paid in full.",
];

function contract(rate: number, payoutTermDays: number, acceptedDaysAgo?: number): MerchantContract {
  return {
    version: CONTRACT_VERSION,
    commissionRate: rate,
    commissionBasis: "net",
    payoutTermDays,
    noticeDays: 30,
    clauses: CONTRACT_CLAUSES,
    acceptedAt: acceptedDaysAgo === undefined ? undefined : iso(acceptedDaysAgo),
    acceptedBy: acceptedDaysAgo === undefined ? undefined : "Authorised signatory",
    acceptedIp: acceptedDaysAgo === undefined ? undefined : "203.0.113.24",
  };
}

function subscription(planId: MerchantPlanId, startedDaysAgo: number): MerchantSubscription {
  const plan = MERCHANT_PLANS[planId];
  return {
    planId,
    status: "active",
    billingCycle: plan.billingCycle,
    price: plan.price,
    startedAt: iso(startedDaysAgo),
    renewsAt: isoAhead(30 - (startedDaysAgo % 30)),
    autoRenew: true,
  };
}

function documents(
  merchantId: string,
  types: MerchantDocumentType[],
  status: MerchantDocument["status"],
  labels: Record<MerchantDocumentType, string>,
  seed: number,
): MerchantDocument[] {
  return types.map((type, i) => ({
    id: `${merchantId}_doc_${i + 1}`,
    merchantId,
    type,
    label: labels[type],
    fileName: `${type}-${merchantId.replace("mrc_", "")}.pdf`,
    fileUrl: `mock://merchant-docs/${merchantId}/${type}.pdf`,
    sizeKb: 180 + ((seed + i * 37) % 640),
    status,
    uploadedAt: iso(120 - i * 4 + (seed % 10)),
    verifiedAt: status === "approved" ? iso(100 - i * 4) : undefined,
    reviewedBy: status === "approved" ? "Compliance Team" : undefined,
  }));
}

function bank(
  holder: string,
  bankName: string,
  country: string,
  currency: string,
  status: MerchantBankAccount["status"],
  seed: number,
  schedule: MerchantBankAccount["schedule"] = "monthly",
): MerchantBankAccount {
  return {
    accountHolder: holder,
    bankName,
    accountNumberMasked: `•••• ${4000 + (seed % 5000)}`,
    branch: "Main branch",
    iban: `${country.slice(0, 2).toUpperCase()}00 ${1000 + seed} ${2000 + seed} ${3000 + seed}`,
    swift: `${bankName.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase()}${country.slice(0, 2).toUpperCase()}2X`,
    country,
    currency,
    method: "bank_transfer",
    schedule,
    status,
    addedAt: iso(110),
    verifiedAt: status === "verified" ? iso(95) : undefined,
  };
}

function staff(
  merchantId: string,
  people: { name: string; email: string; role: MerchantRoleId }[],
): MerchantStaff[] {
  return people.map((p, i) => ({
    id: `${merchantId}_stf_${i + 1}`,
    merchantId,
    name: p.name,
    email: p.email,
    role: p.role,
    propertyIds: [],
    status: "active" as const,
    invitedAt: iso(200 - i * 12),
    acceptedAt: iso(198 - i * 12),
    lastActiveAt: iso(i),
  }));
}

const CONNECTED: ChannelConnection = {
  provider: "siteminder",
  status: "connected",
  externalRef: "SM-88231",
  scopes: ["inventory", "rates", "availability", "reservations"],
  lastSyncAt: iso(0),
};

const SYNC_ERROR: ChannelConnection = {
  provider: "cloudbeds",
  status: "error",
  externalRef: "CB-40127",
  scopes: ["inventory", "rates", "availability"],
  lastSyncAt: iso(3),
  message: "Rate plan mapping is out of date — 2 room types could not be matched.",
};

function property(
  merchantId: string,
  index: number,
  name: string,
  vertical: BookingVertical,
  city: string,
  country: string,
  units: number,
  channel: ChannelConnection = DISCONNECTED_CHANNEL,
): MerchantProperty {
  return {
    id: `${merchantId}_prp_${index}`,
    merchantId,
    name,
    vertical,
    city,
    country,
    addressLine: `${100 + index * 7} Harbour Road`,
    status: "active",
    units,
    listingIds: [],
    createdAt: iso(300 - index * 20),
    channel,
  };
}

const DOC_LABELS: Record<MerchantDocumentType, string> = {
  business_registration: "Business registration certificate",
  tax_certificate: "Tax registration (VAT/GST)",
  ownership_proof: "Ownership / shareholding proof",
  operating_licence: "Operating licence",
  identity_document: "Authorised signatory ID",
  bank_confirmation: "Bank account confirmation letter",
  supporting: "Supporting document",
};

const APPROVED_DOC_TYPES: MerchantDocumentType[] = [
  "business_registration",
  "tax_certificate",
  "identity_document",
  "bank_confirmation",
];

/** Compact spec for a fully-onboarded, trading merchant. */
interface TradingSpec {
  id: string;
  name: string;
  slug: string;
  legalSuffix: string;
  businessType: BusinessType;
  commissionRate: number;
  verticals: BookingVertical[];
  city: string;
  country: string;
  currency: string;
  contactName: string;
  contactRole: string;
  plan: MerchantPlanId;
  description: string;
  properties: {
    name: string;
    vertical: BookingVertical;
    city: string;
    units: number;
    channel?: ChannelConnection;
  }[];
  team: { name: string; email: string; role: MerchantRoleId }[];
}

const TRADING: TradingSpec[] = [
  {
    id: "mrc_azure",
    name: "Azure Bay Hospitality",
    slug: "azure-bay-hospitality",
    legalSuffix: "Hospitality Group Ltd.",
    businessType: "private_limited",
    commissionRate: 12,
    verticals: ["hotels", "resorts"],
    city: "Dubai",
    country: "United Arab Emirates",
    currency: "USD",
    contactName: "Marco Silva",
    contactRole: "Director of Distribution",
    plan: "premium",
    description:
      "A collection of waterfront hotels and resorts across the Gulf and Indian Ocean, operating eleven properties with a shared reservations team.",
    properties: [
      { name: "Azure Bay Dubai Marina", vertical: "hotels", city: "Dubai", units: 220, channel: CONNECTED },
      { name: "Azure Bay Maldives Retreat", vertical: "resorts", city: "Maldives", units: 84, channel: CONNECTED },
      { name: "Azure Bay Bangkok Riverside", vertical: "hotels", city: "Bangkok", units: 160 },
    ],
    team: [
      { name: "Marco Silva", email: "marco@azurebay.com", role: "owner" },
      { name: "Lina Haddad", email: "lina@azurebay.com", role: "manager" },
      { name: "Omar Farouk", email: "omar@azurebay.com", role: "revenue_manager" },
      { name: "Grace Tan", email: "grace@azurebay.com", role: "reservations" },
      { name: "Yusuf Ali", email: "yusuf@azurebay.com", role: "front_desk" },
      { name: "Nadia Rahman", email: "nadia@azurebay.com", role: "finance" },
    ],
  },
  {
    id: "mrc_highline",
    name: "Highline Hotel Group",
    slug: "highline-hotel-group",
    legalSuffix: "Hotels PLC",
    businessType: "public_limited",
    commissionRate: 14,
    verticals: ["hotels", "convention-hall"],
    city: "London",
    country: "United Kingdom",
    currency: "USD",
    contactName: "Eleanor Boyd",
    contactRole: "Head of Partnerships",
    plan: "premium",
    description:
      "City-centre business hotels with attached convention and event space, serving corporate and MICE demand across Europe.",
    properties: [
      { name: "Highline London Bridge", vertical: "hotels", city: "London", units: 310, channel: CONNECTED },
      { name: "Highline Conference Centre", vertical: "convention-hall", city: "London", units: 6 },
    ],
    team: [
      { name: "Eleanor Boyd", email: "eleanor@highlinehotels.com", role: "owner" },
      { name: "Peter Cross", email: "peter@highlinehotels.com", role: "manager" },
      { name: "Aisha Bello", email: "aisha@highlinehotels.com", role: "revenue_manager" },
    ],
  },
  {
    id: "mrc_marina",
    name: "Marina Living Apartments",
    slug: "marina-living-apartments",
    legalSuffix: "Serviced Living Ltd.",
    businessType: "private_limited",
    commissionRate: 15,
    verticals: ["apartments"],
    city: "Singapore",
    country: "Singapore",
    currency: "USD",
    contactName: "Wei Chen",
    contactRole: "Operations Lead",
    plan: "professional",
    description:
      "Serviced apartments for extended stays in central business districts, with weekly housekeeping and long-stay rates.",
    properties: [
      { name: "Marina Living Central", vertical: "apartments", city: "Singapore", units: 92, channel: SYNC_ERROR },
      { name: "Marina Living Riverside", vertical: "apartments", city: "Kuala Lumpur", units: 64 },
    ],
    team: [
      { name: "Wei Chen", email: "wei@marinaliving.com", role: "owner" },
      { name: "Sofia Reyes", email: "sofia@marinaliving.com", role: "reservations" },
    ],
  },
  {
    id: "mrc_cedar",
    name: "Cedarwood Stays",
    slug: "cedarwood-stays",
    legalSuffix: "Stays Ltd.",
    businessType: "private_limited",
    commissionRate: 11,
    verticals: ["hotels", "apartments"],
    city: "Istanbul",
    country: "Türkiye",
    currency: "USD",
    contactName: "Elif Demir",
    contactRole: "Founder",
    plan: "professional",
    description:
      "Boutique hotels and design apartments in historic districts, run by a small owner-operated team with a strong review record.",
    properties: [
      { name: "Cedarwood Old Town", vertical: "hotels", city: "Istanbul", units: 38 },
      { name: "Cedarwood Residences", vertical: "apartments", city: "Istanbul", units: 24 },
    ],
    team: [
      { name: "Elif Demir", email: "elif@cedarwoodstays.com", role: "owner" },
      { name: "Kerem Yilmaz", email: "kerem@cedarwoodstays.com", role: "manager" },
    ],
  },
  {
    id: "mrc_sunset",
    name: "Sunset Collective",
    slug: "sunset-collective",
    legalSuffix: "Collective Co-op",
    businessType: "partnership",
    commissionRate: 13,
    verticals: ["shared-rooms", "tours", "activities"],
    city: "Bangkok",
    country: "Thailand",
    currency: "USD",
    contactName: "Anong Suwan",
    contactRole: "Partner",
    plan: "professional",
    description:
      "Hostels and social stays paired with small-group day tours and activities, aimed at independent travellers on longer itineraries.",
    properties: [
      { name: "Sunset House Bangkok", vertical: "shared-rooms", city: "Bangkok", units: 48 },
      { name: "Sunset Experiences", vertical: "tours", city: "Bangkok", units: 12 },
    ],
    team: [
      { name: "Anong Suwan", email: "anong@sunsetcollective.com", role: "owner" },
      { name: "Ravi Menon", email: "ravi@sunsetcollective.com", role: "reservations" },
    ],
  },
  {
    id: "mrc_palm",
    name: "Palm Grove Resorts",
    slug: "palm-grove-resorts",
    legalSuffix: "Resorts Ltd.",
    businessType: "private_limited",
    commissionRate: 12.5,
    verticals: ["resorts"],
    city: "Maldives",
    country: "Maldives",
    currency: "USD",
    contactName: "Ibrahim Naseem",
    contactRole: "Commercial Director",
    plan: "premium",
    description:
      "All-inclusive island resorts with overwater villas, seaplane transfers and a dedicated diving operation.",
    properties: [
      { name: "Palm Grove Atoll Resort", vertical: "resorts", city: "Maldives", units: 76, channel: CONNECTED },
    ],
    team: [
      { name: "Ibrahim Naseem", email: "ibrahim@palmgrove.com", role: "owner" },
      { name: "Fathimath Zoona", email: "zoona@palmgrove.com", role: "revenue_manager" },
    ],
  },
  {
    id: "mrc_desert",
    name: "Desert Trails Tours",
    slug: "desert-trails-tours",
    legalSuffix: "Tours LLC",
    businessType: "private_limited",
    commissionRate: 18,
    verticals: ["tours", "activities"],
    city: "Dubai",
    country: "United Arab Emirates",
    currency: "USD",
    contactName: "Khalid Mansour",
    contactRole: "Owner",
    plan: "basic",
    description:
      "Desert safaris, dune experiences and guided day trips with a licensed guide fleet operating out of Dubai and Abu Dhabi.",
    properties: [
      { name: "Desert Trails Base Camp", vertical: "tours", city: "Dubai", units: 20 },
    ],
    team: [{ name: "Khalid Mansour", email: "khalid@deserttrails.com", role: "owner" }],
  },
  {
    id: "mrc_transit",
    name: "MetroTransit Rides",
    slug: "metrotransit-rides",
    legalSuffix: "Transport Ltd.",
    businessType: "private_limited",
    commissionRate: 16,
    verticals: ["transport"],
    city: "Kuala Lumpur",
    country: "Malaysia",
    currency: "USD",
    contactName: "Daniel Lim",
    contactRole: "Fleet Manager",
    plan: "basic",
    description:
      "Airport transfers, private chauffeur hire and intercity coach connections with a 60-vehicle managed fleet.",
    properties: [
      { name: "MetroTransit KL Hub", vertical: "transport", city: "Kuala Lumpur", units: 60 },
    ],
    team: [{ name: "Daniel Lim", email: "daniel@metrotransit.com", role: "owner" }],
  },
  {
    id: "mrc_skyfare",
    name: "SkyFare Consolidator",
    slug: "skyfare-consolidator",
    legalSuffix: "Air Services Ltd.",
    businessType: "private_limited",
    commissionRate: 5,
    verticals: ["flights"],
    city: "Singapore",
    country: "Singapore",
    currency: "USD",
    contactName: "Priya Nair",
    contactRole: "Distribution Manager",
    plan: "professional",
    description:
      "An air consolidator supplying negotiated fares across full-service and low-cost carriers in Asia and the Middle East.",
    properties: [
      { name: "SkyFare Ticketing Desk", vertical: "flights", city: "Singapore", units: 1 },
    ],
    team: [
      { name: "Priya Nair", email: "priya@skyfare.com", role: "owner" },
      { name: "Jun Park", email: "jun@skyfare.com", role: "reservations" },
    ],
  },
  {
    id: "mrc_visahub",
    name: "VisaHub Services",
    slug: "visahub-services",
    legalSuffix: "Consular Services Ltd.",
    businessType: "private_limited",
    commissionRate: 8,
    verticals: ["visa"],
    city: "Dhaka",
    country: "Bangladesh",
    currency: "USD",
    contactName: "Tanvir Hasan",
    contactRole: "Managing Partner",
    plan: "basic",
    description:
      "Visa documentation, appointment handling and application tracking for tourist and business travel across 40 destinations.",
    properties: [
      { name: "VisaHub Dhaka Office", vertical: "visa", city: "Dhaka", units: 8 },
    ],
    team: [{ name: "Tanvir Hasan", email: "tanvir@visahub.com", role: "owner" }],
  },
];

function buildTrading(spec: TradingSpec, index: number): Merchant {
  const seed = index * 17 + 3;
  const plan = MERCHANT_PLANS[spec.plan];
  const domain = `${spec.slug.replace(/-/g, "")}.com`;
  return {
    id: spec.id,
    name: spec.name,
    slug: spec.slug,
    status: "approved",
    legalName: `${spec.name.split(" ")[0]} ${spec.legalSuffix}`,
    businessType: spec.businessType,
    registrationNo: `REG-${100000 + seed * 7}`,
    taxId: `TAX-${spec.country.slice(0, 2).toUpperCase()}-${900000 + seed * 13}`,
    foundedYear: 2004 + (seed % 16),
    website: `https://${domain}`,
    description: spec.description,
    addressLine: `${20 + seed} Harbour Road`,
    city: spec.city,
    country: spec.country,
    postalCode: `${10000 + seed * 3}`,
    contactName: spec.contactName,
    contactRole: spec.contactRole,
    email: `partners@${domain}`,
    phone: `+${880 + (seed % 60)} ${1700 + seed} ${100000 + seed * 11}`,
    supportEmail: `support@${domain}`,
    supportPhone: `+${880 + (seed % 60)} ${1700 + seed} ${200000 + seed * 11}`,
    commissionRate: spec.commissionRate,
    commissionBasis: "net",
    currency: spec.currency,
    verticals: spec.verticals,
    kyc: {
      status: "verified",
      legalName: `${spec.name.split(" ")[0]} ${spec.legalSuffix}`,
      registrationNo: `REG-${100000 + seed * 7}`,
      taxId: `TAX-${spec.country.slice(0, 2).toUpperCase()}-${900000 + seed * 13}`,
      beneficialOwners: [
        {
          id: `${spec.id}_own_1`,
          fullName: spec.contactName,
          role: spec.contactRole,
          ownershipPercent: 60,
          nationality: spec.country,
          idNumberMasked: `•••• ${1000 + seed}`,
        },
      ],
      submittedAt: iso(130),
      reviewedAt: iso(120),
      reviewedBy: "Compliance Team",
    },
    documents: documents(spec.id, APPROVED_DOC_TYPES, "approved", DOC_LABELS, seed),
    contract: contract(spec.commissionRate, plan.limits.payoutTermDays, 118),
    bank: bank(
      `${spec.name.split(" ")[0]} ${spec.legalSuffix}`,
      `${spec.country.split(" ")[0]} Commercial Bank`,
      spec.country,
      spec.currency,
      "verified",
      seed,
      plan.limits.payoutTermDays <= 7 ? "weekly" : plan.limits.payoutTermDays <= 14 ? "biweekly" : "monthly",
    ),
    subscription: subscription(spec.plan, 90 + index * 3),
    staff: staff(spec.id, spec.team),
    properties: spec.properties.map((p, i) =>
      property(spec.id, i + 1, p.name, p.vertical, p.city, spec.country, p.units, p.channel),
    ),
    createdAt: iso(400 - index * 12),
    submittedAt: iso(135),
    reviewedAt: iso(118),
    reviewedBy: "Sana Rahman",
    approvedAt: iso(118),
  };
}

/** Compact spec for an applicant that has not finished onboarding. */
interface ApplicantSpec {
  id: string;
  name: string;
  slug: string;
  status: MerchantStatus;
  commissionRate: number;
  verticals: BookingVertical[];
  city: string;
  country: string;
  contactName: string;
  description: string;
  /** How far through onboarding they got. */
  stage: "profile_only" | "documents" | "full" | "sent_back" | "rejected";
  reviewNote?: string;
}

const APPLICANTS: ApplicantSpec[] = [
  {
    id: "mrc_northwind",
    name: "Northwind Lodges",
    slug: "northwind-lodges",
    status: "submitted",
    commissionRate: 12,
    verticals: ["hotels", "resorts"],
    city: "Reykjavík",
    country: "Iceland",
    contactName: "Sigrún Jónsdóttir",
    description:
      "Six mountain lodges with northern-lights packages, guided hikes and a small spa at each location.",
    stage: "full",
  },
  {
    id: "mrc_coralcoast",
    name: "Coral Coast Rentals",
    slug: "coral-coast-rentals",
    status: "under_review",
    commissionRate: 15,
    verticals: ["apartments", "shared-rooms"],
    city: "Cox's Bazar",
    country: "Bangladesh",
    contactName: "Rumana Chowdhury",
    description:
      "Beachfront apartments and shared rooms along the longest sea beach, managed by a local family operator.",
    stage: "full",
  },
  {
    id: "mrc_alpine",
    name: "Alpine Retreats",
    slug: "alpine-retreats",
    status: "action_required",
    commissionRate: 13,
    verticals: ["resorts", "activities"],
    city: "Innsbruck",
    country: "Austria",
    contactName: "Lukas Gruber",
    description:
      "Ski-in ski-out chalets and mountain activity packages across three Alpine valleys.",
    stage: "sent_back",
    reviewNote:
      "The uploaded operating licence has expired. Please upload a current licence and resubmit.",
  },
  {
    id: "mrc_lagoon",
    name: "Lagoon Escapes",
    slug: "lagoon-escapes",
    status: "draft",
    commissionRate: 12,
    verticals: ["resorts", "tours"],
    city: "Malé",
    country: "Maldives",
    contactName: "Aminath Shifa",
    description:
      "Guesthouse-style island escapes with snorkelling and sandbank excursions.",
    stage: "profile_only",
  },
  {
    id: "mrc_oldtown",
    name: "Old Town Guesthouses",
    slug: "old-town-guesthouses",
    status: "rejected",
    commissionRate: 12,
    verticals: ["hotels"],
    city: "Prague",
    country: "Czechia",
    contactName: "Jakub Novák",
    description: "Three small guesthouses in the historic centre.",
    stage: "rejected",
    reviewNote:
      "The business registration could not be matched to the named legal entity. Reapply once the registration is in the trading entity's name.",
  },
  {
    id: "mrc_metrosuites",
    name: "Metro Suites",
    slug: "metro-suites",
    status: "suspended",
    commissionRate: 14,
    verticals: ["apartments"],
    city: "Berlin",
    country: "Germany",
    contactName: "Hanna Weber",
    description:
      "City apartments near transit hubs, currently suspended pending a compliance review.",
    stage: "full",
    reviewNote: "Suspended after repeated guest complaints about undisclosed cleaning fees.",
  },
];

function buildApplicant(spec: ApplicantSpec, index: number): Merchant {
  const seed = 200 + index * 23;
  const domain = `${spec.slug.replace(/-/g, "")}.com`;
  const legalName = `${spec.name} Ltd.`;
  const full = spec.stage === "full" || spec.stage === "sent_back" || spec.stage === "rejected";
  const hasDocs = spec.stage !== "profile_only";

  const docStatus: MerchantDocument["status"] =
    spec.stage === "sent_back" || spec.stage === "rejected" ? "rejected" : "under_review";

  const docs = hasDocs
    ? documents(spec.id, APPROVED_DOC_TYPES.slice(0, 3), docStatus, DOC_LABELS, seed).map(
        (d, i) => ({
          ...d,
          // Only the licence was the problem — the rest passed.
          status: docStatus === "rejected" && i > 0 ? ("approved" as const) : d.status,
          rejectionReason:
            docStatus === "rejected" && i === 0 ? spec.reviewNote : undefined,
        }),
      )
    : [];

  const kycStatus =
    spec.status === "rejected"
      ? ("rejected" as const)
      : spec.status === "action_required"
        ? ("rejected" as const)
        : full
          ? ("under_review" as const)
          : ("unsubmitted" as const);

  return {
    id: spec.id,
    name: spec.name,
    slug: spec.slug,
    status: spec.status,
    legalName,
    businessType: "private_limited",
    registrationNo: `REG-${100000 + seed * 7}`,
    taxId: `TAX-${spec.country.slice(0, 2).toUpperCase()}-${900000 + seed * 13}`,
    foundedYear: 2012 + (seed % 12),
    website: `https://${domain}`,
    description: spec.description,
    addressLine: `${10 + seed} Old Mill Street`,
    city: spec.city,
    country: spec.country,
    postalCode: `${20000 + seed * 3}`,
    contactName: spec.contactName,
    contactRole: "Owner",
    email: `hello@${domain}`,
    phone: `+${40 + (seed % 50)} ${700 + seed} ${100000 + seed * 7}`,
    commissionRate: spec.commissionRate,
    commissionBasis: "net",
    currency: "USD",
    verticals: spec.verticals,
    kyc: {
      status: kycStatus,
      legalName,
      registrationNo: `REG-${100000 + seed * 7}`,
      taxId: `TAX-${spec.country.slice(0, 2).toUpperCase()}-${900000 + seed * 13}`,
      beneficialOwners: full
        ? [
            {
              id: `${spec.id}_own_1`,
              fullName: spec.contactName,
              role: "Owner",
              ownershipPercent: 100,
              nationality: spec.country,
              idNumberMasked: `•••• ${2000 + seed}`,
            },
          ]
        : [],
      submittedAt: full ? iso(18 + index) : undefined,
      reviewedAt: spec.reviewNote ? iso(9 + index) : undefined,
      reviewedBy: spec.reviewNote ? "Compliance Team" : undefined,
      rejectionReason: kycStatus === "rejected" ? spec.reviewNote : undefined,
    },
    documents: docs,
    contract: contract(spec.commissionRate, 30, full ? 17 + index : undefined),
    bank: full
      ? bank(legalName, `${spec.country.split(" ")[0]} Bank`, spec.country, "USD",
          spec.status === "suspended" ? "verified" : "pending", seed)
      : undefined,
    subscription: {
      planId: "basic",
      status: spec.status === "approved" || spec.status === "suspended" ? "active" : "trialing",
      billingCycle: "monthly",
      price: 0,
      startedAt: iso(20 + index),
      renewsAt: isoAhead(10),
      autoRenew: true,
    },
    staff: staff(spec.id, [
      { name: spec.contactName, email: `hello@${domain}`, role: "owner" },
    ]),
    properties:
      spec.stage === "profile_only"
        ? []
        : [property(spec.id, 1, `${spec.name} — ${spec.city}`, spec.verticals[0], spec.city, spec.country, 20 + (seed % 40))],
    createdAt: iso(24 + index * 2),
    submittedAt: full ? iso(18 + index) : undefined,
    reviewedAt: spec.reviewNote ? iso(9 + index) : undefined,
    reviewedBy: spec.reviewNote ? "Sana Rahman" : undefined,
    reviewNote: spec.reviewNote,
    suspendedAt: spec.status === "suspended" ? iso(6) : undefined,
    suspensionReason: spec.status === "suspended" ? spec.reviewNote : undefined,
  };
}

/**
 * The full merchant roster: the ten trading merchants the booking dataset
 * references, plus six applicants across the pre-approval states.
 */
export const MERCHANTS_SEED: Merchant[] = [
  ...TRADING.map(buildTrading),
  ...APPLICANTS.map(buildApplicant),
];

/** The merchant the demo merchant account signs in as. */
export const DEMO_MERCHANT_ID = "mrc_azure";
