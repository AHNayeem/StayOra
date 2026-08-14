# 10 — Technical Architecture

## For managers, first

Otithee is built as a **single web application that runs almost entirely in the visitor's browser**. Think of it as a very sophisticated, very complete showroom: every control works, every screen responds, the business rules behind the buttons are real and tested — but the building has no basement. There is no server storing data, no database, and no connection to banks, airlines, hotels or email providers.

The consequence in plain terms: **what one person does on their laptop is invisible to everyone else.** If a customer books a room, the "admin" who sees that booking is the same browser, not a colleague in an office. Clear the browser's data and the business disappears.

The good news is that the team built this *deliberately and carefully*. Every place where a real server would plug in is marked, isolated, and shaped like the real thing. The application is written as if the server already exists — every data call returns a promise, has a timeout, and validates its response. When a backend is built, most of the front end will not change.

The bad news is the size of what remains. Because the showroom looks finished, the remaining work is easy to underestimate. Building the server that this front end assumes — with the same rules, transactionally correct, secure and auditable — is a larger effort than everything built so far.

---

## Technical detail

### Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16.2.10** (App Router) |
| UI | React 19.2.4 |
| Language | TypeScript 5, `strict: true` |
| Styling | Tailwind CSS 4 (via `@tailwindcss/postcss`) |
| Forms | React Hook Form 7 + Zod 4 (`@hookform/resolvers`) |
| Tables | TanStack Table 8 |
| Charts | Recharts 3 |
| Animation | Framer Motion 12 |
| Icons | Lucide React |
| Toasts | Sonner |
| Package manager | **Bun** |
| Dev port | 3004 |

**Notably absent from `package.json`:** any database driver, ORM, auth library, payment SDK, email/SMS SDK, map SDK, HTTP client, state-management library, or test framework. This is a deliberate zero-backend build.

### Route structure

```
app/
  (auth)/              6 routes   — login, register, forgot, reset, verify, complete-profile
  (marketing)/        ~60 routes  — public site + 24 customer account screens
  dashboard/         ~100 routes  — admin/merchant/agency back office
  layout.tsx, template.tsx, manifest.ts, robots.ts, sitemap.ts,
  global-error.tsx, not-found.tsx, maintenance/
```

**154 page routes. Zero API routes. Zero middleware. Zero server actions.** Verified by `find app -name "route.ts"` (empty) and a repository-wide search for `"use server"` (no matches).

Route groups split cleanly: `(marketing)` and `dashboard` have entirely separate layouts, chrome and design languages.

### Code organisation

```
app/          12,507 LOC   routes and pages
components/   14,285 LOC   shared UI (ui/, cards/, sections/, checkout/, layout/, account/)
features/     91,945 LOC   feature modules — the bulk of the system
lib/           6,240 LOC   utilities + mock data generators
services/      3,857 LOC   the data-access seam (10 services)
types/         2,396 LOC   shared domain types
constants/     3,155 LOC   catalogue, config, content
hooks/           236 LOC   shared React hooks
              ─────────
             134,621 LOC total
```

`features/` is organised by domain: `dashboard/` (the largest, containing the domain layer, 65 modules, RBAC, navigation, data layer and UI kit), `flights/`, `booking/`, `trip/`, `account/`, `auth/`, `search/`, `discovery/`, `ai/`, `i18n/`.

### Frontend architecture

- **Server Components by default**, `"use client"` only where interaction requires it.
- **No state-management library.** State lives in module singletons read through `useSyncExternalStore` — an approach chosen so the store can be swapped for HTTP calls without changing component signatures, and so SSR stays deterministic via stable server snapshots.
- **In-house query cache** (`features/dashboard/data/query/`) with staleness, mutations and a provider — a minimal TanStack-Query shape.
- **Config-driven verticals.** One registry (`constants/verticals.ts`) drives navigation, search tabs, routes, price units and labels for all ten product categories.
- **Reusable CRUD engine.** `ResourceListView` + `createStubService` + per-module `columns/schemas/hooks/service` powers 42 modules identically.

### The data-access seam

This is the architectural centrepiece and the reason a backend migration is feasible.

```
Component  →  hook  →  service (async)  →  [ mock data | domain store ]
                                    ↕
                          swap this body only
```

- `services/http.ts` — `mockDelay()` and a `Paginated<T>` envelope matching a real list endpoint.
- `features/dashboard/data/http-client.ts` — a **real, complete HTTP client**: env-driven base URL, pluggable auth-token provider, `AbortController` timeouts, normalised `ApiError` kinds, 422 field-error parsing, and optional Zod response validation. It throws loudly if called without `NEXT_PUBLIC_API_BASE_URL` configured, precisely to stop anyone accidentally shipping half-wired code.
- `features/dashboard/data/config.ts` — `isLive` is `false` whenever no base URL is set, which is always today.

### State persistence

| Store | Key | Scope |
|---|---|---|
| Domain store | `otithee:domain:v3` | All business data — bookings, refunds, commission, settlements, offers, B2B, inventory, loyalty, support, reviews, outbox, revenue, insurance, membership, advertising, pricing rules |
| Session | `otithee:session` | Auth session |
| Accounts | `otithee:accounts` | Runtime sign-ups |
| Dashboard session | `otithee_session` **(cookie)** | Mirrored principal for SSR |
| Trip cart | `otithee:trip-cart` | Cross-vertical trip context |
| Locale | `otithee:locale` | Language, currency, country |
| Flight bookings | `otithee:flight-bookings` | Client-created flight bookings |
| Plus ~8 account collection stores | `otithee:*` | Wishlist, travellers, cards, notifications, reviews, settings, saved searches, compare |

The domain store is **schema-versioned** (`SCHEMA_VERSION = 3`) so stale persisted state is discarded on shape changes, and merges per-collection on load so a partially-written payload cannot blank the app.

### Authentication architecture

```mermaid
flowchart LR
  A[Sign-in form] --> B[services/auth.ts — localStorage lookup]
  B --> C[Session written to localStorage]
  B --> D[Mirrored to otithee_session cookie]
  D --> E[Server Component: cookies\(\) -> decodeSessionCookie]
  E --> F[resolveCurrentUser — permissions derived from ROLE, not cookie]
  F --> G[Dashboard layout renders correct chrome]
```

The design is right — permissions are never taken from the cookie, only the role is, and the server derives capability from a trusted map. The **implementation** is a prototype: the cookie is plain JSON, unsigned, and not `httpOnly`.

### External services and integrations

| Service | Status |
|---|---|
| Payment gateway | 🔵 Simulated in-repo |
| Email / SMS / push / WhatsApp | 🔵 Simulated in-repo (in-memory outbox) |
| Maps | 🔵 Custom Mercator projection — **no tile provider, no API key** |
| Geocoding | 🔵 Deterministic hash-seeded coordinates from a destination pool |
| Flight supplier | 🔵 Deterministic generation from a self-describing offer id |
| Currency rates | 🔵 Static table |
| AI / LLM | 🔵 Deterministic mock provider, env-switchable |
| Analytics / error tracking | 🟠 PostHog/Sentry-shaped seams, never transmitted |
| Image hosting | 🟡 `next.config.ts` allows `images.unsplash.com` and `i.pravatar.cc` only |

**There are zero real third-party integrations.** The application makes no outbound network request of any kind.

### Environment configuration

Read from environment (all optional, none set):

| Variable | Purpose |
|---|---|
| `API_BASE_URL` | Server-only API origin |
| `NEXT_PUBLIC_API_BASE_URL` | Client-visible API origin |
| `NEXT_PUBLIC_API_TIMEOUT_MS` | Request timeout (default 15s) |
| `NEXT_PUBLIC_AI_PROVIDER` | AI provider selection (default `mock`) |

No `.env` file exists in the repository — correct for a repo with no secrets, and a gap for a deployable one.

### Deployment structure

Standard Next.js: `bun run build` → `bun run start` on port 3004. No Dockerfile, no CI/CD configuration, no infrastructure-as-code, no health checks, no observability. `next.config.ts` contains only image remote patterns.

---

## Architectural strengths

1. **The seam is real, not aspirational.** Every service returns a Promise and matches the shape a real endpoint returns. The HTTP client is production-quality and already written.
2. **Domain logic is isolated from UI.** ~17,000 lines of business rules with no React imports, testable in Node, and tested.
3. **Determinism as a discipline.** No wall-clock reads or randomness inside domain computation — timestamps are injected by callers. This is what makes SSR stable and the tests meaningful.
4. **Config-driven breadth.** Ten verticals through one registry.
5. **Consistent module shape.** Every dashboard module follows the same file structure, so the codebase is navigable at 134k lines.
6. **Honest self-documentation.** Almost every mock in this codebase carries a comment explaining that it is a mock, why, and what replaces it. This is unusually good engineering hygiene and materially reduces migration risk.

## Architectural risks

1. **No server means no trust boundary.** Every security control is advisory.
2. **`localStorage` capacity.** The entire domain dataset serialises into one key; at scale this will hit the ~5–10 MB quota. The code catches the failure and degrades silently.
3. **Two data tiers** (domain-backed vs stub-backed) mean two different migration paths.
4. **No tests above the domain layer.** No component, integration, E2E or accessibility tests; no test framework installed.
5. **No build/deploy pipeline.** No CI, no type-check gate, no lint gate in automation.
6. **Bundle size unmeasured.** The full catalogue, all mock data and all generators ship to the client; no code-splitting analysis has been done.
7. **Branding inconsistency.** The product is documented as "Otithee" but the code, storage keys, package name, seed emails and site config all say **"Otithee"**. This should be resolved before any external presentation.
