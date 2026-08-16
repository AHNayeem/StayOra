# Mock AI Provider

`features/ai/provider/mock-provider.ts` is a deterministic engine, not a language model.
It is a thin adapter over `features/ai/agent/orchestrator.ts`, which performs the same
steps a real LLM provider performs, in the same order:

1. **Understand** — `parseMessage` (`features/ai/nlu/parse.ts`), plus reference
   resolution against the conversation's memory (`agent/reference.ts`)
2. **Decide** — `agent/planner.ts` emits `AgentAction[]`. *This is the only function an
   LLM provider replaces.*
3. **Act** — `agent/tool-runner.ts` executes tool calls with permissions, a per-turn
   budget and structured logging
4. **Compose** — `agent/actions/*` return `text` + `AIBlock[]` + chips + `contextPatch`,
   plus the progress trail and booking state

Because the guardrails live in the runner and the state machine rather than in prompt
wording, they hold for whichever provider is plugged in.

## Parsing

Pure function of `(text, context, today)`. It extracts:

| Slot | Examples it handles |
| --- | --- |
| destination / origin | `from Dhaka to Bangkok`, `DAC to DXB`, `Dhaka to London`, `hotels in Bali`, `Cox's Bazar` |
| budget | `$1,500`, `under 1500`, `1.5k`, `budget is $2,000` |
| nightly ceiling | `hotels under $150`, `$120 per night` (disambiguated from a trip budget by context) |
| duration | `5 days` → 4 nights, `3 nights`, `a week`, `weekend` |
| travellers | `2 adults`, `with my wife` → 2, `family` → 2+2, `solo` → 1 |
| dates | ISO, `tomorrow`, `next week/month`, `this weekend`, `in July`, `12 August` |
| cabin / trip type / direct | `business class`, `round trip`, `non-stop` |
| rating / amenities / styles | `5-star`, `with a pool`, `family-friendly`, `beachfront`, `near the airport` |
| ranking | `cheapest`, `fastest` |

The destination vocabulary is **derived** from the catalog's own listings plus the
airport dataset, so the assistant can only recognise places Otithee actually sells. Add
a listing or an airport and it understands the destination for free.

Two matching details that matter:

- Matching is on **word boundaries**. A substring match makes "Nice" match "Venice",
  which produced a confidently wrong answer before it was fixed.
- Airport city aliases are indexed, so "Bali" resolves to `DPS` even though the dataset
  calls it "Denpasar (Bali)" — without this a Bali plan silently had no flight.

## Intents

`greet · help · set-context · search-hotels · search-flights · search-tours ·
search-activities · search-transport · search-visa · compare · plan-trip · itinerary ·
budget · my-bookings · booking-draft · summarize-reviews · recommend · unknown`

Classification order encodes precedence. Composite asks are tested before
single-vertical ones, so *"Dubai for five days… find me a flight, a hotel and two
activities"* is a **plan**, not a flight search. Follow-ups resolve against the running
context: a bare `"what's the fastest option?"` re-ranks the last flight search, and
`"keep it under $1,000"` re-costs the current plan.

## Replay instead of storage

`itinerary` and `budget` rebuild the plan from context rather than reading a stored
object. Because the tools are deterministic, the rebuilt plan is identical — which is
exactly how a real `GET /plans/:id` behaves, and it means the itinerary and the budget
can never disagree with the plan they came from.

## Latency

No artificial delay is added. The tools call the real service layer, which already
simulates network latency (`searchFlights` takes ~900 ms), so loading states are
exercised by genuine work.

## Testing it

The engine is a plain class with no React or browser dependency, so it can be driven
directly:

```ts
import { MockAIProvider } from "@/features/ai/provider/mock-provider";

const response = await new MockAIProvider().respond({
  message: "Plan a 5-day Dubai trip under $1,500",
  context: {},
  today: "2026-08-11",
  countryCode: "BD",
});
```

Set `NODE_ENV=test` to make `mockDelay` resolve immediately.

## Known limits

- Parsing is keyword- and pattern-based. Unusual phrasing falls through to `unknown`,
  which answers with a clarifying question rather than a guess.
- Multi-city flight requests are parsed as trip type but planned as a single leg pair.
- Trip memory is session-scoped and single-threaded: one destination at a time.
- Answer quality is bounded by the demo catalog. Where a destination has no inventory,
  the assistant says so — it does not invent a listing.
