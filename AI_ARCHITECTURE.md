# AI Travel Assistant — Architecture

The Otithee AI Travel Concierge is a conversational layer **on top of** the existing
service seam. It adds no data, no second search system and no second booking system.

## Data flow

```
User message
   ↓
services/ai.ts            ← service seam (same contract as catalog/search/flight/account)
   ↓
features/ai/provider      ← AIProvider interface  →  MockAIProvider (today)
   ↓
features/ai/nlu/parse     ← intent + slot extraction
   ↓
features/ai/tools         ← the ONLY route to data
   ↓
services/{catalog,search,flight.service,account,checkout}
   ↓
constants/listings · lib/mock/*        (mock data today, real API later)
   ↓
Structured tool result
   ↓
AIResponse { text, blocks[], suggestions[], contextPatch }
   ↓
features/ai/ui            ← chat + block renderers
   ↓
UI action (link, compare, booking draft → /checkout)
```

## The no-hallucination guarantee

It is **structural**, not a matter of prompt wording:

- The provider imports exactly one data-side module — `features/ai/tools` (`AI_TOOLS`).
  It has no import path to `constants/listings` or `lib/mock/*`.
- Every price, availability count, policy and booking status in an answer is a field
  from a tool result.
- Prices are quoted from the same objects the site's own cards render, so a fare the
  assistant shows and the fare on `/flights/[id]` are the same object.
- Booking totals come from `computeBookingPricing` — the function the booking widget
  and `/checkout` already use — so a draft and the checkout page cannot disagree.
- When a constraint can't be met, the tool returns it in `relaxed` and the answer says
  so out loud instead of quietly returning something else.

## Files

| Path | Role |
| --- | --- |
| `types/ai.ts` | Domain types: intents, context, blocks, request/response, `AIProvider` |
| `services/ai.ts` | Service seam (`askAssistant`) — swap for a `fetch` to go server-side |
| `features/ai/provider/` | `AIProvider` implementations + env-driven selection |
| `features/ai/nlu/parse.ts` | Message → intent + slots (pure, clock-free) |
| `features/ai/lib/places.ts` | Destination vocabulary derived from the catalog + airports |
| `features/ai/lib/money.ts` | `{{usd:…}}` tokens so prose reprices with the currency switcher |
| `features/ai/lib/text.ts` | Normalisation and word-boundary matching |
| `features/ai/tools/` | The callable surface (see `AI_TOOLS.md`) |
| `features/ai/ui/` | Provider, launcher, panel, chat, block renderers |
| `features/ai/saved-trips.ts` | Saved plans (`createCollectionStore`, like the wishlist) |
| `app/(marketing)/ai/` | The dedicated assistant page |

## State

Two things are kept deliberately apart:

- **`messages`** — what's on screen, including rendered blocks. Never sent back to the
  engine.
- **`AITripContext`** — the small structured memory (destination, dates, travellers,
  budget, cabin, styles, selected ids, current plan id). This is the *only* thing each
  turn receives, which is what makes "find me a hotel" after "I want to visit Dubai"
  work without replaying the transcript — and what keeps token cost bounded when a real
  LLM is wired in.

`AssistantProvider` is mounted once in `app/(marketing)/layout.tsx`, so a conversation
survives navigation between pages. Nothing is persisted: the memory is session-scoped.

## Determinism

The engine never reads the clock or `Math.random`. `today` is passed in from the UI
(`toISODate(new Date())`, inside an event handler), and ids are derived with `stableId`.
Consequences:

- Server and client can never disagree; the assistant is SSR-safe.
- A plan is reproducible from its prompt, which is what makes the "Share trip" link
  (`/ai?ask=…`) genuinely rebuild the itinerary rather than link to a screenshot.

## Internationalisation

- All amounts are **base USD**, like every other price in the platform.
- Prose emits `{{usd:1500}}` tokens, resolved at render time through
  `useLocale().money()`. Switching currency reprices the assistant's sentences along
  with the rest of the page.
- Dates render through `useLocale().date()`.
- The destination vocabulary is built from the catalog and the airport dataset, so no
  market is hardcoded. The default flight origin is derived from the visitor's country
  preference and is always stated in the answer; when it can't be derived, the
  assistant asks.
- The panel and launcher use logical inset properties (`start`/`end`), so RTL flips
  correctly with the `dir` the locale provider sets.

## Entry points

Homepage band, global nav (desktop + mobile drawer), floating launcher on every public
page, listing search bars, listing detail, flight results, flight detail, checkout,
account overview, and the dedicated `/ai` page. All of them go through `AskAiButton`
(or `openAssistant`) and pass an `AIPageContext`, so the assistant opens already knowing
what the traveller is looking at.

## Safety

- The assistant never confirms a booking or takes payment. `createBookingDraft` produces
  a pre-filled `/checkout` URL and the UI states plainly that nothing is charged.
- It never cancels a booking; it quotes the stored policy and points at the existing
  cancel flow, so the traveller sees the real refund before confirming.
- Visa answers are marked as prototype data and are never presented as legal advice.
