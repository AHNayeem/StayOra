# 01 — Executive Summary

**Product:** Otithee (shipped in code under the brand name **Otithee**)
**Repository:** `otithee-booking` v0.1.0
**Analysis date:** 14 August 2026
**Basis:** Direct inspection of the repository — 154 page routes, ~134,600 lines of TypeScript/TSX, 17 commits.

---

## 1. What has already been built?

Otithee is a **complete, working travel-booking product — built entirely in the browser layer.**

Every screen a hotel marketplace needs exists and functions: a customer can search across ten product categories, open a listing, pick a room and rate plan, hold inventory, add extras and insurance, apply a coupon or loyalty points, pay through a simulated gateway with 3-D Secure, receive a confirmation, see the invoice, request a refund, and leave a review. On the other side, an operator can watch that same booking arrive in the admin dashboard, approve the refund, see the commission reverse, and watch the merchant's settlement change. The two sides are reading the same data.

That last point is the most important thing in this document. Otithee is **not** a collection of disconnected mock screens. It has a genuine **domain layer** — roughly 17,000 lines of business logic covering pricing, commission, tax, refunds, settlement, inventory, loyalty, insurance, membership, advertising and revenue management — with a **regression test suite of 145 checks that currently passes 145/145**. The business rules are real. What is missing is the infrastructure underneath them.

## 2. What are the strongest parts?

| Strength | Why it matters |
|---|---|
| **The money engine** | One canonical formula produces every monetary figure in the product. Commission, tax, platform fee, discounts, B2B markup, refund quotes and settlements all derive from it. Tax is never counted as revenue; the merchant's earning is never counted as platform revenue. This is the hardest part of a marketplace to get right, and it is right. |
| **The revenue ledger** | A single, tested answer to "where does the platform make money?" across nine sources — with derived figures (commission, fees, insurance margin) recomputed on read so they can never disagree with the booking ledger. |
| **Breadth of product coverage** | Nine catalog verticals plus flights, all live end-to-end. Most competitors' prototypes stop at hotels. |
| **RBAC design** | Ten roles, 23 resources × 7 actions, enforced in three layers (menu, route, component). Route rules exist independently of the menu, so hiding a link is never mistaken for access control. |
| **Cross-sell / unified trip** | A working trip cart that carries destination and dates across verticals, a deterministic recommendation engine, combo offers, and a unified booking read model spanning stays, flights and trips. |
| **Honest seams** | Every mock is labelled as a mock in code, returns a Promise, and matches the shape a real API would return. The path to a backend is a body swap, not a rewrite. |

## 3. What is incomplete?

The product is complete **as a prototype** and incomplete **as a business**. The gap is one specific thing:

> **There is no server. No API routes, no database, no middleware, no server actions.**

All 154 routes are pages. `find app -name route.ts` returns nothing. The entire application — catalogue, bookings, money, sessions — lives in browser `localStorage` and in-memory module singletons. Consequences:

- **Data is per-browser.** Two users never see each other's data. Clearing site data deletes the business.
- **Nothing is enforced.** Server-side guards exist and are correctly written, but they read a plain-text, non-`httpOnly` cookie that any user can hand-edit to become a super admin.
- **No money moves.** The payment gateway is a simulator; the "cards" are demo cards chosen from a list.
- **No message is sent.** Email, SMS, push and WhatsApp all write to an in-memory outbox.
- **Two data tiers.** ~23 dashboard modules read the persisted domain store; ~42 read module-scoped stub arrays that reset on page reload. Users, merchants, customers and the whole CMS are in the second tier.

## 4. What important features are missing?

**Critical (blocks any real launch):** backend and database; server-issued sessions and password hashing; a real payment gateway; a real payout rail; real email/SMS delivery; server-side price and availability authority; KYC/verification for merchants; file/image upload.

**High priority (blocks competitiveness):** merchant self-service onboarding; channel-manager / OTA connectivity; real flight supplier (GDS/NDC) integration; real maps and geocoding; document generation (PDF invoices, vouchers, tickets); production tax engine; live FX rates.

**Notably, several things usually missing at this stage are already present in design:** insurance, membership, advertising, B2B, loyalty, revenue management, dispute handling and a full audit log. They need a backend, not a design.

## 5–6. Business opportunity and how Otithee makes money

The revenue model is **already implemented in logic** across ten sources, and the Revenue Center reports on all of them today:

| Stream | Who pays | Status in code |
|---|---|---|
| Booking commission (5–18% by product) | Merchant | Implemented — rule engine with 6 targeting levels |
| Platform service fee (2%) | Customer | Implemented — waivable by membership |
| Cancellation/amendment admin share (20% of fee) | Customer/merchant | Implemented |
| Travel insurance margin | Customer (via provider) | Implemented — outside the commission base |
| Premium membership subscription | Customer | Implemented — plans, benefits, renewal |
| Advertising / sponsored placement | Merchant | Implemented — CPC/CPM/CPA, budget, billing |
| B2B net-rate margin | Agency/corporate | Implemented — markup over net rate |
| B2B subscription | Agency/corporate | Implemented — credit, terms, statements |
| Platform-funded promotions (negative) | Platform | Implemented — tracked as a subsidy, not hidden |
| Manual adjustments | — | Implemented |

The commercial thinking is unusually mature: insurance premium is excluded from the commissionable base so it can never be double-counted; platform-funded discount is added back to the commission base so a marketing subsidy does not silently cut the merchant's earning. These are decisions most platforms get wrong in year two.

**The largest untapped opportunity is the unified trip.** The mechanism (shared trip context, cross-vertical recommendations, combo pricing, one checkout) is already built. Turning "flight → hotel → transfer → activity → insurance" into a default journey multiplies revenue per traveller across five commissionable products instead of one, and every one of those five already has commission logic behind it.

## 7. Biggest risks and gaps

1. **Security is not real.** The session cookie is readable, editable, and not `httpOnly`; seed passwords are plain text in the repository; there is no rate limiting, CSRF protection or input sanitisation at any trust boundary — because there is no trust boundary. *The code says this about itself, honestly, in comments.* Nothing here should ever be deployed publicly with real users.
2. **Price and availability are client-authoritative.** A user can edit `localStorage` and change what they are charged. This is unavoidable without a server and is the single hardest thing to retrofit safely.
3. **Effort mis-estimation.** Because the front end is complete, the remaining work *looks* small. It is not. Building the backend that this front end assumes — with the same domain rules, transactionally correct — is a larger body of work than everything built so far.
4. **Regulatory exposure not yet addressed.** Real travel insurance requires an underwriter and licensing; payments require PCI scope decisions; multi-country tax requires a tax engine; personal data requires GDPR handling. All are currently out of scope in code, correctly labelled as demo.
5. **Two-tier data model will cause drift.** Stub-backed modules (users, merchants, CMS) reset on reload while domain-backed modules persist. In a demo this reads as a bug; in a migration it means two different porting jobs.
6. **Single-currency truth.** Everything is priced in USD and converted for display with static rates. Regional pricing, per-market rounding and settlement currency are not modelled.

## 8. What should be done next?

The correct next move is **not** more features. It is to put a server behind what exists.

1. **Stand up a backend and database** using the existing domain layer as the specification — the service signatures in `features/dashboard/domain/services.ts` are already the API contract.
2. **Move authentication server-side**: hashed passwords, signed `httpOnly` sessions, server-verified RBAC on every read and write.
3. **Move pricing, availability and commission to the server** so the client can never be the authority on what someone is charged.
4. **Integrate one real payment gateway** end-to-end, including refunds and webhooks.
5. **Integrate one real notification provider** (email first) against the existing template registry.
6. **Unify the two data tiers** — migrate stub-backed modules onto the same persisted model.
7. **Build merchant self-service onboarding with KYC**, which is the gate on marketplace supply.
8. **Add file/media upload**, which every catalog and CMS module currently assumes exists.
9. **Then, and only then, expand revenue**: turn advertising, membership and insurance from correct logic into billed products.
10. **Then expand the ecosystem**: unified itinerary, bundles, B2B API, white-label.

---

### One-paragraph summary for the board

> Otithee is a fully-realised travel marketplace product with an unusually rigorous business core — ten booking verticals, ten roles, a tested money engine, and ten revenue sources already modelled — implemented entirely as a browser application with no server, no database and no real payments. The product design work is largely done and is of high quality. The engineering work that remains is the infrastructure beneath it, and that work is substantial: it is the difference between a convincing demonstration and a system that can hold real customers, real money and real liability.
