# 08 — Otithee Revenue & Business Model

## The headline

Otithee's revenue model is **already implemented as working logic**, not merely described. The domain layer contains a revenue ledger with **ten sources**, a configurable commission rule engine, and a Revenue Center that reports on all of it — and the whole thing reconciles against the booking engine by construction. This is the strongest asset in the repository.

What it lacks is the ability to *collect* any of it, because there is no payment or billing infrastructure.

---

## The ten revenue sources (implemented)

From `features/dashboard/domain/revenue.ts`:

| # | Source | Sign | Derived or stored | Status |
|---|---|---|---|---|
| 1 | Booking commission | + | Derived from bookings | ✅ |
| 2 | Service fee (platform fee to customer) | + | Derived | ✅ |
| 3 | Insurance margin | + | Derived | ✅ |
| 4 | Cancellation & amendment fees | + | Derived | ✅ |
| 5 | B2B margin (net-rate uplift) | + | Derived | ✅ |
| 6 | Membership subscriptions | + | Stored | ✅ |
| 7 | Advertising | + | Stored | ✅ |
| 8 | B2B subscription | + | Stored | ✅ |
| 9 | Promotional subsidy | **−** (contra) | Derived | ✅ |
| 10 | Manual adjustment | ± | Stored | ✅ |

### Why "derived vs stored" is a good decision

Anything already implied by a booking (commission, fees, insurance margin, cancellation fees, subsidies) is **recomputed on every read** rather than written to a ledger table. Anything with no booking behind it (membership, advertising, B2B subscription, adjustments) is **written once** by the service that caused it.

The consequence: the Revenue Center can never disagree with the Commission page or a merchant's settlement, because they are reading the same computation, not two copies of a number. The regression suite tests exactly this — *"the ledger and the booking engine agree on commission"*.

### Three pots kept separate throughout

`grossValue` (what changed hands) · `partnerShare` (the merchant's / provider's / agency's) · `amount` (**the platform's only**).

**Tax never appears in the revenue ledger at all** — it belongs to the tax authority. This is correct and unusually disciplined.

---

## Current commercial parameters

From `PRICING_CONFIG` in `domain/money.ts`:

| Parameter | Value |
|---|---|
| Currency | USD |
| Tax rate | 7.5% of net sale |
| Platform service fee | 2% of net sale (waivable by membership) |
| Default commission | 12% |
| Platform share of cancellation fee | 20% |

### Commission by product

| Product | Rate | Commercial read |
|---|---:|---|
| Tours | 18% | Highest margin |
| Activities | 18% | Highest margin |
| Transport | 15% | High margin, high frequency |
| Apartments | 14% | |
| Resorts | 13% | |
| Hotels | 12% | Core volume |
| Combo bundles | 15% | Blended, favours bundling |
| Shared rooms | 10% | Low ticket |
| Convention halls | 9% | High ticket, low rate |
| Visa | 8% | Service product |
| Flights | 5% | Volume driver, thin margin |

The rate structure is commercially sensible: flights are a **traffic acquisition product** at 5%, and the money is made on what the traveller books *around* the flight at 12–18%.

---

## The canonical money formula

```
netSale         = base + markup − discount
taxes           = netSale × taxRate
fees            = netSale × platformFeeRate          (waivable by membership)
customerTotal   = netSale + taxes + fees + insurance
commissionBase  = netSale + platformFundedDiscount   (or base + markup, if gross basis)
commission      = commissionBase × rate + fixed      (clamped to min/max)
merchantEarning = netSale − commission + platformFundedDiscount
platformRevenue = commission + fees + insuranceRevenue − platformFundedDiscount
netSettlement   = merchantEarning − refundAdjustment
```

Two decisions in this formula are worth flagging to management because they are the kind of thing platforms usually get wrong:

1. **Insurance premium is excluded from the commissionable base.** It is its own revenue line, so it can never be double-counted as booking commission.
2. **Platform-funded discount is added back to the commission base and back to the merchant's earning.** When marketing subsidises a promotion, the merchant is not silently made to pay for it, and the platform's revenue correctly shows the subsidy as a cost.

---

## The commission rule engine

Commission is no longer a constant map. `commission-rules.ts` resolves a rule by:

1. Keeping every active rule whose target matches and whose date window covers the booking.
2. Taking the **highest specificity**: insurance/B2B → rate plan → product → merchant → vertical.
3. Breaking ties on the most recently effective rule.
4. Falling back to the merchant's negotiated rate, then the product default.

A rule can carry a percentage **and** a flat fee, be floored and capped, and be measured against gross or net. The admin UI shows which rule won and why. **Nothing computes a commission itself** — callers resolve a rule and hand the result to `priceBooking`.

This is production-grade commercial modelling.

---

## Revenue model table

**Revenue Source → Payer → Trigger → Fee → Otithee revenue**

### Already implemented (logic complete, collection missing)

| Source | Payer | Trigger | Fee | Otithee gets |
|---|---|---|---|---|
| Booking commission | Merchant | Booking confirmed | 5–18% of net sale | Commission, reversed on refund |
| Service fee | Customer | Checkout | 2% of net sale | Full amount |
| Cancellation admin share | Customer (from the fee) | Cancellation within a fee window | 20% of the cancellation fee | The 20%; merchant keeps the rest |
| Insurance margin | Customer (via premium) | Insurance attached at checkout | Provider-set commission % of premium | Commission only; provider keeps their share |
| Membership | Customer | Subscribe / renew | Plan price (monthly or annual) | Full amount |
| Advertising | Merchant / advertiser | Campaign billed | CPC / CPM / CPA against budget | Full amount, recognised on billing |
| B2B margin | Agency / corporate | B2B booking at net rate | Markup over net | The uplift |
| B2B subscription | Agency / corporate | Subscription charge | Tier fee | Full amount |
| Promotional subsidy | **Otithee pays** | Platform-funded discount used | — | Negative — tracked, not hidden |
| Adjustment | — | Operator action | Manual | ± |

### Partially implemented

| Source | What exists | What is missing |
|---|---|---|
| Merchant subscriptions | The B2B subscription mechanism | No merchant plan product, no billing, no tier benefits |
| Loyalty-funded discounts | Points ledger and redemption | No accounting of who funds the points liability |
| Combo/bundle margin | Combo pricing and 15% blended rate | No differential bundle pricing strategy |

### Not implemented — recommended

| Source | Why | Est. contribution |
|---|---|---|
| **Cross-sell attach revenue** | The mechanism is built (trip cart + recommendations); it is not merchandised or measured | **Highest** — multiplies revenue per traveller |
| Affiliate / referral commission | No affiliate model, tracking or payout | Medium |
| Currency-exchange margin | FX is display-only today | Medium, high-margin |
| Payment method surcharges/incentives | No gateway | Low–Medium |
| Premium listing placement (distinct from ads) | No paid ranking product | Medium |
| Data / market-insight products for hotels | Revenue-management analytics already computed | Medium, very high margin |
| White-label / API licensing | B2B exists; no API or tenancy | High, long-dated |
| Corporate travel management fees | B2B corporate type exists; no TMC feature set | High, long-dated |
| Last-minute / distressed inventory marketplace | Pace and occupancy data already computed | Medium |
| Ancillary fulfilment margin (transfers, parking, lounges) | Add-ons exist but earn no separate margin | Medium |

---

## Cross-sell and upsell — the biggest single opportunity

The infrastructure is already there: a shared trip context, a deterministic recommendation engine, combo offers, a trip cart and a combined checkout.

| Path | Mechanism status | Commission earned |
|---|---|---|
| Flight → Hotel | ✅ Built | 5% then 12% |
| Flight → Airport transfer | ✅ Built | 5% then 15% |
| Flight → Insurance | ✅ Built | 5% then insurance margin |
| Hotel → Activity | ✅ Built | 12% then 18% |
| Hotel → Transport | ✅ Built | 12% then 15% |
| Destination → Tour | ✅ Built | 18% |
| Visa → Flight | 🟡 Partial | 8% then 5% |
| Booking → Membership | ✅ Built (checkout upsell) | Subscription |

**The economics:** a traveller booking only a $600 flight yields ~$30 commission plus a ~$12 service fee. The same traveller booking flight + 3-night hotel + transfer + two activities + insurance yields commission on five products across a much larger basket — commonly 4–6× the revenue from one journey, with no additional customer-acquisition cost.

Because the recommendation engine, combo pricing and combined checkout already exist, **this is a merchandising and measurement problem, not an engineering one.**

---

## Recommended priority for revenue work

| Priority | Action | Why |
|---|---|---|
| 1 | Make commission collectable (gateway + payouts) | Nothing else matters until money moves |
| 2 | Merchandise cross-sell aggressively and measure attach rate | Highest return on already-built capability |
| 3 | Launch membership | Recurring, predictable, already complete in logic |
| 4 | Open merchant self-serve advertising | High margin; billing logic already exists |
| 5 | Formalise insurance with a real underwriter | Complete logic; needs a commercial partner and licensing |
| 6 | Merchant subscription tiers | New stream, low build cost on existing patterns |
| 7 | B2B expansion (API, white-label) | Highest ceiling, longest lead time |
