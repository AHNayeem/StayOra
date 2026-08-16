You are working on the existing Otithee Booking SaaS frontend prototype.

Your task is to IMPLEMENT A COMPLETE, PRODUCTION-READY FRONTEND PROTOTYPE for a flexible Dynamic Pricing / Rate Management system.

IMPORTANT:
- This is an existing project.
- DO NOT rebuild the application from scratch.
- DO NOT remove, replace, or break existing features.
- DO NOT change existing working functionality unnecessarily.
- First inspect and understand the current architecture, booking flow, property/room structure, dashboard, mock data, components, state management, routing, and existing pricing-related implementation.
- Reuse existing components, patterns, types, utilities, styling, and design system wherever possible.
- If a pricing-related feature already exists, extend/fix it instead of duplicating it.
- Do NOT implement a real database or backend/API yet.
- Everything must work as a realistic frontend prototype using mock/local data.
- However, the architecture, types, services, state structure, and business logic must be designed so that a real backend/API can be connected later with minimal changes.
- Do not use fake buttons or dead-end UI. Every implemented feature must have a meaningful working prototype flow.
- Do not simplify the feature into static UI only.

==================================================
1. FIRST: AUDIT THE EXISTING PROJECT
==================================================

Before making changes:

1. Inspect the entire project structure.
2. Identify:
   - Booking flow
   - Property management
   - Room/unit management
   - Rate/pricing related components
   - Availability/calendar components
   - Merchant dashboard
   - Admin dashboard
   - Customer booking/search flow
   - Existing mock data
   - Existing state management
   - Existing TypeScript types/interfaces
   - Existing utilities/services
   - Existing design system/components
3. Search for existing:
   - pricing
   - rate
   - room rate
   - seasonal pricing
   - weekend pricing
   - discount
   - promotion
   - availability
   - calendar
   - booking price calculation
4. Determine what is already implemented and what is missing.
5. Do NOT duplicate existing functionality.
6. Create an internal implementation plan based on the current codebase before modifying files.

The final implementation must feel like a natural extension of the existing Otithee product.

==================================================
2. CORE FEATURE: DYNAMIC PRICING ENGINE
==================================================

Implement a reusable frontend pricing engine.

The system should calculate the effective price for every booking date based on:

Base Rate
+
Pricing Rules
+
Season
+
Weekend
+
Holiday
+
Demand / Occupancy
+
Booking Window
+
Length of Stay
+
Guest Count
+
Applicable Discounts
=
Effective Daily Rate / Final Booking Price

The architecture must support adding new pricing rules later without rewriting the booking system.

Create proper TypeScript types/interfaces for:

- RatePlan
- PricingRule
- PricingRuleCondition
- PricingRuleAdjustment
- Season
- Holiday
- WeekendRule
- DynamicPricingRule
- DiscountRule
- DailyRate
- PriceBreakdown
- BookingPriceCalculation
- PricingConfiguration

Do not hard-code pricing logic directly inside UI components.

Use a dedicated pricing service/utility/module.

Example conceptual structure:

pricing/
  types
  rules
  engine
  calculators
  mock-data

Adapt this to the project's existing architecture rather than blindly creating this exact folder structure.

==================================================
3. RATE PLANS
==================================================

Implement a proper Rate Plan system.

Example:

- Standard Rate
- Non-Refundable
- Breakfast Included
- Half Board
- Corporate Rate

Each rate plan should support:

- Name
- Description
- Base price
- Currency
- Refundability
- Meal inclusion
- Status
- Applicable room/property
- Pricing rules
- Minimum stay
- Maximum stay
- Booking restrictions

Merchant should be able to:

- View rate plans
- Create rate plan
- Edit rate plan
- Duplicate rate plan
- Enable/disable rate plan
- Delete/archive rate plan
- View pricing rules attached to a rate plan

Use realistic mock data and functional interactions.

==================================================
4. SEASON MANAGEMENT
==================================================

Create a Seasons management module.

Merchant can create:

Example:

Winter Peak Season
Dec 15, 2026 → Jan 10, 2027
Adjustment: +30%

Eid Holiday
Date Range
Adjustment: +50%

Each season should support:

- Name
- Start date
- End date
- Description
- Adjustment type:
  - Percentage
  - Fixed amount
- Adjustment value
- Priority
- Status
- Applicable properties/rooms/rate plans
- Minimum stay
- Maximum stay
- Optional booking restrictions

Implement:

- Season list
- Search
- Filter
- Create
- Edit
- Duplicate
- Enable/disable
- Delete/archive
- Details view

Include validation for:

- Invalid dates
- End date before start date
- Duplicate/overlapping configuration warnings where appropriate
- Invalid adjustment values

==================================================
5. WEEKEND PRICING
==================================================

Implement configurable weekend pricing.

Do NOT assume every country uses Saturday/Sunday.

Allow merchant/admin to configure:

Weekend days:
- Friday
- Saturday
- Sunday
etc.

Example:

Friday +20%
Saturday +20%

Support:

- Percentage adjustment
- Fixed amount adjustment
- Priority
- Active/inactive
- Applicable rate plans

Weekend pricing must automatically affect the pricing engine.

==================================================
6. HOLIDAY PRICING
==================================================

Implement holiday-based pricing.

Example:

Christmas
Eid
New Year
Pohela Boishakh
Public Holiday

Each holiday rule should support:

- Holiday name
- Date / date range
- Adjustment
- Priority
- Active/inactive
- Applicable properties/rate plans

Use mock holidays.

Make the system generic enough that backend holiday data can later replace the mock data.

==================================================
7. RULE PRIORITY & CONFLICT RESOLUTION
==================================================

This is critical.

Multiple rules can apply to the same date.

Example:

Base Rate = ৳5,000

Weekend = +20%
Peak Season = +30%
Holiday = +40%

The system must NOT randomly combine rules.

Implement explicit rule priority and calculation behavior.

Support concepts such as:

- Priority
- Stackable / non-stackable
- Calculation mode
- Base-relative adjustment
- Sequential adjustment
- Override price

Example:

Priority 100:
Holiday → Override / highest priority

Priority 50:
Season → +30%

Priority 20:
Weekend → +20%

The pricing engine should produce deterministic results.

Clearly document the calculation order in code.

==================================================
8. PRICING CALENDAR
==================================================

Implement a professional Pricing Calendar.

Merchant should be able to select:

- Property
- Room
- Rate Plan
- Month/date range

Calendar should display each date's effective price.

Example:

Normal:
৳5,000

Weekend:
৳6,000

Peak:
৳6,500

Peak + Weekend:
৳7,800

Show visual indicators/labels for:

- Normal
- Weekend
- Peak Season
- Holiday
- Discount
- High Demand
- Override

Allow merchant to click a date and inspect:

- Base price
- Applied rules
- Rule priority
- Adjustment
- Final price

The calendar should be interactive and useful, not just decorative.

==================================================
9. MANUAL PRICE OVERRIDE
==================================================

Implement manual daily price override.

Merchant can select a date and set:

Example:

Base Rate:
৳5,000

Manual Override:
৳7,500

The UI should clearly show:

- Override active
- Previous calculated price
- Final override price
- Reason/note
- Created/updated information

Support:

- Set override
- Edit override
- Remove override

Define how override interacts with other pricing rules.

Manual override should have the highest priority by default unless the existing project has a better established pricing model.

==================================================
10. DEMAND / OCCUPANCY PRICING
==================================================

Implement prototype support for demand-based pricing.

Example:

Occupancy:
0–50% → Base
51–80% → +10%
81–95% → +20%
96–100% → +35%

Use mock availability/occupancy data.

Merchant should be able to configure occupancy thresholds.

The pricing engine should calculate the applicable adjustment.

Do not create a fake AI pricing system.

This is rule-based dynamic pricing.

==================================================
11. BOOKING WINDOW PRICING
==================================================

Support pricing based on how early/late the customer books.

Example:

60+ days before check-in → -15%
30–59 days → -10%
7–29 days → Normal
0–6 days → +15%

The pricing engine should accept:

bookingDate
checkInDate

and calculate the applicable rule.

==================================================
12. LENGTH-OF-STAY PRICING
==================================================

Support stay duration rules.

Example:

1–2 nights → Normal
3–4 nights → -5%
5–6 nights → -10%
7+ nights → -15%

The pricing engine should calculate:

checkIn
checkOut
numberOfNights

and apply the correct rule.

==================================================
13. GUEST-BASED PRICING
==================================================

Support guest-based pricing where applicable.

Example:

2 guests → ৳5,000
3 guests → ৳6,000
4 guests → ৳7,000

Support:

- Adult
- Child
- Extra guest
- Extra bed

Do not assume every property uses this rule.

Make it configurable per property/room/rate plan.

==================================================
14. BOOKING FLOW INTEGRATION
==================================================

This is extremely important.

The dynamic pricing engine must be integrated into the existing customer booking flow.

When a customer searches:

Check-in:
Dec 18

Check-out:
Dec 21

The system should calculate every night individually.

Example:

Dec 18 → ৳6,500
Dec 19 → ৳7,800
Dec 20 → ৳7,800

Subtotal:
৳22,100

Then calculate:

- Taxes
- Service fee
- Discounts
- Other existing charges
- Grand total

Use the existing Otithee booking/checkout architecture.

Do NOT create a separate fake booking flow if one already exists.

==================================================
15. PRICE BREAKDOWN
==================================================

Customer should see a transparent breakdown.

Example:

Room
3 nights

Dec 18
৳6,500

Dec 19
৳7,800

Dec 20
৳7,800

Room subtotal
৳22,100

Discount
-৳1,000

Service fee
৳500

Tax
৳2,160

Total
৳23,760

Also allow the UI to explain why a particular date costs more.

Example:

"Peak Season +30%"
"Weekend +20%"

Do not expose internal implementation details to customers.

==================================================
16. MERCHANT PRICING DASHBOARD
==================================================

Create/update the Merchant Dashboard with:

Pricing Overview

Show:

- Average Daily Rate
- Base Rate
- Current Effective Rate
- Weekend uplift
- Seasonal uplift
- Active pricing rules
- Upcoming seasons
- Upcoming holidays
- Revenue impact
- Occupancy
- Pricing calendar

Use realistic mock analytics.

The dashboard must fit the existing Otithee visual system.

==================================================
17. ADMIN CONTROL
==================================================

Where appropriate, Admin should be able to:

- View pricing configurations
- Manage global holidays
- Configure default weekend days
- View merchant pricing rules
- Enable/disable dynamic pricing capability
- Review unusual pricing configurations

Do not overbuild unnecessary admin functionality.

==================================================
18. MOCK DATA ARCHITECTURE
==================================================

Because backend/database are NOT being implemented now:

Create realistic mock repositories/services.

Avoid scattering hard-coded arrays across components.

Use centralized mock data that resembles future API responses.

For example:

mockRatePlans
mockSeasons
mockPricingRules
mockHolidays
mockRoomRates
mockOccupancy
mockOverrides

Structure them so they can later be replaced by API calls.

Prefer service/repository abstraction where appropriate.

==================================================
19. API-READY ARCHITECTURE
==================================================

Even though there is no backend now, design the frontend as if APIs will be connected later.

Avoid:

- localStorage-only business logic
- UI-specific pricing calculations
- hard-coded booking totals
- hard-coded seasonal conditions
- direct manipulation of unrelated component state

The future architecture should allow:

MockPricingService
        ↓
RealPricingAPIService

without rewriting the UI.

Use async service interfaces where appropriate so the transition to API is straightforward.

==================================================
20. CURRENCY & LOCALIZATION
==================================================

Use the existing Otithee currency/localization system.

Do NOT hard-code ৳ or USD inside the pricing engine.

Pricing engine should work with:

currency
locale
minor units/precision where appropriate

Follow the existing internationalization architecture.

==================================================
21. VALIDATION & EDGE CASES
==================================================

Handle at minimum:

- Same-day check-in/check-out
- Invalid date range
- Leap year
- Month boundaries
- Year boundaries
- Season crossing
- Multiple seasons overlapping
- Weekend + season
- Holiday + weekend
- Multiple applicable rules
- Manual override
- Zero availability
- Minimum stay violation
- Maximum stay violation
- Invalid discount
- Negative final price
- Currency formatting
- Decimal rounding
- Missing pricing configuration
- Disabled pricing rule
- Disabled rate plan

The pricing engine must never produce invalid negative/NaN/infinite prices.

==================================================
22. UX REQUIREMENTS
==================================================

The feature must feel like a real SaaS booking platform.

Follow existing Otithee design language.

Use:

- Proper empty states
- Loading states where relevant
- Error states
- Confirmation dialogs
- Form validation
- Toast/notification feedback
- Responsive layout
- Accessible controls
- Keyboard-friendly interactions
- Clear labels
- Helpful tooltips
- Consistent spacing
- Existing component library

Do not introduce a completely different design style.

==================================================
23. RESPONSIVE DESIGN
==================================================

The following must work properly:

- Desktop
- Tablet
- Mobile

Especially:

- Pricing calendar
- Rule management
- Rate plan forms
- Price breakdown
- Merchant dashboard

Do not simply shrink desktop UI.

Create proper responsive layouts.

==================================================
24. ACCESSIBILITY
==================================================

Maintain WCAG 2.2 AA-oriented practices already used by the project.

Ensure:

- Proper labels
- Keyboard navigation
- Focus states
- Semantic buttons
- Accessible dialogs
- Accessible calendar controls
- Screen-reader-friendly status information
- Sufficient contrast
- No interaction dependent only on color

==================================================
25. TESTING
==================================================

Create unit tests for the pricing engine if the project already has a testing setup.

At minimum test:

1. Base rate
2. Weekend pricing
3. Season pricing
4. Holiday pricing
5. Weekend + season
6. Holiday + weekend
7. Priority conflict
8. Manual override
9. Booking window
10. Length of stay
11. Occupancy
12. Guest count
13. Discounts
14. Multi-night booking
15. Date boundary
16. Invalid configuration

The tests should validate actual pricing calculations, not just component rendering.

==================================================
26. PERFORMANCE
==================================================

Avoid recalculating the entire pricing system unnecessarily.

Use appropriate memoization/caching where needed.

Do not introduce expensive calculations on every render.

Keep the pricing engine framework-independent where practical.

==================================================
27. IMPORTANT: DO NOT BREAK EXISTING WORK
==================================================

Before modifying anything, identify existing functionality.

If existing Otithee already has:

- Room pricing
- Booking price calculation
- Availability
- Rate management
- Discounts
- Calendar
- Property management

then integrate with those systems instead of replacing them.

Existing functionality must continue working.

If there is a conflict between old prototype logic and the new pricing engine:

1. Preserve the existing user-facing flow.
2. Refactor the underlying logic carefully.
3. Make the new pricing engine the single source of truth for calculated booking prices.
4. Do not duplicate pricing calculations in multiple components.

==================================================
28. PROTOTYPE COMPLETENESS
==================================================

This must be a COMPLETE prototype.

A user should be able to demonstrate this end-to-end:

Merchant:

1. Create a Rate Plan
2. Set Base Rate
3. Create a Peak Season
4. Configure Weekend Pricing
5. Configure Holiday Pricing
6. Configure Demand Pricing
7. Configure Booking Window Pricing
8. Configure Length-of-Stay Pricing
9. View Pricing Calendar
10. Override a specific date
11. See effective daily rates

Customer:

1. Search property
2. Select dates
3. Select room/rate plan
4. See date-wise pricing
5. See why certain dates cost more
6. See discount
7. See tax/fees
8. See final booking total
9. Continue through the existing booking flow

Everything should work using mock data.

==================================================
29. DATA FLOW
==================================================

Use a clear architecture similar to:

Property
   ↓
Room
   ↓
Rate Plan
   ↓
Base Rate
   ↓
Pricing Rules
   ↓
Pricing Engine
   ↓
Daily Effective Rates
   ↓
Booking Price Breakdown
   ↓
Checkout

Do not allow UI components to independently calculate prices.

There should be ONE authoritative pricing calculation path.

==================================================
30. FINAL AUDIT
==================================================

After implementation:

1. Run type checking.
2. Run linting if configured.
3. Run tests.
4. Build the application.
5. Fix all errors.
6. Check existing booking flow.
7. Check merchant pricing flow.
8. Check responsive layouts.
9. Check console for errors/warnings.
10. Verify that no existing feature was accidentally removed or broken.

Then perform a final code audit specifically for:

- duplicated pricing logic
- hard-coded pricing
- dead buttons
- incomplete forms
- inconsistent state
- invalid date calculations
- incorrect totals
- broken responsive behavior
- TypeScript errors
- accessibility issues

==================================================
DELIVERABLE
==================================================

Implement the feature directly in the existing Otithee project.

Do not only provide an implementation plan.

Do not stop after creating UI screens.

The final result must be a complete, functional, realistic frontend prototype with:

- Dynamic Pricing Engine
- Rate Plans
- Seasonal Pricing
- Weekend Pricing
- Holiday Pricing
- Demand Pricing
- Booking Window Pricing
- Length-of-Stay Pricing
- Guest-based Pricing
- Manual Overrides
- Pricing Calendar
- Merchant Pricing Management
- Customer Price Breakdown
- Existing Booking Flow Integration
- Mock data/service architecture
- API-ready architecture
- Validation
- Edge-case handling
- Tests where supported
- Responsive UX
- Accessibility
- Production-quality TypeScript/code structure

Remember:

DATABASE = NOT REQUIRED
BACKEND API = NOT REQUIRED
MOCK DATA = REQUIRED
BUSINESS LOGIC = REQUIRED
COMPLETE FRONTEND FLOW = REQUIRED
PRODUCTION-READY ARCHITECTURE = REQUIRED
EXISTING FEATURES = MUST NOT BE BROKEN

Do not ask me to manually create data or configure the feature unless absolutely necessary.

Inspect the project, make the appropriate implementation decisions yourself, and complete the feature end-to-end.