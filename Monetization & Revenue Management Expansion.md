# Otithee / Otithee — Monetization & Revenue Management Expansion

You are continuing work on the existing Otithee / Otithee booking-platform frontend prototype.

The project has already gone through a major gap-closure implementation and now has a strong mock/domain architecture.

The current prototype already includes many booking, inventory, payment, loyalty, support, review, notification, and dashboard capabilities.

## IMPORTANT

This task is specifically about expanding Otithee into a **complete multi-sided booking business with multiple platform revenue streams**.

Do NOT immediately start creating screens.

First understand the existing implementation.

---

# PRIMARY OBJECTIVE

Analyze the CURRENT dashboard, domain layer, booking system, money/commission engine, B2B features, merchant features, inventory/revenue-management features, payment model, membership/rewards, promotions, and reporting.

Then determine:

1. What already exists and is functional.
2. What exists but is incomplete.
3. What exists only as UI/mock data.
4. What is completely missing.

Only after that, implement the missing or insufficient functionality.

**Do NOT duplicate an existing feature.**

**Do NOT create parallel versions of existing revenue/commission logic.**

Reuse the existing domain architecture, especially the existing money, booking lifecycle, merchant scoping, repository/mock persistence, and dashboard CRUD patterns.

---

# CURRENT CONSTRAINT

This is still a FRONTEND PROTOTYPE.

Do NOT add:

* real backend API
* PostgreSQL
* Prisma
* Redis
* real payment gateway
* real insurance provider
* real advertising network
* real OTA integrations
* real supplier APIs
* real accounting integration
* real external B2B API

All new functionality should work through the existing mock/domain/persistent prototype architecture.

The architecture must remain easy to connect to a real backend later.

---

# PHASE 0 — DEEP DASHBOARD ANALYSIS

Before modifying anything, inspect:

* `features/dashboard/`
* `features/dashboard/domain/`
* `features/dashboard/modules/`
* `features/dashboard/crud/`
* existing money/commission logic
* booking domain
* inventory/rate management
* merchant modules
* B2B modules
* wallet
* payouts
* invoices
* reconciliation
* analytics
* reports
* coupons
* rewards
* membership-related UI
* advertising/promotional UI
* insurance-related UI
* pricing
* subscriptions
* tax/fees
* payment records
* audit/activity system

Also inspect customer-facing features related to:

* checkout
* insurance
* rewards
* coupons
* membership
* promotions
* booking
* B2B/travel-agent functionality

Search the entire repository before implementing anything.

Use the existing feature if it already satisfies the requirement.

---

# PHASE 1 — CREATE A REVENUE MODEL

Before implementing UI, establish a coherent prototype-level revenue model.

Otithee should be able to represent multiple platform revenue sources.

At minimum evaluate and implement:

## A. Booking commission

Revenue from:

* hotel bookings
* apartment bookings
* resort bookings
* shared rooms
* tours
* activities
* transport
* other bookable services

Example:

```text
Customer pays:          $100
Merchant gross:         $100
Platform commission:     $15
Merchant earning:        $85
```

Support:

* percentage commission
* fixed commission where appropriate
* merchant-specific commission
* product/category-specific commission
* commission overrides
* commission effective dates

Do not hardcode one global percentage if the existing architecture can support configurable rules.

---

# B. Insurance revenue

Implement a prototype insurance marketplace/attach product.

Customer-facing:

```text
Booking
↓
Insurance offer
↓
Select plan
↓
Coverage summary
↓
Price
↓
Checkout
```

Support demo plans such as:

* Basic
* Standard
* Premium

Possible coverage fields:

* trip cancellation
* medical coverage
* baggage
* delay
* emergency assistance

Do NOT imply these are real insurance policies.

They are demo insurance products.

---

## Insurance revenue model

The platform should support configurable:

```text
Customer insurance price
        ↓
Insurance supplier/provider share
        ↓
Platform commission
        ↓
Platform revenue
```

Example:

```text
Insurance price = $30

Provider share = $22
Platform revenue = $8
```

Support:

* percentage commission
* fixed commission
* provider-specific commission
* plan-specific commission
* platform revenue
* provider payable
* refund/reversal handling

Insurance must appear in:

* checkout
* booking details
* admin insurance module
* revenue reports
* transaction/activity timeline

---

# C. Premium Membership

Implement a Otithee premium membership system.

Example prototype plans:

```text
Otithee Free
Otithee Plus
Otithee Premium
```

Do not assume these exact names are final; use existing branding conventions if present.

Membership may provide:

* member-only discounts
* reduced/zero booking fees
* bonus loyalty points
* free cancellation benefits where configured
* exclusive deals
* priority support
* member-only offers
* selected insurance benefits
* selected partner benefits

---

## Membership revenue

Support:

```text
Customer
   ↓
Membership purchase
   ↓
Membership revenue
   ↓
Platform revenue
```

Track:

* membership price
* billing period
* start date
* expiry/renewal date
* active/cancelled/expired status
* benefits
* revenue
* refunds

Since this is a prototype, renewal can be simulated.

Do not implement real recurring billing.

---

# D. Advertising Revenue

Otithee should have a prototype advertising/merchant promotion system.

Potential advertisers:

* hotels
* resorts
* restaurants
* tour operators
* transport providers
* insurance providers
* travel brands
* merchants

Support advertising placements such as:

* homepage featured listing
* search sponsored result
* category featured placement
* destination page promotion
* banner
* campaign card
* email/push campaign placeholder
* sponsored deal

---

## Advertising campaign model

Support:

```text
Advertiser
↓
Campaign
↓
Placement
↓
Budget
↓
Start / End
↓
Targeting
↓
Performance
↓
Billing
```

Campaign fields should include appropriate prototype fields such as:

* campaign name
* advertiser
* placement
* target vertical
* target destination
* start date
* end date
* budget
* pricing model
* status
* impressions
* clicks
* bookings/conversions
* spend
* revenue

---

## Advertising pricing models

Support prototype versions of:

### CPC

```text
Clicks × CPC
```

### CPM

```text
Impressions / 1000 × CPM
```

### Featured placement

Fixed campaign fee.

### Commission / CPA

```text
Attributed booking × commission
```

Do not build a real ad network.

The goal is to make the business model and dashboard demonstrable.

---

# E. B2B Revenue

Analyze the existing B2B functionality first.

If B2B pricing/credit concepts already exist, extend them instead of rebuilding.

Otithee should support B2B customers such as:

* travel agencies
* corporate accounts
* tour operators
* travel agents
* resellers

Prototype capabilities:

* organization/account
* sub-users
* account limits
* negotiated rates
* markup
* commission
* credit
* invoices
* statements
* settlements
* booking attribution

---

# B2B COMMISSION MODEL

Implement a clear B2B revenue structure.

Support different models:

## Model 1 — Agency commission

```text
Supplier price
↓
Otithee
↓
Agency commission
↓
Platform margin
```

Example:

```text
Supplier price = $100
Agency commission = $8
Otithee revenue = $12
Customer/agency transaction value = $120
```

Do not hardcode these values.

---

## Model 2 — Markup

```text
Supplier net price = $100
B2B markup = $15
Selling price = $115
```

Platform can retain configurable margin.

---

## Model 3 — Commission + markup

Support where appropriate:

```text
Supplier price
+ B2B markup
- agency commission
= final commercial calculation
```

Make the calculation transparent in the admin prototype.

---

## Model 4 — B2B subscription

If useful within the existing architecture, support a future-ready prototype model where an agency can pay for:

* premium B2B access
* higher commission tier
* lower booking fees
* advanced reporting
* API access placeholder
* negotiated rates

Do not implement a real API.

---

# B2B CREDIT / WALLET

Implement prototype support for:

* credit limit
* available credit
* outstanding balance
* credit utilization
* due date
* invoice
* payment
* overdue
* statement

Example:

```text
Credit limit:     $10,000
Used:              $3,200
Available:         $6,800
```

Booking should respect the credit limit.

---

# PHASE 2 — REVENUE MANAGEMENT

Analyze the existing inventory/rate manager first.

If rate management already exists, extend it rather than replacing it.

Build a prototype **Revenue Management** capability.

This is not just rate editing.

It should help merchants/platform operators optimize:

* price
* occupancy
* availability
* demand
* seasonality
* restrictions
* revenue
* margin

---

# Revenue Management Dashboard

Create/extend a dashboard section showing:

* occupancy
* ADR
* RevPAR
* booking pace
* revenue
* cancellation rate
* average length of stay
* room availability
* demand level
* pickup
* price changes
* revenue forecast

Use deterministic demo data.

Charts should react to filters/date ranges.

---

# Revenue Management Rules

Support prototype rules such as:

### High demand

```text
occupancy > threshold
→ increase price
```

### Low demand

```text
occupancy < threshold
→ decrease price
```

### Weekend pricing

Different price rules for weekends.

### Seasonal pricing

High/low season.

### Last-room availability

As inventory becomes low, pricing can increase.

### Minimum stay

Configure based on demand/season.

### Stop sell

Close availability.

### CTA / CTD

Arrival/departure restrictions.

---

# Revenue Management Recommendation Engine

Create prototype recommendations such as:

```text
"Occupancy is 92% for Aug 20.
Consider increasing Deluxe Room price by 12%."
```

or:

```text
"Occupancy is only 28% for Aug 25.
Consider a 10% promotional discount."
```

These are demo recommendations, not ML.

Keep the logic deterministic and transparent.

---

# PHASE 3 — PLATFORM REVENUE CENTER

Create a central admin dashboard for Otithee's own revenue.

This is extremely important.

Admin should be able to understand:

```text
Where does Otithee make money?
```

Build a **Revenue Center / Platform Revenue** module if one does not already exist.

---

# Revenue Center

Show:

## Revenue overview

* Gross Booking Value
* Platform Revenue
* Merchant Revenue
* Net Revenue
* Commission Revenue
* Insurance Revenue
* Membership Revenue
* Advertising Revenue
* B2B Revenue
* Service Fee Revenue
* Cancellation/Amendment Fees
* Other Revenue

---

# Revenue formula

The prototype should conceptually support:

```text
Platform Revenue
=
Booking Commissions
+ Insurance Commissions
+ Membership Revenue
+ Advertising Revenue
+ B2B Margin/Commission
+ Service Fees
+ Other Platform Fees
```

Where applicable, subtract:

* refunds
* commission reversals
* promotional subsidies
* merchant adjustments

Do not invent accounting standards.

This is a prototype management model.

---

# Revenue breakdown

Admin should be able to filter by:

* date
* vertical
* merchant
* destination
* customer
* B2B account
* revenue source
* currency
* booking status

Revenue source examples:

```text
Booking Commission
Insurance
Membership
Advertising
B2B
Service Fee
Other
```

---

# PHASE 4 — COMMISSION MANAGEMENT

Create a centralized commission configuration system.

Admin should be able to configure:

```text
Vertical
Merchant
Product
Rate Plan
B2B Account
Insurance Plan
```

with:

* commission %
* fixed fee
* minimum fee
* maximum fee
* effective date
* status

Example:

```text
Hotels       → 15%
Tours        → 12%
Activities   → 10%
Insurance    → 25%
B2B          → configurable
```

These are only demo values.

---

# Commission Calculation Breakdown

Every booking should have a transparent breakdown.

Example:

```text
Booking value                  $500

Platform commission             $75
Insurance commission             $10
Service fee                      $5

Merchant payable               $425
Platform revenue                 $90
```

Use the existing money engine.

Do not create a second money calculation engine.

---

# Commission Lifecycle

Support:

```text
Booking confirmed
↓
Commission accrued
↓
Booking completed
↓
Commission finalized
↓
Refund/cancellation
↓
Commission reversal if applicable
```

The exact reversal behavior should follow existing lifecycle/refund rules.

---

# PHASE 5 — MERCHANT REVENUE VIEW

Merchant dashboard should show:

* gross bookings
* gross booking value
* platform commission
* refunds
* net payable
* pending payout
* paid payout
* commission history
* revenue by product
* revenue by date
* revenue by rate plan

Merchant must only see its own data.

Reuse existing merchant scoping.

---

# PHASE 6 — PAYOUT & SETTLEMENT CONNECTION

Analyze existing:

* payouts
* reconciliation
* invoices
* wallet
* money domain

Then connect them to the new revenue model.

Example:

```text
Booking
 ↓
Revenue calculation
 ↓
Merchant payable
 ↓
Commission
 ↓
Settlement
 ↓
Payout
```

Support prototype states:

* pending
* eligible
* held
* approved
* released
* paid
* reversed

Admin should see the financial timeline.

---

# PHASE 7 — PROMOTIONS VS REVENUE

Make sure promotions do not silently destroy revenue calculations.

Support:

```text
Gross booking value
- merchant discount
- platform-funded discount
- coupon
+ service fee
= customer payable
```

Then calculate commission according to a configurable commission basis.

For example:

* commission on gross
* commission on discounted net
* fixed commission

The admin configuration should make the basis explicit.

Do not assume one universal rule.

---

# PHASE 8 — TAX / FEE AWARENESS

Inspect the existing tax and fee functionality.

Do not build a second tax engine.

Where appropriate, show:

* base price
* taxes
* service fee
* platform fee
* discount
* commission
* merchant payable
* platform revenue

Keep tax separate from platform revenue.

---

# PHASE 9 — CUSTOMER-FACING MONETIZATION

Integrate monetization naturally into customer journeys.

Potential placements:

## Checkout

* insurance
* premium membership
* add-ons
* points
* coupon

## Search

* sponsored results
* featured properties

## Homepage

* sponsored destinations
* featured partners
* premium offers

## Account

* membership
* loyalty
* referrals
* wallet

Do not make the UI feel like an ad-heavy marketplace.

Sponsored content must be clearly labelled.

---

# PHASE 10 — ADMIN MODULES

Before creating new modules, inspect whether equivalent modules already exist.

Potential final dashboard structure:

```text
Dashboard
├── Bookings
├── Inventory
├── Rates
├── Revenue Management
├── Revenue Center
├── Commissions
├── Insurance
├── Membership
├── Advertising
├── B2B
├── Payouts
├── Reconciliation
├── Invoices
├── Promotions
├── Loyalty
├── Analytics
└── Reports
```

Only create modules that are genuinely missing.

If an existing module can be extended, extend it.

---

# PHASE 11 — ANALYTICS

Extend analytics to answer:

## Platform

* How much did Otithee earn?
* From which revenue source?
* Which vertical is most profitable?
* Which merchant generates the most platform revenue?
* Which B2B account generates the most margin?
* How much insurance revenue was generated?
* How much membership revenue?
* How much advertising revenue?

## Merchant

* How much did the merchant sell?
* How much commission was charged?
* How much is payable?
* What is occupancy/revenue performance?

## B2B

* booking volume
* gross value
* commission
* markup
* platform margin
* outstanding credit
* settlement

---

# PHASE 12 — REPORTS

Create useful prototype reports:

* Platform Revenue Report
* Commission Report
* Merchant Settlement Report
* Insurance Revenue Report
* Membership Revenue Report
* Advertising Campaign Revenue Report
* B2B Revenue Report
* Revenue Management Report
* Payout Report
* Refund/Commission Reversal Report

Reports should support:

* date range
* filters
* summary
* table
* CSV export using existing export infrastructure

Do not implement a new export framework if one already exists.

---

# PHASE 13 — AUDIT / ACTIVITY

Every important financial configuration/action should create a mock activity/audit record where the existing architecture supports it.

Examples:

```text
Commission changed
Rate changed
Insurance plan changed
Membership plan changed
Advertising campaign approved
B2B credit limit changed
Payout released
Revenue adjustment created
```

Show:

* who
* what
* when
* affected entity
* old value
* new value where appropriate

---

# PHASE 14 — DEMO DATA

Create realistic deterministic demo data for:

## Revenue

* hotel commissions
* tour commissions
* insurance commissions
* memberships
* advertising campaigns
* B2B margins
* service fees
* refunds/reversals

## Merchants

At least several merchants with different:

* commission rates
* verticals
* revenue
* payouts

## B2B

Several agencies with:

* different commission models
* negotiated rates
* credit limits
* outstanding balances

## Advertising

Campaigns with:

* active
* scheduled
* completed
* paused

and metrics:

* impressions
* clicks
* conversions
* spend
* revenue

## Insurance

Multiple plans and providers with different commission rules.

## Membership

Users across different membership states.

---

# PHASE 15 — END-TO-END REVENUE SCENARIOS

The prototype must demonstrate these flows.

## Scenario 1 — Hotel commission

```text
Customer books hotel
→ booking confirmed
→ commission calculated
→ merchant payable calculated
→ platform revenue recorded
→ settlement/payout reflects it
```

## Scenario 2 — Insurance

```text
Customer books hotel
→ insurance offered
→ customer selects insurance
→ insurance revenue calculated
→ booking total updated
→ platform revenue updated
```

## Scenario 3 — Premium membership

```text
Customer buys membership
→ membership becomes active
→ benefits become available
→ membership revenue recorded
```

## Scenario 4 — Advertising

```text
Merchant creates campaign
→ campaign approved
→ campaign appears in sponsored placement
→ impressions/clicks/conversions update
→ advertising spend/revenue recorded
```

## Scenario 5 — B2B booking

```text
B2B agency
→ negotiated rate
→ markup/commission calculated
→ credit checked
→ booking created
→ platform margin calculated
→ outstanding balance updated
```

## Scenario 6 — Cancellation

```text
Booking
→ commission accrued
→ cancellation
→ refund calculated
→ commission reversal if applicable
→ merchant payable updated
→ platform revenue adjusted
```

## Scenario 7 — Revenue management

```text
High occupancy
→ recommendation generated
→ admin changes rate
→ inventory/rate calendar updates
→ future booking reflects new price
→ revenue projection changes
```

---

# ARCHITECTURAL REQUIREMENT

Do not scatter financial calculations across UI components.

Prefer:

```text
UI
 ↓
Feature Service
 ↓
Domain / Revenue Engine
 ↓
Mock Repository
 ↓
Persistent Store
```

Centralize calculations for:

* commission
* platform revenue
* merchant payable
* insurance revenue
* advertising spend
* membership revenue
* B2B margin
* settlement
* reversal

Reuse the existing money engine wherever possible.

If the existing money engine needs extension, extend it instead of replacing it.

---

# VERY IMPORTANT — BUSINESS LOGIC

Keep these concepts separate:

```text
Customer Price
Merchant Gross
Discount
Tax
Platform Fee
Commission
Supplier/Provider Share
Merchant Payable
Platform Revenue
Refund
Commission Reversal
```

Do not accidentally treat commission as customer tax.

Do not count the full booking value as platform revenue.

Do not count merchant revenue as platform revenue.

The dashboard must clearly distinguish:

```text
GMV / Gross Booking Value
vs
Platform Revenue
vs
Merchant Revenue
vs
Net Revenue
```

---

# FINAL DASHBOARD EXPERIENCE

The finished dashboard should allow a Super Admin to answer:

### "How does Otithee make money?"

with a clear view of:

```text
Booking Commission       $XXX
Insurance Revenue        $XXX
Membership Revenue       $XXX
Advertising Revenue      $XXX
B2B Revenue/Margin       $XXX
Service Fees             $XXX
--------------------------------
Gross Platform Revenue   $XXX

Refunds/Reversals        -$XX
--------------------------------
Net Platform Revenue     $XXX
```

And then drill down into each revenue source.

---

# DO NOT OVERBUILD

This is a prototype.

Do not implement:

* real accounting
* GAAP/IFRS ledger
* real payment settlement
* real insurance claims
* real ad bidding
* real recurring billing
* real B2B API
* real tax compliance
* real OTA settlement

But the UI/domain model should represent the business concepts clearly enough that these integrations can be added later.

---

# IMPLEMENTATION STRATEGY

Work in this order:

1. Analyze existing dashboard/domain
2. Identify existing vs missing features
3. Extend existing money/commission engine
4. Build revenue model
5. Add revenue center
6. Add commission management
7. Add insurance monetization
8. Add premium membership monetization
9. Add advertising monetization
10. Complete B2B monetization
11. Connect payouts/settlements
12. Extend revenue management
13. Connect analytics/reports
14. Add customer-facing monetization surfaces
15. Add demo data
16. Run end-to-end revenue scenarios
17. Run typecheck/lint/build/tests
18. Fix regressions

Do not stop after adding UI.

Every implemented feature must be connected to the underlying mock/domain data flow.

---

# FINAL VALIDATION

Verify at minimum:

* existing booking functionality still works
* existing inventory still works
* existing cancellation/refund logic still works
* commission calculations are centralized
* merchant scoping still works
* platform revenue is distinct from merchant revenue
* insurance revenue works
* membership revenue works
* advertising revenue works
* B2B commission/margin works
* credit limit works
* payout/settlement reflects revenue
* refunds reverse financial values correctly
* revenue management affects pricing
* analytics reflect the new revenue streams
* reports reflect the new revenue streams
* customer-facing monetization works
* no duplicate existing modules were created
* no backend/API/database was introduced

Run:

* `tsc --noEmit`
* ESLint
* production build
* relevant tests
* focused end-to-end prototype scenarios

Fix all errors introduced by this task.

---

# FINAL RESPONSE

When finished, do NOT provide a long narrative.
Do not waste tokens explaining routine implementation details.
Do not ask for confirmation between phases unless there is a genuinely blocking architectural decision.

Return only:

1. Existing features discovered and reused
2. New features implemented
3. Revenue models implemented
4. Important architectural/domain changes
5. Validation results
6. Remaining intentionally deferred real-world integrations
