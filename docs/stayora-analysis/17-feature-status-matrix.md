# 17 — Master Feature Status Matrix

**Legend:** ✅ Implemented · 🟡 Partial · 🟠 Prototype/UI only · 🔵 Mock/demo data · 🔴 Missing · ⚪ Recommended/future
**Users:** C = Customer · M = Merchant · A = Admin · F = Finance · S = Support · B = B2B/Agency · P = Platform/system

| Module | Feature | Status | User | Business importance | Revenue potential | Priority |
|---|---|---|---|---|---|---|
| **Authentication** | Login / register / logout | 🔵 | All | Critical | Indirect | 1 |
| | Email verification (OTP) | 🔵 fixed code | All | Critical | — | 1 |
| | Forgot / reset password | 🔵 | All | Critical | — | 1 |
| | Password hashing | 🔴 | All | Critical | — | 1 |
| | Server-issued sessions | 🔴 | All | Critical | — | 1 |
| | MFA | 🔴 | A F | High | — | 2 |
| | Social login | 🟠 buttons only | C | Medium | Indirect | 3 |
| **RBAC** | 10 roles, 23×7 permissions | ✅ design | All | Critical | — | 1 |
| | Menu / route / component guards | ✅ | All | Critical | — | 1 |
| | Server-side enforcement | 🔴 | All | Critical | — | 1 |
| | Runtime role editing | 🟠 read-only | A | High | — | 2 |
| | Impersonation | 🔴 | S A | Medium | — | 3 |
| **Catalogue** | 9 verticals, ~380 listings | ✅ 🔵 data | C | Critical | Direct | 1 |
| | Listing pages + filters + sort | ✅ | C | Critical | Direct | 1 |
| | Detail pages | ✅ | C | Critical | Direct | 1 |
| | Admin catalogue CRUD | 🔵 stub | M A | Critical | Direct | 1 |
| | Admin catalogue → public site | 🔴 **contradiction** | M A | Critical | Direct | 1 |
| | Media upload | 🔴 | M A | Critical | — | 1 |
| | Catalogue approval workflow | 🔴 | M A | High | — | 2 |
| **Search** | Global cross-vertical search | ✅ | C | High | Direct | 1 |
| | Suggestions + recent searches | ✅ | C | Medium | Direct | 2 |
| | Filters (price, rating, location, category) | ✅ | C | High | Direct | 1 |
| | Map discovery | ✅ 🔵 no tiles | C | Medium | Indirect | 2 |
| | Near me (geolocation) | ✅ | C | Medium | Indirect | 2 |
| | Compare | ✅ | C | Medium | Direct | 2 |
| | Availability-aware search | 🔴 | C | High | Direct | 2 |
| | Zero-result recovery | 🔴 | C | High | Direct | 2 |
| | Saved searches (stays) | 🔴 | C | Low | Indirect | 3 |
| | Personalised recommendations | 🔴 | C | High | Direct | 3 |
| **Inventory** | Room types & rate plans | ✅ | M | Critical | Direct | 1 |
| | Availability engine | ✅ | C M | Critical | Direct | 1 |
| | Holds with expiry | ✅ | C | Critical | Direct | 1 |
| | Double-booking prevention | ✅ tested | C M | Critical | Direct | 1 |
| | Min/max stay, CTA/CTD | 🔴 | M | High | Direct | 2 |
| | Time-slot inventory (tours) | 🔴 | M | High | Direct | 3 |
| | Channel manager sync | 🔴 | M | Critical | Direct | 2 |
| **Checkout** | 4-step flow | ✅ | C | Critical | Direct | 1 |
| | Add-ons | ✅ | C | High | Direct | 1 |
| | Insurance attach | ✅ | C | High | Direct | 1 |
| | Membership upsell | ✅ | C | High | Direct | 1 |
| | Coupons / promo codes | ✅ | C | High | Direct | 1 |
| | Loyalty redemption | ✅ | C | Medium | Indirect | 2 |
| | Deposit / balance plans | ✅ | C | Medium | Direct | 2 |
| | Guest checkout | 🟡 | C | Medium | Direct | 2 |
| **Payments** | Gateway | 🔵 simulator | C F | Critical | Direct | 1 |
| | 3-D Secure | 🔵 | C | Critical | — | 1 |
| | Decline + retry | ✅ | C | High | Direct | 1 |
| | Saved cards / tokenisation | 🟠 display only | C | Medium | Indirect | 2 |
| | Wallet balance | 🔵 stub | C | Low | Indirect | 3 |
| | Webhooks + idempotency | 🔴 | F P | Critical | — | 1 |
| **Money engine** | Canonical pricing formula | ✅ | All | Critical | Direct | 1 |
| | Commission calculation | ✅ | M F | Critical | **Direct** | 1 |
| | Commission rule engine (6 levels) | ✅ | F A | Critical | **Direct** | 1 |
| | Tax | 🟡 flat 7.5% | F | Critical | — | 2 |
| | Platform service fee | ✅ | F | High | **Direct** | 1 |
| | Discounts + platform-funded split | ✅ | F | High | Direct | 1 |
| | B2B markup | ✅ | B F | High | Direct | 2 |
| | Server-side pricing authority | 🔴 | All | Critical | Direct | 1 |
| | Multi-currency storage | 🔴 | C F | High | Direct | 2 |
| | FX rate locking | 🔴 (type exists) | F | High | Direct | 2 |
| **Refunds** | Policy-driven quoting | ✅ | C F | Critical | — | 1 |
| | Full lifecycle | ✅ | C F | Critical | — | 1 |
| | Partial refunds | ✅ | F | High | — | 1 |
| | Cancellation fees + admin share | ✅ | F | High | **Direct** | 1 |
| | Commission reversal | ✅ tested | F | Critical | Direct | 1 |
| | Actual money returned | 🔴 | C F | Critical | — | 1 |
| **Settlement & payout** | Merchant settlement roll-up | ✅ | M F | Critical | — | 1 |
| | Settlement status machine | ✅ | F | High | — | 1 |
| | Payout execution | 🔴 | M F | Critical | — | 1 |
| | Payout schedules & statements | 🔴 | M F | High | — | 2 |
| **Revenue** | Revenue ledger (10 sources) | ✅ | F A | Critical | **Direct** | 1 |
| | Revenue Center UI | ✅ | F A | High | Direct | 1 |
| | Derived/stored split | ✅ | F | High | — | 1 |
| | Point-in-time snapshots | 🔴 | F | High | — | 2 |
| | Period close | 🔴 | F | High | — | 2 |
| **Revenue management** | Occupancy / ADR / RevPAR | ✅ | M | High | Direct | 2 |
| | Pace analysis | ✅ | M | High | Direct | 2 |
| | Pricing rules | ✅ | M | High | **Direct** | 2 |
| | Transparent recommendations | ✅ | M | High | Direct | 2 |
| | ML dynamic pricing | ⚪ | M | High | Direct | 6 |
| **Merchants** | Merchant dashboard + scoping | ✅ tested | M | Critical | Indirect | 1 |
| | Registration | 🔴 | M | **Critical** | **Direct** | 1 |
| | KYC / verification | 🔴 | M A | **Critical** | — | 1 |
| | Onboarding wizard | 🔴 | M | Critical | Direct | 2 |
| | Bank details | 🔴 | M F | Critical | — | 1 |
| | Admin merchant CRUD | 🔵 stub, separate model | A | High | Indirect | 1 |
| | Merchant staff accounts | 🔴 | M | High | — | 2 |
| | Multi-property grouping | 🔴 | M | Medium | Indirect | 3 |
| | Merchant subscriptions | 🔴 | M | Medium | **Direct** | 3 |
| **B2B** | Accounts + tiers + terms | ✅ | B F | High | **Direct** | 2 |
| | Credit limits + checks | ✅ | B F | High | Direct | 2 |
| | Net rates + markup | ✅ | B | High | **Direct** | 2 |
| | Statements + invoices | ✅ | B F | High | Direct | 2 |
| | Subscription charging | ✅ | B F | Medium | **Direct** | 2 |
| | Sub-user login | 🔴 (model exists) | B | High | Indirect | 3 |
| | Public API | ⚪ | B | High | **Direct** | 5 |
| | White-label | ⚪ | B | High | **Direct** | 5 |
| | Corporate policy & approvals | ⚪ | B | High | Direct | 5 |
| **Membership** | Plans + benefits | ✅ | C A | High | **Direct** | 3 |
| | Subscribe / cancel / renew / refund | ✅ | C | High | Direct | 3 |
| | Benefit enforcement at checkout | ✅ | C | High | Direct | 3 |
| | Recurring billing + dunning | 🔴 | C F | High | Direct | 3 |
| **Loyalty** | Points ledger + tiers | ✅ | C | Medium | Indirect | 3 |
| | Accrual & reversal on refund | ✅ | C | Medium | — | 3 |
| | Wallet coupons | ✅ | C | Medium | Direct | 3 |
| | Referral | 🟡 model only | C | Medium | Direct | 3 |
| | Coalition partners | ⚪ | C | Low | Direct | 6 |
| **Insurance** | Providers, plans, policies | ✅ 🔵 demo | C A | High | **Direct** | 3 |
| | Attach at checkout | ✅ | C | High | Direct | 1 |
| | Margin outside commission base | ✅ | F | High | Direct | 1 |
| | Policy unwind on refund | ✅ tested | C F | High | — | 1 |
| | Real underwriter | 🔴 | C | High | Direct | 3 |
| | Claims | 🔴 | C | Medium | — | 4 |
| **Advertising** | Advertisers + campaigns | ✅ | A | High | **Direct** | 3 |
| | Placements + budgets | ✅ | A | High | Direct | 3 |
| | CPC / CPM / CPA | ✅ | A | High | Direct | 3 |
| | Billing to revenue ledger | ✅ | F | High | Direct | 3 |
| | Merchant self-serve purchase | 🔴 | M | High | **Direct** | 3 |
| | Ad approval + fraud prevention | 🔴 | A | Medium | — | 3 |
| **Promotions** | Offers (5 types) + eligibility | ✅ | M A | High | Direct | 1 |
| | Combo offers | ✅ | M A | High | **Direct** | 2 |
| | Banners | 🔵 stub | A | Low | Indirect | 3 |
| **Bookings (ops)** | List / detail / timeline | ✅ | M A S | Critical | — | 1 |
| | State machine enforcement | ✅ | All | Critical | — | 1 |
| | Manual booking creation | ✅ | A S | High | Direct | 1 |
| | Amendments (date, upgrade, guests) | ✅ | C A | High | Direct | 2 |
| | Unified cross-vertical view | ✅ | A | Medium | — | 2 |
| | Supplier confirmation loop | 🔴 | M | Critical | — | 2 |
| **Flights** | Search / results / detail | ✅ 🔵 | C | High | Direct | 1 |
| | 4-step booking + seats + extras | ✅ | C | High | Direct | 1 |
| | PNR / e-ticket / boarding pass | ✅ 🔵 | C | High | — | 1 |
| | Shared invoice/payment records | ✅ | C F | High | — | 1 |
| | Admin flight modules | 🟡 | A | Medium | Indirect | 2 |
| | GDS / NDC supplier | 🔴 | C | Critical | Direct | 2 |
| | Ticketing & settlement | 🔴 | F | Critical | — | 2 |
| | Refund processing | 🟡 queue only | C F | High | — | 2 |
| **Trip / ecosystem** | Trip cart + shared context | ✅ | C | High | **Direct** | 1 |
| | Recommendation engine | ✅ | C | High | **Direct** | 1 |
| | Trip checkout (multi-supplier) | ✅ | C | High | Direct | 2 |
| | Unified booking read model | ✅ | C A | Medium | — | 2 |
| | Cross-sell merchandising | 🔴 | C | **Critical** | **Highest** | 3 |
| | Unified itinerary document | 🔴 | C | High | Indirect | 4 |
| | Single trip reference | 🔴 | C | High | Indirect | 4 |
| | Refund orchestration across suppliers | 🔴 | C F | High | — | 4 |
| **Reviews** | Verified-stay-only reviews | ✅ | C M | High | Indirect | 1 |
| | Moderation | ✅ | A | High | — | 1 |
| | Property replies | ✅ | M | Medium | Indirect | 2 |
| | Fraud / spam prevention | 🔴 | A | Medium | — | 3 |
| | Review analytics | 🟡 | M A | Medium | Indirect | 3 |
| **Support** | Shared ticket store | ✅ | C S | High | — | 1 |
| | Customer help centre | ✅ | C | High | — | 1 |
| | Admin inbox + internal notes | ✅ | S | High | — | 1 |
| | Live chat | 🔴 | C S | Medium | Indirect | 3 |
| | SLA / escalation | 🔴 | S | Medium | — | 3 |
| | Disputes / chargebacks | 🔵 stub | F | High | Direct | 2 |
| **Notifications** | 5 channels, 10 templates | 🔵 outbox | All | Critical | — | 1 |
| | Preferences | ✅ | C | Medium | — | 2 |
| | Real delivery (email/SMS/push) | 🔴 | All | **Critical** | Indirect | 1 |
| | Campaign composer | 🔴 | A | Medium | Direct | 3 |
| | Scheduled reminders | 🔴 | C | High | Direct | 2 |
| **CMS** | Pages, homepage, menus, media, SEO | 🔵 stub | A | Medium | Indirect | 2 |
| | Draft → review → publish workflow | ✅ tested | A | Medium | — | 2 |
| | Publishing to the public site | 🔴 **contradiction** | A | High | Indirect | 2 |
| **Localization** | Currency switching | 🟡 static rates | C | High | Direct | 2 |
| | Language switching | 🟡 1 of 3 dictionaries | C | High | Indirect | 2 |
| | Locale-aware formatting | ✅ | C | Medium | — | 2 |
| | RTL direction | 🟡 | C | Medium | — | 3 |
| | Regional pricing | 🔴 | C F | High | Direct | 3 |
| **Platform** | Admin dashboard (65 modules) | ✅/🔵 | A | Critical | Indirect | 1 |
| | Analytics | ✅ | A M | High | Indirect | 1 |
| | Reports + CSV export | ✅ | A M F | High | Indirect | 1 |
| | Audit log | ✅ tested | A F | Critical | — | 1 |
| | Settings (functional) | 🟠 decorative | A | High | — | 2 |
| | System tools (cron/queue/cache) | 🟠 no runtime | P | High | — | 2 |
| | Maintenance mode | 🟠 unenforced | P | Medium | — | 2 |
| | Command palette | ✅ | A M | Low | — | 3 |
| | Design system | ✅ | P | Medium | — | 3 |
| | Feature flags | 🟡 all on | P | Medium | — | 3 |
| **Quality** | Domain regression tests (145) | ✅ passing | P | Critical | — | 1 |
| | Component / integration tests | 🔴 | P | High | — | 1 |
| | E2E tests | 🔴 | P | High | — | 1 |
| | Accessibility tests | 🔴 | P | High | — | 2 |
| | CI/CD | 🔴 | P | Critical | — | 1 |
| **Infrastructure** | Backend API | 🔴 | All | **Critical** | Total | 1 |
| | Database | 🔴 | All | **Critical** | Total | 1 |
| | File storage | 🔴 | All | Critical | — | 1 |
| | Monitoring / alerting | 🔴 | P | Critical | — | 1 |
| | Backup / recovery | 🔴 | P | Critical | — | 1 |
| | Security headers / rate limiting | 🔴 | P | Critical | — | 1 |
| | GDPR (consent, export, erasure) | 🔴 | C P | Critical | — | 1 |

---

## Tally

| Status | Count | Share |
|---|---:|---:|
| ✅ Implemented | 78 | 44% |
| 🟡 Partial | 17 | 10% |
| 🟠 Prototype / UI only | 8 | 4% |
| 🔵 Mock / demo | 14 | 8% |
| 🔴 Missing | 55 | 31% |
| ⚪ Recommended / future | 6 | 3% |
| **Total rows** | **178** | |

**Read this alongside the weighting, not instead of it:** the 44% implemented includes the hardest business logic in the system, and the 31% missing is almost entirely infrastructure. A feature count understates both the quality of what exists and the effort of what remains.
