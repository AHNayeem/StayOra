# Otithee – Enterprise Flight Booking Module Integration

## ROLE

You are a Principal Software Architect, Senior Product Designer, Senior Frontend Engineer, UX Specialist, and Travel-Tech Domain Expert.

Your responsibility is NOT to simply add a Flight page.

Your responsibility is to transform Otithee into a complete Travel Super App by integrating a production-ready Flight Booking module that naturally fits into the existing architecture.

Before writing any code, thoroughly analyze the current Otithee project and existing implementation.

Do not rebuild anything unnecessarily.

Reuse existing architecture, components, design system, utilities, hooks, services, tokens, layouts, permissions, localization, and state management wherever possible.

---

# FIRST TASK — COMPLETE PROJECT ANALYSIS

Before implementation:

Analyze the entire Otithee project.

Identify:

* Existing folder structure
* Current architecture
* Existing routing
* Shared UI components
* Design System
* Services layer
* Mock data layer
* Dashboard architecture
* Search architecture
* Booking architecture
* Cart
* Checkout
* User Dashboard
* Merchant Dashboard
* Admin Dashboard
* CMS
* Notifications
* Reviews
* Wishlist
* Authentication
* Internationalization
* Currency system
* Theme system

Then determine:

* What already exists
* What is reusable
* What is missing
* What should be improved
* What should be refactored
* What needs extension for Flight support

Do not duplicate existing code.

---

# GOAL

Integrate a complete Flight Booking System into Otithee.

The experience should feel similar to leading travel platforms such as Gozayaan, while remaining fully consistent with Otithee's branding, UI, architecture, and design language.

Do not copy layouts or assets.

Instead, implement the complete feature set with an original Otithee experience.

---

# FLIGHT SEARCH

Implement complete search support.

Trip Types

* One Way
* Round Trip
* Multi City

Passenger Types

* Adult
* Child
* Infant

Cabin Classes

* Economy
* Premium Economy
* Business
* First Class

Trip Options

Departure

Destination

Departure Date

Return Date

Flexible Dates

Direct Flight Only

Nearby Airports

Preferred Airline

Refundable Only

Baggage Filter

Departure Time

Arrival Time

Layover Duration

Price Range

Stops

Airline Alliance

Flight Duration

Sorting

Recent Searches

Popular Routes

Saved Searches

Search Suggestions

Airport autocomplete using realistic mock data.

---

# FLIGHT RESULTS

Create realistic airline datasets.

Include:

Airline

Flight Number

Aircraft

Departure Airport

Arrival Airport

Terminal

Gate

Boarding Time

Departure Time

Arrival Time

Flight Duration

Layovers

Cabin

Seat Availability

Refund Policy

Baggage

Meals

WiFi

Entertainment

Carbon Emission

Price Breakdown

Discount

Taxes

Service Fees

Coupon Support

Promo Badge

Recommended Badge

Fastest Badge

Cheapest Badge

Best Value Badge

Everything should behave dynamically using services.

---

# AIRLINES

Generate realistic demo airlines.

Examples:

* Biman Bangladesh
* US-Bangla
* Novoair
* Emirates
* Qatar Airways
* Singapore Airlines
* Turkish Airlines
* Etihad
* Air Arabia
* FlyDubai
* Cathay Pacific
* Thai Airways
* Malaysia Airlines
* IndiGo
* Air India
* Lufthansa
* British Airways
* KLM
* Air France
* Saudi Airlines

Create logos, colors, and metadata through the mock layer.

---

# FLIGHT DETAILS

Create a complete details page.

Include:

Timeline

Layover information

Aircraft

Cabin Information

Fare Rules

Cancellation Policy

Refund Policy

Seat Map Placeholder

Baggage

Meal

WiFi

Entertainment

Flight Amenities

Airport Information

Terminal

Gate

Map Placeholder

Timeline Animation

Price Breakdown

Coupon

Traveler Summary

Everything should be interactive.

---

# BOOKING FLOW

Complete booking experience.

Search

↓

Select Flight

↓

Traveler Information

↓

Seat Selection

↓

Extra Baggage

↓

Meal Selection

↓

Travel Insurance

↓

Review

↓

Payment

↓

Confirmation

Everything should use mock services.

---

# TRAVELER INFORMATION

Support:

Passport

National ID

Date of Birth

Gender

Nationality

Passport Expiry

Frequent Flyer Number

Emergency Contact

Visa Requirement Placeholder

Validation using React Hook Form + Zod.

---

# SEAT SELECTION

Interactive seat map.

Seat Types

Window

Middle

Aisle

Extra Legroom

Emergency Exit

Premium

Business

Unavailable

Reserved

Selected

Seat pricing should update dynamically.

---

# ANCILLARY SERVICES

Support:

Extra baggage

Meals

Wheelchair assistance

Special assistance

Pet travel (placeholder)

Sports equipment

Priority boarding

Airport pickup

Travel insurance

Lounge access

Fast track

Everything should affect pricing dynamically.

---

# PAYMENT

Integrate with the existing Otithee checkout flow.

Do not create a separate payment architecture.

Reuse:

Wallet

Coupons

Taxes

Invoices

Payment Summary

Transactions

Order History

Confirmation

Notifications

---

# MY FLIGHTS

Inside User Dashboard:

Upcoming Flights

Completed Flights

Cancelled Flights

Flight Tickets

Boarding Pass Placeholder

Download Ticket

Share Ticket

Modify Booking

Request Refund

Support

Timeline

Status Tracking

---

# MERCHANT PANEL

If airline management is supported in the future, prepare extensible architecture.

Create reusable modules only.

Do not over-engineer current UI.

---

# ADMIN PANEL

Add Flight Management.

Airlines

Airports

Routes

Schedules

Bookings

Passengers

Coupons

Promotions

Taxes

Commissions

Reports

Analytics

Refund Requests

Support Cases

Settings

Everything should match existing Admin UI.

---

# HOME PAGE

Integrate Flights naturally.

Hero Search

Hotels

Flights

Apartments

Activities

Transport

Visa

Tours

Convention Hall

Unified search tabs.

Featured Flight Deals.

Popular Routes.

Seasonal Offers.

Airline Partners.

Travel Packages.

Flash Deals.

Everything should consume services.

---

# UNIFIED TRAVEL CART

Otithee should support:

Hotel

Flight

Transport

Visa

Activities

Tours

Insurance

Airport Pickup

Everything inside one booking ecosystem.

Single checkout experience.

---

# MOCK DATA ARCHITECTURE

Never import data directly.

Create:

mock/flights.ts

mock/airlines.ts

mock/airports.ts

mock/routes.ts

mock/fares.ts

mock/passengers.ts

mock/boardingPass.ts

services/flight.service.ts

All UI must consume service methods only.

Use simulated API delays and realistic loading states.

---

# INTERNATIONAL SUPPORT

Support:

All currencies

Timezone conversion

Airport time differences

International date formatting

Passport-friendly forms

Visa-aware architecture

LTR / RTL readiness

Localization

Country selectors

International phone formats

---

# UX

Smooth transitions.

Professional loading.

Skeletons.

Empty states.

No results state.

Error state.

Retry state.

Toast feedback.

Responsive.

Accessible.

Keyboard friendly.

---

# FUTURE API READY

The Flight module must be API-ready.

Replacing mock services with real backend endpoints should require minimal changes.

The UI must never know whether data comes from mock services or live APIs.

---

# FINAL AUDIT

Before completing the task:

Audit the entire Otithee project again.

Ensure the Flight module integrates correctly with:

* Homepage
* Navigation
* Search
* Booking
* Checkout
* User Dashboard
* Merchant Dashboard
* Admin Dashboard
* Notifications
* Wallet
* Wishlist
* Reviews
* CMS
* Analytics
* Internationalization
* Theme
* Permissions
* Responsive layouts

Identify and fix any gaps introduced by the new module.

No broken routes.

No placeholder pages.

No dead buttons.

No inconsistent UI.

No duplicated components.

The final result should feel like Flight booking has always been a core part of Otithee, with a seamless, production-ready architecture powered by mock services that can later be replaced with real APIs with minimal effort.

Before implementing anything, create a detailed implementation plan, dependency map, affected routes, affected services, affected dashboards, and a migration checklist. Wait for no confirmation—after the plan is complete, implement each phase sequentially and run a self-review after every phase before proceeding to the next.
