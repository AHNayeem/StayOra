# 18 — Audit Implementation

Every item in [14 — Feature Gap Analysis](./14-feature-gap-analysis.md) and
[17 — Master Feature Status Matrix](./17-feature-status-matrix.md), verified against the code
rather than against its own label, and classified.

The rule for this pass: **prove a gap before filling it.** A third of the audit's "missing"
rows were already built — several of them tested — and were left alone. What follows records
both the work and the corrections.

---

## Where the audit was wrong

These were labelled missing or partial and are in fact complete. Nothing was written for them.

| Audit says | Reality | Evidence |
|---|---|---|
| Inventory: min/max stay, CTA/CTD 🔴 | Complete, and enforced | `RatePlan.minStay/maxStay/closedToArrival/closedToDeparture`, per-day overrides, all checked in `checkAvailability` and editable in the rate manager |
| Support: SLA / escalation 🔴 | Complete | `SLA_HOURS` + `slaStatus()` in `domain/support.ts` |
| B2B: sub-user login 🔴 | Complete | `b2b_sub_user` role, `b2bagent@otithee.com` seed account, `b2bSubUsers` in the store |
| Merchant: registration, KYC, onboarding, bank details 🔴 | Complete | `merchant-service.ts` + `modules/merchant-onboarding`, `/partner` public application |
| Merchant staff accounts 🔴 | Complete | `modules/merchant-workspace/staff-view.tsx`, RBAC as an intersection |
| Merchant subscriptions 🔴 | Complete | `subscription-view.tsx`, plan limits enforced in `planAllows`/`withinLimit` |
| Multi-property grouping 🔴 | Complete | One merchant, many `MerchantProperty` records, plan-limited |
| Cross-sell merchandising 🔴 | Complete | `RecommendationRail` on checkout, flight detail, booking confirmation, trip cart and detail |
| Merchant self-serve advertising 🔴 | Complete | `merchant-advertising.ts` with `pending_review` — a merchant can never self-approve |
| Ad approval / fraud prevention 🔴 | Complete | same file, approval workflow |
| Traveller profiles + documents 🔴 | Complete | `SavedTraveler` with passport number and expiry, full CRUD |
| Referral programme 🟡 "model only" | Complete | `referralService` + `/account/rewards` |
| Approval workflows 🔴 | Complete | `catalogue-approvals`, `commission-approvals` |
| Impersonation 🔴 | Complete | `dashboard/auth/impersonation.ts` with an audit trail |
| Scheduled jobs 🔴 | Complete | `domain/scheduler.ts`, now 13 jobs |
| Period close, FX locking, waitlist, zero-result recovery, campaigns | Complete | closed in the previous pass — see [15](./15-gap-closure.md) |

---

## What was genuinely incomplete, and is now done

### [PARTIAL → COMPLETED] Tax rule engine wired to pricing

The audit's own worked example, and it was right. An admin screen managed `TaxRule` rows in a
module-local stub while `priceBooking` charged one flat `taxRate`. Editing a rate changed
nothing anyone paid.

`domain/tax.ts` is now the rule book and the engine: rules match on jurisdiction (ISO-2, `EU`,
or `GLOBAL`), product category and an effective window, and charge on one of five bases — % of
net sale, % of service fee, fixed per unit-night, fixed per guest-night, fixed per booking. So
UAE VAT and a per-night tourism dirham coexist on one booking and are shown to the traveller as
separate lines.

- `priceBooking` takes a `taxContext` and emits `BookingMoney.taxLines`, snapshotted onto the
  booking so a rate change tomorrow never rewrites what was charged yesterday.
- **Inclusive** rules are carved out for display and never added to the total, which is what
  "included in price" means.
- **Nothing matches → the flat platform rate still applies.** That fallback is why no existing
  figure in the app moved.
- Refunds reverse the tax that was actually collected, line by line (`reverseTaxLines`).
- The admin screen writes to the same book, with audit entries and a live "Rule check" panel
  that prices a sample sale — so the wiring is visible, not asserted.
- The rule book lives beside `platform-config` rather than in the domain store, for the reason
  that file documents: `money.ts` reads it and the store's seed calls `money.ts`.

Wired through customer checkout, the dashboard's manual booking, and each leg of a unified trip
— a Dubai hotel and a Paris tour on one trip carry different tax lines.

### [PARTIAL → COMPLETED] External calendar sync (iCal / channel manager)

A channel connection existed and did nothing: a connected property's availability was identical
to a disconnected one's. `domain/calendar-sync.ts` is the half that moves inventory.

- **Pull**: a deterministic feed (seeded on the property code) becomes `ExternalBlock` rows that
  come out of availability exactly as a booking does. The rate manager shows an `OTA n` chip and
  names the channel that took the night.
- **Push**: the property's own sold and stop-sell dates as a downloadable `.ics` feed.
- A pull is a **replace**, not an append, so a cancellation on the other channel gives the night
  back here.
- Lifecycle: `not_connected → syncing → synced → error → paused`. `ChannelStatus` gained `synced`
  and `paused`; every seventh pull fails deterministically, so the error state and the retry are
  reachable. Pausing releases the imported blocks; disconnecting clears them.
- Driven by the new `calendar:sync` job, or "Sync now".

### [IMPLEMENTED] Saved searches and price alerts

Flights could pin a search; a stay search vanished on unmount, and nothing watched a price.
`domain/saved-searches.ts` adds both — in the domain, not an account store, because the
`alerts:price` job has to re-run these without the page being open.

Matching reuses the public catalogue's own `filterListings`, so a saved search can never drift
from what the listing page would show. An alert fires once per price and re-notifies on a
further fall. `/account/searches` manages them; a triggered alert badges the sidebar.

### [PARTIAL → COMPLETED] Wishlist organisation

The wishlist stays exactly as it was — one flat ordered list, every heart button unchanged.
Boards are a layer on top (`features/account/wishlist-boards.ts`), so a listing can sit in more
than one board and anything unfiled shows under "Unsorted". Board membership is intersected with
the wishlist, so removing a save can't leave a ghost.

### [IMPLEMENTED] Recurring membership billing and dunning

`renew()` existed but only when a human pressed it, so a membership left alone lapsed and the
recurring revenue the plans promise never arrived. `domain/membership-billing.ts` bills on a
schedule and handles the decline:

`due → charge → renewed`, or `due → declined → dunning (retry ×3, 3 days apart) → lapsed`.

Deterministic per subscriber, so the same demo always shows the same subscription in dunning.
The admin gets a "Renewals failing to bill" worklist with the recurring revenue at risk and a
one-click retry; the member sees why their card failed and when the next attempt is.

### [IMPLEMENTED] Split / group payment

A third payment plan beside `full` and `deposit`. The organiser pays their share at checkout and
the booking confirms immediately — a group that can't get everyone to pay would otherwise lose
the room while waiting, which is the opposite of what a split is for.

- Shares divide to the cent, organiser absorbing the odd penny.
- Each participant gets a link (`/account/split/[token]`); the link is the credential, which is
  how these work in practice.
- A declined share can be retried; the organiser can remind, or cover the balance in one step.
- The `split:chase` job reminds and closes the window; an expired split is not a cancelled
  booking — the organiser is asked to cover it. Cancelling the booking closes the split.

### [PARTIAL → COMPLETED] Unified itinerary and cross-supplier refunds

Trips already had one reference and per-component status. What was missing was the document and
the trip-level exit:

- `features/trip/itinerary.ts` — one printable itinerary and one calendar for the whole trip,
  every leg in order with its own reference and supplier reference. Cancelled legs are carried
  as `STATUS:CANCELLED` rather than dropped.
- `quoteTripCancellation` quotes **each leg against its own supplier's policy** and shows all of
  them before the traveller commits; a single headline number would hide that a non-refundable
  tour returns nothing while a flexible hotel returns everything.
- `cancelWholeTrip` is deliberately **not atomic**, because the real world isn't: every leg is
  attempted, one refusing never rolls back the others, and what couldn't be cancelled is
  reported rather than swallowed.

---

## Deferred — and only for the reasons the brief allows

Nothing here was deferred for difficulty. Each needs infrastructure or a third party that is
explicitly outside a frontend prototype.

| Item | Why |
|---|---|
| Backend API, database, server-side auth and authorization | Excluded by the brief. The domain services remain the contract. |
| Real payment, payout, KYC, email/SMS, storage, maps providers | Third-party integrations. Every seam is shaped for one. |
| GDS/NDC and real channel-manager connectivity | `supplier.ts` and `calendar-sync.ts` simulate both loops behind the signatures a real client would replace. |
| Server-rendered PDF documents | Documents stay plain-text/ICS in the browser. A prototype that issued a signed PDF would invite someone to treat it as one. |
| Component / E2E / accessibility test suites, CI | Test infrastructure, not product. Domain coverage is 475 checks. |
| Native apps, ML pricing, loyalty coalition | Out of scope for a frontend prototype. |

---

## Verification

`bun run typecheck` · `npx eslint .` (0 errors) · `bun run test:domain` (**475 checks**) ·
`bun run build` (532 static pages).

The regression harness gained coverage for the tax engine (rule → assessment → pricing → refund
reversal), calendar sync (pull → availability drop → pause → resume → failure → release),
saved searches and price alerts, membership billing and dunning, trip itinerary and
cross-supplier cancellation, and split payment.

New scheduled jobs: `calendar:sync`, `alerts:price`, `membership:renew`, `split:chase`.
