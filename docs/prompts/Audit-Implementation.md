You are working on the Otithee booking platform frontend prototype.

IMPORTANT CONTEXT
This is an existing, large, feature-rich prototype. Do NOT assume the audit's "missing" labels are accurate.

The audit is only a GAP-CHECK CHECKLIST, not a source of truth.

Your primary objective:

> Make the existing Otithee frontend prototype feature-complete and production-ready at the frontend/domain/service level, WITHOUT implementing a real database or backend server.

The prototype must behave as if it were a real production application using mock/in-memory/local persistence.

Later, a real backend API + database should be connectable by replacing/wiring the service/data layer, WITHOUT rebuilding the UI or business flow.

==================================================
NON-NEGOTIABLE RULES
==================================================

1. DO NOT blindly implement every item marked "missing" in the audit.

2. BEFORE implementing anything:
   - inspect the existing codebase
   - locate the relevant module
   - trace its complete user journey
   - inspect its domain logic
   - inspect its state/store
   - inspect its service layer
   - inspect related pages/routes
   - inspect related forms/modals/actions
   - inspect existing mock/seed data
   - inspect navigation entry points
   - inspect permissions/RBAC where applicable

3. The audit may be wrong because some features may already exist under:
   - another module
   - another name
   - a shared component
   - domain services
   - dashboard modules
   - booking flows
   - account/trip flows
   - mock services
   - existing localStorage state

4. NEVER create a duplicate implementation when an equivalent feature already exists.

5. If a feature already has a complete end-to-end cycle:
   - KEEP IT
   - DO NOT rewrite it
   - DO NOT replace it unnecessarily
   - only fix actual bugs/inconsistencies discovered during verification

6. If a feature exists but is PARTIAL:
   - extend the existing implementation
   - preserve the existing architecture
   - complete the missing steps of the cycle
   - do not create a parallel implementation

7. If a feature genuinely does NOT exist:
   - implement it using the project's existing patterns
   - integrate it into navigation, permissions, state, services, mock data and relevant workflows
   - make the entire feature usable end-to-end

8. Do NOT implement:
   - PostgreSQL
   - Prisma
   - real API routes
   - real server actions
   - real payment gateways
   - real external OTA integrations
   - real webhook infrastructure
   - real third-party services

9. However, design the frontend/domain/service boundaries so these can be connected later.

10. Existing work has priority.
    NEVER destroy or regress previously implemented functionality just to satisfy the audit.

==================================================
PROTOTYPE DEFINITION OF "COMPLETE"
==================================================

For this task, a module is NOT considered complete just because its page exists.

A module is complete only when its COMPLETE USER/OPERATIONAL CYCLE works.

For every relevant module, verify:

DISCOVER
→ LIST
→ DETAIL
→ CREATE / SELECT
→ VALIDATE
→ CONFIGURE
→ PRICE / CALCULATE
→ CONFIRM
→ PERSIST IN PROTOTYPE STATE
→ UPDATE
→ STATUS TRANSITION
→ RELATED RECORDS UPDATE
→ NOTIFICATION / FEEDBACK
→ HISTORY / TIMELINE
→ CANCEL / REFUND / REVERSE where applicable
→ FINAL STATE

The exact steps depend on the module.

Examples:

Booking:
search → detail → availability → selection → customization → pricing → checkout → hold → payment simulation → confirmation → booking record → trip/account → amendment → cancellation → refund → final state

Merchant:
application → onboarding → business information → documents → KYC simulation → bank details → verification → catalogue → approval → publish → inventory → bookings → settlement → payout

Inventory:
property → room → rate plan → availability → restrictions → pricing → hold → booking → release/commit → calendar impact

Messaging:
conversation → compose → validation → send → thread update → unread state → reply → status/read state → booking context

Refund:
booking/order → cancellation policy → refund quote → approval (if required) → refund simulation → booking status → money reversal → timeline → notification

Tax:
rule creation → validation → activation → rule matching → price calculation → tax lines → checkout display → booking snapshot → refund reversal

Do not use one generic cycle for every module. Infer the correct lifecycle from the existing domain model and UI.

==================================================
AUDIT SOURCE
==================================================

Use the uploaded audit document as the GAP-CHECK reference.

Important:
The audit contains both:
- genuinely missing features
- features that are already present but partial/unwired
- features that may be incorrectly classified as missing

Therefore:

AUDIT ITEM
      ↓
EXISTING CODE VERIFICATION
      ↓
CLASSIFY
      ├── COMPLETE → KEEP
      ├── PARTIAL → COMPLETE
      ├── MISSING → IMPLEMENT
      └── DUPLICATE/ALREADY COVERED → DO NOTHING

Never implement based on the audit label alone.

==================================================
HIGH-LEVEL AUDIT AREAS TO VERIFY
==================================================

Use the audit's full list, but organize verification around these areas:

CUSTOMER / TRAVELER
- unified/multi-service booking
- traveler profiles
- traveler documents
- seat selection
- room customization
- price alerts
- wishlist
- wishlist organization
- saved searches
- amendments
- cancellation/refund
- split/group payment
- account/trip integration

MERCHANT / HOST
- merchant onboarding
- merchant application
- KYC/verification
- bank verification
- merchant contracts
- merchant staff
- merchant RBAC
- multi-property
- catalogue approval
- media/gallery
- inventory
- rate plans
- pricing
- calendar
- iCal
- messaging
- reviews
- fulfilment
- payouts
- settlements
- merchant advertising
- subscriptions

ADMIN / OPERATIONS
- tax
- commission
- refunds
- disputes
- payouts
- reconciliation
- invoices
- wallet
- support
- messaging
- notifications
- audit logs
- approvals
- fraud/risk
- access control
- system settings

INVENTORY / REVENUE
- room inventory
- rate plans
- restrictions
- min stay
- stop sell
- CTA
- dynamic pricing
- promotions
- rate derivation
- availability
- holds
- external calendar blocks

SUPPLIER / DISTRIBUTION
- supplier management
- API logs
- GDS/supplier concepts
- OTA/channel concepts
- import/export flows
- supplier booking lifecycle

B2B
- organizations
- agency accounts
- sub-users
- contracts
- negotiated rates
- markup
- credit
- statements
- booking management
- B2B permissions

CMS / CONTENT / LOCALIZATION
- CMS
- publishing
- drafts
- preview
- scheduling
- media
- translations
- currency
- localization

ANALYTICS
- dashboards
- funnel
- booking analytics
- merchant analytics
- finance analytics
- product analytics
- operational analytics

PLATFORM
- notifications
- audit history
- feature flags
- permissions
- search
- filtering
- bulk actions
- saved views
- empty/error/loading states

==================================================
PHASE 0 — DISCOVERY FIRST
==================================================

Do NOT start coding immediately.

First inspect:

1. Project structure
2. package.json
3. app routes
4. features/
5. dashboard/
6. domain/
7. services/
8. stores
9. mock/seed data
10. booking flow
11. account/trip flow
12. merchant flow
13. admin flow
14. auth/RBAC
15. existing shared UI
16. existing forms/actions
17. existing state persistence

Then identify the actual architecture already present.

Do not waste tokens documenting every file.

Produce a concise internal/module map only.

==================================================
PHASE 1 — BUILD A FEATURE VERIFICATION MATRIX
==================================================

Before implementation, create an internal checklist with:

Feature
Existing implementation
Entry points
State/store
Service/domain logic
Complete cycle?
Missing steps
Decision

Possible decisions:

COMPLETE
PARTIAL
MISSING
DUPLICATE / ALREADY COVERED

Do NOT modify code during this classification pass.

Prioritize actual user-facing behavior over filenames.

Example:

"Wishlist"
→ account/wishlist.ts
→ wishlist page
→ save/remove works
→ local persistence works
→ no boards
→ PARTIAL
→ extend existing wishlist instead of creating new wishlist module

"Tax"
→ admin tax UI exists
→ pricing uses global tax scalar
→ admin rules don't affect pricing
→ PARTIAL / UNWIRED
→ connect existing tax concepts to pricing simulation

==================================================
PHASE 2 — IMPLEMENT ONLY REAL GAPS
==================================================

After classification:

For COMPLETE modules:
- no unnecessary changes

For PARTIAL modules:
- complete the missing lifecycle
- preserve existing components/domain/services
- reuse existing types and patterns
- add only necessary state/service/domain logic

For MISSING modules:
- implement complete feature cycle
- integrate with existing architecture

==================================================
PROTOTYPE DATA ARCHITECTURE
==================================================

Do NOT add a real backend.

Use the existing prototype architecture wherever possible.

Preferred layering:

UI
 ↓
feature/service facade
 ↓
domain/business logic
 ↓
prototype repository/store
 ↓
localStorage / seeded mock data

Later this should become:

UI
 ↓
same feature/service facade
 ↓
domain/business logic
 ↓
API adapter
 ↓
Backend
 ↓
Database

Therefore:

- do not put business logic directly inside React components
- do not scatter localStorage operations throughout UI
- do not hardcode state transitions inside pages
- keep service method signatures API-friendly
- use stable IDs
- keep explicit statuses
- preserve domain invariants
- keep money calculations deterministic
- keep lifecycle transitions explicit

If a service already exists, extend it instead of creating another service.

==================================================
STATE & DATA RULES
==================================================

Prototype state must behave consistently.

When an action happens:

CREATE
→ record appears in list/detail/dashboard

UPDATE
→ every related view reflects it

STATUS CHANGE
→ badges, filters, counters and related records update

DELETE/CANCEL
→ related state updates correctly

BOOKING
→ account/trip/dashboard/merchant/finance views should reflect the same logical transaction where applicable

Do NOT create isolated mock arrays for a feature if a related domain store already exists.

Avoid multiple sources of truth.

If two existing stores represent the same business entity:
- do not blindly delete either
- determine their roles
- consolidate/bridge them safely
- ensure one authoritative prototype state

==================================================
UNIFIED BOOKING RULE
==================================================

Otithee is intended to support unified travel booking.

Therefore verify that related services can participate in one logical trip/order flow.

Examples:

Flight
→ airport transfer
→ hotel
→ apartment
→ tour
→ activity
→ transport

The prototype does NOT need real backend atomic transactions.

But the frontend simulation should behave like a unified booking system:

Search
→ select
→ add to trip/cart
→ configure
→ calculate
→ checkout
→ confirmation
→ trip itinerary
→ per-service status
→ cancellation/amendment where applicable

Do not break existing individual booking flows.

==================================================
REALISTIC SIMULATION
==================================================

Because there is no backend, simulate production behavior properly.

Examples:

Payment:
- authorize
- processing
- success
- failure
- retry

Booking:
- pending
- confirmed
- on request
- cancelled
- completed
- no-show

Refund:
- requested
- approved
- processing
- refunded
- rejected

Merchant:
- draft
- submitted
- under review
- approved
- rejected
- active
- suspended

Calendar:
- connected
- syncing
- synced
- error
- paused

Do not fake everything as immediate success if the existing domain supports lifecycle states.

Use deterministic simulation rather than random behavior.

==================================================
UI COMPLETENESS
==================================================

Every completed module must have appropriate:

- loading state
- empty state
- error state
- success feedback
- validation
- confirmation dialog where destructive
- disabled states
- optimistic/pending state where appropriate
- toast/notification
- responsive UI
- accessible labels
- keyboard-friendly interaction
- realistic mock data
- filters/search where the module requires them
- pagination or sensible list handling where needed

Do not redesign the entire application.

Follow existing Otithee visual language and components.

==================================================
BACKEND-READY CONTRACTS
==================================================

Even though backend is forbidden for this task, make service interfaces API-ready.

Example:

Instead of:

button → mutate localStorage directly

Use:

UI
→ bookingService.create(...)
→ prototypeRepository.create(...)

Later:

UI
→ bookingService.create(...)
→ apiClient.post("/orders", ...)

Keep the UI unchanged.

Do NOT implement fake API routes merely to claim backend readiness.

==================================================
DO NOT OVERBUILD
==================================================

This is critical.

Do NOT build speculative enterprise infrastructure.

Do NOT add:
- unnecessary libraries
- unnecessary abstractions
- generic frameworks
- unused database models
- fake backend endpoints
- real external integrations
- unnecessary refactors

Implement the smallest complete solution that fits the existing architecture.

Reuse:
- existing components
- existing hooks
- existing domain functions
- existing services
- existing stores
- existing types
- existing mock data
- existing utilities

==================================================
TOKEN / CONTEXT EFFICIENCY
==================================================

You are operating in a large repository.

Do NOT repeatedly read the same files.

Strategy:

1. Inspect structure first.
2. Search narrowly.
3. Read only relevant files.
4. Build a mental/module map.
5. Reuse findings.
6. Modify only necessary files.
7. After each module, verify immediately.
8. Do not re-audit untouched modules repeatedly.

Avoid dumping large files into context when targeted search is enough.

Prefer:
- grep/ripgrep
- symbol search
- targeted file reads
- dependency tracing

over reading entire unrelated directories.

Do not spend tokens explaining obvious code.

==================================================
IMPLEMENTATION ORDER
==================================================

Work in this order:

1. Core booking/order lifecycle
2. Customer/traveler lifecycle
3. Merchant lifecycle
4. Inventory/calendar lifecycle
5. Finance/refund lifecycle
6. Tax/pricing lifecycle
7. Messaging/notification lifecycle
8. Admin/operations lifecycle
9. B2B lifecycle
10. CMS/content/localization
11. Analytics
12. Secondary ecosystem features

However, if discovery shows that an apparently later feature is actually a dependency, handle the dependency first.

==================================================
AFTER EACH MODULE
==================================================

For each modified module:

1. Verify imports/types
2. Run relevant lint/typecheck
3. Test the complete cycle
4. Verify related screens
5. Verify state persistence
6. Verify no duplicate state was introduced
7. Verify existing functionality still works

Do not move on if the module is broken.

==================================================
FINAL VERIFICATION
==================================================

At the end, perform a final audit against the original audit list.

For every audit item classify:

[COMPLETE]
Already existed / now complete

[PARTIAL → COMPLETED]
Existing feature was extended

[IMPLEMENTED]
Genuinely missing feature was added

[NOT APPLICABLE / DUPLICATE]
Audit item was already covered elsewhere

[DEFERRED]
Only if implementation would require a real backend/external integration that is explicitly outside this task

IMPORTANT:
Do NOT mark something DEFERRED merely because it is difficult.
If it can be fully simulated in the frontend prototype, implement it.

Only backend infrastructure and real third-party integrations are deferred.

==================================================
QUALITY BAR
==================================================

The final prototype should feel like a real production OTA frontend, not a collection of demo screens.

A user should be able to complete realistic end-to-end journeys.

Examples:

CUSTOMER:
search
→ select
→ configure
→ checkout
→ payment simulation
→ confirmation
→ trip
→ amend/cancel
→ refund

MERCHANT:
apply
→ onboarding
→ verification
→ property
→ room
→ rate plan
→ inventory
→ booking
→ guest communication
→ fulfilment
→ settlement
→ payout

ADMIN:
review merchant
→ approve
→ manage catalogue
→ manage pricing/tax/commission
→ monitor booking
→ refund
→ settlement
→ support
→ audit

B2B:
organization
→ users
→ permissions
→ contract
→ rates/markup
→ credit
→ booking
→ statement

Do not implement these as disconnected demos.
They must use the same logical prototype state where entities overlap.

==================================================
IMPORTANT FINAL RULE
==================================================

DO NOT CHANGE EXISTING WORK JUST TO MAKE THE AUDIT LOOK GREEN.

The objective is NOT:

"Implement every missing item."

The objective is:

"Verify every audit item against the real codebase, identify the actual gap, and make every genuinely incomplete module fully usable end-to-end while preserving all existing functionality."

Before writing code, inspect.
Before adding a feature, prove it is missing.
Before extending a feature, prove which lifecycle step is missing.
Before creating a new service/store, prove that no existing one can be reused.

Start with PHASE 0 discovery.
Do not begin implementation until you understand the existing architecture.