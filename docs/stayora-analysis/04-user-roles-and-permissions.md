# 04 — User Roles & Permissions

## Two role systems, deliberately separate

The code maintains a **coarse account role** (who you are on the public site) and a **fine dashboard role** (what you may do in the back office). One sign-in drives both. A traveler has no dashboard role at all, and the auth service explicitly refuses to mint a dashboard session for them.

- **Account roles** (`AuthUser.role`): `traveler`, `merchant`, `admin`, `staff`, `agency`
- **Dashboard roles** (`RoleId`): 10, listed below

---

## The ten dashboard roles

Verified in `features/dashboard/rbac/roles.ts`.

### Super Admin
- **Purpose:** Unrestricted operation of the platform.
- **Permissions:** `*:*` — every resource, every action, including `system:*` and `impersonate`.
- **Dashboard:** Full sidebar including System (settings, cron, queues, cache, storage, maintenance, design system).
- **Only role that can:** perform destructive system operations and reset platform data.

### Admin
- **Purpose:** Day-to-day platform management.
- **Can manage:** bookings, merchants, catalog, flights, customers, finance, B2B, promotions, reviews, CMS, localization, reports, notifications, users, settings, support.
- **Cannot:** create or edit roles/permissions (`roles:read`, `permissions:read` only); no `system:*`.

### Merchant
- **Purpose:** A supplier operating their own inventory on the platform.
- **Can:** full control of their catalog (`catalog:*`), read and update their bookings, create and manage their own promotions, read and reply to their reviews, read and export their finances and reports, raise support tickets.
- **Cannot — and this boundary is drawn deliberately in the code:** approve refunds, change commission rules, run settlements, manage other merchants, or touch platform settings. The comment in the source states the reasoning: merchants own inventory, pricing, promotions and operations, and can *see* their money, but refund decisions, commission rules and settlement runs stay with the platform.
- **Data scoping:** all queries are filtered by `merchantId` — verified by a regression test.

### Vendor
- **Purpose:** A lighter supplier who supplies inventory but does not operate commercially.
- **Can:** read dashboard, read and update catalog, read bookings, manage own profile. Nothing else.
- **Note:** This is the least-privileged role and is used as the fallback when an unknown role is encountered.

### Agency / Corporate (B2B)
- **Purpose:** A travel agency or corporate account booking platform inventory at net rates against a credit line.
- **Can:** read and create B2B records, create and manage bookings, read finance and reports, raise support tickets.
- **Lands on:** `/dashboard/b2b`.
- **Data scoping:** by `organizationId`.
- **Cannot:** see any other account's data, or any platform-level finance.

### Finance
- **Purpose:** Owns the money.
- **Can:** `finance:*` (payments, transactions, invoices, payouts, refunds, commission, commission rules, insurance, settlements, tax, reconciliation, disputes), read/export reports, read bookings, read merchants, read B2B.
- **Cannot:** touch catalog, CMS, users or system.

### Customer Support
- **Purpose:** Handles tickets and customer issues.
- **Can:** `support:*`, read and update bookings, read flights, read customers, read reviews and notifications.
- **Cannot:** see finance, catalog, merchants or system.

### Staff
- **Purpose:** General day-to-day operations.
- **Can:** read dashboard, read/update bookings, read flights, customers, reviews and notifications.
- **Cannot:** anything financial, structural or administrative.

### Marketing
- **Purpose:** Runs promotions, campaigns and content marketing.
- **Can:** `promotions:*`, `cms:*`, read analytics, reviews and reports.

### Content Manager
- **Purpose:** CMS, localization and review moderation.
- **Can:** `cms:*`, `localization:*`, `reviews:*`.

---

## Permission model

- **23 resources:** dashboard, analytics, bookings, merchants, catalog, flights, customers, finance, b2b, promotions, reviews, cms, localization, reports, notifications, users, roles, permissions, system, settings, support, logs, profile.
- **7 actions:** read, create, update, delete, approve, export, impersonate.
- **Wildcards** (`finance:*`, `*:*`) are expanded at sign-in so runtime checks only ever compare concrete strings.

Two resources were separated for principled reasons documented in the source:
- **`flights`** is split from `catalog` because flight inventory (airlines, airports, routes, schedules) has different teams and approval paths — a catalog editor should not implicitly gain schedule rights.
- **`b2b`** is its own resource because an agency user needs it *without* any platform finance access, and a finance user needs read-only visibility *into* it.

---

## Is RBAC actually implemented?

**As a design: yes, thoroughly. As enforcement: no.**

Three layers exist and all three work:

| Layer | Mechanism | File |
|---|---|---|
| 1. Menu | Items declare required permissions; the sidebar filters | `navigation/menu-config.ts` |
| 2. Route | Every URL prefix declares a permission; evaluated on navigation, deep links, and back/forward | `rbac/route-access.ts`, `rbac/route-guard.tsx` |
| 3. Component | `PermissionGuard` wraps individual actions and panels | `rbac/permission-guard.tsx` |

Server-side helpers `requirePermission()` and `requireAnyPermission()` exist in `auth/session.ts`, resolve the principal from the cookie, and derive permissions **from the role, never from the cookie** — which is the correct design.

**But** the cookie itself is plain JSON, URL-encoded, unsigned and not `httpOnly`. Any user can open DevTools, change `"role":"merchant"` to `"role":"super_admin"`, reload, and hold every permission in the system. The source states this openly:

> *"This is a prototype mechanism and is deliberately readable: it carries no secret and grants nothing on its own. A real deployment replaces it with a signed, `httpOnly` session cookie issued by the backend."*

Because there is no server that owns data, escalating the cookie grants access only to data already in that browser — the practical blast radius today is one user's own demo state. The moment a real API exists, this becomes a total compromise, so the fix must land **with** the backend, not after it.

---

## Seed accounts

Seven demo accounts, all sharing the password `Passw0rd!` in plain text in `constants/accounts.ts`:

| Email | Account role | Dashboard role | Lands on |
|---|---|---|---|
| traveler@otithee.com | traveler | — | `/account` |
| merchant@otithee.com | merchant | merchant | `/dashboard` |
| admin@otithee.com | admin | admin | `/dashboard` |
| superadmin@otithee.com | admin | super_admin | `/dashboard` |
| agency@otithee.com | agency | agency | `/dashboard/b2b` |
| finance@otithee.com | staff | finance | `/dashboard/finance/commission` |
| support@otithee.com | staff | support | `/dashboard/bookings` |

Three of the ten roles (**vendor, marketing, content_manager**) have no seed account, so they are defined but never exercised in the demo.

---

## Missing roles for a real multi-vendor travel ecosystem

| Role | Why needed |
|---|---|
| **Property Manager / Multi-property owner** | A group operating several hotels needs to switch between properties under one login. Only a single `merchantId` is modelled. |
| **Merchant Staff (front desk / reservations)** | Merchants cannot create sub-users. Today a merchant is one account, so hotel staff would share credentials. |
| **Tour Operator / Transport Provider (specialised)** | Currently all collapse into `merchant`, though their operational needs (departures, drivers, vehicles) differ materially. |
| **Compliance / KYC Officer** | Merchant verification has no owner, and no role can approve or reject an onboarding application. |
| **Revenue Manager** | The revenue-management module exists but has no dedicated role; it sits under `catalog`. |
| **Auditor (read-only across everything)** | For internal audit and external review without any write capability. |
| **Partner / Affiliate** | No role for affiliates who send traffic and claim commission. |
| **API / Machine client** | B2B API access is envisaged but there is no service-account role or scoped token concept. |
| **B2B Agent (sub-user of an agency)** | `B2BSubUser` exists as a data type, but there is no login or role for one. |

---

## Access control gaps

1. **Roles are static.** The Roles and Permissions screens render a read-only matrix. Roles cannot be created, cloned or edited at runtime, and there is no custom-role builder.
2. **No permission delegation.** A merchant cannot grant a colleague partial access.
3. **`impersonate` is defined but unimplemented.** The action exists in the catalogue; no code performs it. Support teams will need it, and it needs an audit trail when it lands.
4. **No approval workflows.** `approve` is a defined action but only refunds have an approval path; commission changes, payouts and catalog publishing do not require a second pair of eyes.
5. **Feature flags are a second gate, but all are on.** `DEFAULT_ENABLED_FLAGS` enables everything, so the flag layer is untested in the "off" direction except by design.
