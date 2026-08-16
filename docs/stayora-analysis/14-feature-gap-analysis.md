# 14 — Feature Gap Analysis

> **Status:** closed out by [15 — Gap Closure](./15-gap-closure.md) and
> [18 — Audit Implementation](./18-audit-implementation.md). Doc 18 also lists the items below
> that were already complete when this analysis called them missing.

## Contradictions found between UI, domain and data

These are cases where one part of the product implies something another part does not deliver. They matter more than missing features, because they mislead.

| # | Contradiction | Detail |
|---|---|---|
| 1 | **Admin catalogue vs public catalogue** | Dashboard catalog modules (hotels, apartments, resorts, …) are stub-backed and manage a dataset entirely separate from `constants/listings.ts`, which is what the public site renders. Creating a hotel in the dashboard does not create a bookable hotel. |
| 2 | **CMS publishes nothing** | The CMS has a real, tested draft → review → publish workflow. The public site reads static constants. Publishing changes a status and nothing else. |
| 3 | **Settings are decorative** | The Settings screen implies control over platform economics; commission defaults, tax rate, service fee and cancellation share are constants in `PRICING_CONFIG` in code. |
| 4 | **System tools have no system** | Cron, queues, cache and storage screens present realistic operational data. There are no cron jobs, no queues, no cache and no storage. Maintenance mode has a page that nothing enforces. |
| 5 | **Notifications appear delivered** | The delivery report shows queued → sent → delivered. Nothing leaves the browser. |
| 6 | **Language switcher over-promises** | Three languages offered; one dictionary exists, covering chrome only. Arabic flips direction but not language. |
| 7 | **Payouts vs Settlements** | Two finance screens cover overlapping ground; Settlements is domain-backed and real, Payouts is stub-backed. A user cannot tell which is authoritative. |
| 8 | **`FxSnapshot` defined but unused** | The data model anticipates rate locking; the money path never populates it. |
| 9 | **Stub persistence** | 42 modules present full CRUD; state vanishes on reload while 23 domain-backed modules persist. Same UI, different behaviour. |
| 10 | **Three roles unreachable** | `vendor`, `marketing` and `content_manager` are fully defined but have no seed account, so they cannot be demonstrated. |

---

# Missing / Recommended Features

## 🔴 CRITICAL — required before production

### C1. Backend API and database
**Why:** Everything else depends on it. Today all data is per-browser.
**Who:** All users. **How:** Build the API directly from the existing service signatures — `features/dashboard/domain/services.ts` is already the contract, complete with `ListParams`, `DomainScope` and `Paginated<T>`. Port the domain layer server-side largely unchanged; it has no React dependency and is Node-testable.
**Dependencies:** None — this is the root.
**Business impact:** Without it there is no product. **Revenue impact:** Total. **Priority:** 1.

### C2. Server-issued authentication
**Why:** Passwords are compared in plain text; the session cookie is unsigned and grants any role.
**How:** Hashed passwords (argon2/bcrypt), signed `httpOnly` `Secure` session cookies, real OTP with expiry, refresh and revocation.
**Dependencies:** C1. **Impact:** Legal and reputational exposure without it. **Priority:** 1.

### C3. Server-side authorization
**Why:** RBAC is designed correctly and enforced nowhere that matters.
**How:** Call the existing `requirePermission` / `requireAnyPermission` helpers at every endpoint; apply `DomainScope` filters server-side.
**Dependencies:** C1, C2. **Priority:** 1.

### C4. Server-authoritative pricing and availability
**Why:** A user can currently alter what they are charged.
**How:** The client may *quote*; only the server may *charge*. Move `priceBooking`, inventory checks and commission resolution behind the API.
**Dependencies:** C1. **Revenue impact:** Direct — protects every transaction. **Priority:** 1.

### C5. Real payment gateway
**Why:** No money can be collected.
**How:** Replace the bodies of `authorize` / `complete3DS` / `capture` / `refund` in `domain/payments.ts` — the shapes already match a real integration. Add webhooks and idempotency keys.
**Dependencies:** C1, C4. **Priority:** 1.

### C6. Real payout rail
**Why:** Merchants cannot be paid; settlements compute a number with nowhere to go.
**Dependencies:** C5, C9. **Priority:** 1.

### C7. Real notification delivery
**Why:** No customer receives anything. Ten templates across five channels exist and are ready.
**How:** Reimplement `dispatch` in `domain/messaging.ts` against Postmark/SES, then Twilio. The template registry, preference checks and delivery log all stay.
**Dependencies:** C1. **Priority:** 1.

### C8. File and media upload
**Why:** Every catalog and CMS module assumes images exist; none can be uploaded.
**How:** S3/R2 + CDN, signed upload URLs, image processing.
**Dependencies:** C1. **Priority:** 1.

### C9. Merchant onboarding with KYC
**Why:** There is no way to become a merchant, which caps supply at zero.
**How:** Application → document upload → verification (Onfido/Sumsub) → contract → bank details → approval → publish.
**Dependencies:** C1, C2, C8. **Revenue impact:** Unlocks the primary revenue line. **Priority:** 1.

### C10. Unify the two data tiers and reconcile the contradictions above
**Why:** 42 modules manage data the rest of the platform cannot see.
**Dependencies:** C1. **Priority:** 1.

---

## 🟠 HIGH PRIORITY — business competitiveness

| # | Feature | Why | Who | Business impact | Revenue impact |
|---|---|---|---|---|---|
| H1 | **Supplier connectivity** (channel manager for hotels, GDS/NDC for flights) | Nothing real can be sold without it | Merchants, customers | Existential for supply | Enables all commission |
| H2 | **Document generation** (invoice, voucher, e-ticket, receipt PDFs) | Nothing can be presented at check-in or filed for tax | Customers, merchants, finance | Trust and compliance | Indirect |
| H3 | **Supplier confirmation loop** | Bookings are confirmed without the supplier agreeing | Merchants | Prevents disputes | Protects revenue |
| H4 | **Real maps and geocoding** | Discovery quality; the current map is a projection stand-in | Customers | Conversion | Indirect |
| H5 | **Cross-sell merchandising** | The mechanism is built but never led | Customers | **Highest single uplift available** | 4–6× revenue per traveller |
| H6 | **Production tax engine** | Single flat 7.5% rate cannot serve multiple markets | Finance | Compliance | Protects margin |
| H7 | **Multi-currency storage + live FX with rate locking** | Prices are USD converted for display | Customers, finance | Market expansion | Direct (FX margin) |
| H8 | **Runtime role and permission management** | Access control needs a deploy to change | Admin | Operational agility | Indirect |
| H9 | **Merchant staff accounts** | Merchants must currently share one login | Merchants | Security and usability | Indirect |
| H10 | **Chargeback / dispute lifecycle** | No evidence flow or liability handling | Finance | Loss prevention | Direct |
| H11 | **Scheduled jobs** (reminders, review invitations, renewals, expiry) | Several features assume a scheduler that does not exist | All | Retention | Direct (renewals) |
| H12 | **Search availability filtering + zero-result recovery** | Travellers reach dead ends | Customers | Conversion | Direct |
| H13 | **Merchant self-serve advertising** | The billing logic exists; the shop window does not | Merchants | New stream | Direct, high margin |
| H14 | **Approval workflows** for catalogue, commission changes and payouts | Everything commits immediately | Admin, finance | Control | Loss prevention |
| H15 | **Testing above the domain layer** | No component, integration or E2E tests | Engineering | Release confidence | Indirect |

---

## 🟡 MEDIUM PRIORITY — scaling

| # | Feature | Why |
|---|---|---|
| M1 | Merchant subscription tiers | New recurring stream, low build cost |
| M2 | Affiliate / referral programme | Untapped acquisition channel |
| M3 | Advanced CRM and segmentation | Retention; customer data already exists |
| M4 | Abandoned-booking recovery | Holds already record intent |
| M5 | Email marketing and campaigns | No composer exists |
| M6 | Multi-property grouping for merchants | Hotel groups cannot operate today |
| M7 | Time-slot inventory for tours and activities | Cannot sell capacity by departure |
| M8 | Waitlist and alternative-date suggestions | Recovers lost demand |
| M9 | Complete localization (full dictionaries, RTL layout, regional pricing) | Market expansion |
| M10 | Bulk operations and catalogue import/export | Operational efficiency at scale |
| M11 | Mobile-optimised merchant dashboard | Property operators are mobile-first |
| M12 | Advanced fraud detection | Card testing, booking fraud |
| M13 | Accessibility audit and remediation | Legal requirement in several markets |
| M14 | Financial period close and point-in-time revenue snapshots | Prevents historical figures from changing |
| M15 | Impersonation with audit trail | Support efficiency |

---

## ⚪ FUTURE / ADVANCED — ecosystem

| # | Feature | Why |
|---|---|---|
| F1 | **Unified itinerary and single trip reference** | The signature travel-ecosystem feature; components exist |
| F2 | **Refund orchestration across suppliers** | Required for real multi-supplier trips |
| F3 | **B2B API and white-label** | Highest revenue ceiling |
| F4 | **Corporate travel management** (policy, approval chains, expense) | Large contracts |
| F5 | **Native mobile apps** | Channel model already supports ios/android |
| F6 | **Real AI concierge** | Provider interface and tool registry already built |
| F7 | **ML-driven dynamic pricing** | Deterministic rule engine is the foundation |
| F8 | **Personalisation engine** | Rule-based recommendations already exist |
| F9 | **Data products for hotels** (market insight) | RevPAR/pace already computed; very high margin |
| F10 | **Loyalty coalition with partners** | Points ledger already exists |
| F11 | **Last-minute / distressed inventory marketplace** | Pace data already computed |
| F12 | **Marketplace for ancillary services** (lounges, parking, eSIM) | Add-on framework exists |

---

## Summary

| Priority | Count |
|---|---:|
| 🔴 Critical | 10 |
| 🟠 High | 15 |
| 🟡 Medium | 15 |
| ⚪ Future | 12 |
| **Total recommended** | **52** |
| Contradictions to resolve | 12 |

**The concentration is the finding:** all ten critical items are infrastructure, not product. The product thinking is done. What remains is making it real.
