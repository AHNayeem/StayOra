# 02 — Complete Feature & Module Inventory

Every module below was verified by reading the code. Nothing is listed as implemented because a menu item or route exists.

## Status legend

| Symbol | Meaning |
|---|---|
| ✅ Implemented | Real logic, persisted state, works end-to-end within the prototype's boundary |
| 🟡 Partial | Works, but a material part of the workflow is absent |
| 🟠 UI only | Screens and interactions exist; no business logic behind them |
| 🔵 Mock/demo | Real logic over deliberately fake data or a simulated external system |
| 🔴 Missing | Not present |

**Two data tiers exist, and the distinction matters throughout this document:**

- **Domain-backed** — reads/writes `features/dashboard/domain/store.ts`, persisted to `localStorage`, shared across every screen, versioned, resettable. 23 modules.
- **Stub-backed** — reads/writes `createStubService(...)`, a module-scoped in-memory array. Full CRUD with search, filter, sort and pagination, but **state resets on page reload** and is invisible to other modules. 42 modules.

---

## A. Foundation modules

### A1. Authentication

**Status:** 🔵 Mock/demo — complete flows, fake backend
**Purpose:** Identify the user and decide which of the three product surfaces they land on.
**What it does:** Login, registration, email verification by OTP, forgot/reset password, profile completion, logout, social-auth buttons, an auth modal, and route guards.
**Who uses it:** Everyone.
**How it works:** `services/auth.ts` is a fake backend over `localStorage`. Seven seed accounts live in `constants/accounts.ts` with the shared password `Passw0rd!` in plain text. On sign-in the service writes two things: a session object to `localStorage`, and a mirrored session **cookie** so the dashboard's Server Components can resolve the principal before rendering. Travelers get no dashboard cookie.
**Frontend:** `app/(auth)/*` — login, register, forgot-password, reset-password, verify-email, complete-profile. `components/auth/*`, `features/auth/*`.
**Backend:** None. **Database:** None.
**Dependencies:** Session cookie → dashboard RBAC → menu, routes, data scoping.
**Outputs:** A session; role-based redirect (`traveler → /account`, `agency → /dashboard/b2b`, others → `/dashboard`).
**Business value:** The gate on everything. **Revenue:** Indirect — account creation enables membership, loyalty and repeat booking.
**Limitations:** Passwords compared in plain text; the OTP is the constant `123456`; the session cookie is JSON, URL-encoded, **not `httpOnly`, not signed** — a user can edit it in DevTools and become `super_admin`. No refresh tokens, no MFA, no device management, no lockout. The code documents all of this openly as prototype behaviour.

### A2. RBAC & Access Control

**Status:** ✅ Implemented (as client-side design) / 🔴 Missing (as enforcement)
**Purpose:** Decide what each of ten roles can see and do.
**What it does:** 23 resources × 7 actions (`read, create, update, delete, approve, export, impersonate`), wildcard expansion (`*:*`, `finance:*`), ten seeded roles, longest-prefix route rules, a `PermissionGuard` component, a `RouteGuard` on navigation, feature flags as a second independent gate, and data scoping by `merchantId` / `organizationId`.
**Who uses it:** All dashboard roles.
**How it works in three layers:** (1) the menu hides what you may not see; (2) `route-access.ts` declares the permission each URL needs and is evaluated on every navigation including deep links — *because hiding a menu item is not access control*; (3) components guard individual actions. Server helpers `requirePermission` / `requireAnyPermission` exist and are correctly written.
**Files:** `features/dashboard/rbac/*`, `features/dashboard/navigation/menu-config.ts`.
**Limitations:** Every check happens where the attacker sits. The permissions themselves are derived from the role in a seed map, not fetched. Roles cannot be created or edited at runtime — the Roles and Permissions screens are read-only matrices.

### A3. Domain Layer *(the business core)*

**Status:** ✅ Implemented
**Purpose:** One place where every business rule lives, so no screen invents its own.
**What it contains:** 24 modules, ~17,000 lines —

| Module | Lines | Responsibility |
|---|---:|---|
| `services.ts` | 3,695 | The async API surface every UI calls (18 services) |
| `seed.ts` / `seed-extra.ts` / `seed-revenue.ts` | 3,891 | Deterministic demo dataset |
| `inventory.ts` | 1,103 | Room types, rate plans, availability, holds |
| `money.ts` | 901 | Commission, tax, fees, discounts, refunds, settlement |
| `revenue-management.ts` | 879 | Occupancy, ADR, RevPAR, pace, pricing rules |
| `types.ts` | 823 | The normalised data model |
| `revenue.ts` | 654 | The platform revenue ledger |
| `lifecycle.ts` | 493 | State machines for booking/payment/refund/settlement |
| `engagement.ts` | 489 | Loyalty points, wallet coupons, referrals |
| `advertising.ts` | 460 | Advertisers, campaigns, placements, billing |
| `messaging.ts` | 439 | Mock email/SMS/push/WhatsApp |
| `insurance.ts` | 427 | Plans, policies, margin |
| `payments.ts` | 425 | Mock gateway: authorize, 3DS, capture, retry, refund |
| `amendments.ts` | 396 | Date change, upgrade, guest change |
| `membership.ts` | 367 | Paid plans, benefits, renewal |
| `commission-rules.ts` | 360 | The configurable commission book |
| `support.ts` | 357 | Ticketing shared by customer and admin |
| `reviews.ts` | 284 | Verified-stay reviews and moderation |
| `store.ts` | 279 | Persisted mutable state |
| `telemetry.ts` | 159 | Analytics/error seams |

**Verification:** `bun run test:domain` → **145 checks, 145 passed, 0 failed**, covering the booking lifecycle, double-booking prevention, pricing, cancellation and refund, loyalty, support visibility, merchant scoping, the unified read model, CMS workflow, geo, revenue reconciliation and audit.
**Limitations:** Runs in the browser. On the server it falls back to an immutable seed, so SSR is deterministic but writes never persist server-side.

---

## B. Customer-facing modules

### B1. Catalogue & Listings — ✅ Implemented (🔵 mock data)

Nine catalog verticals with roughly **380 listings** (hand-written seeds plus deterministic generation: 49 hotels, 49 apartments, 27 resorts, 21 shared rooms, 15 convention halls, 39 transport, 41 tours, 79 activities, 23 visas, plus seeds). One config registry (`constants/verticals.ts`) drives navigation, search tabs, routes, price units and labels for all of them — adding a vertical is a data change. Listing pages have filters, sorting, pagination, a results bar, map view and compare. Detail pages have gallery, overview, facts, amenities, itinerary, FAQ, map, reviews, availability and a booking widget.
**Limitations:** All data is generated at module load. No CMS-driven listing creation reaches the public site — the dashboard catalog modules are stub-backed and separate from `constants/listings.ts`. **This is a genuine contradiction between admin and front end** (see file 14).

### B2. Search & Discovery — 🟡 Partial

Global cross-vertical search with a weighted in-memory index and debounced suggestions; recent searches; a hero search widget with per-vertical tabs; date-range picker; guest selector; location select; price/rating/category/amenity filters; sorting; **map-based discovery** (a custom Mercator projection — no tile provider, no API key); **near-me** via browser geolocation with fallbacks; **compare** trays for listings and flights; saved flight searches.
**Missing:** Saved searches for stays, personalised recommendations driven by history, price alerts, real geocoding, availability-aware search (search does not currently filter by whether inventory exists on the chosen dates).

### B3. Booking & Checkout — ✅ Implemented (🔵 mock payment)

A four-step checkout (`components/checkout/checkout-flow.tsx`) that: creates a **real inventory hold** with a countdown timer before the traveller starts typing, so the last room cannot be sold twice; collects travellers (with saved-traveller autofill); offers add-ons, **insurance** and a **membership upsell**; accepts a promo code, a wallet coupon or **loyalty points redemption**; prices everything through the domain money engine; runs a **simulated gateway** with card/wallet/bank instruments, decline and **3-D Secure step-up** paths chosen by which demo card you pick; supports deposit/balance payment plans; then confirms the booking, writes the invoice and payment, sends notifications, and releases or commits the hold.
Two verticals (**visa**, **convention-hall**) correctly take a *request* rather than a payment, creating a `pending` booking with a `due` invoice.
**Limitations:** No real payment; no PCI scope; totals computed client-side; no saved-card tokenisation (saved cards are a separate display-only store); no guest checkout without an account for some paths.

### B4. Trip Cart & Unified Trip — ✅ Implemented

A single trip context (destination, dates, travellers, currency) plus chosen items, persisted and shared across verticals — so a flight selected on `/flights` teaches the hotel rail on `/hotels` where and when the traveller is going. Includes an "add to trip" affordance on listings, a recommendation rail, a trip cart view, a **trip checkout** that books multiple suppliers together, trip detail with per-item status, and a unified booking read model (`features/booking/unified.ts`) that projects stays, flights and trips into one list without forcing them into one schema.
**Limitations:** No unified itinerary document, no partial-failure orchestration UI beyond status, no single cross-supplier cancellation.

### B5. Flights — ✅ Implemented (🔵 mock supplier)

The most complete single vertical. Search panel (origin/destination/dates/passengers/cabin/trip type), results with filters, sorting, price calendar, segment timelines, badges, compare tray and saved searches; a detail view with fare rules, cabin amenities, seat-map preview and airport info; a **four-step booking flow** (travellers → seats → extras → review) with schemas; fare breakdown and coupon field; booking confirmation; and in the account area, **My Flights**, a ticket view, a boarding pass and ticket actions. Flight bookings emit the *same* invoice/payment triple as stays, so they appear in invoices and payment history with no branching.
**Dashboard side:** airlines, airports, routes, schedules, bookings, passengers, refund requests.
**Limitations:** No GDS/NDC supplier; offers are generated deterministically from a self-describing offer id; no ticketing, no PNR with an airline, no schedule change handling, no IATA settlement.

### B6. Customer Account — ✅ Implemented

24 screens in four groups: **Travel** (overview, trips, bookings, my flights, history, wishlist, reviews), **Money** (invoices, refunds, payments, saved cards, coupons, rewards, membership), **Support & profile** (messages, help & support, notifications, profile, saved travellers, settings, security). Eight of these read the shared domain store directly, so a refund the customer requests is the record the admin approves.
**Limitations:** No PDF export of invoices or vouchers; no data-export/delete (GDPR); security page has no real MFA or session list.

### B7. AI Travel Assistant — 🔵 Mock/demo (well-architected)

A deterministic assistant with NLU parsing, a **tool registry** (catalog, flight, trip and account tools), and rich response blocks — itinerary, trip plan, budget, comparison, flight, listing, booking draft. Provider selection is env-driven (`NEXT_PUBLIC_AI_PROVIDER`, default `mock`).
**Key property:** the provider can only reach data through the tool barrel, so no price, availability or policy in an answer can be anything other than what the platform's own services returned. Swapping in a real LLM keeps that guarantee.
**Limitations:** No real model, no streaming, no conversation memory across sessions, no cost controls.

### B8. Content & Marketing pages — ✅ Implemented (🔵 static content)

Home (hero slider, featured listings, destinations, deals, flash deals, combo deals, trending packages, testimonials, partners, awards, stats, blog, newsletter, FAQ, CTA), about, contact, blogs and blog detail with comments, destinations, FAQs, terms. Plus SEO infrastructure: `sitemap.ts`, `robots.ts`, `manifest.ts`, JSON-LD structured data, and per-page metadata.
**Limitations:** Content comes from `constants/*`, not from the CMS module. Newsletter and contact forms do not send anything.

---

## C. Dashboard modules — domain-backed (23)

These share the persisted store and are internally consistent with each other.

| Module | Status | What it actually does |
|---|---|---|
| Overview / Dashboard | ✅ | KPI tiles, charts and recent activity computed from real bookings |
| Analytics | ✅ | Revenue, bookings, conversion and channel charts (feature-flagged) |
| Bookings (list, detail, create, all, unified) | ✅ | Full lifecycle with legal-transition enforcement, timeline, actions, cancellation quoting, manual booking creation |
| Refunds | ✅ | Request → review → approve → process → complete, with quoting against the cancellation policy |
| Commission | ✅ | Per-booking commission entries, lifecycle panel, platform summary |
| Commission Rules | ✅ | Configurable rule book: 6 targeting levels, percent + flat, floor/cap, gross/net basis, date windows, deterministic resolution with an explanation of why a rule won |
| Settlements | ✅ | Merchant settlement runs, roll-ups, status advance, refund adjustment |
| Revenue Center | ✅ | The nine-source ledger with filters, grouping and CSV export |
| Insurance (admin) | ✅ | Providers, plans, policies, margin summary, plan editor |
| Membership (admin) | ✅ | Plans, subscriptions, benefits, subscribe/cancel/renew/refund, summary |
| Advertising (admin) | ✅ | Advertisers, campaigns, placements, budgets, CPC/CPM/CPA, status, event recording, billing to the ledger |
| Revenue Management | ✅ | Occupancy/ADR/RevPAR, pace, pricing rules, transparent recommendations that apply as ordinary inventory overrides |
| Inventory / Rates & availability | ✅ | Rate manager over the baseline + override + consumed model |
| B2B (overview, accounts, bookings, invoices, statements) | ✅ | Accounts, credit limits and checks, settlement terms, net rates and markup, sub-users, statements, invoicing, subscription charging |
| Offers / Promotions / Combos | ✅ | Offer evaluation with eligibility, scope, windows; combo pricing and availability |
| Reviews (moderation) | ✅ | Verified-stay-only reviews, moderation, property reply |
| Support (admin inbox) | ✅ | Shared ticket store with the customer help centre; internal notes filtered from customer view |
| Notifications | ✅ | Audience-scoped platform notifications, read state |
| Logs / Audit | ✅ | Every financial and lifecycle change recorded with before/after and entity |
| Reports | ✅ | Cross-module reporting over domain data |
| Settings | 🟡 | Platform settings incl. "reset demo data"; most values are not consumed by other modules |
| CMS (workflow) | 🟡 | Draft → review → publish workflow exists and is tested; the published output does not reach the public site |
| Flights (overview) | ✅ | Flight KPIs over the mock supplier |

## D. Dashboard modules — stub-backed (42)

Full CRUD with search/filter/sort/pagination and simulated latency, **but state resets on reload and is not shared with other modules**.

| Group | Modules |
|---|---|
| Catalog | hotels, apartments, resorts, shared-rooms, convention-hall, transport, activities, visa, categories, amenities, attributes, catalog |
| Flights inventory | airlines, airports, routes, schedules, passengers |
| People | users, customers, merchants |
| Finance ops | payments, transactions, wallet, invoices, payouts, tax, reconciliation, disputes, finance |
| Growth | promotions, banners |
| Content | cms pages, homepage, menus, media, testimonials, newsletter, seo, localization |
| System | templates, cron, queues, cache, storage, maintenance, login-logs, api-logs, design-system, help, profile |

---

## E. Cross-cutting systems

| System | Status | Notes |
|---|---|---|
| Localization / i18n | 🟡 | 3 languages declared (English, Arabic, Bangla); **one real dictionary (Bangla, ~150 keys covering chrome only)**; currency switching with static conversion rates; locale-aware number and date formatting; RTL document direction handling |
| Notifications & messaging | 🔵 | 5 channels (email, SMS, push, WhatsApp, in-app), template registry, preference checks, queued → sent → delivered simulation, one shared outbox the customer's inbox reads |
| Telemetry | 🟠 | PostHog/Sentry-shaped seams; events recorded to the store, never transmitted |
| Feature flags | 🟡 | 5 known flags, all on by default, resolved from a local stub |
| Design system | ✅ | ~40 UI primitives, a documented design-system page, dark mode, theme provider |
| State management | ✅ | No external library — `useSyncExternalStore` bridges over module singletons, an in-house query cache with staleness, and React Hook Form + Zod for forms |
| Error/loading/empty states | ✅ | Route-level `error.tsx` / `loading.tsx` / `not-found.tsx`, skeletons, empty states, offline banner, toaster |
| Accessibility | 🟡 | Focus traps, `aria-current`, screen-reader step announcements, keyboard handling present; not formally audited |
| Testing | 🟡 | 145 domain regression checks passing; **no component, integration, E2E or accessibility tests** |

---

## Counts

| Category | Count |
|---|---:|
| Page routes | 154 |
| API routes / server actions / middleware | **0** |
| Dashboard modules | 65 |
| — domain-backed | 23 |
| — stub-backed | 42 |
| Customer account screens | 24 |
| Booking verticals | 10 (9 catalog + flights) |
| Roles | 10 |
| Permission resources × actions | 23 × 7 |
| Revenue streams modelled | 9 |
| Domain regression checks | 145 passing |
