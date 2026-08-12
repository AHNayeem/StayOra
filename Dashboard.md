# StayOra — Dashboard, Roles, B2B/B2C & Booking Business Logic Prototype

## ROLE

You are a Principal Software Architect, Senior Frontend Engineer, Product Manager, UX Architect, and Travel-Tech Domain Expert.

Your task is to audit the existing StayOra dashboard system and turn it into a complete, realistic, production-style frontend prototype.

The dashboard UI/design already exists.

DO NOT redesign or rebuild the dashboard from scratch.

Your responsibility is to identify missing functionality, business flows, permissions, states, and interactions, then implement them within the existing design system.

The final prototype must clearly demonstrate:

* Authentication
* Role-based access
* Admin capabilities
* Merchant capabilities
* B2B scenarios
* B2C scenarios
* Booking lifecycle
* Booking failure
* Cancellation
* Refund
* Offers
* Combo offers
* Commission
* Settlement
* Notifications
* Financial states
* Operational states

The prototype must feel like a real travel SaaS platform.

---

# 1. FIRST — AUDIT THE EXISTING PROJECT

Before changing code, inspect the existing StayOra project.

Focus ONLY on areas relevant to this task.

Analyze:

* Dashboard routes
* Dashboard layouts
* Sidebar/navigation
* Existing dashboard pages
* Admin dashboard
* Merchant dashboard
* User dashboard
* Booking pages
* Flight module
* Hotel module
* Transport
* Tours
* Activities
* Visa
* Offers
* Coupons
* Payments
* Wallet
* Invoices
* Notifications
* Reviews
* Existing mock data
* Existing services
* Existing state management
* Existing authentication-related code
* Existing role-related code

Create a concise internal map of:

1. What already exists
2. What is partially implemented
3. What is missing
4. What can be reused
5. What needs to be extended

Do not repeatedly inspect unchanged files.

Do not analyze the entire repository unnecessarily.

Use targeted inspection.

---

# 2. CRITICAL — DO NOT REDESIGN

The existing dashboard design has already been approved.

Reuse:

* Layout
* Sidebar
* Header
* Cards
* Tables
* Charts
* Tabs
* Dialogs
* Forms
* Buttons
* Badges
* Filters
* Typography
* Colors
* Spacing
* Design tokens
* Existing responsive patterns

Only create new UI where a required business feature genuinely does not exist.

New pages must visually belong to the existing dashboard.

---

# 3. AUTHENTICATION PROTOTYPE

Currently the dashboard does not have real authentication.

Implement realistic mock authentication.

Support at minimum:

## Admin

Admin login

## Merchant

Merchant login

## Customer

Customer login

## Staff

Optional if existing architecture supports it.

The authentication must be mock/demo based.

Do NOT integrate a real backend.

Persist the demo session so refresh does not immediately lose the role.

Provide realistic demo accounts or a role selector for prototype testing.

Example:

Admin

Merchant

Customer

After login, redirect to the correct dashboard.

---

# 4. ROLE-BASED ACCESS CONTROL

Implement a clear permission system.

Do NOT rely only on hiding menu items.

Routes and actions must also respect permissions.

Example:

Admin:

* Full platform access

Merchant:

* Own business/data only

Customer:

* Own bookings/profile only

Unauthorized access should show:

* Permission denied
* Appropriate message
* Back/dashboard action

Do not allow a Merchant to access Admin functionality simply by manually entering the URL.

---

# 5. ADMIN — WHAT CAN ADMIN SEE?

Create a complete platform-level Admin experience using the existing dashboard design.

Admin should be able to view/manage:

### Platform

Dashboard

Analytics

Users

Customers

Merchants

Staff

Bookings

Flights

Hotels

Apartments

Tours

Activities

Transport

Visa

Offers

Coupons

Reviews

Payments

Refunds

Invoices

Commissions

Settlements

Support

Notifications

Reports

CMS

Countries

Currencies

Languages

Taxes

Settings

Audit Logs

---

# 6. ADMIN ACTIONS

Admin should be able to:

Create

Edit

Delete

Archive

Restore

Approve

Reject

Suspend

Activate

Refund

Cancel

Review

Export

Filter

Search

Sort

Bulk action

Where appropriate.

Every meaningful action should produce realistic feedback.

Use existing toast/dialog systems.

---

# 7. MERCHANT — WHAT CAN MERCHANT SEE?

Merchant must only see data belonging to their business.

Merchant dashboard should include relevant modules such as:

Dashboard

Bookings

Calendar

Inventory

Products

Pricing

Availability

Offers

Combo Offers

Coupons

Customers

Reviews

Messages

Payments

Revenue

Commission

Settlement

Invoices

Analytics

Documents

Profile

Team

Settings

Support

---

# 8. MERCHANT PERMISSIONS

Merchant can:

Create their own products/services

Edit their own products

Manage availability

Manage pricing

Create offers

Create combo offers

Create coupons

Accept/reject applicable bookings

Manage booking status

View customers related to their bookings

View reviews

Respond to reviews

View revenue

View commissions

View settlement information

Download invoices

View reports

Contact support

Merchant MUST NOT:

View another merchant's private data

Modify platform-wide settings

Modify platform commission rules

Manage other merchants

Access Admin-only financial/platform settings

---

# 9. CUSTOMER DASHBOARD

Ensure Customer experience is also complete.

Customer can see:

Upcoming bookings

Past bookings

Cancelled bookings

Failed bookings

Refunds

Payments

Invoices

Wishlist

Offers

Coupons

Reviews

Profile

Saved travelers

Notifications

Support

Trips

Flights

Hotels

Tours

Activities

Transport

Visa applications where applicable

---

# 10. BOOKING LIFECYCLE

This is one of the most important requirements.

Create a realistic booking state machine.

Example:

SEARCHED

↓

SELECTED

↓

BOOKING_INITIATED

↓

PAYMENT_PENDING

↓

PAYMENT_PROCESSING

↓

CONFIRMED

OR

FAILED

From CONFIRMED:

↓

COMPLETED

OR

CANCELLED

From CANCELLED:

↓

REFUND_PENDING

↓

REFUND_PROCESSING

↓

REFUNDED

OR

REFUND_FAILED

Do not create random statuses.

Use a consistent booking lifecycle across:

* Hotel
* Flight
* Tour
* Activity
* Transport
* Other bookable services

Where a specific product requires different states, extend the state machine without breaking the common model.

---

# 11. BOOKING SUCCESS

When booking succeeds:

Show:

Booking ID

Product

Provider/Merchant

Traveler

Date

Payment

Taxes

Commission

Total

Status

Invoice

Confirmation

Notifications

Customer dashboard update

Merchant dashboard update

Admin dashboard update

Everything should update through mock services/state.

---

# 12. BOOKING FAILURE

This must be clearly implemented.

Simulate realistic failure scenarios.

Examples:

Payment failed

Inventory unavailable

Seat unavailable

Room no longer available

Provider rejected booking

Timeout

Technical failure

When booking fails:

Do NOT show it as cancelled or refunded.

Show:

BOOKING FAILED

Reason

Payment status

Next action

Retry

Change option

Contact support

If payment was captured but booking failed, demonstrate:

PAYMENT CAPTURED

↓

BOOKING FAILED

↓

REFUND INITIATED

This distinction is extremely important.

---

# 13. CANCELLATION

Customer can request cancellation when policy allows.

Show:

Cancellation policy

Refund eligibility

Cancellation fee

Estimated refund

Final refund amount

Confirmation dialog

After confirmation:

CONFIRMED

↓

CANCELLATION REQUESTED

↓

CANCELLED

↓

REFUND PENDING

↓

REFUNDED

---

# 14. REFUND SYSTEM

Create a realistic refund workflow.

Support:

Full refund

Partial refund

No refund

Refund pending

Refund processing

Refund completed

Refund failed

Refund rejected

Admin review where appropriate

Show:

Original amount

Cancellation fee

Tax adjustment

Refund amount

Payment method

Refund ID

Requested date

Processed date

Reason

Status

---

# 15. REFUND UI

Customer:

Request refund

View refund status

View refund details

Merchant:

View refund requests related to their products

Admin:

Review

Approve

Reject

Process

View refund history

Do not allow merchants to bypass platform-level refund rules unless business rules explicitly allow it.

---

# 16. PAYMENT FAILURE VS BOOKING FAILURE

Clearly distinguish:

Payment Failed

Booking Failed

Booking Cancelled

Refund Pending

Refund Completed

These must never appear as the same state.

Create appropriate UI for each.

---

# 17. OFFERS

Add a complete Offer Management system.

Admin can create/manage platform offers.

Merchant can create/manage offers for their own products.

Offer fields:

Name

Description

Offer type

Discount type

Percentage

Fixed amount

Start date

End date

Minimum booking amount

Maximum discount

Applicable products

Applicable destinations

Applicable customers

Usage limit

Per-user limit

Promo code

Status

Terms

---

# 18. COMBO OFFERS ⭐

Implement Combo Offers.

Example:

HOTEL + FLIGHT

HOTEL + TOUR

FLIGHT + HOTEL + TRANSFER

HOTEL + ACTIVITY

TOUR + TRANSPORT

Create a bundle product.

Example:

Dubai Explorer Combo

Flight

Hotel

Airport Transfer

Desert Safari

Normal total:

$850

Combo price:

$749

Savings:

$101

The UI must clearly show:

Individual prices

Combo price

Savings

Terms

Availability

Validity

---

# 19. COMBO OFFER RULES

Combo offers must support:

Multiple products

Different merchants/providers

Discount calculation

Validity

Inventory/availability concept

Customer eligibility

Booking status

Cancellation policy

Refund handling

Do not implement complicated real inventory synchronization for the prototype.

But the architecture must be prepared for it.

---

# 20. COMMISSION SYSTEM ⭐⭐⭐⭐⭐

Commission must be clearly visible.

Support:

Platform commission

Merchant earning

Customer total

Taxes

Fees

Discount

Refund adjustment

Net settlement

Example:

Booking:

$500

Discount:

-$50

Customer pays:

$450

Platform commission:

$45

Merchant earning:

$405

The exact formula should be centralized.

Do not hardcode commission calculations inside components.

Create a commission service/calculator.

---

# 21. COMMISSION DASHBOARD

Admin can see:

Total GMV

Platform revenue

Commission earned

Merchant earnings

Pending settlements

Completed settlements

Refund adjustments

Commission by merchant

Commission by product

Commission by date

Charts

Tables

Filters

Export

---

# 22. MERCHANT FINANCIAL DASHBOARD

Merchant should see:

Gross sales

Discounts

Refunds

Commission

Net earnings

Pending settlement

Available balance

Paid amount

Settlement history

Invoices

Transaction history

Example:

Gross:

$10,000

Commission:

$1,000

Refund:

$300

Net:

$8,700

Keep calculations consistent everywhere.

---

# 23. B2C SCENARIO

Clearly implement and demonstrate:

Customer

↓

Search

↓

Select product

↓

Booking

↓

Payment

↓

Provider/Merchant

↓

Confirmation

↓

Customer trip

↓

Completion

↓

Review

Also support:

Cancellation

Refund

Failed booking

Support

---

# 24. B2B SCENARIO

StayOra must clearly support future B2B travel commerce.

Implement a prototype B2B structure.

Example:

Travel Agency / Corporate Client

↓

Search StayOra inventory

↓

Book for traveler/customer

↓

Receive B2B pricing

↓

Commission / markup

↓

Invoice

↓

Settlement

At minimum create concepts for:

B2B customer/company

Corporate traveler

Agency

B2B booking

B2B pricing

Markup

Commission

Invoice

Credit/settlement concept

Do not over-engineer a full corporate accounting system.

The prototype only needs to clearly demonstrate the business model and UI flow.

---

# 25. B2B VS B2C

Make the distinction obvious.

B2C:

Customer pays StayOra

StayOra processes booking

Merchant receives settlement

B2B:

Agency/Corporate client books

B2B pricing/markup applies

Booking belongs to organization

Invoice is generated

Settlement/credit relationship exists

Design the data model so both flows can coexist.

---

# 26. NOTIFICATIONS

Create realistic notifications for:

Booking confirmed

Booking failed

Payment failed

Refund requested

Refund approved

Refund completed

Booking cancelled

Offer created

Offer expiring

Settlement completed

Commission updated

New booking

New review

Support update

---

# 27. AUDIT LOG

For Admin:

Record important actions.

Examples:

Admin approved refund

Merchant created offer

Admin suspended merchant

Booking status changed

Commission adjusted

Refund processed

Keep this as mock data.

---

# 28. MOCK SERVICE ARCHITECTURE

Do not hardcode business logic inside pages.

Create/reuse service layers.

Examples:

auth.service

booking.service

payment.service

refund.service

offer.service

commission.service

settlement.service

merchant.service

admin.service

b2b.service

notification.service

Services should simulate API behavior.

The future backend should replace these services without requiring a dashboard rewrite.

---

# 29. DATA MODEL

Create reusable types/interfaces for:

User

Role

Permission

Merchant

Organization

Booking

BookingStatus

Payment

PaymentStatus

Refund

RefundStatus

Offer

ComboOffer

Commission

Settlement

Invoice

Notification

AuditLog

B2BAccount

Traveler

Keep the models normalized and reusable.

---

# 30. PROTOTYPE PERSISTENCE

Use the existing mock data/state architecture if available.

If appropriate, persist demo mutations using localStorage/session storage.

Example:

Create offer

↓

Refresh page

↓

Offer still exists

Same for:

Booking status

Refund

Coupon

Commission-related demo data

Do not introduce a database for this frontend prototype.

---

# 31. REALISTIC DEMO DATA

Do not use only 3–5 records.

Create enough realistic demo data to make:

Tables

Charts

Filters

Search

Pagination

Dashboard statistics

Booking histories

Refund histories

Commission reports

Offers

Merchant data

feel real.

Use reusable mock data generators where appropriate.

---

# 32. EVERY ACTION MUST WORK

No dead buttons.

Examples:

Create

Edit

Delete

Approve

Reject

Cancel

Refund

Retry

Create Offer

Create Combo

Apply Coupon

View Commission

Export

Filter

Search

View Details

Open Booking

Download Invoice

All should have a meaningful prototype behavior.

Use toast notifications and dialogs where appropriate.

---

# 33. RESPONSIVE + ACCESSIBILITY

Preserve the existing responsive design.

Test:

Mobile

Tablet

Desktop

Ensure:

Keyboard navigation

Focus states

ARIA

Accessible dialogs

Readable tables

Accessible forms

---

# 34. EXECUTION STRATEGY — TOKEN EFFICIENT

IMPORTANT.

Optimize implementation for context/token efficiency.

Rules:

1. Analyze once.
2. Build a concise dependency/impact map.
3. Inspect only relevant files.
4. Reuse existing components.
5. Do not repeatedly reread unchanged files.
6. Do not rewrite working modules.
7. Do not create duplicate services.
8. Do not create duplicate types.
9. Do not redesign existing dashboards.
10. Keep implementation summaries concise.
11. Avoid unnecessary explanations.
12. Do not generate large documentation during implementation.
13. Update documentation only after meaningful milestones.
14. After completing a phase, verify and move forward.
15. Do not stop for confirmation between phases unless a genuinely blocking issue exists.

Prefer small targeted changes over large rewrites.

---

# 35. IMPLEMENTATION PHASES

## Phase 1 — Dashboard Audit

Analyze existing dashboard.

Identify:

Missing pages

Missing routes

Missing permissions

Missing actions

Missing states

Missing services

Missing data

Missing business flows

Create a concise implementation map.

Do not redesign.

---

## Phase 2 — Authentication + RBAC

Implement:

Mock login

Session

Roles

Permissions

Protected routes

Admin

Merchant

Customer

Role-aware navigation

Unauthorized states

---

## Phase 3 — Booking Lifecycle

Implement:

Booking states

Payment states

Booking success

Booking failure

Cancellation

Refund

Retry

Notifications

---

## Phase 4 — Offers + Combo Offers

Implement:

Offer management

Coupon integration

Combo offers

Discount calculations

Validity

Eligibility

Merchant offers

Admin offers

---

## Phase 5 — Commission + Settlement

Implement:

Commission calculation

Admin commission dashboard

Merchant earnings

Settlement states

Refund adjustment

Financial summaries

---

## Phase 6 — B2B + B2C

Implement:

Customer flow

Agency/company flow

Organization concept

B2B booking

B2B pricing/markup concept

Invoices

Settlement concept

Clear separation between B2C and B2B.

---

## Phase 7 — Dashboard Integration

Connect everything to:

Admin Dashboard

Merchant Dashboard

Customer Dashboard (/account) (check it maybe don't need any dashboard for customer. Check route for customer profile)

Notifications

Analytics

Tables

Charts

Reports

---

## Phase 8 — Final Business Flow QA

Test complete scenarios.

### B2C Success

Customer → Booking → Payment → Confirmation → Merchant → Completion → Review

### B2C Failure

Customer → Payment → Booking Failed → Refund if applicable

### Cancellation

Customer → Cancel → Refund Eligibility → Refund → Completed

### Merchant

Merchant → New Booking → Manage → Earnings → Commission → Settlement

### Admin

Admin → Booking → Refund → Commission → Merchant → Settlement

### B2B

Agency → Search → B2B Price → Booking → Invoice → Settlement

### Offer

Merchant → Create Offer → Customer → Apply → Discount → Booking

### Combo

Customer → Combo → Multiple Products → Discount → Booking

Fix any broken or inconsistent flow.

---

# 36. FINAL AUDIT

Before declaring completion:

Check the entire dashboard system for:

* Broken routes
* Missing links
* Dead buttons
* Missing permissions
* Incorrect role visibility
* Incorrect financial calculations
* Missing booking states
* Missing refund states
* Missing failure states
* Missing empty states
* Missing loading states
* Missing error states
* Missing toast feedback
* Responsive issues
* Accessibility issues
* Duplicate code
* Hardcoded business logic
* Mock/API coupling

Verify that Admin, Merchant, and Customer experiences are clearly different and logically correct.

---

# 37. FUTURE BACKEND READY

The final implementation must make this transition easy:

CURRENT:

UI
→ Mock Services
→ Mock Data

FUTURE:

UI
→ Real Services
→ REST/GraphQL API
→ Backend
→ Database

Do NOT couple the UI directly to mock data.

Business rules such as:

Commission

Refund calculation

Offer calculation

Booking state transitions

Permissions

should exist in reusable service/domain logic.

---

# FINAL OUTPUT

After implementation, provide only a concise summary:

1. Dashboard gaps found
2. Features implemented
3. Important files/modules changed
4. B2B/B2C flows implemented
5. Booking/refund/commission/offer flows implemented
6. Remaining limitations, if any
7. Future backend integration points

Do not claim a feature is complete unless it was actually implemented and verified.

DO NOT stop after analysis.

After the initial analysis and plan, implement the complete feature sequentially.

Do not ask for confirmation between phases unless there is a genuinely blocking architectural decision.

Do not waste tokens explaining routine implementation details.

Analyze → Plan → Implement → Verify → Continue → Final Audit.





## Final Result ##


Done. next build, tsc --noEmit and eslint are clean (only pre-existing warnings in site-header, hero2, register-form, reset-form, (marketing)/page.tsx), and I verified the RBAC boundaries and domain arithmetic at runtime.

1. Dashboard gaps found
The design system, shell, RBAC primitives, CRUD engine and ~40 module screens already existed and were reused untouched. What was missing was the business logic:

Auth: session hardcoded to super_admin; no login, sign-out, persistence or role separation. Dashboard reachable while signed out.
RBAC: UI-level only (<Can>). Typing /dashboard/users as a merchant rendered the page.
Booking lifecycle: flat 6-status list. No payment states, no failure states, no cancellation/refund chain, no timeline, no money breakdown, no commission on a booking.
Money: commission/refund figures computed per-seed, per-module — they didn't reconcile between screens.
Missing entirely: settlements, merchant earnings, offer rules engine, combo offers, all of B2B, merchant data scoping, domain-driven notifications/audit log.
2. Features implemented
A framework-free domain layer at features/dashboard/domain/ — types · lifecycle (state machines) · money (the single money engine) · seed (96 deterministic bookings; refunds/commissions/settlements/invoices derived from them) · store (localStorage-persisted) · services (scoped async API with audit + notification side effects).

Then, on top: unified sign-in with 7 demo roles, three-layer RBAC, the full booking lifecycle console, the refund workflow, the commission dashboard, settlements, merchant earnings, offers, combo offers, the B2B module, live notification/audit feeds, and the customer-side refund flow.

3. Important files
Area	Files
Domain core	domain/lifecycle.ts, domain/money.ts, domain/services.ts, domain/seed.ts, domain/store.ts
Auth	auth/session.ts, auth/session-cookie.ts, services/auth.ts, constants/accounts.ts, app/dashboard/layout.tsx
RBAC	rbac/route-access.ts, rbac/route-guard.tsx, rbac/roles.ts, domain/use-domain.ts
New modules	modules/settlements/, modules/offers/, modules/b2b/
Rewired	bookings, refunds, commission, logs, notifications, overview
Customer	account/refunds.ts, account/refunds/refunds-view.tsx, booking-detail-view.tsx
New routes: /dashboard/finance/settlements, /dashboard/finance/earnings, /dashboard/promotions/offers, /dashboard/promotions/combos, /dashboard/b2b{,/accounts,/bookings,/invoices}, /account/refunds.

4. B2B / B2C flows
One booking ledger, two commercial models. B2C: customer pays at checkout → commission retained → merchant settled → refunds to the original method. B2B: agency books at a net rate on credit → adds its markup → invoiced on net 7/15/30 → commission still charged on the net rate → refunds become credit notes. Verified: a $1,000 public rate → $920 agency net → +$110.40 markup → $1,030.40 traveller price. Recording an invoice payment releases the account's credit line, which drives the credit meter and the block on over-limit bookings.

5. Booking / refund / commission / offer flows
Lifecycle: 13 states with an enforced transition table. Verified failed → cancelled is impossible, cancelled → refunded cannot skip the refund chain, and 0 illegal actions are offered across all 96 bookings.
Failure vs cancellation: a provider failure keeps the payment captured and raises a refund (7 of 7 in the seed); a payment failure marks it failed with nothing owed (0 refunds). Both are shown explicitly with the next action.
Commission: the brief's example reproduces exactly — $500 − $50 = $450 paid, $45 commission, $405 merchant. Zero money-invariant violations across the dataset, and the sum of per-merchant earnings equals the platform total to the cent.
Refunds: policy-tiered quotes shown before committing on all three surfaces; approving one reverses the commission and re-totals the affected settlement in the same mutation. A non-refundable booking returns $0 for a customer cancellation and 100% for platform fault.
Combos: Dubai Explorer — $850 individual, $749 bundle, $101 saved, allocated pro-rata across four merchants.
6. Remaining limitations
The traveler account and dashboard still hold separate booking datasets; refundService.requestExternal bridges refunds between them, but a customer's own bookings don't appear in the admin booking list. This is the one place the prototype has two sources of truth.
The session cookie is readable and unsigned — deliberate for a prototype, called out in its file header. Replace with a signed httpOnly cookie.
Combo inventory is a counter, not synchronised availability (as the brief specified).
Pre-existing modules I didn't rewire keep their own stub seeds: payouts, transactions, wallet, disputes, tax, reconciliation, flight refunds. They work, but their numbers don't reconcile with the domain ledger.
Merchant "Team" management is absent — the users list is platform-wide, and scoping it needed a per-merchant user model I judged out of scope.
7. Backend integration points
Replace the body of each function in domain/services.ts with a fetch — the signatures, DomainScope semantics and ApiError kinds are already the server contract. domain/store.ts then disappears entirely. getServerSession() swaps its cookie read for JWT verification; permissions already derive from the role server-side, never from the client. lifecycle.ts and money.ts should be shared with the backend rather than reimplemented — they're pure TypeScript with no React or Next imports, which is what keeps the client and server from ever disagreeing about a commission or a refund.