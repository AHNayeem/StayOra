# 07 — Admin / Platform Management

The admin dashboard is the largest surface in the product: **65 modules across 9 sidebar sections and roughly 100 routes**. Every route is real — there is not a single "coming soon" placeholder page in the application (`PlaceholderPage` exists as a component but is used nowhere).

## Sidebar structure

| Section | Modules |
|---|---|
| *(top)* | Dashboard, Analytics |
| **Operations** | Bookings, Catalog (12 sub-items), Flights (8), Merchants, Customers |
| **Revenue** | Finance (15 sub-items), Promotions (4), Membership, Advertising, B2B (5), Reports |
| **Content** | CMS (7), Reviews, Localization |
| **Access** | Users, Roles, Permissions |
| **Platform** | System (12), Help, Support, Profile |

---

## Capability audit

✅ implemented (domain-backed, persisted, cross-module consistent) · 🟡 partial · 🟠 UI only · 🔵 stub-backed CRUD (resets on reload) · 🔴 missing

| Capability | Status | Notes |
|---|---|---|
| User management | 🔵 | CRUD with role assignment, search, filters, pagination. In-memory only. |
| Vendor/merchant management | 🔵 | CRUD, but on a data model unrelated to the booking engine (see file 06). |
| Booking management | ✅ | List, detail, timeline, legal-transition actions, manual creation, cross-vertical unified view, cancellation quoting. |
| Product management | 🔵 | Per-vertical CRUD with Zod-validated forms. Does not reach the public catalogue. |
| Category management | 🔵 | Categories, amenities, attributes. |
| Commission management | ✅ | Per-booking entries, lifecycle panel, platform summary. |
| **Commission rules** | ✅ | A genuine rule engine: 6 targeting levels, percent + flat fee, floor/cap, gross-or-net basis, effective date windows, deterministic resolution, and the UI shows *which rule won and why*. |
| Payment management | 🔵 | Payments and transactions lists. |
| Refund management | ✅ | Full lifecycle with policy-based quoting and downstream reversal. |
| Payout management | 🔵 | Payouts list is stub-backed; **Settlements** (the real financial roll-up) is domain-backed. |
| Coupon management | ✅ | Via the offers engine — promo codes with eligibility, scope, windows, usage. |
| Promotion management | ✅ | Offers, combos, banners, seasonal/flash/member types. |
| Advertisement management | ✅ | Advertisers, campaigns, placements, budgets, CPC/CPM/CPA, status control, event recording, billing to the revenue ledger, performance summary. |
| Subscription management | 🟡 | B2B subscription charging exists. No merchant subscription product. |
| Membership management | ✅ | Plans, benefits, subscriptions, subscribe/cancel/renew/refund, revenue summary. |
| Reviews moderation | ✅ | Verified-stay-only reviews, publish/reject/remove, property replies. |
| Content management / CMS | 🟡 | Pages, homepage, menus, media, testimonials, newsletter, SEO — with a real **draft → review → publish workflow** (domain-backed and tested). But the published content does not drive the public site, which reads `constants/*`. |
| Reports | ✅ | Cross-module reporting with CSV export. |
| Analytics | ✅ | Revenue, booking, conversion and channel charts (feature-flagged). |
| Support | ✅ | Shared ticket inbox; agent replies land in the customer's messages. |
| Dispute management | 🔵 | Disputes list exists, stub-backed; no chargeback lifecycle or evidence submission. |
| Notifications | ✅ | Audience-scoped platform notifications with read state and unread counts. |
| System settings | 🟡 | Settings screen exists; **most values are not consumed elsewhere** — pricing constants, for example, live in `PRICING_CONFIG` in code, not in settings. |
| Localization | 🔵 | Locale management screen; one real dictionary behind it. |
| Currency | 🟡 | Switching works with static conversion rates. No rate source, no per-market pricing. |
| Tax | 🔵 | Tax module is stub-backed. The domain applies a single flat 7.5% rate from `PRICING_CONFIG`. |
| Audit logs | ✅ | Every financial and lifecycle change recorded with actor, entity, before and after — verified by test. |
| Role/permission management | 🟠 | Read-only matrices. Roles cannot be created or edited at runtime. |
| Revenue Center | ✅ | The nine-source ledger with filters, grouping, charts and export. Reconciles with the booking engine by construction. |
| Revenue management | ✅ | Occupancy/ADR/RevPAR, pace, pricing rules, transparent recommendations. |
| Inventory / rates | ✅ | Rate manager over baseline + override + consumed. |
| B2B management | ✅ | Accounts, credit limits and checks, settlement terms, net rates, sub-users, statements, invoices, subscription charging. |
| Insurance administration | ✅ | Providers, plans, policies, plan editor, margin summary. |
| Flights administration | 🟡 | Overview and bookings are domain-aware; airlines/airports/routes/schedules/passengers are stub-backed reference data. |
| System tools | 🔵 | Templates, cron, queues, cache, storage, maintenance, login logs, API logs — realistic screens over fake data. **There are no actual cron jobs, queues or cache.** |
| Design system | ✅ | A live documentation page for the component library. |
| Command palette | ✅ | Keyboard-driven navigation across the dashboard. |
| Global search (dashboard) | ✅ | Top-nav search. |
| Dark mode / theming | ✅ | Theme provider with persistence. |
| Data export | ✅ | CSV export helper used across modules. |
| Impersonation | 🔴 | The permission exists; no implementation. |

---

## What the admin dashboard does genuinely well

1. **Every route is reachable, permission-checked and visually consistent.** No dead ends.
2. **The financial modules agree with each other.** Because commission, fees and insurance margin are *derived on read* rather than stored, the Revenue Center can never disagree with the Commission page or a merchant's settlement. This is verified by the test "the ledger and the booking engine agree on commission".
3. **Actions are driven by the state machine.** The UI asks the domain which actions are legal; it does not decide for itself.
4. **Audit is real.** Financial changes record before/after and the entity affected.
5. **Scoping works.** A merchant signing into the same dashboard sees only their own data, tested.
6. **Reusable CRUD engine.** One `createStubService` + `ResourceListView` pattern powers 42 modules consistently — which also means all 42 will migrate to a real backend in one motion.

---

## Gaps in platform management

### Critical
- **Settings are decorative.** Commission defaults, tax rate, platform fee, currency and cancellation shares are constants in code (`PRICING_CONFIG`), not configuration. An admin cannot change the platform's economics from the platform.
- **No real system operations.** Cron, queues, cache, storage and maintenance are screens with no runtime behind them. Maintenance mode has a page (`/maintenance`) but nothing enforces it.
- **Stub modules lose data on reload**, which will read as broken to any evaluator.

### High priority
- **No role editor.** Access control cannot be changed without a code deploy.
- **No approval workflows** outside refunds and CMS — commission changes, payouts and catalogue publishing all commit immediately.
- **No dispute/chargeback lifecycle.**
- **No bulk operations** — no bulk status change, bulk price update outside revenue management, or bulk import/export of catalogue.
- **No notification composer** — admins cannot send a campaign or an ad-hoc message.
- **No merchant onboarding queue** (see file 06).

### Medium priority
- **No saved views or dashboards per role.**
- **No scheduled reports.**
- **No admin activity analytics** (who did what, how often).
- **No data retention or archival policy.**
- **No API key / integration management.**
