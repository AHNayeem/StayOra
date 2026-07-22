# ROLE

You are a Senior Staff Frontend Engineer, Senior UX Designer, Frontend Architect, Product Designer, and Software Architect.

Your mission is NOT to create a fake demo.

Your mission is to build a production-quality frontend prototype that behaves exactly like a real application while using local mock data.

Everything should be designed so that replacing mock data with real APIs requires minimal changes.

Think like this application will launch internationally.

Quality is far more important than speed.



# PROJECT

Project Name:
StayOra

Technology

- Next.js App Router
- TypeScript
- TailwindCSS
- Shadcn UI
- Framer Motion
- React Hook Form
- Zod
- TanStack Table
- React Query (or compatible data layer)
- next-intl
- Recharts
- Sonner Toast
- Lucide Icons

Architecture must remain scalable.



# PRIMARY GOAL

Create a COMPLETE FRONTEND PROTOTYPE.

Users must feel this is a real production application.

Nothing should feel unfinished.

Nothing should feel like placeholder.

Everything should appear dynamic.



# IMPORTANT RULE

DO NOT HARDCODE UI.

Instead create a fake backend layer.

Example

/src

    /mock
        hotels.ts
        apartments.ts
        bookings.ts
        users.ts
        transport.ts
        tours.ts
        visa.ts
        activities.ts
        reviews.ts
        messages.ts
        notifications.ts
        invoices.ts
        dashboard.ts
        analytics.ts

/services

    hotel.service.ts
    booking.service.ts
    auth.service.ts

Every page must consume service functions.

Never import mock data directly inside UI components.

Future API replacement should only require replacing service implementations.



# DATA LAYER

Create realistic datasets.

Not 5 items.

Use realistic amounts.

Hotels
50+

Apartments
50+

Tours
40+

Activities
80+

Transport
40+

Visa Packages
25+

Bookings
200+

Users
150+

Reviews
300+

Notifications
100+

Messages
100+

Transactions
150+

Coupons
30+

Blogs
40+

Countries

Every country

Currency

Multiple currencies

Language

Multiple languages

Timezone

Multiple timezones

Date format

International support.



# INTERNATIONAL READY

Application must support

LTR

RTL ready architecture

Localization ready

Multiple currencies

Country selector

Language selector

Timezone awareness

Metric/Imperial ready

Phone formats

Passport support

Visa support

Tax support

Invoice support



# HOME PAGE

The Home page must look like an international travel platform.

NOT a landing page with only a hero.

Build a content-rich homepage.

Include

Hero

Animated search

Destination slider

Popular hotels

Featured resorts

Featured apartments

Featured activities

Popular tours

Transport

Visa services

Special offers

Flash deals

Travel inspiration

Top destinations

Country cards

Trending packages

Testimonials

Partner logos

Awards

Latest blogs

FAQs

Newsletter

Statistics

CTA

Everything should be powered by services.

Use carousels where appropriate.

Use smooth animation.

Everything clickable.



# SEARCH EXPERIENCE

Global search

Live filtering

Suggestions

Location autocomplete (mock)

Price range

Rating

Facilities

Availability

Guests

Dates

Sorting

Pagination

Everything behaves realistically.



# AUTHENTICATION

Build

Login

Register

Forgot password

OTP

Reset Password

Verification

Profile Completion

Social Login UI

Use mock authentication.

Session should persist.

Protected routes.

Role based routing.



# USER ROLES

Guest

Traveler

Merchant

Vendor

Hotel Owner

Resort Owner

Apartment Owner

Transport Provider

Activity Provider

Visa Agency

Moderator

Support

Admin

Super Admin



# USER DASHBOARD

Bookings

Wishlist

Reviews

Messages

Invoices

Payments

Traveler Profile

Notifications

Settings

Security

Saved Cards

Saved Travelers

Travel History

Rewards

Coupons



# MERCHANT DASHBOARD

Every action must work.

Dashboard

Analytics

Properties

Booking Management

Calendar

Pricing

Availability

Seasonal Pricing

Coupons

Reviews

Messages

Customers

Invoices

Withdraw

Wallet

Support

Settings

Documents

Verification

Team Members

Roles

Permissions

Reports

Charts

Tables

Export buttons

Filters

Pagination

Search

Sorting

Bulk Actions



# ADMIN DASHBOARD

Complete SaaS Admin.

Analytics

Revenue

Commission

Users

Merchants

Bookings

Hotels

Apartments

Tours

Activities

Transport

Visa

Countries

Currencies

Languages

CMS

Blogs

FAQs

Newsletter

Support Tickets

Refund Requests

Reports

Audit Logs

System Settings

Taxes

Payment Gateways

Email Templates

Notification Templates

Roles

Permissions

Feature Flags

Maintenance Mode



# CRUD

Every CRUD must work visually.

Create

Edit

Delete

Archive

Restore

Duplicate

Preview

Status Change

Approval

Reject

Bulk Delete

Import

Export

Confirmation Dialog

Success Toast

Error Toast

Loading

Skeleton

Empty State

Validation

Everything must behave like production.



# TABLES

Professional tables.

Sorting

Filtering

Pagination

Column visibility

Sticky header

Bulk actions

Export

Search

Responsive



# FORMS

Every form

React Hook Form

Zod

Validation

Error messages

Success messages

Loading

Disabled states

Character limits

Upload preview

Image preview

Progress bars



# MODALS

Professional.

Animations.

Keyboard support.

ESC support.

Focus trap.

Accessible.



# NOTIFICATIONS

Use Sonner.

Every button click should show realistic feedback.

Examples

Hotel created

Booking updated

Review approved

Coupon copied

Invoice exported

Password changed

Profile updated

Document uploaded

Etc.



# UI STATES

Every page must include

Loading

Skeleton

Error

No data

Empty

Permission denied

Offline

Maintenance

404

500



# COMPONENTS

Everything reusable.

No duplicated UI.

Create proper design system.

Cards

Tables

Buttons

Dialogs

Inputs

Badges

Charts

Stats

Timeline

Avatar

Breadcrumb

Stepper

Tabs

Accordions

Carousel

Calendar

Charts

Maps placeholder



# PERFORMANCE

Lazy load

Code splitting

Memoization

Virtual lists

Image optimization

Dynamic imports

Keep architecture scalable.



# ACCESSIBILITY

Keyboard navigation

ARIA

Focus state

Contrast

Screen reader

Accessible dialogs

Accessible tables



# RESPONSIVE

Mobile

Tablet

Laptop

Desktop

Ultra wide

No broken layout.



# ANIMATION

Professional.

Not excessive.

Framer Motion.

Smooth transitions.

Hover

Page transitions

Cards

Dropdown

Drawer

Dialog

Toast



# MOCK API DELAY

Every service should simulate APIs.

Random delay

300ms

600ms

900ms

1200ms

Occasional random errors for testing.

Use Promise.

Never directly return data.



# FILE STRUCTURE

Organize properly.

feature-based architecture.

No messy folders.

No giant components.

No component over 300 lines if avoidable.

Split logic.

Split hooks.

Split services.



# CODE QUALITY

Strict TypeScript

Reusable types

Interfaces

Enums

Constants

Utilities

Hooks

Zero duplication

Clean naming

Comments only where necessary



# FUTURE API READY

Every service interface must exactly resemble future backend endpoints.

UI must never know whether data comes from mock or API.

Swapping backend should require replacing only services.



# FINAL AUDIT

Before finishing

Review the ENTIRE project.

Find every unfinished area.

Find every placeholder.

Find every TODO.

Find every missing page.

Find every broken route.

Find every missing link.

Find every missing action.

Find every missing dialog.

Find every missing empty state.

Find every inconsistent spacing.

Find every inconsistent typography.

Find every color inconsistency.

Find every responsiveness issue.

Find every accessibility issue.

Fix everything.



# SUCCESS CRITERIA

The final result should convince someone that:

"This application is already connected to a backend."

The only remaining task should be replacing service implementations with real API calls.

No obvious demo feeling should remain anywhere.

Build it to production-quality standards.