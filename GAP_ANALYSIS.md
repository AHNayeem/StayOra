# Otithee / Otithee — Booking Ecosystem Gap Analysis

**Date:** 2026-08-13
**Scope:** Customer-facing journey (`app/(marketing)`, `app/(auth)`) + administrative dashboard (`app/dashboard`)
**Method:** Static audit of the working tree — 140 routes, 58 dashboard modules, 12 service seams, domain layer, auth, i18n. No runtime/manual QA pass.

---

## 0. Executive summary

The product is an unusually complete **frontend prototype**: 140 routes, a 58-module admin shell, a genuine domain layer with state machines and refund/commission math, RBAC, a trip cart, an AI concierge, and a full flight vertical. The *breadth* is largely done.

What is missing is not screens — it is **the parts of a booking business that cannot live in the browser**:

| # | Structural gap | Consequence |
|---|---|---|
| S1 | **No server boundary** — zero API routes; pricing, promos, booking creation all run client-side | Nothing is authoritative or verifiable; the price is whatever the browser says |
| S2 | **Two divergent booking models** — customer path and admin path never meet | A customer booking never appears in `/dashboard/bookings`; an admin action never reaches `/account` |
| S3 | **No inventory / availability / rate model** | Double-booking is structurally possible; admins cannot open, close, or price inventory |
| S4 | **Auth is a client-side prototype** — localStorage + unsigned readable cookie, no middleware | Every protected route is bypassable; RBAC is cosmetic |
| S5 | **No tests, no CI** | The money and lifecycle code — the code that must never regress — is unpinned |

Everything in §3–§5 below is a feature gap. Everything in §1 is a gap that *makes the feature gaps unfixable* until closed. Prioritise §1.

---

## 1. Structural gaps (cross-cutting, highest leverage)

### S1 — There is no server boundary

`find app -name route.ts` returns **nothing**. There is no `middleware.ts`. Every service under [services/](services/) is a mock seam returning `mockDelay(...)`.

Concretely:

- Booking totals are computed in the browser by [lib/booking-pricing.ts](lib/booking-pricing.ts) and passed *as input* to `createBooking` — see `CreateBookingInput.totalUsd` in [services/checkout.ts:44-64](services/checkout.ts#L44-L64). The client tells the system what to charge.
- Promo validation reads a client-bundled coupon array — [services/checkout.ts:162](services/checkout.ts#L162). Every valid code, its value, and its rules ship to every visitor.
- Booking references, invoice numbers, and IDs are minted client-side from `Date.now()` + slug hashing — [services/checkout.ts:82-91](services/checkout.ts#L82-L91). Two devices can mint the same reference.
- There is **no idempotency key anywhere** (`grep -ri idempot` → 0 hits). A double-click or retry creates two bookings.

**Required:** a real API layer (Route Handlers or the external NestJS backend) owning: price quote → hold → confirm, promo validation, reference minting, and every lifecycle transition. The seams are already shaped for it — [features/dashboard/data/repository.ts](features/dashboard/data/repository.ts) and [features/dashboard/data/http-client.ts](features/dashboard/data/http-client.ts) exist and are **used by zero modules**.

### S2 — Two booking models that never reconcile

| | Customer path | Admin path |
|---|---|---|
| Entry | [components/checkout/checkout-flow.tsx](components/checkout/checkout-flow.tsx) | [features/dashboard/modules/bookings/](features/dashboard/modules/bookings/) |
| Creator | [services/checkout.ts](services/checkout.ts) `createBooking` | [features/dashboard/domain/services.ts](features/dashboard/domain/services.ts) |
| Type | `TravelerBooking` — [types/traveler.ts](types/traveler.ts) | `Booking` — [features/dashboard/domain/types.ts](features/dashboard/domain/types.ts) |
| Statuses | ~5 (`pending`, `upcoming`, `completed`, …) | **13**, with a legality-checked state machine — [features/dashboard/domain/lifecycle.ts:27-41](features/dashboard/domain/lifecycle.ts#L27-L41) |
| Storage | `localStorage` — [features/account/created-bookings.ts](features/account/created-bookings.ts) | module-scoped in-memory store — [features/dashboard/domain/store.ts](features/dashboard/domain/store.ts) |
| Money | client `computeBookingPricing` | `priceBooking` + commission + tax — [features/dashboard/domain/money.ts:101](features/dashboard/domain/money.ts#L101) |

A booking made at `/checkout` is invisible to every admin screen. An admin marking a booking `cancelled` is invisible to the customer. Cancellation is likewise local-only — [features/account/booking-overrides.ts](features/account/booking-overrides.ts).

**The fix pattern already exists in the codebase.** The trip/unified path writes into the domain layer directly — [features/trip/trips-store.ts](features/trip/trips-store.ts) imports `features/dashboard/domain`, and [features/trip/trip-checkout-view.tsx](features/trip/trip-checkout-view.tsx) uses `CANCELLATION_POLICIES`, `b2bService`, `defaultPolicyFor`. **Single-listing checkout is the outlier, not the norm.** Retiring `services/checkout.ts` in favour of the domain layer is a contained, high-value refactor.

### S3 — No inventory, availability, or rate model

This is the largest *product* gap for a booking platform.

- `grep -ri "rate plan|ratePlan|allotment"` → **0 hits**. `blackout` → 1 (a copy string).
- `checkAvailability` exists only for trip items — [services/trip.service.ts:436](services/trip.service.ts#L436) — and is a heuristic, not an inventory read.
- Listings carry a single nightly price. No per-date pricing, no seasonality, no min-stay / CTA / CTD restrictions, no allotment, no stop-sell.
- The booking widget will quote **any** dates and **any** quantity — [components/sections/detail/booking-widget.tsx](components/sections/detail/booking-widget.tsx). Dates entered in search never filter results.
- [components/cards/room-card.tsx](components/cards/room-card.tsx) exists but is **imported nowhere**. Hotel and resort detail pages have **no room-type or rate-plan selection at all** — a guest books "the hotel", not a room.
- Admin side has no calendar grid, no bulk price update, no open/close inventory screen, no channel-manager / OTA sync.

### S4 — Auth is a prototype, not a control

- Customer session lives in `localStorage` — [features/auth/session-store.ts](features/auth/session-store.ts).
- The dashboard cookie is **unsigned, non-`httpOnly`, and URL-encoded plain JSON**; its own docstring says so — [features/dashboard/auth/session-cookie.ts:11-16](features/dashboard/auth/session-cookie.ts#L11-L16). Anyone can hand-write `role: "super_admin"`.
- No `middleware.ts`. All customer route protection is a `useEffect` redirect — [features/auth/guards.ts:52-62](features/auth/guards.ts#L52-L62) — so protected content is reachable with JS disabled or by reading the RSC payload.
- Dashboard RBAC ([features/dashboard/rbac/](features/dashboard/rbac/)) is well-designed but enforced **only in the render tree**.
- Missing: admin 2FA (`grep -i "2fa|twoFactor"` → ~0), session listing / force-logout, IP allowlist, audited impersonation, rate limiting, account lockout, password policy enforcement server-side.

**Note:** merchant data scoping *is* correctly implemented in the domain layer — [features/dashboard/domain/services.ts:104-127](features/dashboard/domain/services.ts#L104-L127), consumed via `useDomainScope` in [features/dashboard/modules/bookings/hooks.ts](features/dashboard/modules/bookings/hooks.ts). But the **42 stub-service modules** (catalog, users, media, CMS, system) are **entirely unscoped** — a merchant role would see every tenant's rows.

### S5 — Zero tests, zero CI

No `*.test.*`, no `*.spec.*`, no vitest/playwright config, no CI workflow. Meanwhile:

- [features/dashboard/domain/money.ts](features/dashboard/domain/money.ts) — 697 lines: refund quoting, commission tiers, B2B pricing, settlement totals, platform financials.
- [features/dashboard/domain/lifecycle.ts](features/dashboard/domain/lifecycle.ts) — 493 lines: transition legality across 4 state machines.

This is exactly the code that must be regression-locked before a backend lands. `package.json` has no `test` script.

---

## 2. Data-layer state of play

All 42 of 58 dashboard resource modules use `createStubService` — [features/dashboard/crud/stub-service.ts](features/dashboard/crud/stub-service.ts) — an in-memory array with simulated latency. Implications to close:

- **Data resets on reload/rebuild.** Two admin tabs see divergent worlds.
- **CSV export is silently partial** — it exports `list.rows`, i.e. the *loaded page only*. Every list does this (e.g. [features/dashboard/modules/payouts/list.tsx](features/dashboard/modules/payouts/list.tsx)). An admin exporting 10 of 4,000 payouts gets no warning.
- **Bulk actions are wired but disabled.** `DataTable` supports selection ([features/dashboard/ui/data-table.tsx:54](features/dashboard/ui/data-table.tsx#L54)) yet every call site passes `selectable={false}`. No bulk approve, bulk price change, bulk status transition, bulk export.
- **No server-side search/sort/filter contract validation**, no cursor pagination, no optimistic-concurrency (`updatedAt` / ETag) — two admins editing one record silently clobber each other.
- No import pipeline (CSV/XLSX listing upload, bulk media import), no seed/reset tooling for staging.

---

## 3. Customer-facing gaps, by funnel stage

### 3.1 Discover
| Gap | Notes |
|---|---|
| No map-based search | No map library anywhere (`leaflet`/`mapbox`/`google.maps` → 0). Detail pages use a keyless Google embed only — [components/sections/detail/detail-map.tsx](components/sections/detail/detail-map.tsx) |
| No geolocation / "near me" | — |
| No price alerts or deal watch | Wishlist exists ([features/account/wishlist.ts](features/account/wishlist.ts)) but never notifies on price drop |
| No personalization | Home is static constants ([constants/home-data.ts](constants/home-data.ts)); `recent-searches` exists but drives nothing on home |
| No native listing comparison | The AI concierge has a `comparison-block`; the site itself has no compare tray |

### 3.2 Search & results
| Gap | Notes |
|---|---|
| **Cross-vertical `/search` has no filters** | Only vertical chips — [app/(marketing)/search/search-results.tsx](app/(marketing)/search/search-results.tsx). No price, rating, amenity, sort, or pagination. Vertical pages *do* have facets via [lib/listing-filter.ts](lib/listing-filter.ts) — an inconsistency users will feel |
| Search dates don't filter results | Follows S3 — no availability read |
| No saved searches for stays | Flights have [features/flights/saved-searches.ts](features/flights/saved-searches.ts); stays have nothing. Asymmetric |
| No "sold out" / urgency / social-proof signals | No inventory to derive them from |
| Ranking is naive term-scoring | [services/search.ts:111-126](services/search.ts#L111-L126) — no typo tolerance, no synonyms, no geo-radius, no popularity/conversion signal |

### 3.3 Evaluate (detail pages)
| Gap | Notes |
|---|---|
| **No room / rate-plan selection** | See S3. Blocks board type, refundable-vs-not, occupancy pricing |
| **No tax or fee disclosure** | Checkout writes `taxesUsd: 0` — [services/checkout.ts:129](services/checkout.ts#L129) — while the dashboard runs a whole tax module. Total-price transparency is a legal requirement in the EU/UK |
| Reviews have no provenance | Static seed + client-authored; no "verified stay", no moderation link to the dashboard reviews module, no host reply, no photo reviews |
| No guest Q&A | — |
| No cancellation-policy comparison | Policies exist in the domain ([lifecycle.ts:451](features/dashboard/domain/lifecycle.ts#L451)) but aren't surfaced as a choice |
| No accessibility/amenity structured filtering on detail | Amenities are free text |

### 3.4 Book & pay — highest-risk cluster
| Gap | Severity | Notes |
|---|---|---|
| **No guest checkout** | High | `useRequireAuth` bounces guests to `/login` — [components/checkout/checkout-flow.tsx:31](components/checkout/checkout-flow.tsx#L31). A known double-digit conversion loss |
| **Raw card PAN in React state** | Critical | [components/checkout/payment-methods.tsx:80-84](components/checkout/payment-methods.tsx#L80-L84). No tokenization, no iframe/hosted field, no PCI scope containment |
| **No 3DS / SCA** | Critical | Blocks EU/UK acceptance outright |
| **No payment gateway at all** | Critical | No Stripe/Adyen/local PSP. `persist()` writes a card record to localStorage |
| **No local payment methods** | High | bKash, Nagad, Rocket, cards-on-delivery — absent despite an evidently Bangladesh-first market (BDT + Bangla locale) |
| **No idempotency on submit** | High | Double-submit ⇒ duplicate bookings |
| **No booking hold / price-lock timer** | High | Nothing reserves inventory during checkout |
| **No payment-failure recovery** | High | The domain models `payment_pending` / `failed` with next-actions ([lifecycle.ts:87](features/dashboard/domain/lifecycle.ts#L87)); checkout has no failure branch at all |
| No deposit / pay-later / installments | Medium | The `Invoice` model supports `due`, but checkout only ever charges in full |
| No multi-currency charging | Medium | FX is display-only — [features/i18n/format.ts:23](features/i18n/format.ts#L23) converts with a mock rate. Settlement currency is unmodelled |
| No traveller-document capture | Medium | Passport/NID/expiry needed for visa and flight compliance; [features/account/travelers-store.ts](features/account/travelers-store.ts) doesn't hold them |
| No add-ons for stays | Medium | Flights have `extras-step`; stays have no ancillary step |
| No travel insurance offer | Medium | High-margin attach point, absent |
| No terms/consent capture at purchase | Medium | No recorded acceptance of the cancellation policy |

### 3.5 Post-booking (manage)
**Working well:** cancellation with a real policy-driven refund quote from the platform's own engine — [app/(marketing)/account/bookings/[id]/booking-detail-view.tsx:340-407](app/(marketing)/account/bookings/[id]/booking-detail-view.tsx#L340-L407).

| Gap | Notes |
|---|---|
| **No date change / modify** | `grep -ri reschedule` → 0. The single most-requested self-service action after cancel |
| No name correction, add-guest, or upgrade | — |
| No voucher / e-ticket PDF for stays | Flights have a boarding-pass card; stays produce nothing printable |
| No calendar (.ics) export | — |
| No dispute filing from the account | The dashboard has a disputes module; customers cannot open one |
| No pre-arrival / check-in reminders | Follows §3.7 (no delivery channel) |
| No live booking status/ops updates | — |
| No partial refund self-service | The engine supports it; the UI doesn't expose it |

### 3.6 Retain & loyalty — UI without an engine
`/account/rewards` and `/account/coupons` render, but nothing behind them accrues or issues.

- No points **earn** on booking completion, no **burn** at checkout, no expiry, no tier benefits.
- No coupon issuance rules (welcome, win-back, birthday, abandoned-cart).
- No referral program (`referral` hits are copy only).
- No wishlist price-drop or back-in-stock alerts.
- Newsletter preference centre isn't wired to the dashboard newsletter module.

### 3.7 Communication — no delivery channel exists
This is a silent, systemic gap: **the platform cannot send anything.**

- No email, no SMS, no push, no WhatsApp integration anywhere in the tree.
- The dashboard `templates` module is a *catalogue of templates with no sender*.
- Therefore: no booking confirmation email, no e-ticket delivery, no OTP delivery (the OTP UI exists in [components/auth/otp-field.tsx](components/auth/otp-field.tsx) with no channel), no password-reset link, no refund notification, no review invitation.
- `manifest.ts` exists but there is no service worker → no web push, no offline.

### 3.8 Support — two disconnected inboxes
`/account/messages` is a local thread store ([app/(marketing)/account/messages/messages-view.tsx](app/(marketing)/account/messages/messages-view.tsx)). The dashboard has a separate `support` tickets module. They share no data.

Missing: customer-initiated tickets, agent replies reaching the customer, attachments, ticket status visible to the customer, help-centre search, live chat/handoff from the AI concierge.

---

## 4. Administrative dashboard gaps

### 4.1 Missing entirely (no screen exists)
| Domain | Missing capability |
|---|---|
| **Revenue management** | Rate calendar, bulk price/availability update, restrictions (min-stay, CTA/CTD), seasonal rate plans, yield rules, competitor rate shopping |
| **Channel management** | OTA connectivity (Booking.com, Agoda, Expedia), rate/inventory push, reservation pull, mapping UI |
| **Supplier integration** | GDS/NDC for flights, hotel bed-bank APIs, transfer suppliers — the flight vertical is entirely mock ([lib/mock/flights.ts](lib/mock/flights.ts)) |
| **Communication** | Campaign composer, transactional-send log, delivery/bounce tracking, template preview + test send |
| **Approval workflows** | Merchant KYC/onboarding review, payout release approval, refund escalation above a threshold, price-change approval |
| **Fraud & risk** | Velocity rules, blocklists, chargeback prevention, manual-review queue |
| **Cancellation-reason analytics** | Reasons are captured in the domain but never analysed |
| **Data lifecycle** | Backup/restore, retention policy, PII redaction, GDPR export/erasure tooling |

### 4.2 Read-only where an action is needed
31 of 58 modules have no create/edit form. Several are legitimately read-only (logs, queues), but these need actions:

| Module | Missing action |
|---|---|
| [payouts](features/dashboard/modules/payouts/) | **Cannot run or release a payout** — status facet + CSV only |
| [reconciliation](features/dashboard/modules/reconciliation/) | No gateway settlement-file import, no match/unmatch, no write-off |
| [support](features/dashboard/modules/support/) | Status change only — **no reply thread**, no SLA timer, no assignment UI, no macros |
| [disputes](features/dashboard/modules/disputes/) | Advances status but no evidence upload, no deadline tracking |
| [invoices](features/dashboard/modules/invoices/) | No credit note, no re-issue, no PDF, no send |
| [reviews](features/dashboard/modules/reviews/) | No moderate/approve/reject, no host reply, no takedown |
| [notifications](features/dashboard/modules/notifications/) | No composer — cannot send anything |
| [reports](features/dashboard/modules/reports/) | No report builder, no scheduling, no email digest |
| [wallet](features/dashboard/modules/wallet/) | No manual credit/debit adjustment with audit |

### 4.3 Operational depth missing across all modules
- **No saved views / per-user filters / column customization.** Every admin re-applies filters on every visit.
- **No bulk actions** (§2).
- **No unified audit trail UI.** A partial platform audit exists in the domain ([services.ts:258](features/dashboard/domain/services.ts#L258)) but there's no "who changed what, when, from where" view spanning modules — a hard requirement for finance and access changes.
- **No inline record activity timeline** on most detail views.
- **No global undo / soft delete / trash.** `remove()` is hard-delete.
- **No keyboard-first bulk workflows** beyond the command palette.
- **No SLA/queue dashboards** for ops teams (aging refunds, stuck payments, unassigned tickets).

### 4.4 Analytics & BI
[features/dashboard/modules/analytics/](features/dashboard/modules/analytics/) charts seeded data. Missing: conversion funnel (search → detail → checkout → paid), abandonment analysis, cohort retention, LTV, channel/campaign attribution, margin-by-product, cancellation/refund-rate trending, merchant scorecards, forecast vs actual, export to warehouse.

### 4.5 Content & localization
- **CMS has no publishing workflow**: no draft/review/publish states, no versioning or rollback, no scheduled publish, no preview.
- No arbitrary page builder (only homepage/menus/SEO/media/testimonials are managed).
- No media transforms (crop, alt-text enforcement, CDN variants).
- **The localization module doesn't feed the site.** [features/i18n/dictionaries.ts](features/i18n/dictionaries.ts) is a hardcoded 153-line map; the dashboard's `localization` module manages locale/currency records that no translation actually reads.

### 4.6 B2B depth
`priceB2B` and credit limits exist ([money.ts:191](features/dashboard/domain/money.ts#L191)). Missing: negotiated/contract rates per account, per-account markup rules, credit ledger + statements + dunning, sub-user management under an agency, agency self-serve portal, commission tiers per agreement, API/XML access for partners.

---

## 5. Non-functional gaps

### 5.1 Internationalization
[features/i18n/dictionaries.ts](features/i18n/dictionaries.ts) is an English-phrase → Bangla map covering nav and search terms.

- No ICU message format; plurals are separate keys (`night` / `nights`) — breaks for languages with 3+ plural forms.
- No locale routing (`/bn/...`), no `hreflang`, no per-locale sitemap → **zero international SEO**.
- No RTL support.
- Locale lives in `localStorage` ([features/i18n/locale-store.ts](features/i18n/locale-store.ts)) → server renders English, then flashes. Not SSR-safe.
- FX rates are hardcoded mocks; no rate-provider, no rate-at-time-of-booking capture.
- Untranslated: all long-form content, emails, error messages, legal pages.

### 5.2 Security & compliance
| Gap | Notes |
|---|---|
| PCI scope | Raw PAN in the app (§3.4) |
| No cookie consent / CMP | `grep -i "gdpr|consent"` → 0 |
| No privacy policy page | Only `/terms-and-conditions` exists |
| No data export / right-to-erasure | — |
| No admin 2FA, no session management | §S4 |
| No rate limiting, no CAPTCHA, no bot defence | Login, register, promo, and search are all open |
| No CSP / security headers | `next.config.ts` sets only image `remotePatterns` |
| No secret management | No `.env` contract documented |
| No accessibility statement | — |

### 5.3 Accessibility
Primitives are thoughtful — `aria-live` regions, labelled controls, `aria-pressed` on selectable rows. Missing: automated axe/lighthouse gate in CI, verified focus-trap/restore in every dialog and drawer, skip-to-content link, verified keyboard paths through checkout and the flight seat map, prefers-reduced-motion coverage for framer-motion, contrast verification in both themes.

### 5.4 Performance
No image CDN beyond Unsplash `remotePatterns`, no bundle budget or analyzer, no documented caching/revalidation strategy (no data layer to cache), several very large client components on hot paths ([checkout-flow.tsx](components/checkout/checkout-flow.tsx) is 835 lines, `"use client"`), no virtualization on long admin tables, no Core Web Vitals measurement.

### 5.5 Observability
No error tracking (no Sentry/Bugsnag), no product analytics (no gtag/posthog/segment), no structured logging, no uptime/synthetic checks, no alerting. [app/global-error.tsx](app/global-error.tsx) renders a message and **reports nowhere** — production failures would be invisible.

### 5.6 Delivery engineering
No tests (§S5), no CI/CD pipeline, no preview environments, no feature-flag *remote* control ([features/dashboard/feature-flags/](features/dashboard/feature-flags/) is local), no migration story, no runbooks, no README beyond the `create-next-app` default.

---

## 6. Prioritized roadmap

### P0 — Blocks any real transaction (do first, in order)
1. **Stand up the API boundary.** Route Handlers or the NestJS backend. Move quote → hold → confirm, promo validation, and reference minting server-side. Add idempotency keys. Wire [data/repository.ts](features/dashboard/data/repository.ts) into modules, replacing `createStubService`.
2. **Unify the booking model.** Retire [services/checkout.ts](services/checkout.ts); route single-listing checkout through the domain layer exactly as [features/trip/](features/trip/) already does. Delete the localStorage booking/cancellation stores.
3. **Real auth.** Signed `httpOnly` session cookie, `middleware.ts` route protection, server-side RBAC checks on every mutation, merchant scoping extended to all 42 stub modules.
4. **Payment integration.** Hosted fields/tokenization (no PAN in the app), 3DS/SCA, at least one local BD method, webhook-driven status, failure-recovery UX.
5. **Regression-lock the money.** Unit tests over [domain/money.ts](features/dashboard/domain/money.ts) and [domain/lifecycle.ts](features/dashboard/domain/lifecycle.ts); an E2E smoke path for search → book → cancel → refund. CI on every push.

### P1 — Required to operate the business
6. **Inventory & rates.** Availability model, rate plans, room-type selection on detail (activate the orphaned [room-card.tsx](components/cards/room-card.tsx)), admin rate calendar with bulk edit and restrictions.
7. **Communication layer.** Transactional email/SMS provider; wire confirmations, OTP, password reset, refund notices, review invitations. Then the dashboard notification composer + send log.
8. **Tax & total-price transparency.** Stop writing `taxesUsd: 0`; connect the tax module to checkout; disclose all-in pricing.
9. **Guest checkout** + traveller-document capture.
10. **Manage-my-booking:** date change, name correction, voucher/e-ticket PDF, `.ics`, dispute filing.
11. **Close admin action gaps:** payout release, reconciliation import, support reply threads, review moderation, invoice credit notes, bulk actions, unified audit trail.
12. **Observability:** error tracking, product analytics, structured logging, alerting.

### P2 — Growth and scale
13. Loyalty/coupon engine (earn, burn, expiry, tiers, issuance rules), referrals, price-drop alerts.
14. Cross-vertical `/search` filter parity + map-based search + better ranking.
15. Real i18n (ICU, locale routing, hreflang, RTL, SSR-safe locale) fed by the localization module.
16. Analytics depth: funnel, cohorts, attribution, margin, merchant scorecards.
17. B2B depth: contract rates, credit ledger, agency portal, partner API.
18. Channel manager + supplier/GDS integrations.
19. CMS publishing workflow (draft/version/schedule/preview).
20. Compliance: CMP, privacy policy, data export/erasure, security headers, a11y gate in CI.

---

## 7. What is genuinely strong (preserve these)

Worth stating explicitly, because the refactors above should not damage them:

- **The domain layer.** [domain/lifecycle.ts](features/dashboard/domain/lifecycle.ts) is the single source of transition legality, with `availableBookingActions` driving UI so no screen can offer an illegal action. [domain/money.ts](features/dashboard/domain/money.ts) centralises commission, refund quoting, settlement and platform financials. This is production-grade thinking and should become the server's domain layer verbatim.
- **Customer cancellation** already reads the platform's real policy engine and shows an honest refund quote — the correct pattern for every other self-service action.
- **The trip / unified-booking path** already bridges customer UI to the domain layer. It is the template for §6.2.
- **RBAC design** ([features/dashboard/rbac/](features/dashboard/rbac/)) — roles, permissions, route access, and scope-aware services — needs enforcement moved server-side, not redesign.
- **The CRUD kit** ([features/dashboard/crud/](features/dashboard/crud/)) gave 42 modules consistent list/filter/sort/paginate behaviour, and its service signature already matches a real repository.
- **Flight vertical depth** — search → results → detail → seats → extras → review → confirmation → boarding pass is a complete, coherent journey.
- **Design consistency** across 140 routes, with loading, error, and empty states as first-class citizens.

---

## Appendix — evidence index

| Claim | Verification |
|---|---|
| No API routes | `find app -name route.ts` → 0 |
| No middleware | `ls middleware.ts` → absent |
| No tests | `find . -name '*.test.*' -o -name '*.spec.*'` → 0 |
| No idempotency | `grep -ri idempot` → 0 |
| No rate plans / allotment | `grep -ri "rate plan\|ratePlan\|allotment"` → 0 |
| No reschedule | `grep -ri reschedule` → 0 |
| No consent/GDPR | `grep -ri "gdpr\|consent"` → 0 |
| No map library | `grep -ri "leaflet\|mapbox\|google.maps"` → 0 |
| No analytics/error tracking | `grep -ri "gtag\|posthog\|sentry\|segment"` → 0 |
| No admin 2FA | `grep -ri "2fa\|twoFactor"` → ~0 |
| 42 of 58 modules on stub services | `grep -rl createStubService features/dashboard/modules` → 42 |
| Repository layer unused | `grep -rn createResourceRepository features/dashboard/modules` → 0 |
| Bulk actions disabled | every `DataTable` call site passes `selectable={false}` |
| `RoomCard` orphaned | `grep -rn RoomCard` outside `components/cards/` → 0 |
| i18n is a phrase map | [features/i18n/dictionaries.ts](features/i18n/dictionaries.ts), 153 lines |
| Tax hardcoded to zero | [services/checkout.ts:129](services/checkout.ts#L129) |
