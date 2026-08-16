# 15 — Gap Closure

What was done against [14 — Feature Gap Analysis](./14-feature-gap-analysis.md), and what was
deliberately left. The prototype rule still holds: no backend, no database, no real provider —
but every feature below works end to end against the local domain, behind service contracts a
real API can replace without touching the UI.

---

## Contradictions

| # | Contradiction | Resolution |
|---|---|---|
| 1 | Admin catalogue vs public catalogue | The eight stub-backed vertical modules (hotels, apartments, resorts, shared rooms, convention halls, transport, activities, visa) are **deleted**. `/dashboard/catalog/*` now renders `CatalogueProductsView`, which reads the canonical `catalogueService`. Creating → submitting → approving → publishing a product puts it on sale on the public site; unpublishing removes it. |
| 2 | CMS publishes nothing | `modules/cms/published.ts` is the published-content read model; `components/shared/cms-content.tsx` renders it on public pages with the shipped copy as fallback. `/about-us` and `/terms-and-conditions` consume it today, and the CMS list links each live page to its public URL. |
| 3 | Settings are decorative | `domain/platform-config.ts` stores tax, service fee, default commission, cancellation admin share, per-product commission, FX spread/lock, delivery simulation and maintenance. `PRICING_CONFIG` is now a live read of it, so a tax change in Settings changes the next quote. `platform-settings-service.ts` adds validation, audit and notification. |
| 4 | System tools have no system | `domain/scheduler.ts` registers nine jobs, each bound to a real domain effect, with run history and a tick the dashboard drives. Queues project real backlogs (queued messages, submitted catalogue items, pending refunds/settlements/supplier requests). Cache and storage project real entity counts, with the simulated parts (hit rate, byte estimates) labelled as such. Maintenance mode is enforced by `MaintenanceGate` on the public layout. |
| 5 | Notifications appear delivered | Messages enter the outbox **queued** and are progressed queued → sent → delivered by `delivery:progress`, with a configurable, deterministic failure share and a retry action. Every record carries `simulated: true` and the UI says so. |
| 6 | Language switcher over-promises | Arabic dictionary added (RTL); the switcher only offers languages that are enabled in Localization, coverage is **measured** from the dictionaries, and the new Translations tab edits strings that change the public site immediately. |
| 7 | Payouts vs Settlements | Already resolved (payouts derive from settlements) — left unchanged. |
| 8 | `FxSnapshot` defined but unused | `domain/fx.ts` quotes mid + spread from the same currency table the switcher uses, locks a rate at checkout onto `Booking.fx`, expires stale locks, and shows the held rate in the order summary and on the voucher. |
| 9 | Stub persistence | `crud/module-store.ts` gives every `createStubService` module localStorage persistence, schema-versioned and namespaced. Same UI, same behaviour, everywhere. |
| 10 | Three roles unreachable | Already resolved in an earlier pass (every role has a seed account) — left unchanged. |

---

## Features implemented

**Booking foundation.** Supplier confirmation loop (`domain/supplier.ts`) with instant vs
on-request products, a merchant decision screen and a job that resolves overdue requests;
FX rate locking; period-aware finance.

**Customer conversion.** Zero-result search recovery (relax the query one constraint at a time
and say which one); alternative dates on every listing (sold out → free windows, available →
cheaper ones); waitlist with a job that notifies travellers when dates reopen; abandoned-checkout
recovery with a link back to the same room, rate and dates.

**Marketing / CRM.** Computed customer segments (first-time, repeat, high value, lapsed, members,
abandoned, waitlisted); campaign composer with schedule, audience preview, suppression-aware
reporting and a job that sends scheduled campaigns; review invitations after a completed stay.

**Platform operations.** Scheduler with run history; period close with point-in-time snapshots and
audited reopen; bulk catalogue CSV import/export; delivery retry.

---

## Deliberately not built

Everything the brief excludes, restated so nobody mistakes a gap for an oversight:

- No API, database, or server-side authorization — the domain services remain the contract.
- No real payment, payout, KYC, email/SMS, storage or maps provider.
- No GDS/NDC or channel-manager connectivity: `supplier.ts` simulates the acknowledgement loop.
- Document generation stays plain-text/ICS in the browser rather than server-rendered PDF.
- Native apps, ML pricing and coalition loyalty remain out of scope for a frontend prototype.

---

## Verification

`bun run typecheck` · `npx eslint .` (0 errors) · `bun run test:domain` (338 checks) ·
`bun run build`.

> A later pass closed the remaining audit items — tax rule engine, external calendar sync,
> saved searches and price alerts, wishlist boards, recurring membership billing with dunning,
> split payment, and the trip-level itinerary and cross-supplier refunds. See
> [18 — Audit Implementation](./18-audit-implementation.md). The regression harness covers platform configuration, FX locking, the delivery
lifecycle, the scheduler, waitlist and alternatives, supplier confirmation, recovery, segments and
campaigns, period close, and localization.
