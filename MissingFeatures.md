# StayOra / Otithee — Complete Prototype Gap Closure

You are working on the existing StayOra / Otithee booking-platform prototype.

## Context

A full static audit has already been performed. The project currently has strong frontend breadth:

* ~140 routes
* ~58 dashboard modules
* Domain layer
* Booking lifecycle/state machines
* Refund/commission/money calculations
* RBAC design
* Trip / unified booking flow
* AI concierge
* Flight vertical
* Consistent loading/error/empty states

The audit found many missing production/business capabilities.

**Important constraint: this is STILL a frontend prototype.**

Do NOT introduce a real backend/API/database/payment gateway at this stage.

Instead, make the prototype behave as completely and realistically as possible using:

* existing domain layer
* local/mock repositories
* client-side persistence where appropriate
* deterministic demo data
* simulated async operations
* existing architecture and UI patterns

The implementation must remain easy to migrate to a real backend later.

---

# PRIMARY GOAL

Turn the current project into a **complete, coherent, end-to-end booking ecosystem prototype**.

Do not merely add screens.

Every implemented feature should have:

1. UI
2. state
3. realistic mock data
4. validation
5. loading state
6. empty state
7. error state where applicable
8. persistence where useful
9. integration with the existing domain/lifecycle/money/RBAC architecture

The prototype should feel like a real product during a client demo.

---

# NON-NEGOTIABLE RULES

## 1. Preserve existing work

Before changing anything:

* inspect the repository
* understand the current architecture
* identify existing implementations
* reuse existing components, domain logic, stores, types and utilities
* do NOT rewrite working features unnecessarily
* do NOT duplicate existing business logic
* do NOT create parallel booking models
* do NOT break existing routes

The existing domain layer is valuable and must remain the source of truth for business rules wherever possible.

Especially preserve and reuse:

* `features/dashboard/domain/lifecycle.ts`
* `features/dashboard/domain/money.ts`
* existing cancellation/refund logic
* `features/trip/`
* existing RBAC design
* CRUD/data-table infrastructure
* flight booking flow

---

## 2. Prototype only — NO real backend

Do NOT add:

* API routes
* NestJS
* external backend
* PostgreSQL
* Prisma
* Redis
* real payment gateway
* real OTA integrations
* real GDS/NDC
* real email/SMS/WhatsApp providers

Do not spend tokens implementing infrastructure that is intentionally deferred.

Instead create clean mock seams that can later be replaced by repositories/API calls.

Preferred conceptual architecture:

```text
UI
 ↓
Feature hooks/actions
 ↓
Repository / mock service
 ↓
Domain layer
 ↓
Persistent mock/demo store
```

Do not make UI components directly manipulate unrelated localStorage structures.

---

# 3. Do NOT fake security as production security

This is a prototype.

Implement realistic UX and permission behavior, but clearly keep it mock/client-side.

For example:

* simulated sessions
* simulated roles
* demo 2FA flow
* demo permission checks
* demo audit records

Do not claim these are production security mechanisms.

---

# 4. Do NOT store real card information

The payment UI must never persist real PAN/card details.

Use a simulated payment method:

```text
Card ending in 4242
Payment authorized
Payment failed
3DS required
3DS successful
3DS failed
```

Only store safe mock metadata such as:

* brand
* last4
* expiry display if needed for demo
* payment status
* provider = `mock`

---

# 5. Token efficiency

Be highly token-efficient.

Do NOT:

* explain every file
* paste large files into responses
* repeatedly inspect the same files
* create unnecessary abstractions
* refactor unrelated code
* redesign existing UI without reason
* implement production infrastructure

Work in focused batches.

After each batch:

1. inspect changed files
2. run relevant typecheck/lint/build/tests
3. fix issues
4. continue

Do not stop after discovering gaps.

---

# PHASE 0 — AUDIT FIRST

Before coding, inspect:

* `package.json`
* project structure
* `app/`
* `components/`
* `features/`
* `services/`
* `lib/`
* existing stores
* domain layer
* dashboard modules
* booking/checkout flow
* trip flow
* flight flow
* auth
* i18n
* existing mock data

Create a concise internal implementation checklist mapped to the existing architecture.

Do NOT produce a long audit report.

Then implement.

---

# PHASE 1 — UNIFY THE PROTOTYPE BOOKING ENGINE

This is the highest priority.

The customer booking flow and dashboard booking flow must behave as one system even without a backend.

Create/reuse a central mock repository/store for:

* bookings
* booking items
* travelers
* payments
* invoices
* refunds
* cancellation
* inventory
* availability
* rate plans

Customer checkout and dashboard must read/write the same mock data source.

Required flow:

```text
Search
 ↓
Select listing
 ↓
Select room/rate/quantity
 ↓
Quote
 ↓
Availability check
 ↓
Hold inventory
 ↓
Checkout
 ↓
Mock payment
 ↓
Confirm booking
 ↓
Booking reference
 ↓
Confirmation
 ↓
Account booking
 ↓
Dashboard booking
```

The same booking must immediately appear in:

* customer account
* dashboard booking module
* relevant merchant scope
* activity/audit timeline

Admin changes must reflect in customer booking details.

---

# PHASE 2 — INVENTORY + RATE PLAN SYSTEM

Implement a realistic prototype inventory engine.

Support:

## Room/product inventory

* room types
* units/allotment
* occupancy
* availability
* sold out
* blocked dates
* stop sell

## Rate plans

At minimum:

* Standard
* Non-refundable
* Breakfast included
* Flexible/refundable

Support:

* base price
* date-specific price
* seasonal price
* weekend price
* minimum stay
* maximum stay
* CTA
* CTD
* availability

Prototype example:

```text
Deluxe Room
Aug 20
3 available
৳8,000

Aug 21
1 available
৳10,000
```

Booking must decrease availability.

Cancellation must restore availability according to the cancellation rules.

Double booking must be prevented inside the mock engine.

---

# PHASE 3 — HOTEL / STAY DETAIL EXPERIENCE

Upgrade hotel/resort/apartment/shared-room detail pages.

Implement:

* room-type selection
* rate-plan selection
* occupancy
* dates
* quantity
* cancellation policy
* refundable/non-refundable comparison
* taxes
* service fees
* total price
* availability status
* sold-out state
* urgency/social proof when demo data supports it
* amenities
* structured filters
* guest reviews
* verified-stay badge
* host/property response
* guest Q&A

Reuse the existing `RoomCard` if appropriate instead of creating a duplicate component.

---

# PHASE 4 — SEARCH & DISCOVERY

Improve search without adding real external services.

Implement:

## Cross-vertical search

Filters:

* price
* rating
* property type
* amenities
* location
* availability
* sort
* pagination

## Stay search

* date-aware availability
* guest/room filters
* price range
* rating
* amenities
* refundable
* breakfast
* property type

## Discovery

Implement prototype versions of:

* map-based search
* "near me"
* recent searches
* saved searches
* compare tray
* wishlist
* price-drop state
* sold-out/limited availability indicators

Map may be a mock interactive map/list representation if no real map provider exists.

Do not add paid/external map infrastructure.

---

# PHASE 5 — COMPLETE CHECKOUT

Upgrade checkout to a realistic flow.

Steps:

```text
1. Trip summary
2. Traveler information
3. Add-ons
4. Cancellation policy
5. Price breakdown
6. Promo
7. Payment
8. Review
9. Confirmation
```

Support:

* guest checkout prototype
* authenticated checkout
* traveler selection
* passport/NID demo fields where relevant
* terms/cancellation consent
* promo validation
* tax
* service fee
* discounts
* multi-item trip
* add-ons
* travel insurance offer
* deposit/pay-later simulation
* payment failure recovery
* retry payment
* booking hold timer
* price-lock timer
* duplicate-submit prevention
* confirmation state

Never trust a price supplied directly by a component. Calculate totals through the central pricing/domain layer.

---

# PHASE 6 — MOCK PAYMENT SYSTEM

Create a reusable mock payment engine.

Support demo scenarios:

### Success

```text
Payment authorized
Booking confirmed
```

### Failure

```text
Payment failed
Retry
```

### 3DS

```text
Authentication required
↓
Success / Failed
```

### Pay later / deposit

Support demo partial payment where the existing domain model allows it.

Show:

* payment status
* amount paid
* amount due
* transaction reference
* payment timeline

No real gateway.

---

# PHASE 7 — POST-BOOKING MANAGEMENT

Make `/account/bookings/[id]` substantially complete.

Implement:

* booking overview
* traveler information
* invoice
* payment details
* cancellation
* refund quote
* date change/reschedule
* name correction
* add guest
* upgrade
* voucher
* printable confirmation
* e-ticket/boarding-style document where applicable
* `.ics` calendar export
* dispute filing
* partial refund request where supported
* booking activity timeline
* live-style status updates using mock state
* pre-arrival reminders

Reuse the existing real cancellation/refund engine.

Do not replace working cancellation logic with a simplified implementation.

---

# PHASE 8 — COMMUNICATION CENTER

Implement a complete mock communication layer.

Channels:

* Email
* SMS
* Push
* WhatsApp

No real providers.

Create a reusable mock notification service.

Trigger demo notifications for:

* booking confirmation
* payment confirmation
* payment failure
* OTP
* password reset
* cancellation
* refund
* date change
* pre-arrival reminder
* review invitation

Customer:

* notification inbox
* unread count
* notification preferences

Admin:

* notification composer
* templates
* send preview
* mock send
* delivery status
* delivery log

---

# PHASE 9 — SUPPORT SYSTEM

Unify customer and admin support.

Customer:

* create ticket
* booking-linked ticket
* category
* priority
* attachment mock
* message thread
* status
* SLA indicator

Admin:

* inbox
* assignment
* status
* priority
* SLA
* reply
* internal note
* canned response
* booking context

Customer replies must appear in dashboard and admin replies must appear in customer messages.

---

# PHASE 10 — REVIEWS & REPUTATION

Implement:

* verified stay reviews
* rating breakdown
* photo reviews using mock media
* review moderation
* approve/reject
* host/property reply
* report review
* review invitation after completed booking

Connect review eligibility to completed bookings in the mock domain.

---

# PHASE 11 — LOYALTY / COUPONS / REFERRALS

Make existing rewards/coupons pages functional.

Implement:

## Loyalty

* earn points
* burn points
* balance
* history
* expiry
* tiers
* benefits

## Coupons

* welcome coupon
* win-back coupon
* birthday coupon
* campaign coupon
* minimum spend
* expiry
* usage limit
* applicable vertical

## Referral

* referral code
* invited user
* reward status
* earned reward

Integrate coupon/points application into checkout.

---

# PHASE 12 — ADMIN OPERATIONAL DEPTH

Do not create unnecessary new dashboard architecture.

Extend existing modules.

Implement meaningful actions for:

## Payouts

* approve
* hold
* release
* reject
* payout timeline

## Reconciliation

* import mock settlement data
* match
* unmatch
* discrepancy
* write-off

## Support

* reply
* assignment
* SLA
* internal note

## Disputes

* evidence
* deadline
* status
* resolution

## Invoices

* generate
* download/print
* credit note
* resend

## Reviews

* moderate
* approve
* reject
* reply
* takedown

## Notifications

* compose
* preview
* send mock
* delivery status

## Wallet

* credit
* debit
* reason
* audit

---

# PHASE 13 — ADMIN INVENTORY / REVENUE MANAGEMENT

Create a prototype rate-management experience.

Include:

* calendar grid
* room/product availability
* daily price
* bulk price update
* bulk availability update
* seasonal pricing
* stop sell
* minimum stay
* CTA/CTD
* rate-plan management

Make it interactive with the mock inventory engine.

---

# PHASE 14 — MERCHANT / MULTI-TENANT DEMO

Ensure merchant scoping works throughout the prototype.

Demo users:

```text
Super Admin
Admin
Merchant
Staff
Customer
```

Merchant should only see its own:

* listings
* rooms
* bookings
* customers where appropriate
* payouts
* reviews
* inventory
* reports

Super admin can see everything.

Reuse the existing RBAC design. Do not redesign it.

---

# PHASE 15 — ANALYTICS

Make dashboard analytics meaningful using deterministic demo data.

Implement:

* booking funnel
* search → detail → checkout → paid
* conversion rate
* revenue
* gross booking value
* commission
* refunds
* cancellation rate
* occupancy
* ADR
* merchant performance
* product performance
* customer retention
* cohort-style demo data
* LTV
* margin
* attribution
* forecast vs actual

Charts must respond to filters/date ranges.

---

# PHASE 16 — CMS / CONTENT

Upgrade the existing CMS prototype with:

* draft
* review
* publish
* scheduled publish
* version
* rollback
* preview
* SEO metadata
* media management
* alt text
* basic crop/transform simulation

Do not build a complex page-builder unless the existing architecture already supports it.

---

# PHASE 17 — I18N / CURRENCY

Improve existing i18n without replacing the entire project.

Support:

* English
* Bangla
* at least one additional locale structure

Implement:

* locale-aware formatting
* pluralization abstraction
* currency formatting
* BDT
* USD
* EUR
* GBP

FX can remain mock/deterministic.

Capture the FX rate used in a booking snapshot so historical booking totals remain stable.

If architecture permits, make locale SSR-safe, but do not introduce unnecessary routing complexity that breaks existing routes.

---

# PHASE 18 — ACCESSIBILITY

Run an accessibility-focused pass.

Check:

* keyboard navigation
* focus management
* dialogs/drawers
* form labels
* aria states
* live regions
* skip-to-content
* reduced motion
* contrast
* checkout keyboard flow
* flight seat map keyboard flow

Target WCAG 2.2 AA.

Do not rewrite accessible existing primitives unnecessarily.

---

# PHASE 19 — PERFORMANCE

Do a focused optimization pass.

Check:

* unnecessary client components
* repeated data fetching
* large checkout component
* image loading
* long dashboard tables
* expensive renders
* memoization only where useful
* pagination/virtualization where appropriate

Do not perform premature micro-optimizations.

---

# PHASE 20 — OBSERVABILITY MOCK

Since there is no backend yet, implement lightweight prototype observability:

* mock error event collector
* mock activity/event log
* product analytics event abstraction
* booking funnel events
* checkout events
* payment events

Create clean interfaces that can later map to:

* Sentry
* PostHog
* analytics provider
* structured logging

Do not install real external monitoring unless already present.

---

# PHASE 21 — DEMO DATA

Create a rich deterministic demo dataset.

Include:

## Properties

* hotels
* resorts
* apartments
* shared rooms
* convention halls

## Inventory

* multiple room types
* multiple rate plans
* different availability
* sold-out dates
* seasonal pricing

## Transport

* flights
* transfers

## Travel

* tours
* activities
* visa services

## Users

* customer
* merchant
* staff
* admin
* super admin

## Bookings

Include bookings in different lifecycle states:

* pending
* payment_pending
* confirmed
* upcoming
* checked_in
* completed
* cancellation_requested
* cancelled
* refund_pending
* refunded
* failed

Use the existing lifecycle state machine rather than inventing conflicting statuses.

---

# PHASE 22 — END-TO-END DEMO SCENARIOS

The final prototype must support these demo scenarios without manually editing code.

## Scenario A — Hotel booking

```text
Search hotel
→ choose dates
→ filter
→ select room
→ select rate plan
→ traveler
→ add-on
→ promo
→ payment
→ confirmation
→ account booking
→ dashboard booking
```

## Scenario B — Payment failure

```text
Checkout
→ mock payment failure
→ retry
→ success
→ booking confirmed
```

## Scenario C — Cancellation

```text
Confirmed booking
→ cancel
→ policy calculation
→ refund quote
→ confirm cancellation
→ inventory restored
→ refund status
→ notification
```

## Scenario D — Admin action

```text
Customer booking
→ dashboard
→ admin changes status
→ customer sees updated status
```

## Scenario E — Merchant isolation

```text
Merchant A
→ sees own data

Merchant B
→ sees own data

Super Admin
→ sees all data
```

## Scenario F — Support

```text
Customer opens ticket
→ Admin receives ticket
→ Admin replies
→ Customer receives reply
```

## Scenario G — Loyalty

```text
Completed booking
→ points earned
→ next booking
→ points redeemed
→ discount reflected in checkout
```

---

# IMPORTANT ARCHITECTURAL REQUIREMENT

The prototype should now have one clear business flow:

```text
                 ┌────────────────────┐
                 │     Customer UI    │
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────┐
                 │ Feature Services   │
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────┐
                 │ Mock Repository    │
                 │ / Demo Store       │
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────┐
                 │ Existing Domain    │
                 │ Lifecycle + Money  │
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────┐
                 │ Persistent Mock    │
                 │ State              │
                 └────────────────────┘
```

The future backend should be replaceable at the repository/service boundary without rewriting the UI.

---

# QUALITY GATE

Before declaring completion, verify:

* no broken existing routes
* no duplicate booking models
* customer/admin share booking state
* inventory affects booking
* cancellation restores inventory
* pricing is centralized
* tax/fees appear correctly
* promo works
* loyalty works
* mock payment works
* payment failure/retry works
* booking lifecycle works
* admin actions reflect in customer UI
* merchant scoping works
* support is unified
* notifications work as mock events
* reviews connect to completed bookings
* analytics use real demo state
* i18n does not regress
* accessibility is preserved
* no raw card PAN is stored
* no real external backend/API is introduced

Run:

* typecheck
* lint
* build
* existing tests if present
* relevant new tests

Fix all errors caused by your changes.

---

# FINAL ACCEPTANCE CRITERIA

The prototype should be demoable as if it were a real booking SaaS:

Customer can:

```text
discover
→ search
→ filter
→ compare
→ select
→ check availability
→ choose room/rate
→ checkout
→ pay using mock payment
→ receive confirmation
→ manage booking
→ cancel/modify
→ receive mock notifications
→ earn/redeem loyalty
→ contact support
→ review
```

Merchant/Admin can:

```text
manage listings
→ manage rooms
→ manage rates
→ manage inventory
→ receive bookings
→ operate bookings
→ manage payouts
→ manage support
→ moderate reviews
→ manage promotions
→ inspect analytics
→ manage content
→ inspect audit/activity
```

---

# EXECUTION STYLE

Do not ask me to manually specify every missing feature.

Use the existing codebase and this specification as the source of truth.

Work autonomously.

When an existing implementation already satisfies a requirement, preserve it and integrate it rather than rebuilding it.

When a production feature cannot be implemented without a backend, implement the **best realistic mock/prototype equivalent** and keep a clean service/repository seam for future backend replacement.

Prioritize:

1. correctness
2. integration
3. reuse
4. realistic prototype behavior
5. consistency
6. token efficiency

Do not waste time producing documentation while implementation is incomplete.

At the end, provide only a concise summary of:

* what was implemented
* important architectural changes
* remaining intentionally deferred backend-only items
* validation results
