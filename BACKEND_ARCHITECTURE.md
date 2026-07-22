# StayOra — Backend Architecture & System Design

**Multi-Vendor Travel & Booking SaaS Platform**

| | |
|---|---|
| **Document type** | Master Software Architecture Documentation (implementation blueprint) |
| **Status** | Design — no implementation |
| **Version** | 1.0 |
| **Owner** | Backend / Solution Architecture |
| **Audience** | Senior backend engineers, DBAs, DevOps, QA |
| **Companion docs** | `ANALYSIS.md` (frontend audit), `DESIGN.md` (design tokens), `APIDesign.md` (brief) |

> **Purpose.** This document is the single source of truth for the StayOra backend. It defines the business analysis, data model, booking engine, CMS, localization, authentication, authorization, and the complete REST API contract. It contains **no code, no migrations, and no component files** — only architecture. It is intended to be detailed enough that a senior backend engineer can implement the platform without further clarification.

---

## Table of Contents

1. [System Analysis](#1-system-analysis)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Design — Conventions](#3-database-design--conventions)
4. [Domain Model & Entity Relationships](#4-domain-model--entity-relationships)
5. [Data Dictionary (Tables)](#5-data-dictionary-tables)
6. [Booking Engine](#6-booking-engine)
7. [Pricing Engine](#7-pricing-engine)
8. [Payments, Refunds, Wallet & Commission](#8-payments-refunds-wallet--commission)
9. [Dynamic CMS](#9-dynamic-cms)
10. [Multi-Language Architecture](#10-multi-language-architecture)
11. [Multi-Currency Architecture](#11-multi-currency-architecture)
12. [Authentication](#12-authentication)
13. [Authorization & RBAC](#13-authorization--rbac)
14. [API Design — Conventions](#14-api-design--conventions)
15. [API Reference by Module](#15-api-reference-by-module)
16. [Admin Panel Requirements](#16-admin-panel-requirements)
17. [Best Practices & Engineering Standards](#17-best-practices--engineering-standards)
18. [Recommended Future Enhancements](#18-recommended-future-enhancements)
19. [Appendix — Enumerations & Status Codes](#19-appendix--enumerations--status-codes)

---

## 1. System Analysis

### 1.1 Business Overview

StayOra is a **multi-vendor travel commerce SaaS**. Independent merchants (vendors) list inventory across nine verticals — **Hotels, Apartments, Resorts, Shared Rooms, Convention Halls, Transport, Tours, Activities, Visa Services** — and customers discover, book, pay for, and review them. The platform earns via **commission**, **service fees**, and (future) **subscription plans**. Conceptually it combines **Booking.com + Agoda + Airbnb + a travel agency + a headless CMS**.

The system has three principal actor domains, each with its own authentication realm:

- **Customer domain** — public storefront; browse, search, book, pay, review.
- **Merchant domain** — vendor back-office; list inventory, manage availability/pricing, fulfil bookings, withdraw earnings.
- **Platform domain** — Super Admin + Admin staff; onboard/verify merchants, configure the platform, moderate content, run finance and reports.

### 1.2 Actors & Roles

| Actor | Realm | Description |
|---|---|---|
| Guest | Public | Unauthenticated visitor; browse & search only. |
| Customer | Customer | Registered traveller; books, pays, reviews, manages wallet & wishlist. |
| Merchant Owner | Merchant | Owns a vendor account; full control of their org. |
| Merchant Staff | Merchant | Scoped staff of a merchant (e.g. Front Desk, Finance) via RBAC. |
| Admin | Platform | Platform operator with a dynamic role. |
| Super Admin | Platform | Unrestricted; owns global settings, feature flags, roles. |

> All roles except Guest/Customer are **dynamic** (see [RBAC](#13-authorization--rbac)). "Merchant Staff", "Admin" etc. are seed roles, not hardcoded privileges.

### 1.3 Business Workflow (macro)

1. **Onboarding** — Merchant registers → submits KYC/business docs → Admin verifies → account activated.
2. **Listing** — Merchant creates properties/services, room types, rate plans, availability calendars, media, policies. Content enters **Draft → Pending Review → Published** (moderation configurable per platform policy).
3. **Discovery** — Customer searches by vertical, location, dates, guests, filters; results ranked by relevance/price/rating.
4. **Booking** — Customer selects offer → availability re-checked & held → price quoted (taxes, fees, coupons) → payment → confirmed booking → vouchers/notifications.
5. **Fulfilment** — Merchant services the booking (check-in, transport dispatch, visa processing, etc.); status advances through the booking timeline.
6. **Settlement** — Platform captures commission; merchant earnings accrue to a payable ledger; merchant requests payout.
7. **Post-stay** — Customer reviews; merchant may respond; analytics update.
8. **Support** — Tickets, messages, disputes, refunds handled through dedicated modules.

### 1.4 User (Customer) Workflow

```
Register/Login ─► Browse/Search ─► View Detail ─► Check Availability
      │                                                   │
      ▼                                                   ▼
  Manage Profile                               Select Options (dates, guests,
  Wishlist / Currency / Language                extras, room/rate plan)
      │                                                   │
      ▼                                                   ▼
  My Bookings ◄──── Confirmation ◄──── Payment ◄──── Price Quote (+coupon)
      │
      ▼
  Modify / Cancel ─► Refund ─► Review ─► Support Ticket
```

### 1.5 Booking Workflow (state-driven)

```
DRAFT/CART ─► PENDING_PAYMENT ─► CONFIRMED ─► IN_PROGRESS ─► COMPLETED
     │              │                │
     │              ▼                ▼
     └──────► EXPIRED           CANCELLED ─► REFUND_PENDING ─► REFUNDED
                                    │
                                    └► NO_SHOW / REJECTED (merchant)
```

- On checkout, an **inventory hold** is placed (TTL, e.g. 10–15 min). Payment success → hold converts to a firm reservation and inventory is decremented. Payment failure/timeout → hold released, booking `EXPIRED`.
- Cancellation resolves against the applicable **Cancellation Policy** to compute refundable amount.

### 1.6 Merchant Workflow

Register → KYC submission → verification → configure org (payout account, currency, tax profile) → create inventory → manage calendars & rate plans → receive bookings → fulfil → respond to reviews → view earnings → request payouts → manage staff (RBAC).

### 1.7 Admin Workflow

Merchant verification & suspension → catalog/content moderation → global settings, taxes, commission rules, feature flags → coupons/offers/banners → CMS (menus, pages, blog, FAQ, SEO) → languages & currencies & exchange rates → finance (payouts, refunds, invoices, reconciliation) → RBAC (roles/permissions) → reports & analytics → audit/activity logs → support/dispute oversight.

### 1.8 Payment Workflow

```
Quote ─► Create Payment Intent (gateway) ─► Customer pays
      ─► Gateway webhook ─► Verify signature ─► Mark Payment CAPTURED
      ─► Create Transaction (ledger) ─► Confirm Booking
      ─► Generate Invoice ─► Accrue Merchant Payable + Platform Commission
```

Supports multiple gateways via a **Payment Provider abstraction** (Stripe, PayPal, and regional gateways such as SSLCommerz/bKash for BD). Idempotency keys on intent creation; webhook events stored for audit and replay.

### 1.9 Refund Workflow

```
Cancellation/Dispute ─► Compute refundable (policy) ─► Refund request
   ─► Approval (auto if within policy, else Admin/Merchant approval)
   ─► Gateway refund OR Wallet credit ─► Refund record RESOLVED
   ─► Reverse commission/payable entries ─► Notify customer & merchant
```

Refund destinations: **original payment method** or **StayOra Wallet** (configurable, often faster for the customer).

### 1.10 Review Workflow

Only customers with a `COMPLETED` booking may review (verified-purchase gate). Review enters `PENDING` → moderation/auto-publish → `PUBLISHED`. Merchant may post one response. Ratings aggregate to per-listing summary counters (denormalized for read performance). Abusive reviews can be reported → moderation queue.

### 1.11 Notification Workflow

Domain events (booking confirmed, payment captured, refund issued, KYC approved, payout sent, new message, review posted…) are published to a **notification dispatcher**. The dispatcher resolves the recipient's channel preferences and locale, renders the matching **template** (email/SMS/push/in-app), and enqueues delivery. All notifications are persisted for the in-app inbox and audit.

### 1.12 Missing Requirements Identified (with recommendations)

| # | Gap in brief | Recommendation |
|---|---|---|
| 1 | No explicit **inventory-hold / overbooking** control | Add `booking_holds` with TTL + optimistic locking / row-versioned availability. |
| 2 | Commission model unspecified | Add configurable **commission rules** (global → vertical → merchant override; % or flat). |
| 3 | Merchant **payout / settlement** ledger absent | Add merchant wallet + `payout_requests` + double-entry `ledger_entries`. |
| 4 | **Tax** rules only listed as a field | Model tax as inclusive/exclusive rules per country/vertical with `booking_taxes` breakdown. |
| 5 | No **idempotency / webhook** durability | Require idempotency keys and a `webhook_events` store. |
| 6 | **Search** at scale | Recommend a search index (OpenSearch/Meilisearch) fed by outbox events; DB is source of truth. |
| 7 | **Subscription/plans** for merchants (SaaS monetization) | Add `plans` + `merchant_subscriptions` (future). |
| 8 | **Dispute / chargeback** handling | Add `disputes` linked to bookings/payments. |
| 9 | **GDPR / data deletion** | Soft delete + a data-export/erasure workflow; PII encryption at rest. |
| 10 | **Rate limiting / abuse** | API gateway rate limits + `api_logs`. |
| 11 | **Multi-property groups** (chains) | Merchant → many properties already supports this; add optional `brand`/`chain` grouping (future). |
| 12 | **Channel manager / OTA sync** | Out of scope v1; design availability model to allow external sync later. |

---

## 2. Architecture Overview

### 2.1 Style

**Modular monolith** with **Clean / Layered Architecture**, organized by bounded context (module), designed for later extraction into services. Each module exposes an application (service) layer over a repository layer; controllers/route-handlers are thin.

```
┌───────────────────────────────────────────────────────────────┐
│                         Clients                                 │
│   Customer Web (Next.js)  │  Merchant Panel  │  Admin Panel     │
└───────────────┬───────────────────┬───────────────────┬────────┘
                │  HTTPS / REST (JSON)                    │
┌───────────────▼─────────────────────────────────────────────────┐
│                       API Gateway / Edge                          │
│   TLS · Rate limiting · Auth token validation · Request logging   │
└───────────────┬───────────────────────────────────────────────────┘
                │
┌───────────────▼───────────────────────────────────────────────────┐
│                    Application (Backend) Layer                      │
│  Presentation: Route handlers / Controllers (thin, validate+map)    │
│  Application:  Services (use-cases, orchestration, transactions)    │
│  Domain:       Entities, value objects, policies, state machines    │
│  Infra:        Repositories, gateways (payment/mail/sms/storage)    │
└───┬───────────────┬───────────────┬───────────────┬───────────────┘
    │               │               │               │
┌───▼────┐    ┌─────▼─────┐   ┌─────▼─────┐   ┌──────▼──────┐
│Postgres│    │  Redis    │   │Search idx │   │Object store │
│(source │    │(cache,    │   │(OpenSearch│   │(S3: media,  │
│of truth)│   │ locks,    │   │ /Meili)   │   │ docs, KYC)  │
│         │    │ queues)   │   │           │   │             │
└────────┘    └───────────┘   └───────────┘   └─────────────┘
                    │
              ┌─────▼──────┐
              │ Job workers │  (notifications, payouts, exchange-rate
              │  / queue    │   sync, search indexing, invoice gen)
              └────────────┘
```

### 2.2 Recommended Technology Stack

The frontend is **Next.js 16 (App Router) + React 19 + TypeScript** with a services-layer stub already API-ready. To minimize impedance the backend is TypeScript-native.

| Concern | Recommendation | Rationale |
|---|---|---|
| Language/runtime | **TypeScript on Node (Bun runtime)** | Matches repo ([[use-bun]]); shared types with frontend. |
| API framework | **NestJS** (or Fastify + tsyringe) | First-class DI, modules, guards, interceptors → maps cleanly to Clean Architecture, RBAC guards, service layer. |
| ORM / data | **Prisma** (or Drizzle) over **PostgreSQL 15+** | Type-safe repository layer, migrations, relations. |
| Cache / locks / queue | **Redis** + **BullMQ** | Holds, rate limits, sessions, background jobs. |
| Search | **OpenSearch** or **Meilisearch** | Faceted geo/availability search at scale. |
| Object storage | **S3-compatible** | Media library, KYC docs, invoices. |
| Auth | **JWT access + rotating refresh**, Argon2id hashing | Two separate realms (customer / staff). |
| Payments | Provider abstraction (**Stripe**, PayPal, regional) | Pluggable gateways. |
| Observability | OpenTelemetry, structured logs, Sentry | Tracing + error tracking. |

> **Deployment topology (target):** stateless API behind a load balancer (N replicas), primary Postgres with read replicas, Redis cluster, queue workers as separate deployments, search + object store as managed services. Horizontal scaling of API/workers; DB scaled via read replicas + partitioning of hot tables (`bookings`, `*_logs`, `notifications`).

### 2.3 Scalability Principles

- **Statelessness** — no session affinity; JWT + Redis for shared state.
- **CQRS-lite** — writes to Postgres (source of truth); reads for search/listing served from the search index and cache; kept in sync via an **outbox → indexer** pipeline.
- **Denormalized read counters** — `rating_avg`, `rating_count`, `min_price` cached on listing rows.
- **Partitioning** — time-partition high-volume tables (`activity_logs`, `api_logs`, `notifications`, `bookings` by created month).
- **Idempotency & optimistic concurrency** — version columns on inventory/booking-critical rows.
- **Async everything non-blocking** — email/SMS/push, invoice PDF, payout, indexing run on workers.

---

## 3. Database Design — Conventions

A production PostgreSQL schema. Normalized to **3NF** except where denormalization is deliberately introduced for read performance (documented per case). JSON columns are used **only** for genuinely schema-less or presentation data (e.g. CMS section payloads, gateway responses, template variables).

### 3.1 Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Table | `snake_case`, plural | `booking_items` |
| Column | `snake_case` | `check_in_date` |
| Primary key | `id` (BIGINT identity or UUID v7) | `id` |
| Foreign key | `<singular>_id` | `merchant_id` |
| Join table | `<a>_<b>` | `role_permissions` |
| Boolean | `is_/has_` prefix | `is_active` |
| Timestamp | `_at` suffix | `published_at` |
| Enum status | `status` / `*_status` | `payment_status` |
| Index | `ix_<table>_<cols>` | `ix_bookings_customer_id_status` |
| Unique | `uq_<table>_<cols>` | `uq_users_email` |

> **PK strategy.** Use **UUID v7** (time-ordered) for externally exposed, distributable resources; BIGINT identity acceptable for internal high-volume append tables. Never expose sequential internal IDs in customer-facing URLs — use `slug` or `public_id`.

### 3.2 Standard Columns (present on all business tables unless noted)

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID/BIGINT PK | Primary key. |
| `created_at` | TIMESTAMPTZ NOT NULL | Audit — creation time. |
| `updated_at` | TIMESTAMPTZ NOT NULL | Audit — last modification. |
| `deleted_at` | TIMESTAMPTZ NULL | **Soft delete** (NULL = live). |
| `created_by` | UUID NULL (FK users) | Actor who created. |
| `updated_by` | UUID NULL (FK users) | Actor who last updated. |
| `deleted_by` | UUID NULL (FK users) | Actor who soft-deleted. |
| `version` | INT NOT NULL DEFAULT 1 | **Optimistic locking** / row version. |

### 3.3 Content Columns (present on publishable / catalog / CMS tables)

| Column | Type | Purpose |
|---|---|---|
| `status` | ENUM | Lifecycle (e.g. `draft/pending/published/archived`). |
| `visibility` | ENUM (`public/private/unlisted`) | Access scope. |
| `slug` | CITEXT | URL-safe identifier, unique per scope. |
| `sort_order` | INT DEFAULT 0 | Manual ordering. |
| `seo_title` | VARCHAR(255) | SEO meta title. |
| `seo_description` | VARCHAR(500) | SEO meta description. |
| `seo_keywords` | VARCHAR(500) | Optional. |
| `og_image_id` | FK media | Open Graph image. |
| `meta` | JSONB | Extra SEO / OpenGraph / schema.org. |

### 3.4 Global Rules

- **Soft delete everywhere** business data can be referenced; partial unique indexes use `WHERE deleted_at IS NULL`.
- **All money** stored as `NUMERIC(14,2)` (or minor-unit BIGINT) **plus** a `currency_code` (CHAR(3)); never store money without its currency.
- **All timestamps** `TIMESTAMPTZ` in UTC; presentation timezone resolved at the edge.
- **Translatable text** lives in `*_translations` tables keyed by `(entity_id, language_code)` — see [Multi-Language](#10-multi-language-architecture).
- **Every FK** has a supporting index; composite indexes ordered by selectivity + query shape.
- **Enums** implemented as PostgreSQL enums or lookup tables where admin-editable (see [Appendix](#19-appendix--enumerations--status-codes)).

---

## 4. Domain Model & Entity Relationships

### 4.1 Bounded Contexts (module map)

| # | Context | Core tables |
|---|---|---|
| A | Identity & Access | `users`, `customers`, `staff_profiles`, `roles`, `permissions`, `sessions`, `password_resets`, `email_verifications`, `oauth_accounts`, `two_factor` |
| B | Merchant | `merchants`, `merchant_members`, `merchant_kyc`, `merchant_documents`, `payout_accounts` |
| C | Catalog / Property | `properties`, `property_types`, `property_amenities`, `property_media`, `property_policies`, `visa_services`, `transport_services`, `tours`, `activities` |
| D | Rooms & Inventory | `room_types`, `bed_types`, `rate_plans`, `inventory_calendar`, `availability`, `booking_holds` |
| E | Pricing & Promotion | `price_rules`, `seasonal_rates`, `taxes`, `coupons`, `coupon_redemptions`, `offers` |
| F | Booking | `bookings`, `booking_items`, `booking_guests`, `booking_taxes`, `booking_status_history` |
| G | Finance | `payments`, `transactions`, `invoices`, `refunds`, `wallets`, `wallet_transactions`, `ledger_entries`, `commissions`, `payout_requests`, `webhook_events`, `disputes` |
| H | Reviews | `reviews`, `review_responses`, `review_reports`, `ratings_summary`, `wishlists`, `wishlist_items` |
| I | Communication | `notifications`, `notification_preferences`, `messages`, `message_threads`, `support_tickets`, `ticket_messages` |
| J | CMS | `pages`, `page_blocks`, `menus`, `menu_items`, `blog_posts`, `blog_categories`, `faqs`, `faq_groups`, `banners`, `testimonials`, `partners`, `homepage_sections` |
| K | Media | `media`, `media_folders` |
| L | Localization | `languages`, `translations`, `currencies`, `exchange_rates` |
| M | Reference / Geo | `countries`, `cities`, `locations`, `amenities`, `facilities`, `attributes`, `cancellation_policies` |
| N | System | `settings`, `feature_flags`, `email_templates`, `sms_templates`, `push_templates`, `notification_templates`, `activity_logs`, `login_logs`, `api_logs`, `plans`, `merchant_subscriptions` |

### 4.2 Key Relationships (cardinalities)

- `merchants (1) ──< (N) properties` — a merchant owns many listings.
- `merchants (1) ──< (N) merchant_members >── (N) users` (staff) with per-membership `role_id`.
- `properties (1) ──< (N) room_types (1) ──< (N) rate_plans`.
- `room_types (1) ──< (N) inventory_calendar` (per-day rows) — the availability grain.
- `bookings (1) ──< (N) booking_items` — one booking can span multiple items (e.g. 2 rooms + 1 transport). Each `booking_item` references exactly one bookable (`property/room_type/rate_plan` or `transport/tour/activity/visa`).
- `bookings (1) ──< (N) booking_guests`, `(1) ──< (N) booking_taxes`, `(1) ──< (N) booking_status_history`.
- `bookings (1) ──< (N) payments`; `payments (1) ──< (N) refunds`.
- `bookings (1) ── (0..1) invoices`; `invoices (1) ──< (N) transactions`.
- `bookings (1) ── (0..1) reviews` (verified purchase); `reviews (1) ── (0..1) review_responses`.
- `roles (N) ──< role_permissions >── (N) permissions`; `users ──< user_roles`; staff roles scoped by realm (platform vs merchant).
- Every catalog/CMS entity `(1) ──< (N) *_translations` keyed by `language_code`.

### 4.3 Polymorphic bookable model (design decision)

Rather than nine parallel booking tables, StayOra uses **one `bookings` header + typed `booking_items`**. Each `booking_item` carries a `bookable_type` discriminant (`hotel_room | apartment | resort_room | shared_bed | convention_hall | transport | tour | activity | visa`) plus a `bookable_id` and a denormalized snapshot (title, unit price, currency, dates) so the booking is immutable against later catalog edits. Vertical-specific attributes for the item are stored in a typed `item_meta JSONB` validated per discriminant.

**Rationale:** aligns with the frontend's discriminated-union `Listing` type; keeps the booking ledger uniform for finance/reporting; avoids 9× duplication of booking/payment logic (DRY); allows mixed-cart bookings.

### 4.4 ER Diagram (textual overview)

```
users ──1:1── customers                     users ──1:1── staff_profiles
  │                                            │
  └──< user_roles >── roles ──< role_permissions >── permissions
                                            
merchants ──< merchant_members >── users
   │  └──1:1 merchant_kyc   └──< merchant_documents   └──< payout_accounts
   │
   └──< properties ──< room_types ──< rate_plans
             │              └──< inventory_calendar (per-day: price, allotment, min_stay)
             │              └──< booking_holds
             ├──< property_media / property_amenities / property_policies
             └── (transport_services | tours | activities | visa_services extend the property/service base)

bookings ──< booking_items      bookings ──< booking_guests
   │   └──< booking_taxes        └──< booking_status_history
   ├──< payments ──< refunds
   ├──1:1 invoices ──< transactions
   └──1:1 reviews ──1:1 review_responses

wallets ──< wallet_transactions        ledger_entries (double-entry)
commissions        payout_requests        webhook_events        disputes

CMS:  menus──<menu_items   pages──<page_blocks   blog_posts>──blog_categories
      faq_groups──<faqs    banners  testimonials  partners  homepage_sections
Localization: languages  currencies──<exchange_rates  translations
Geo: countries──<cities──<locations   amenities facilities attributes
System: settings feature_flags *_templates activity_logs login_logs api_logs
```

---

## 5. Data Dictionary (Tables)

> Every table below also carries the **Standard Columns** (§3.2). Publishable/catalog/CMS tables additionally carry **Content Columns** (§3.3). Only distinctive columns are repeated here. `PK`, `FK`, `UQ`, `IX` denote primary key, foreign key, unique constraint, index.

### 5.A — Identity & Access

#### `users`
Single account root for **every** human; `realm` separates the two auth systems.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| realm | ENUM(`customer`,`staff`) | NOT NULL, IX | Which auth system this account belongs to. |
| email | CITEXT | UQ(`realm`,`email`) WHERE deleted_at IS NULL | Login identifier. |
| phone | VARCHAR(20) | UQ(`realm`,`phone`) partial | Phone login. |
| password_hash | TEXT | NULL | Argon2id; NULL for social-only. |
| full_name | VARCHAR(150) | | |
| avatar_media_id | UUID | FK media | |
| locale | VARCHAR(10) | FK languages.code | Preferred language. |
| currency_code | CHAR(3) | FK currencies.code | Preferred currency. |
| timezone | VARCHAR(64) | | IANA tz. |
| is_active | BOOLEAN | DEFAULT true | |
| email_verified_at | TIMESTAMPTZ | NULL | |
| phone_verified_at | TIMESTAMPTZ | NULL | |
| last_login_at | TIMESTAMPTZ | NULL | |

**Indexes:** `ix_users_realm_active`, `uq_users_realm_email` (partial), `uq_users_realm_phone` (partial).

#### `customers`
Customer-specific profile (1:1 with a `realm='customer'` user).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK users, UQ | |
| gender | ENUM | NULL | |
| dob | DATE | NULL | |
| nationality | CHAR(2) | FK countries.iso2 | |
| loyalty_points | INT | DEFAULT 0 | |
| default_wallet_id | UUID | FK wallets | |
| marketing_opt_in | BOOLEAN | DEFAULT false | |

#### `staff_profiles`
Platform/merchant staff profile (1:1 with a `realm='staff'` user).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK users, UQ | |
| scope | ENUM(`platform`,`merchant`) | NOT NULL | Platform admin vs merchant staff. |
| merchant_id | UUID | FK merchants, NULL | NULL for platform staff. |
| job_title | VARCHAR(120) | | |
| is_super_admin | BOOLEAN | DEFAULT false | Bypasses permission checks. |

#### `roles`, `permissions`, and joins — see [RBAC §13](#13-authorization--rbac).

#### `sessions`
Refresh-token / device sessions (supports "Remember Me").

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| user_id | UUID | FK users, IX | |
| refresh_token_hash | TEXT | UQ | Rotating; store hash only. |
| device_label | VARCHAR(120) | | |
| ip | INET | | |
| user_agent | TEXT | | |
| remember_me | BOOLEAN | DEFAULT false | Controls refresh TTL. |
| expires_at | TIMESTAMPTZ | NOT NULL, IX | |
| revoked_at | TIMESTAMPTZ | NULL | |

#### Supporting auth tables (compact)

| Table | Key columns | Purpose |
|---|---|---|
| `email_verifications` | user_id FK, token_hash UQ, expires_at | Email confirm links. |
| `password_resets` | user_id FK, token_hash UQ, expires_at, used_at | Reset flow. |
| `oauth_accounts` | user_id FK, provider, provider_uid, UQ(provider,provider_uid) | Social login (future-ready). |
| `two_factor` | user_id FK UQ, secret_encrypted, enabled_at, recovery_codes JSONB | 2FA (future-ready). |
| `otp_codes` | user_id FK, channel, code_hash, expires_at, attempts | OTP login (future-ready). |

### 5.B — Merchant

#### `merchants`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| owner_user_id | UUID | FK users | Merchant owner. |
| legal_name | VARCHAR(200) | NOT NULL | |
| display_name | VARCHAR(200) | | Public brand. |
| slug | CITEXT | UQ partial | Storefront URL. |
| email / phone | | | Business contacts. |
| country_id | UUID | FK countries | |
| default_currency | CHAR(3) | FK currencies | Merchant payout currency. |
| commission_rate | NUMERIC(5,2) | NULL | Per-merchant override (else global/vertical). |
| verification_status | ENUM(`unverified`,`pending`,`verified`,`rejected`) | IX | KYC gate. |
| status | ENUM(`active`,`suspended`,`closed`) | IX | |
| rating_avg / rating_count | | denormalized | Aggregate over listings. |

#### Merchant support tables

| Table | Key columns | Purpose |
|---|---|---|
| `merchant_members` | merchant_id FK, user_id FK, role_id FK, status, UQ(merchant_id,user_id) | Staff membership + scoped role. |
| `merchant_kyc` | merchant_id FK UQ, business_reg_no, tax_id, doc refs, reviewed_by, reviewed_at, status | KYC record. |
| `merchant_documents` | merchant_id FK, media_id FK, doc_type, status | Uploaded verification docs. |
| `payout_accounts` | merchant_id FK, method(`bank`,`paypal`,`mobile`), details_encrypted JSONB, is_default | Where payouts go. |

### 5.C — Catalog / Property

#### `properties`
The unifying catalog entity for **all place-based verticals** (hotel, apartment, resort, shared room, convention hall). Service verticals (transport/tour/activity/visa) reference it optionally or use their own service tables that share the base columns.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| merchant_id | UUID | FK merchants, IX | Owner. |
| vertical | ENUM(9 verticals) | NOT NULL, IX | Discriminant. |
| property_type_id | UUID | FK property_types | e.g. "Boutique hotel". |
| title | VARCHAR(200) | NOT NULL | Base (translatable via `translations`). |
| slug | CITEXT | UQ partial | |
| description | TEXT | | |
| star_rating | SMALLINT | NULL | Official class (hotels/resorts). |
| country_id / city_id / location_id | UUID | FK geo | |
| address | VARCHAR(300) | | |
| lat / lng | NUMERIC(9,6) | IX (geo) | Map + proximity search. |
| base_currency | CHAR(3) | FK currencies | Listing's native pricing currency. |
| min_price | NUMERIC(14,2) | denormalized, IX | Cheapest bookable — for sort/filter. |
| rating_avg | NUMERIC(3,2) | denormalized, IX | |
| rating_count | INT | denormalized | |
| cancellation_policy_id | UUID | FK cancellation_policies | Default policy. |
| checkin_from / checkout_until | TIME | | Check-in rules. |
| status / visibility | ENUM | IX | Draft→pending→published. |

**Indexes:** `ix_properties_vertical_city_status`, `ix_properties_merchant`, `ix_properties_min_price`, `ix_properties_rating`, GiST on `(lat,lng)` for geo, `uq_properties_slug` partial.

#### Vertical extension tables
Each holds only vertical-specific attributes (mirrors the frontend's per-vertical types), linked 1:1 to `properties` where place-based, or standalone service tables sharing the base contract.

| Table | Distinctive columns |
|---|---|
| `hotel_details` | property_id UQ, board_type |
| `apartment_details` | property_id UQ, bedrooms, bathrooms, max_guests, size_sqm |
| `resort_details` | property_id UQ, board_type |
| `shared_room_details` | property_id UQ, dorm_type, beds_total |
| `convention_hall_details` | property_id UQ, capacity, area_sqm, layouts JSONB |
| `transport_services` | merchant_id, transport_type, seats, route_from, route_to, duration_hours, base_price |
| `tours` | merchant_id, duration_days, group_size, tour_type, itinerary → `tour_itinerary_steps` |
| `activities` | merchant_id, duration_hours, category |
| `visa_services` | merchant_id, destination_country_id, processing_time, validity, entry_type, requirements JSONB |

#### Catalog support tables

| Table | Key columns | Purpose |
|---|---|---|
| `property_types` | name, vertical, slug, sort_order | Admin-managed types. |
| `amenities` | name, icon, category | Master amenity list. |
| `facilities` | name, icon | Master facility list. |
| `attributes` | key, label, data_type, options JSONB | Dynamic EAV-style attributes. |
| `property_amenities` | property_id FK, amenity_id FK, UQ(property_id,amenity_id) | M:N. |
| `property_facilities` | property_id FK, facility_id FK | M:N. |
| `property_attribute_values` | property_id FK, attribute_id FK, value | EAV values. |
| `property_media` | property_id FK, media_id FK, role(`cover`,`gallery`,`video`,`doc`), sort_order | Gallery/images/videos/documents. |
| `property_policies` | property_id FK, policy_type, content | Extra policies. |
| `bed_types` | name, capacity | Reference. |
| `room_bed_config` | room_type_id FK, bed_type_id FK, quantity | Beds per room. |

### 5.D — Rooms & Inventory

#### `room_types`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| property_id | UUID | FK properties, IX | |
| name | VARCHAR(150) | | e.g. "Deluxe Double". |
| max_adults / max_children | SMALLINT | | Capacity. |
| max_occupancy | SMALLINT | | |
| extra_bed_allowed | BOOLEAN | | |
| extra_bed_price | NUMERIC(14,2) | | |
| size_sqm | INT | NULL | |
| total_units | INT | NOT NULL | Physical inventory count. |

#### `rate_plans`
A sellable price configuration on a room type / service (e.g. "Room only", "Breakfast included, non-refundable").

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| room_type_id | UUID | FK room_types, IX | (Nullable for service verticals; then FK to service table.) |
| name | VARCHAR(150) | | |
| base_price | NUMERIC(14,2) | NOT NULL | Default nightly/unit price. |
| currency_code | CHAR(3) | FK currencies | |
| cancellation_policy_id | UUID | FK | Overrides property default. |
| includes_breakfast | BOOLEAN | | Example inclusion flag. |
| is_refundable | BOOLEAN | | |
| min_stay / max_stay | SMALLINT | | Nights bounds. |

#### `inventory_calendar`
Per-day availability & price grain — the heart of the booking engine.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGINT | PK | |
| room_type_id | UUID | FK, IX | |
| rate_plan_id | UUID | FK, NULL | If price varies per plan. |
| date | DATE | NOT NULL | |
| allotment | INT | NOT NULL | Units available that date. |
| booked | INT | DEFAULT 0 | Units already sold. |
| price | NUMERIC(14,2) | | Overrides base (dynamic/seasonal). |
| min_stay | SMALLINT | NULL | Date-specific override. |
| is_closed | BOOLEAN | DEFAULT false | Stop-sell. |
| version | INT | | Optimistic lock for concurrent booking. |

**Constraints/Indexes:** `uq_inventory_room_rate_date (room_type_id, rate_plan_id, date)`; `ix_inventory_date` for range scans; check `booked <= allotment`. **Partitioned by month** on `date` for scale.

#### `booking_holds`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| room_type_id / rate_plan_id | UUID | FK | |
| date_from / date_to | DATE | | Range held. |
| quantity | INT | | Units held. |
| session_id | UUID | IX | Cart/session owning the hold. |
| expires_at | TIMESTAMPTZ | IX | TTL (Redis mirrors for fast expiry). |

> Availability check = `allotment - booked - active_holds >= requested` across every date in the range.

### 5.E — Pricing & Promotion

| Table | Key columns | Purpose |
|---|---|---|
| `price_rules` | scope(property/room/rate_plan), rule_type(`dynamic`,`length_of_stay`,`occupancy`,`early_bird`,`last_minute`), config JSONB, priority, active window | Dynamic pricing engine rules. |
| `seasonal_rates` | rate_plan_id FK, season_type(`seasonal`,`weekend`,`holiday`), date_from, date_to, weekdays, price/modifier | Seasonal/weekend/holiday pricing. |
| `taxes` | name, scope(country/vertical/property), rate_percent OR flat, is_inclusive, applies_to | Tax rules. |
| `coupons` | code UQ, discount_type(`percent`,`flat`), value, max_uses, per_user_limit, min_spend, valid_from, valid_to, vertical/merchant scope, status | Promo codes. |
| `coupon_redemptions` | coupon_id FK, user_id FK, booking_id FK, amount, UQ per policy | Redemption ledger. |
| `offers` | title, banner_media_id, discount config, target scope, schedule, sort_order | Merchandised deals. |

### 5.F — Booking

#### `bookings` (header)
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| booking_code | VARCHAR(16) | UQ | Human reference (e.g. `SO-8F3K2Q`). |
| customer_id | UUID | FK customers, IX | |
| merchant_id | UUID | FK merchants, IX | Denormalized for merchant queries. |
| status | ENUM (booking states) | IX | See §6.4. |
| payment_status | ENUM(`unpaid`,`pending`,`paid`,`partially_refunded`,`refunded`) | IX | |
| currency_code | CHAR(3) | FK | Charge currency. |
| subtotal | NUMERIC(14,2) | | Sum of items. |
| discount_total | NUMERIC(14,2) | | Coupons/offers. |
| tax_total | NUMERIC(14,2) | | |
| service_fee | NUMERIC(14,2) | | Platform fee. |
| grand_total | NUMERIC(14,2) | | Amount charged. |
| commission_amount | NUMERIC(14,2) | | Platform cut (snapshot). |
| coupon_id | UUID | FK, NULL | |
| cancellation_policy_snapshot | JSONB | | Policy captured at booking time. |
| booked_at / confirmed_at / cancelled_at | TIMESTAMPTZ | | Timeline. |
| channel | ENUM(`web`,`admin`,`api`) | | Source. |

**Indexes:** `ix_bookings_customer_status`, `ix_bookings_merchant_status`, `ix_bookings_created_at` (partition key), `uq_bookings_code`.

#### `booking_items`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK | |
| booking_id | UUID | FK bookings, IX | |
| bookable_type | ENUM(9 types) | NOT NULL | Discriminant. |
| bookable_id | UUID | | Property/room/service ref. |
| rate_plan_id | UUID | FK, NULL | |
| title_snapshot | VARCHAR(200) | | Immutable label. |
| unit_price | NUMERIC(14,2) | | Snapshot. |
| quantity | INT | | Rooms/seats/persons/units. |
| date_from / date_to | DATE | NULL | Stay/travel window. |
| nights_or_units | INT | | Billable quantity. |
| adults / children / extra_beds / extra_persons | SMALLINT | | Capacity breakdown. |
| line_total | NUMERIC(14,2) | | |
| item_meta | JSONB | | Vertical-specific (route, visa applicant, itinerary…). |

#### Booking support tables

| Table | Key columns | Purpose |
|---|---|---|
| `booking_guests` | booking_id FK, full_name, type(`adult`,`child`,`infant`), doc info JSONB | Guest/passenger/applicant manifest. |
| `booking_taxes` | booking_id FK, tax_id FK, label, amount | Tax breakdown snapshot. |
| `booking_status_history` | booking_id FK, from_status, to_status, actor_user_id, reason, created_at | Immutable timeline / audit. |

### 5.G — Finance

| Table | Key columns | Purpose |
|---|---|---|
| `payments` | booking_id FK, gateway, intent_id UQ, amount, currency, status(`initiated`,`authorized`,`captured`,`failed`,`refunded`), method, idempotency_key UQ, raw_response JSONB | Gateway payment attempts. |
| `refunds` | payment_id FK, booking_id FK, amount, reason, destination(`gateway`,`wallet`), status, approved_by, resolved_at | Refund records. |
| `invoices` | booking_id FK UQ, invoice_no UQ, issued_at, billing JSONB, pdf_media_id, totals | Customer invoice. |
| `transactions` | invoice_id/booking_id FK, type(`charge`,`refund`,`payout`,`commission`,`adjustment`), amount, currency, direction(`debit`,`credit`), reference | Financial ledger line. |
| `ledger_entries` | account(`platform`,`merchant:<id>`,`customer:<id>`), booking_id, debit, credit, balance_after, currency | **Double-entry** book. |
| `commissions` | booking_id FK, merchant_id FK, base_amount, rate, amount, status | Commission accrual. |
| `wallets` | owner_type(`customer`,`merchant`), owner_id, currency, balance, is_active, UQ(owner_type,owner_id,currency) | Balances. |
| `wallet_transactions` | wallet_id FK, type, amount, direction, reference, balance_after | Wallet movements. |
| `payout_requests` | merchant_id FK, amount, currency, payout_account_id FK, status(`requested`,`approved`,`processing`,`paid`,`rejected`), processed_at | Merchant withdrawals. |
| `webhook_events` | provider, event_id UQ, type, payload JSONB, signature_verified, processed_at | Idempotent webhook store. |
| `disputes` | booking_id FK, payment_id FK, opened_by, reason, status, resolution | Chargebacks/disputes. |

### 5.H — Reviews & Wishlist

| Table | Key columns | Purpose |
|---|---|---|
| `reviews` | booking_id FK UQ, property_id FK, customer_id FK, rating SMALLINT(1–5), sub_ratings JSONB, title, body, status, published_at | Verified-purchase review. |
| `review_responses` | review_id FK UQ, merchant_id FK, body | Single merchant reply. |
| `review_reports` | review_id FK, reporter_user_id, reason, status | Abuse moderation. |
| `ratings_summary` | property_id FK UQ, avg, count, breakdown JSONB | Denormalized aggregates. |
| `wishlists` | customer_id FK, name, is_default | Saved collections. |
| `wishlist_items` | wishlist_id FK, property_id FK, UQ(wishlist_id,property_id) | Saved listings. |

### 5.I — Communication

| Table | Key columns | Purpose |
|---|---|---|
| `notifications` | user_id FK, type, title, body, data JSONB, channel, is_read, read_at | In-app + delivery record. Partitioned by month. |
| `notification_preferences` | user_id FK, category, email/sms/push/inapp BOOLEAN | Per-channel opt-in. |
| `message_threads` | subject, booking_id FK NULL, participants | Customer↔merchant chat. |
| `messages` | thread_id FK, sender_user_id, body, attachments JSONB, read_at | Chat messages. |
| `support_tickets` | code UQ, opener_user_id, subject, category, priority, status, assignee_user_id | Helpdesk. |
| `ticket_messages` | ticket_id FK, sender_user_id, body, attachments JSONB | Ticket replies. |

### 5.J — CMS

| Table | Key columns | Purpose |
|---|---|---|
| `pages` | title, slug UQ, template, status, visibility, SEO cols | Dynamic pages (About/Contact/Terms/Privacy/custom). |
| `page_blocks` | page_id FK, block_type, payload JSONB, sort_order | Composable page sections. |
| `homepage_sections` | section_key, config JSONB, is_enabled, sort_order | Homepage builder. |
| `menus` | key UQ (`header`,`footer`,…), name | Navigation containers. |
| `menu_items` | menu_id FK, parent_id FK (self), label, url/route, icon, sort_order, target | Nested menus/submenus. |
| `blog_categories` | name, slug UQ, sort_order | Blog taxonomy. |
| `blog_posts` | title, slug UQ, category_id FK, author_user_id, cover_media_id, excerpt, body JSONB (block union), read_minutes, published_at, status, SEO | Blog. |
| `blog_comments` | post_id FK, author info, body, status | Comments (moderated). |
| `blog_post_tags` | post_id FK, tag | Tags. |
| `faq_groups` | title, icon, sort_order | FAQ grouping. |
| `faqs` | group_id FK, question, answer, sort_order | FAQ items. |
| `banners` | placement, media_id, link_url, schedule, sort_order | Promotional banners. |
| `testimonials` | author, role, avatar_media_id, quote, rating, sort_order | Testimonials. |
| `partners` | name, logo_media_id, url, sort_order | Partner logos. |

### 5.K — Media

| Table | Key columns | Purpose |
|---|---|---|
| `media` | folder_id FK, disk, path, url, mime, size, width, height, alt, title, uploaded_by | Media library asset. |
| `media_folders` | parent_id FK (self), name, path | Folder tree. |

### 5.L — Localization

| Table | Key columns | Purpose |
|---|---|---|
| `languages` | code UQ (BCP-47), name, native_name, is_rtl, is_default, is_active, fallback_code FK, sort_order | Dynamic languages. |
| `translations` | entity_type, entity_id, field, language_code FK, value, UQ(entity_type,entity_id,field,language_code) | Polymorphic content translations. |
| `ui_strings` | key, language_code FK, value, UQ(key,language_code) | Static UI i18n strings. |
| `currencies` | code UQ (ISO-4217), symbol, name, decimals, is_default, is_active, sort_order | Dynamic currencies. |
| `exchange_rates` | base_code FK, quote_code FK, rate, source, fetched_at, UQ(base,quote,fetched_at) | Time-series FX. |

### 5.M — Reference / Geo

| Table | Key columns | Purpose |
|---|---|---|
| `countries` | iso2 UQ, iso3, name, phone_code, currency_code, is_active | Countries. |
| `cities` | country_id FK, name, slug, lat, lng, is_active | Cities. |
| `locations` | city_id FK, name, type(`area`,`landmark`,`airport`), lat, lng | Sub-locations. |
| `cancellation_policies` | name, rules JSONB (tiers: days_before→refund_percent), is_default | Reusable policies. |

### 5.N — System

| Table | Key columns | Purpose |
|---|---|---|
| `settings` | group, key UQ(group,key), value JSONB, data_type, is_public | Application settings (no hardcoding). |
| `feature_flags` | key UQ, is_enabled, rollout JSONB, description | Feature toggles. |
| `email_templates` / `sms_templates` / `push_templates` | key, language_code FK, subject, body, variables JSONB, UQ(key,language_code) | Localized templates. |
| `notification_templates` | key, channels JSONB, event, is_active | Event→template mapping. |
| `activity_logs` | actor_user_id, action, entity_type, entity_id, changes JSONB, ip, created_at | Audit trail. Partitioned. |
| `login_logs` | user_id FK, ip, user_agent, result(`success`,`failed`), created_at | Auth audit. |
| `api_logs` | request_id, user_id, method, path, status, latency_ms, ip, created_at | API audit / rate-limit forensics. Partitioned. |
| `plans` | name, price, interval, features JSONB, limits JSONB | Merchant subscription plans (future). |
| `merchant_subscriptions` | merchant_id FK, plan_id FK, status, current_period_end | SaaS subscriptions (future). |

---

## 6. Booking Engine

### 6.1 Design goal

One engine, nine verticals. The engine is composed of vertical **strategies** that plug into a common pipeline. Each strategy declares its **date model**, **capacity model**, **inventory model**, and **pricing inputs** — everything else (holds, quoting, payment, status, timeline) is shared. This mirrors the frontend's `BOOKING_CONFIG` per-vertical map.

### 6.2 Per-vertical booking matrix

| Vertical | Date model | Unit sold | Inventory grain | Capacity fields | Key extras |
|---|---|---|---|---|---|
| Hotels | Date range (nights) | Room-night per rate plan | `room_types` × date | adults, children, extra bed | board type |
| Apartments | Date range (nights) | Whole unit-night | unit × date | guests, extra person | min stay |
| Resorts | Date range (nights) | Room-night per rate plan | room × date | adults, children | board type |
| Shared Rooms | Date range (nights) | **Per bed**-night | beds × date | guests | dorm type |
| Convention Hall | Single day / slot | Hall-day/slot | hall × date/slot | capacity, layout | setup add-ons |
| Transport | Single date + time | Seat or whole vehicle | vehicle × date | passengers | route from→to |
| Tours | Start date | Seat per departure | departure × capacity | group size, adults/children | itinerary days |
| Activities | Date + time slot | Ticket per slot | slot × capacity | participants | session duration |
| Visa | Application date | Application (no calendar) | none (SLA-based) | applicants | processing time, requirements |

### 6.3 Booking pipeline (shared)

```
1. RESOLVE      — load bookable + rate plan + policy (respect visibility/status)
2. AVAILABILITY — strategy checks inventory_calendar across the range/slot
                  available = allotment − booked − active_holds ≥ requested
3. HOLD         — create booking_holds (TTL) + Redis key; optimistic version bump
4. QUOTE        — Pricing Engine computes subtotal, seasonal/dynamic, extras,
                  discounts (coupon/offer), taxes, service fee → grand_total
5. CREATE       — bookings(PENDING_PAYMENT) + booking_items + guests + taxes snapshot
6. PAY          — payment intent (idempotent); await capture (webhook)
7. CONFIRM      — on capture: decrement inventory (booked += qty), release hold,
                  status→CONFIRMED, invoice, commission accrual, notifications
8. TIMELINE     — every transition appended to booking_status_history
```

### 6.4 Booking status machine

`DRAFT → PENDING_PAYMENT → CONFIRMED → IN_PROGRESS → COMPLETED`
Side transitions: `PENDING_PAYMENT → EXPIRED` (hold TTL), `CONFIRMED → CANCELLED → REFUND_PENDING → REFUNDED`, `CONFIRMED → NO_SHOW`, `PENDING_PAYMENT → REJECTED` (merchant/instant-book off). Each transition is guarded (only legal transitions allowed) and recorded.

**Payment status** (independent axis): `unpaid → pending → paid → partially_refunded → refunded`.

### 6.5 Concurrency & overbooking safety

- Availability decrement runs inside a DB transaction using the `inventory_calendar.version` optimistic lock; a lost update retries the check.
- `booking_holds` + Redis TTL prevent two carts from selling the last unit; `CHECK (booked <= allotment)` is the last-resort guardrail.
- Idempotency keys on create-booking and payment-intent prevent double submission.

### 6.6 Booking timeline (customer-visible)

Derived from `booking_status_history`: Booked → Payment confirmed → Confirmed by merchant → Upcoming → In progress (checked in) → Completed, with cancellation/refund branches. Exposed via `GET /bookings/{id}/timeline`.

---

## 7. Pricing Engine

### 7.1 Price resolution order (deterministic)

```
base_price (rate_plan)
  → date override (inventory_calendar.price)
  → seasonal_rates (season/weekend/holiday modifier or absolute)
  → price_rules (dynamic: LOS, occupancy, early-bird, last-minute) by priority
  → × nights/units
  → + extras (extra bed, extra person, add-ons)
  → − discounts (coupon → offer; best or stacking per config)
  → + taxes (inclusive already embedded; exclusive added)
  → + platform service_fee
  = grand_total (in listing base_currency → converted to charge currency)
```

### 7.2 Rules

- **Seasonal / Weekend / Holiday** — `seasonal_rates` matched by date/weekday; either absolute price or percentage modifier.
- **Dynamic pricing** — `price_rules` with `config` (e.g. occupancy>80% → +15%; booked <48h out → last-minute discount). Applied by ascending `priority`; each rule is pure and auditable.
- **Taxes** — `is_inclusive` taxes are shown but not added; exclusive taxes added and itemized into `booking_taxes`.
- **Discounts** — coupon validated (window, min spend, per-user limit, scope); offers auto-applied; stacking governed by a setting.
- **Everything snapshotted** onto the booking so later catalog/price edits never mutate historical bookings.

### 7.3 Quote endpoint contract

A **quote is not a booking**. `POST /bookings/quote` returns a fully itemized price breakdown + a short-lived `quote_token` that the create-booking call references, guaranteeing the customer pays what they were quoted (or gets re-quoted if inventory/price changed).

---

## 8. Payments, Refunds, Wallet & Commission

### 8.1 Payment provider abstraction

A `PaymentProvider` interface (create intent, capture, refund, verify webhook) with adapters (Stripe, PayPal, SSLCommerz, bKash…). The active providers and keys come from `settings` — **not hardcoded**. Each attempt persists to `payments` with an idempotency key; provider raw responses stored for audit.

### 8.2 Money flow (double-entry)

On capture: `ledger_entries` credits the platform clearing account and records the customer charge; commission accrues (`commissions`), the merchant payable is credited to `wallets(owner=merchant)`. On payout, the merchant wallet is debited and a `payout_request`/`transaction(type=payout)` is recorded. Every movement is balanced (debit = credit).

### 8.3 Refunds

Refundable amount computed from the booking's **policy snapshot** (tiered by days-before-check-in). Auto-approved when within policy; otherwise routed to Admin/Merchant approval. Refund destination is gateway or wallet. Commission and payable entries are reversed proportionally. Partial refunds set `payment_status=partially_refunded`.

### 8.4 Commission

Resolution: `merchant.commission_rate` → vertical rule → global rule (`settings`). Snapshot onto `bookings.commission_amount` at confirmation so rate changes don't rewrite history.

### 8.5 Wallet

Customers and merchants each have per-currency wallets. Customer wallet funded by refunds/loyalty; usable at checkout. Merchant wallet accrues earnings; drained by payouts. All changes go through `wallet_transactions` with `balance_after` for tamper-evident history.

---

## 9. Dynamic CMS

Everything the storefront renders is database-driven — **nothing hardcoded**, matching the brief and the frontend's config-driven sections.

| Manageable area | Backed by |
|---|---|
| Header / Footer / Navigation | `menus` + `menu_items` (nested, per placement) |
| Homepage sections & order | `homepage_sections` (section_key + config + sort) |
| Pages (About/Contact/Terms/Privacy/custom) | `pages` + `page_blocks` (block union payloads) |
| Blog | `blog_posts` + `blog_categories` + `blog_comments` + tags |
| FAQ | `faq_groups` + `faqs` |
| Banners / Testimonials / Partners | dedicated tables |
| Media | `media` + `media_folders` |
| SEO (title, description, keywords, OG, meta image, schema.org) | Content Columns + `meta` JSONB on every publishable entity |

**Block model:** `page_blocks.block_type` (hero, richtext, gallery, faq, cta, listing-rail, testimonial…) with a validated `payload` JSONB per type — the backend mirror of the frontend's discriminated block unions. Content is translatable via `translations`. Draft/preview supported via `status` + a signed preview token.

---

## 10. Multi-Language Architecture

### 10.1 Model

- `languages` is fully dynamic (create/enable/disable, set default, set `fallback_code`, `is_rtl`).
- **Two translation layers:**
  1. `ui_strings` — static interface strings by `key` + `language_code`.
  2. `translations` — polymorphic per-record content: `(entity_type, entity_id, field, language_code) → value`.
- Resolution: requested locale → record translation → fallback language → base column value. Missing keys logged for translators.

### 10.2 Delivery

- Locale determined by: explicit query/header (`Accept-Language` / `?lang=`) → user preference → default language.
- API returns already-resolved localized fields (per request locale) and exposes `GET /i18n/{lang}` bundles for the client.
- **RTL** exposed via `languages.is_rtl` so the frontend flips layout.
- Admin translation UI backed by `GET/PUT /admin/translations` with per-entity coverage reporting.

---

## 11. Multi-Currency Architecture

- `currencies` dynamic (unlimited; enable/disable, default, decimals, symbol).
- `exchange_rates` time-series, refreshed by a scheduled worker from a configured FX source; historical rates retained for accurate reporting.
- **Pricing currency vs display currency:** each listing prices in its `base_currency`; the customer's selected currency is a **display/checkout** conversion using the latest rate. The **charge currency** and the rate used are snapshotted on the booking/payment for auditability.
- Per-property currency (merchant sets `base_currency`), user-selected currency (`users.currency_code`), and guest currency via `?currency=` are all supported.
- Money is never converted silently in the ledger — settlement happens in the merchant's payout currency with recorded FX.

---

## 12. Authentication

**Two fully separate realms** (`users.realm`) with separate login endpoints, guards, token audiences, and dashboards.

| | Customer realm | Staff realm (Merchant + Admin) |
|---|---|---|
| Login base | `/api/v1/auth/*` | `/api/v1/panel/auth/*` |
| Token audience | `aud: customer` | `aud: staff` |
| Guard | `CustomerGuard` | `StaffGuard` (+ RBAC) |
| Registration | Self-serve | Merchant self-serve (owner) / Admin-invited staff |
| Dashboard | Storefront account | Merchant panel / Admin panel |

### 12.1 Mechanism

- **Access token** (JWT, short-lived ~15 min) + **refresh token** (opaque, rotating, stored hashed in `sessions`).
- **Remember Me** extends refresh TTL and device retention.
- Passwords hashed with **Argon2id**; reset via `password_resets` (single-use, expiring).
- **Email verification** (`email_verifications`) gates sensitive actions.
- Supported now: **email login, phone login**. Future-ready (schema present, endpoints stubbed): **social login** (`oauth_accounts`), **OTP** (`otp_codes`), **2FA** (`two_factor`).
- Login attempts + results audited in `login_logs`; rate-limited; lockout after N failures.

### 12.2 Token payload (claims)

`sub` (user id), `realm`, `aud`, `merchant_id` (staff), `roles` (ids), `perm_hash` (permission-set fingerprint for cache busting), `sid` (session), `iat`, `exp`.

---

## 13. Authorization & RBAC

Fully dynamic — roles, permissions, and assignments live in the database; **no privilege is hardcoded** (except `staff_profiles.is_super_admin` which bypasses checks).

### 13.1 Tables

| Table | Key columns | Purpose |
|---|---|---|
| `roles` | name, slug UQ, scope(`platform`,`merchant`,`customer`), is_system, description | Dynamic roles per realm. |
| `permissions` | key UQ (`module.action`, e.g. `booking.cancel`), module, description | Atomic permissions. |
| `role_permissions` | role_id FK, permission_id FK, UQ | Role→permission. |
| `user_roles` | user_id FK, role_id FK, merchant_id FK NULL, UQ | User→role (merchant-scoped for staff). |
| `menu_permissions` | menu_item_id FK, permission_id FK | Menu visibility. |
| `route_permissions` | route_key, permission_id FK | Route guarding. |

### 13.2 Permission granularity (per brief)

- **Menu permission** — which admin/merchant menu items render.
- **Route permission** — which panel routes are reachable.
- **API permission** — enforced by a guard mapping endpoint → required permission key.
- **Action permission** — fine-grained (`booking.refund`, `property.publish`).
- **Field permission (future-ready)** — optional column-level masking via a `field_permissions` table.

### 13.3 Enforcement

A guard resolves the user's effective permission set (roles → permissions), cached in Redis keyed by `perm_hash`. Merchant staff permissions are **scoped to their `merchant_id`** — a Finance staffer of Merchant A cannot act on Merchant B. Super Admin bypasses. Every denied attempt is logged.

### 13.4 Seed roles

Platform: `super_admin`, `admin`, `finance`, `content_editor`, `support`. Merchant: `owner`, `manager`, `front_desk`, `finance`. Customer realm uses an implicit `customer` role. All editable post-seed.

---

## 14. API Design — Conventions

> **Design only. No implementation.** These conventions apply to every endpoint in §15.

### 14.1 Base & versioning

- Base URL: `/api/v1`. Version in the path; breaking changes bump the version.
- Two surfaces: **Storefront** (`/api/v1/...`, customer realm) and **Panel** (`/api/v1/panel/...`, staff realm). Some resources are read-only public.

### 14.2 Standards

- JSON only (`Content-Type: application/json`), UTF-8. `snake_case` fields.
- Auth via `Authorization: Bearer <access_token>`.
- `Accept-Language` + optional `X-Currency` headers select locale/currency.
- `Idempotency-Key` header required on POST that create money/bookings.
- Correlation via `X-Request-Id` (echoed; stored in `api_logs`).

### 14.3 Response envelope

```jsonc
// success
{ "success": true, "data": { ... }, "meta": { ... } }
// list
{ "success": true, "data": [ ... ],
  "meta": { "page": 1, "per_page": 20, "total": 137, "total_pages": 7 } }
// error
{ "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "…",
             "details": [ { "field": "email", "message": "is required" } ] } }
```

### 14.4 Pagination · Filtering · Sorting · Searching (list endpoints)

| Concern | Convention | Example |
|---|---|---|
| Pagination | `?page=&per_page=` (default 20, max 100); cursor `?cursor=` for hot lists | `?page=2&per_page=24` |
| Filtering | `?filter[field]=value`, ranges `filter[price][gte]` | `?filter[city_id]=..&filter[price][lte]=200` |
| Sorting | `?sort=field` / `?sort=-field` (desc), CSV multi | `?sort=-rating_avg,min_price` |
| Searching | `?q=` full-text over indexed fields | `?q=beach resort` |
| Field select | `?fields=id,title,min_price` | sparse responses |
| Includes | `?include=media,amenities` | relation expansion |

### 14.5 HTTP status usage

`200` OK · `201` Created · `202` Accepted (async) · `204` No Content · `400` validation · `401` unauthenticated · `403` forbidden (RBAC) · `404` not found · `409` conflict (e.g. inventory) · `422` semantic validation · `429` rate limited · `500` server.

### 14.6 Standard error codes

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INVENTORY_UNAVAILABLE`, `PRICE_CHANGED`, `PAYMENT_FAILED`, `RATE_LIMITED`, `IDEMPOTENCY_REPLAY`, `INTERNAL_ERROR`.

### 14.7 Spec format used below

Each endpoint lists: **Method · URL · Purpose · Auth · Permission · Request/Query · Response · Validation · Errors**. Common list params (§14.4) are implied on any `GET` collection unless narrowed.

---

## 15. API Reference by Module

### 15.1 Authentication

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/register` | Customer sign-up | Public |
| POST | `/auth/login` | Customer email/phone login | Public |
| POST | `/auth/refresh` | Rotate tokens | Refresh token |
| POST | `/auth/logout` | Revoke session | Customer |
| POST | `/auth/verify-email` | Confirm email token | Public |
| POST | `/auth/forgot-password` | Send reset link | Public |
| POST | `/auth/reset-password` | Set new password | Public |
| GET | `/auth/me` | Current customer profile | Customer |
| POST | `/auth/social/{provider}` | Social login (future) | Public |
| POST | `/auth/otp/request` · `/auth/otp/verify` | OTP (future) | Public |
| POST | `/panel/auth/login` | Staff (merchant/admin) login | Public(staff) |
| POST | `/panel/auth/refresh` · `/panel/auth/logout` | Staff session | Staff |
| GET | `/panel/auth/me` | Current staff + permissions | Staff |

**Detailed — `POST /auth/register`**
- **Purpose:** create a customer account.
- **Auth/Permission:** Public / none.
- **Request:** `{ full_name, email, phone?, password, currency_code?, locale?, marketing_opt_in? }`
- **Validation:** email format + unique in customer realm; password ≥ 8 with complexity; phone E.164; at least one of email/phone.
- **Response `201`:** `{ user, access_token, refresh_token, expires_in }` (+ email verification dispatched).
- **Errors:** `400 VALIDATION_ERROR`, `409 CONFLICT` (email/phone exists), `429`.

**Detailed — `POST /auth/login`**
- **Request:** `{ identifier (email|phone), password, remember_me? }`
- **Response `200`:** `{ user, access_token, refresh_token, expires_in }`.
- **Errors:** `401 UNAUTHENTICATED` (bad creds / unverified), `429` (lockout). Logged to `login_logs`.

### 15.2 Users (Customer self-service)

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| GET/PATCH | `/me/profile` | View/update profile | Customer |
| PATCH | `/me/preferences` | Locale, currency, notifications | Customer |
| POST | `/me/change-password` | Change password | Customer |
| GET | `/me/bookings` | My bookings (filter by status) | Customer |
| GET | `/me/wallet` | Wallet balance + transactions | Customer |
| GET/POST/DELETE | `/me/wishlists` · `/me/wishlists/{id}/items` | Wishlist mgmt | Customer |
| GET | `/me/notifications` · PATCH `/{id}/read` | Inbox | Customer |
| GET/POST | `/me/support-tickets` | Support | Customer |

### 15.3 Users & Staff (Panel)

| Method | URL | Purpose | Permission |
|---|---|---|---|
| GET | `/panel/users` | List platform users | `user.read` |
| POST | `/panel/users` | Invite staff | `user.create` |
| GET/PATCH | `/panel/users/{id}` | View/update | `user.read`/`user.update` |
| PATCH | `/panel/users/{id}/status` | Activate/suspend | `user.update` |
| DELETE | `/panel/users/{id}` | Soft delete | `user.delete` |

### 15.4 Roles & Permissions (RBAC)

| Method | URL | Purpose | Permission |
|---|---|---|---|
| GET/POST | `/panel/roles` | List/create role | `role.read`/`role.create` |
| GET/PATCH/DELETE | `/panel/roles/{id}` | Manage role | `role.*` |
| PUT | `/panel/roles/{id}/permissions` | Assign permissions | `role.assign` |
| GET | `/panel/permissions` | List all permissions | `role.read` |
| PUT | `/panel/users/{id}/roles` | Assign roles to user | `role.assign` |

**Detailed — `PUT /panel/roles/{id}/permissions`**
- **Request:** `{ permission_ids: [uuid] }`
- **Validation:** role exists & not `is_system` when locked; permissions exist; scope compatibility (a `merchant` role can't get platform-only perms).
- **Response `200`:** updated role with permissions. Invalidates cached `perm_hash`.

### 15.5 Merchant

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| POST | `/merchants/register` | Merchant owner sign-up | Public(staff) |
| GET/PATCH | `/panel/merchant` | View/update own merchant org | `merchant.read`/`update` |
| POST | `/panel/merchant/kyc` | Submit KYC docs | `merchant.kyc` |
| GET/POST/DELETE | `/panel/merchant/members` | Staff management | `merchant.staff` |
| GET/POST | `/panel/merchant/payout-accounts` | Payout accounts | `merchant.finance` |
| GET | `/panel/merchants` | (Admin) list merchants | `admin.merchant.read` |
| PATCH | `/panel/merchants/{id}/verify` | (Admin) approve/reject KYC | `admin.merchant.verify` |
| PATCH | `/panel/merchants/{id}/status` | (Admin) suspend/activate | `admin.merchant.update` |

### 15.6 Property / Catalog

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| GET | `/properties` | Public search/list (per §14.4 + geo/date) | Public |
| GET | `/properties/{slug}` | Public detail (localized, currency-converted) | Public |
| GET | `/properties/{slug}/reviews` | Listing reviews | Public |
| GET | `/panel/properties` | Merchant's listings | `property.read` |
| POST | `/panel/properties` | Create listing | `property.create` |
| GET/PATCH/DELETE | `/panel/properties/{id}` | Manage | `property.*` |
| PATCH | `/panel/properties/{id}/status` | Draft→publish (moderation) | `property.publish` |
| POST | `/panel/properties/{id}/media` | Attach media | `property.update` |
| PUT | `/panel/properties/{id}/amenities` | Set amenities | `property.update` |

**Detailed — `GET /properties` (public search)**
- **Purpose:** faceted, geo, availability-aware listing search (served from search index).
- **Query:** `vertical` (required for vertical pages), `filter[city_id]`, `filter[country_id]`, `filter[price][gte|lte]`, `filter[stars]`, `filter[amenities]` (CSV), `filter[rating][gte]`, `date_from`, `date_to`, `adults`, `children`, `rooms`, `near=lat,lng&radius_km=`, `q`, `sort` (`-rating_avg`,`min_price`,`-popularity`), `page`, `per_page`, `currency`, `lang`.
- **Response `200`:** list of listing cards `{ id, slug, title, vertical, city, min_price, currency, rating_avg, rating_count, cover, badges }` + `meta` (pagination + facet counts).
- **Validation:** `date_to > date_from`; occupancy ≥ 1; radius bounded.
- **Errors:** `400 VALIDATION_ERROR`.

**Detailed — `POST /panel/properties`**
- **Permission:** `property.create` (merchant-scoped).
- **Request:** `{ vertical, property_type_id, title, description, country_id, city_id, location_id?, address, lat, lng, base_currency, star_rating?, cancellation_policy_id?, seo{...}, vertical_details{...} }`
- **Validation:** vertical enum; geo ids exist; currency active; `vertical_details` schema validated per vertical; slug generated & unique.
- **Response `201`:** created property (status `draft`).
- **Errors:** `400`, `403 FORBIDDEN`, `409 CONFLICT` (slug).

### 15.7 Room & Rate Plan

| Method | URL | Purpose | Permission |
|---|---|---|---|
| GET/POST | `/panel/properties/{id}/room-types` | List/create room types | `room.read`/`create` |
| GET/PATCH/DELETE | `/panel/room-types/{id}` | Manage room type | `room.*` |
| GET/POST | `/panel/room-types/{id}/rate-plans` | Rate plans | `rateplan.*` |
| GET/PATCH/DELETE | `/panel/rate-plans/{id}` | Manage rate plan | `rateplan.*` |

### 15.8 Availability & Inventory

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| GET | `/properties/{slug}/availability` | Public availability for dates | Public |
| GET | `/panel/room-types/{id}/calendar` | Calendar view (range) | `inventory.read` |
| PUT | `/panel/room-types/{id}/calendar` | Bulk set allotment/price/closed | `inventory.update` |
| POST | `/panel/room-types/{id}/calendar/close` | Stop-sell dates | `inventory.update` |

**Detailed — `GET /properties/{slug}/availability`**
- **Query:** `date_from`, `date_to`, `rate_plan_id?`, `adults`, `children`, `rooms`.
- **Response `200`:** per-date `{ date, available, price, min_stay, is_closed }` + `is_bookable` summary + quoted `total`.
- **Errors:** `404 NOT_FOUND`, `409 INVENTORY_UNAVAILABLE`.

**Detailed — `PUT /panel/room-types/{id}/calendar`**
- **Request:** `{ date_from, date_to, weekdays?:[..], allotment?, price?, min_stay?, is_closed? }`
- **Validation:** range valid; allotment ≥ booked on each date; price ≥ 0.
- **Response `200`:** affected date count. Concurrency-safe (version bump).

### 15.9 Pricing (rules/coupons/offers/taxes)

| Method | URL | Purpose | Permission |
|---|---|---|---|
| GET/POST | `/panel/price-rules` | Dynamic pricing rules | `pricing.*` |
| GET/POST | `/panel/seasonal-rates` | Seasonal/weekend/holiday | `pricing.*` |
| GET/POST | `/panel/coupons` | Coupons | `coupon.*` |
| POST | `/coupons/validate` | Validate a code at checkout | Customer |
| GET/POST | `/panel/offers` | Merchandised offers | `offer.*` |
| GET/POST | `/panel/taxes` | Tax rules (Admin) | `tax.*` |

### 15.10 Booking

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| POST | `/bookings/quote` | Price a prospective booking | Customer |
| POST | `/bookings` | Create booking (hold + pending) | Customer |
| GET | `/bookings/{id}` | Booking detail | Customer(owner) |
| GET | `/bookings/{id}/timeline` | Status timeline | Customer(owner) |
| POST | `/bookings/{id}/cancel` | Cancel (policy-aware) | Customer(owner) |
| GET | `/panel/bookings` | Merchant/Admin bookings list | `booking.read` |
| PATCH | `/panel/bookings/{id}/status` | Confirm/reject/no-show/complete | `booking.manage` |

**Detailed — `POST /bookings/quote`**
- **Request:** `{ items:[{ bookable_type, bookable_id, rate_plan_id?, date_from?, date_to?, adults, children?, extra_beds?, quantity }], coupon_code?, currency? }`
- **Validation:** availability across items; occupancy within capacity; coupon eligibility.
- **Response `200`:** `{ quote_token, currency, items:[{line_total, breakdown}], subtotal, discount_total, tax_total, service_fee, grand_total, expires_at }`.
- **Errors:** `409 INVENTORY_UNAVAILABLE`, `422` (capacity), `400`.

**Detailed — `POST /bookings`**
- **Headers:** `Idempotency-Key` (required).
- **Request:** `{ quote_token, guests:[{full_name,type,doc?}], contact:{email,phone}, payment_method, notes? }`
- **Validation:** quote valid & unexpired; price unchanged (else `409 PRICE_CHANGED` with new quote); guests match occupancy.
- **Response `201`:** `{ booking, payment: { intent_client_secret | redirect_url } }` — status `PENDING_PAYMENT`, hold placed.
- **Errors:** `409 INVENTORY_UNAVAILABLE`/`PRICE_CHANGED`, `422`, `429`, `IDEMPOTENCY_REPLAY` returns original result.

**Detailed — `POST /bookings/{id}/cancel`**
- **Request:** `{ reason?, refund_destination?: gateway|wallet }`
- **Logic:** computes refundable from policy snapshot → creates refund → transitions to `CANCELLED`/`REFUND_PENDING`.
- **Response `200`:** `{ booking, refund: { amount, destination, status } }`.
- **Errors:** `403` (not owner), `409` (non-cancellable state).

### 15.11 Payment & Refund

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| POST | `/payments/intent` | Create/refresh payment intent | Customer |
| POST | `/payments/webhook/{provider}` | Gateway webhook (signature-verified) | Public (HMAC) |
| GET | `/payments/{id}` | Payment status | Customer(owner) |
| POST | `/panel/refunds` | Initiate/approve refund | `refund.manage` |
| GET | `/panel/refunds` | Refund list | `refund.read` |
| GET | `/panel/invoices/{id}` | Invoice (PDF link) | `invoice.read` |

**Detailed — `POST /payments/webhook/{provider}`**
- **Auth:** provider HMAC signature (no bearer). **Idempotent** via `webhook_events.event_id`.
- **Logic:** verify signature → store event → on `payment.captured` confirm booking, decrement inventory, accrue commission, generate invoice, notify. Replays are no-ops.
- **Response:** `200` always (after storing) to prevent retries once persisted.

### 15.12 Wallet

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| GET | `/me/wallet` | Customer wallet + ledger | Customer |
| POST | `/me/wallet/topup` | Top up (future) | Customer |
| GET | `/panel/merchant/wallet` | Merchant earnings wallet | `merchant.finance` |
| POST | `/panel/merchant/payouts` | Request payout | `merchant.finance` |
| GET/PATCH | `/panel/payouts` · `/{id}` | (Admin) process payouts | `admin.payout.*` |

### 15.13 Reviews

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| GET | `/properties/{slug}/reviews` | Public list (sort/filter) | Public |
| POST | `/bookings/{id}/review` | Submit review (verified purchase) | Customer(owner) |
| POST | `/panel/reviews/{id}/response` | Merchant reply | `review.respond` |
| POST | `/reviews/{id}/report` | Report abuse | Customer |
| PATCH | `/panel/reviews/{id}/status` | Moderate (Admin) | `review.moderate` |

**Detailed — `POST /bookings/{id}/review`**
- **Validation:** booking is `COMPLETED`, owned by user, not already reviewed; rating 1–5.
- **Response `201`:** review (status `pending`/`published` per policy); updates `ratings_summary` on publish.

### 15.14 Notification

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| GET | `/me/notifications` | Inbox (paginated, unread filter) | Customer/Staff |
| PATCH | `/me/notifications/{id}/read` · `/read-all` | Mark read | Customer/Staff |
| GET/PATCH | `/me/notification-preferences` | Channel prefs | Customer/Staff |
| GET/POST | `/panel/notification-templates` | Manage templates | `template.*` |
| POST | `/panel/notifications/broadcast` | Admin broadcast | `notification.broadcast` |

### 15.15 CMS

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| GET | `/cms/pages/{slug}` | Public page (localized) | Public |
| GET | `/cms/homepage` | Homepage sections | Public |
| GET | `/cms/menus/{key}` | Menu tree (permission-filtered) | Public/Auth |
| GET | `/blog` · `/blog/{slug}` | Blog list/detail | Public |
| GET | `/faqs` | FAQ groups+items | Public |
| GET | `/cms/banners` · `/testimonials` · `/partners` | Homepage content | Public |
| GET/POST/PATCH/DELETE | `/panel/pages` (+ blocks) | Manage pages | `cms.page.*` |
| GET/POST/PATCH/DELETE | `/panel/blog` (+ categories, comments) | Manage blog | `cms.blog.*` |
| GET/POST/PATCH/DELETE | `/panel/faqs` (+ groups) | Manage FAQ | `cms.faq.*` |
| PUT | `/panel/homepage-sections` | Reorder/toggle sections | `cms.homepage` |
| CRUD | `/panel/banners` · `/testimonials` · `/partners` | Manage content | `cms.*` |

### 15.16 Menu (Navigation)

| Method | URL | Purpose | Permission |
|---|---|---|---|
| GET | `/panel/menus` · `/{key}` | List/tree | `menu.read` |
| POST/PATCH/DELETE | `/panel/menu-items` · `/{id}` | Manage items | `menu.manage` |
| PUT | `/panel/menus/{key}/reorder` | Drag-reorder (nested) | `menu.manage` |

### 15.17 Language

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| GET | `/i18n/languages` | Active languages | Public |
| GET | `/i18n/{lang}` | UI string bundle | Public |
| CRUD | `/panel/languages` | Create/enable/disable/default | `language.manage` |
| GET/PUT | `/panel/translations` | Per-entity translations | `translation.manage` |

### 15.18 Currency

| Method | URL | Purpose | Auth · Permission |
|---|---|---|---|
| GET | `/currencies` | Active currencies | Public |
| GET | `/exchange-rates` | Current rates | Public |
| CRUD | `/panel/currencies` | Manage currencies | `currency.manage` |
| POST | `/panel/exchange-rates/sync` | Trigger FX refresh | `currency.manage` |

### 15.19 Settings

| Method | URL | Purpose | Permission |
|---|---|---|---|
| GET | `/settings/public` | Public app settings (branding, flags) | Public |
| GET/PUT | `/panel/settings` | Read/update settings groups | `settings.manage` |
| GET/PUT | `/panel/feature-flags` | Toggle features | `settings.manage` |
| GET | `/panel/settings/templates/{type}` | Email/SMS/push templates | `template.manage` |

### 15.20 Dashboard / Reports / Analytics

| Method | URL | Purpose | Permission |
|---|---|---|---|
| GET | `/panel/dashboard` | Role-aware KPI summary | `dashboard.read` |
| GET | `/panel/reports/bookings` | Booking report (range, group by) | `report.read` |
| GET | `/panel/reports/revenue` | Revenue/commission report | `report.read` |
| GET | `/panel/reports/payouts` | Payout report | `report.read` |
| GET | `/panel/analytics/occupancy` | Occupancy analytics | `analytics.read` |
| GET | `/panel/reports/export` | CSV/XLSX export (async → job) | `report.export` |
| GET | `/panel/logs/{activity|login|api}` | Audit logs | `logs.read` |

**Common report query:** `?date_from=&date_to=&group_by=day|week|month|vertical|merchant&merchant_id=&vertical=`. Large exports return `202 Accepted` + a job id, delivered via notification/download link.

---

## 16. Admin Panel Requirements

Everything is DB-driven — **no hardcoded values**. The Admin panel must expose management for every module:

- **Dashboard** — KPIs (bookings, revenue, commission, occupancy, new merchants) scoped by role.
- **Merchants** — list, verify KYC, suspend, commission override, impersonate (audited).
- **Catalog** — moderate properties/services, property types, amenities/facilities/attributes.
- **Bookings & Finance** — bookings, payments, refunds, invoices, payouts, commission, reconciliation, disputes.
- **Promotions** — coupons, offers, banners, taxes.
- **Reviews** — moderation queue, reports.
- **CMS** — pages/blocks, homepage builder, menus (header/footer/nav), blog, FAQ, testimonials, partners, media library, SEO.
- **Localization** — languages (create/enable/RTL/fallback), translations coverage, currencies, exchange rates.
- **RBAC** — roles, permissions, assignments, menu/route/API permissions.
- **System** — settings, feature flags, templates (email/SMS/push/notification), audit/login/API logs.
- **Reports & Analytics** — configurable reports + exports.

Merchant panel is a **scoped subset** (own org only), gated by merchant-realm RBAC.

---

## 17. Best Practices & Engineering Standards

### 17.1 Architecture

- **Clean / Layered:** Presentation (thin controllers) → Application (services/use-cases, own transactions) → Domain (entities, value objects, policies, state machines) → Infrastructure (repositories, gateways). Dependencies point inward.
- **Repository Pattern:** all data access behind repository interfaces; services depend on interfaces, not the ORM — swappable and testable.
- **Service Layer:** business logic lives in services; controllers only validate, authorize, map DTOs, and delegate.
- **DTO boundaries:** request/response DTOs distinct from domain entities and DB rows; never leak ORM models over the wire.

### 17.2 Principles

- **SOLID** — SRP per service/module; DIP via interfaces; OCP via strategy pattern for the booking engine & payment providers.
- **DRY** — one booking/pricing/payment pipeline reused across verticals; shared standard columns; shared validation.
- **KISS** — polymorphic booking model over nine parallel stacks; JSON only where genuinely dynamic.

### 17.3 Cross-cutting

- **Validation** at the edge (schema) + domain invariants in services.
- **Transactions** wrap money/inventory operations; outbox pattern for events → search/notifications.
- **Idempotency** on all money/booking mutations; **optimistic locking** on inventory.
- **Security:** Argon2id passwords, JWT with short TTL + rotating refresh, RBAC guards, rate limiting, PII encryption at rest, signed webhooks, audit logging, OWASP Top-10 hygiene, secrets via env/secret manager (never in DB/code).
- **Observability:** structured logs with `request_id`, OpenTelemetry traces, metrics, health/readiness probes.
- **Testing:** unit (services/domain), integration (repositories), contract (API), e2e (booking→payment→refund happy + edge paths).
- **Enterprise naming:** per §3.1, consistent across DB, DTOs, and API.

---

## 18. Recommended Future Enhancements

1. **Merchant subscriptions/plans** (`plans`, `merchant_subscriptions`) — tiered SaaS monetization + feature gating.
2. **Channel manager / OTA sync** — two-way availability with Booking.com/Expedia via the neutral inventory model.
3. **Search service** — OpenSearch/Meilisearch with geo + faceted + typo-tolerant search, fed by outbox events.
4. **Recommendation & dynamic ranking** — personalization, "similar listings", ML-based demand pricing.
5. **Field-level permissions** — column masking (`field_permissions`) building on RBAC §13.2.
6. **Loyalty & referral program** — points earn/burn, tiers, referral rewards.
7. **Real-time** — WebSocket/SSE for messages, notifications, live availability.
8. **Fraud & risk scoring** — velocity checks, device fingerprinting on payments.
9. **Multi-region / data residency** — sharding by region; read replicas near users.
10. **GraphQL gateway** (optional) alongside REST for flexible client queries.
11. **Webhooks for merchants** — outbound event subscriptions to merchant systems.
12. **A/B testing & experimentation** on top of `feature_flags`.
13. **Automated tax/VAT compliance** integration per jurisdiction.
14. **Mobile push + PWA** deepening the existing `manifest`.

---

## 19. Appendix — Enumerations & Status Codes

### 19.1 Core enums

| Enum | Values |
|---|---|
| `realm` | customer, staff |
| `vertical` | hotels, apartments, resorts, shared-rooms, convention-hall, transport, tours, activities, visa |
| `booking_status` | draft, pending_payment, confirmed, in_progress, completed, cancelled, expired, no_show, rejected, refund_pending, refunded |
| `payment_status` | unpaid, pending, paid, partially_refunded, refunded |
| `payment_attempt_status` | initiated, authorized, captured, failed, refunded |
| `refund_status` | requested, approved, processing, resolved, rejected |
| `payout_status` | requested, approved, processing, paid, rejected |
| `verification_status` | unverified, pending, verified, rejected |
| `content_status` | draft, pending, published, archived |
| `visibility` | public, private, unlisted |
| `role_scope` | platform, merchant, customer |
| `discount_type` | percent, flat |
| `season_type` | seasonal, weekend, holiday |
| `notification_channel` | email, sms, push, inapp |

### 19.2 Permission key naming

`<module>.<action>` — e.g. `property.create`, `property.publish`, `booking.manage`, `refund.approve`, `cms.blog.update`, `role.assign`, `settings.manage`. Modules mirror §4.1; actions: `read, create, update, delete, publish, manage, approve, export, moderate, assign, broadcast`.

### 19.3 HTTP status map

See §14.5. Business conflicts (`INVENTORY_UNAVAILABLE`, `PRICE_CHANGED`) use `409`; capacity/semantic failures use `422`; RBAC denials use `403` and are audited to `activity_logs`.

---

*End of document — StayOra Backend Architecture v1.0. This blueprint is implementation-ready and modular; new sections/modules can be appended without restructuring.*
