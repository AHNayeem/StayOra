# 12 — UX & Product Flow Audit

## Overall assessment

The UX is the most polished part of the product. It is consistent, complete and considered — noticeably better than the "prototype" label suggests. The issues below are real but they are refinements, not rebuilds; the two exceptions (mocked feedback loops and mobile depth in the dashboard) are noted as major.

---

## What works well

| Area | Finding |
|---|---|
| **Information architecture** | Three surfaces with distinct chrome — public site, customer account, dashboard — and no bleed between them. A traveller never sees admin navigation; a merchant never sees another merchant's data. |
| **Navigation** | Mega-menu with vertical grouping, mobile drawer, top bar, breadcrumbs, and a dashboard sidebar organised into six labelled sections with collapsible groups and badge counts. A **command palette** gives keyboard users direct access to any module. |
| **Config-driven consistency** | Because all ten verticals flow from one registry, a hotel page and a visa page feel like the same product. Listing, detail, filter and card templates are shared. |
| **Checkout** | Genuinely well designed: a visible progress stepper, a live order summary, an inventory hold with a countdown so the traveller knows the room is theirs while they type, and an accessible step announcement (`Step 2 of 4: …`) rather than a bare visual indicator. |
| **State coverage** | Route-level `error.tsx`, `loading.tsx` and `not-found.tsx`; skeletons that match the shape of the content they replace; empty states with a next action; an offline banner; toasts. This is unusually complete. |
| **Forms** | React Hook Form + Zod throughout, with field-level errors, disabled states and consistent control styling. |
| **Design system** | ~40 primitives plus a live `/dashboard/design-system` reference page. Dark mode across the whole product. |
| **Discovery affordances** | Map view synchronised two ways with the result list, near-me with graceful fallbacks, and compare trays for both listings and flights. |
| **Honesty in the UI** | Demo credentials are surfaced on the sign-in screen; the payment step is labelled a simulator; insurance carries a "demo underwriter" disclaimer. Nothing pretends to be real. |

---

## Journey-by-journey audit

### Discover → book a stay — ✅ strong

Home → search/filter → listing → detail → widget → hold → travellers → extras → discounts → payment → confirmation. Every step has loading, error and empty handling.

**Issues:** search results do not filter by whether inventory actually exists on the chosen dates, so a traveller can open a property and discover it is unavailable only at the booking widget. There is no "similar available properties" recovery.

### Book a flight — ✅ strong

Search panel → results with price calendar and filters → detail with fare rules and seat preview → four-step booking → confirmation with PNR.

**Issues:** the seat map is a preview rather than a full selector; there is no fare-family comparison at the point of choice; no "hold this fare" option.

### Plan a multi-product trip — 🟡 good mechanism, weak merchandising

The trip cart carries destination and dates across verticals, and recommendation rails appear on listing pages and at checkout.

**Issue — and this is the biggest product-level miss:** the cross-sell mechanism is built but not *merchandised*. There is no prompt after a flight booking saying "you land in Dubai on the 14th — here are hotels for those nights". The most valuable interaction in the product is available but not led.

### Manage my account — ✅ strong

24 screens, clearly grouped, with shared components and consistent status badges.

**Issues:** no PDF download for invoices or vouchers; the security screen has no real MFA or active-session list; no account deletion or data export.

### Operate as a merchant — 🟡 good once inside

Scoped dashboard, real inventory and rate control, real bookings and earnings.

**Issue:** there is no way in. No registration, no onboarding wizard, no progress checklist — a merchant simply exists or does not.

### Administer the platform — ✅ broad, 🟡 shallow in places

All 65 modules are reachable and permission-checked.

**Issue:** 42 of them lose their data on reload, which reads as a bug to anyone evaluating the product. And the Settings screen implies control over platform economics that it does not have.

---

## Major UX issues

### 1. Mocked feedback loops break the mental model — **major**

The traveller "receives" a booking confirmation because the admin's outbox and the customer's inbox are the same array. In a demo this is elegant; to a user it means nothing arrives in their actual email. Any pilot with real users will fail here first.

### 2. Stub modules lose state on reload — **major**

Creating a user, a merchant or a catalogue item and then refreshing shows it gone. This is the single most damaging impression the product can make on an evaluator, and it affects 42 of 65 dashboard modules.

### 3. Admin catalogue does not drive the public site — **major**

An admin who adds a hotel and then visits `/hotels` will not find it. This is a genuine contradiction between two parts of the product (documented in file 14) and it undermines confidence in everything else the dashboard shows.

### 4. Dashboard mobile experience — **major**

The dashboard has a mobile sidebar, but 65 data-table modules on a phone are functional rather than usable. Property operators — the users most likely to be mobile-first — get the least mobile-appropriate surface.

### 5. No search-result recovery — moderate

Zero results offers no relaxed filters, no nearby alternatives, no date flexibility suggestions. This is a direct conversion loss.

### 6. Conversion optimisation is absent — moderate

No urgency signals ("2 rooms left at this price"), no social proof in the results list, no abandoned-checkout recovery, no exit intent, no price-drop alerts, no recently-viewed rail. The data to power all of these already exists in the domain layer.

### 7. Accessibility is good but unverified — moderate

Focus traps, `aria-current`, screen-reader step announcements, keyboard handling and semantic structure are all present, and the code shows evidence of deliberate a11y thinking. But there is **no automated accessibility testing and no audit**, so WCAG conformance is unknown. Specific risks: the custom map has no keyboard or screen-reader equivalent; colour contrast in dark mode is unmeasured; complex data tables lack tested screen-reader semantics.

### 8. Localization is shallower than it appears — moderate

Three languages are offered in the switcher; only Bangla has a dictionary, covering site chrome only (~150 keys). Selecting Arabic switches document direction but leaves the interface in English. A visitor who chooses a language and sees no change loses trust immediately. Either complete the dictionaries or show only the languages that are ready.

### 9. Onboarding for new users — minor

No first-run guidance on any of the three surfaces. The dashboard in particular presents 65 modules with no orientation.

### 10. No in-product help beyond a static page — minor

`/dashboard/help` exists as content; there is no contextual help, no tooltips on complex financial figures (take rate, RevPAR, commission basis), and no guided tours.

---

## Responsive design

| Surface | Assessment |
|---|---|
| Public site | ✅ Genuinely responsive — mobile drawer, adaptive grids, touch-friendly targets |
| Checkout | ✅ Works well on mobile; steps stack cleanly |
| Customer account | ✅ Sidebar collapses appropriately |
| Dashboard | 🟡 Renders and navigates, but dense tables and financial views are desktop-first in practice |

---

## Conversion opportunities already unlocked by existing data

Because the domain layer already computes these, each is a UI change rather than a feature build:

| Opportunity | Data already available |
|---|---|
| "Only N left" scarcity | Inventory allotment vs consumed |
| "Booked X times this week" | Booking ledger |
| Price-drop and pace signals | Revenue-management pace metrics |
| Personalised recommendations | Recommendation engine + booking history |
| Member price shown to non-members | Membership benefits calculation |
| Cross-sell after booking | Trip context + recommendation groups |
| Abandoned-checkout recovery | Inventory holds record intent |
