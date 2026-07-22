# Claude Code Implementation Prompt — StayOra Dashboard (Admin + Merchant)

## Objective

You are a Senior Staff Frontend Architect, UI/UX System Designer, and Full Stack SaaS Engineer.

Your task is to design and implement the complete **Dashboard Architecture** for **StayOra**, following enterprise-grade SaaS standards.

**Important Goal**

Do NOT build everything in one step.

Instead, split the implementation into logical phases, where each phase is independently compilable, reviewable, and production-ready.

Each phase must complete successfully before moving to the next.

---

# Primary Mission

Create a fully dynamic Dashboard architecture for StayOra.

The dashboard must support:

* Super Admin
* Admin
* Staff
* Merchant
* Vendor
* Customer Support
* Finance
* Marketing
* Content Manager

Everything must be RBAC driven.

Nothing should be hardcoded.

Everything should be configurable from Database.

---

# Tech Stack

Use existing project stack.

* Next.js App Router
* TypeScript
* Tailwind CSS
* Shadcn UI
* TanStack Table
* React Hook Form
* Zod
* React Query / Apollo (existing project architecture)
* Framer Motion
* Lucide Icons

---

# UI Inspiration

Reference

https://triprex-app.egenslab.com/dashboard

Do NOT copy.

Only use it for:

* layout
* spacing
* navigation hierarchy
* interaction ideas
* dashboard density

StayOra must have its own design language.

---

# Dashboard Layout

Desktop

```
-----------------------------------------------------
Top Navigation
-----------------------------------------------------

Sidebar | Main Content

Sidebar | Page Header

Sidebar | Toolbar

Sidebar | Content

Sidebar | Footer
```

Mobile

```
TopBar

Drawer Sidebar

Content
```

---

# Layout Requirements

The layout must include:

### Left Sidebar

Collapsible

Expand / Collapse

Nested menu support

Infinite nesting support

Search menu

Pinned menu

Recently opened pages

Favorites

Role filtered menu

Permission filtered menu

Feature flag filtered menu

Dynamic icon

Dynamic badge

Dynamic notification count

Everything DB driven.

---

### Top Navigation

Must include

* Search
* Quick Actions
* Notification
* Messages
* Language
* Currency
* Theme
* Organization Switcher
* Merchant Switcher
* Profile
* Help
* Breadcrumb

Everything configurable.

---

### Main Content

Support

Loading

Skeleton

Permission denied

Empty

404

500

Maintenance

Feature disabled

Soft deleted data

Archived data

---

# Routing Structure

Create scalable route structure.

Example

```
dashboard/

analytics/

bookings/

booking/

[id]

create/

edit/

merchants/

merchant/

catalog/

cms/

finance/

users/

roles/

permissions/

settings/

system/

reports/

notifications/

support/

logs/

profile/
```

Each module must have

```
page.tsx

loading.tsx

error.tsx

layout.tsx

components/

hooks/

types/

api/

constants/

schemas/

```

---

# Sidebar Modules

Create dynamic menu configuration.

Dashboard

Analytics

Bookings

Hotels

Apartments

Resorts

Shared Rooms

Convention Hall

Transport

Activities

Visa

Customers

Merchants

Finance

Payments

Invoices

Payouts

Refunds

Commission

Reports

CMS

Reviews

Localization

Marketing

Coupons

Offers

Banner

Tax

Media

SEO

Users

Roles

Permissions

Audit Logs

System

Settings

Profile

Help

Support

Logout

No hardcoded menu.

Everything API driven.

---

# Admin Modules

Everything must be manageable.

## Dashboard

KPIs

Revenue

Bookings

Occupancy

Conversion

Commission

New Users

Merchants

Top Properties

Charts

Reports

Recent Activities

---

## Merchant

List

View

Approve

Reject

Suspend

Activate

Commission Override

KYC

Documents

Wallet

Settlement

Impersonation

Audit

---

## Catalog

Hotels

Apartment

Resort

Shared Room

Convention Hall

Transport

Activity

Visa

Categories

Amenities

Facilities

Attributes

Property Types

Tags

Gallery

Availability

Pricing

Rules

Policies

---

## Booking

Manage

Assign

Cancel

Refund

Rebook

Invoice

Timeline

History

Audit

---

## Finance

Payments

Payout

Wallet

Transactions

Refund

Commission

Tax

Invoice

Reconciliation

Disputes

Reports

---

## Promotion

Coupons

Flash Sale

Discount

Campaign

Offer

Banner

Referral

Gift Card

Tax

---

## Reviews

Pending

Approved

Rejected

Reported

Moderation Queue

---

## CMS

Pages

Blocks

Homepage Builder

Menus

Header

Footer

Navigation

Blog

FAQ

Testimonials

Partners

Media Library

SEO

---

## Localization

Languages

RTL

Fallback

Translation Coverage

Currencies

Exchange Rate

Timezone

Country

Region

---

## RBAC

Role

Permission

Assignment

Menu Permission

API Permission

Route Permission

Field Permission

Action Permission

---

## System

Feature Flags

Settings

Email Templates

SMS Templates

Push Templates

Notifications

Audit Logs

Login Logs

API Logs

Cron

Queue

Cache

Storage

Maintenance

---

## Reports

Dynamic Reports

Builder

Filter

Export

CSV

Excel

PDF

Print

---

# Merchant Dashboard

Merchant dashboard must be scoped.

Merchant only sees own organization.

Cannot access Admin data.

RBAC enforced.

---

# UI System Rules

Everything must use Design Tokens.

Never use raw spacing.

Never use raw colors.

Use semantic tokens.

Example

```
bg-surface

bg-primary

text-primary

text-secondary

border-default

spacing-md

radius-lg

shadow-md
```

---

# Accessibility

WCAG 2.2 AA

Every interactive component must support

Keyboard

Mouse

Touch

Screen Reader

Focus Visible

Escape

Tab

Shift Tab

Arrow Navigation

Enter

Space

---

# Component States

Every component must define

Default

Hover

Focus Visible

Pressed

Active

Selected

Disabled

Loading

Empty

Error

Success

Readonly

Permission Denied

---

# Component Standards

Cards

Tables

Forms

Dropdown

Popover

Dialog

Drawer

Tabs

Accordion

Combobox

Date Picker

File Upload

Charts

Pagination

Filters

Toolbar

Search

Sidebar

Navbar

Breadcrumb

Toast

Alert

Badge

Avatar

Must all follow one consistent design language.

---

# Data Rules

Everything dynamic.

Never hardcode

Countries

Languages

Currencies

Amenities

Roles

Permissions

Sidebar

Settings

Menus

Categories

Status

Labels

Feature flags

Everything fetched.

---

# API Layer

Keep clean architecture.

```
feature

api

types

hooks

services

schemas

validators

mapper

```

No API call inside UI component.

---

# Forms

React Hook Form

Zod

Reusable Form Components

Dynamic Form Builder ready

Validation driven

---

# Tables

TanStack Table

Reusable DataTable

Support

Pagination

Sorting

Filtering

Column Visibility

Column Pinning

Bulk Action

Export

Selection

Responsive

Server Side

---

# Search

Global Search

Command Palette

Recent Search

Saved Search

Keyboard Shortcut

---

# Notification System

Unread count

Real-time ready

Grouped

Filter

Mark Read

Archive

Delete

---

# Theme

Light

Dark

System

Persist user preference

---

# Responsive

Desktop

Laptop

Tablet

Mobile

Ultra Wide

---

# Empty States

Every page must have

No Data

No Permission

No Result

Loading

Offline

Archived

Deleted

Maintenance

---

# Error Handling

404

403

401

500

Network

Validation

Permission

Conflict

Timeout

Graceful recovery

Retry

---

# Performance

Lazy loading

Dynamic import

Code splitting

Suspense

Streaming

Memoization

Virtualization

Image optimization

---

# Folder Structure

Design scalable enterprise architecture.

Do not create flat folders.

Group by feature.

---

# Coding Standards

Strict TypeScript

Reusable

Composable

SOLID

Clean Architecture

Feature First

No duplicated code

Reusable hooks

Reusable services

Reusable UI

---

# Phase Based Development

Do NOT implement everything at once.

Instead implement in the following phases.

---

## Phase 1

Foundation

* Dashboard Layout
* Sidebar
* Top Navigation
* App Shell
* Theme
* Navigation
* Responsive Layout
* Route Structure
* Placeholder Pages
* RBAC Skeleton
* Permission Guard
* Breadcrumb
* Command Palette Skeleton

Deliverable:
A working dashboard shell with navigation and routing.

---

## Phase 2

Design System

Build all reusable dashboard UI components.

Buttons

Cards

Inputs

Dialogs

Drawer

Tables

Badge

Avatar

Pagination

Filters

Forms

Charts Placeholder

Loading Skeleton

Empty States

Error States

Deliverable:
Reusable component library.

---

## Phase 3

Data Infrastructure

API architecture

Repository

Services

Hooks

Query Layer

Global Error Handling

Authentication

Authorization

Permission System

Feature Flags

Deliverable:
Scalable data layer.

---

## Phase 4

Core Modules

Dashboard

Bookings

Merchants

Catalog

Finance

CMS

Localization

Reviews

Promotions

Deliverable:
Module scaffolding with reusable CRUD foundation.

---

## Phase 5

Advanced Features

Analytics

Reports

Audit Logs

Notifications

Media Library

SEO

Exports

Global Search

Command Palette

Deliverable:
Enterprise dashboard capabilities.

---

## Phase 6

Optimization

Accessibility

Performance

Animations

Code Splitting

Virtualization

Testing

Bundle Optimization

Deliverable:
Production-ready dashboard.

---

# For Every Phase

Before writing code:

1. Analyze the existing project structure.
2. Detect reusable components.
3. Avoid duplicate implementation.
4. Follow current architecture.
5. Explain implementation strategy.
6. List affected files.
7. Implement.
8. Run type checks.
9. Fix issues.
10. Summarize changes.
11. Wait for review before starting the next phase.

---

# Final Quality Gates

Every implementation **must** satisfy the following:

* Must be fully TypeScript-safe.
* Must follow semantic design tokens only (no raw colors or spacing values).
* Must be responsive across desktop, tablet, and mobile.
* Must satisfy WCAG 2.2 AA accessibility with visible focus states.
* Must support keyboard, pointer, and touch interactions.
* Must define explicit states: default, hover, focus-visible, active, disabled, loading, success, empty, and error.
* Must handle long content, overflow, empty datasets, and API failures gracefully.
* Must avoid hardcoded business data, labels, routes, menus, roles, currencies, languages, and settings.
* Must be RBAC-aware and feature-flag aware.
* Must keep API logic outside presentation components.
* Must maintain a clean, scalable, feature-first architecture.
* Must preserve consistency over local visual exceptions.
* Must not introduce duplicate components or one-off implementations.
* Must end each phase with a QA checklist and clearly identify any remaining work before proceeding.
