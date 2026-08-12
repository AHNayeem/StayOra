# Mock → Real LLM

Nothing in the UI needs to change. The assistant renders an `AIResponse`; it has never
known who produced one.

## What you write

One class implementing `AIProvider` (`types/ai.ts`):

```ts
export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  readonly label = "Claude";

  async respond(request: AIRequest): Promise<AIResponse> {
    // 1. system prompt + TOOL_DESCRIPTORS as tool definitions
    // 2. user message + request.context as structured state
    // 3. run the tool loop, executing calls against AI_TOOLS
    // 4. map tool results onto AIBlock[]; return text, blocks, suggestions, contextPatch
  }
}
```

Register it in `features/ai/provider/index.ts`:

```ts
const PROVIDERS: Record<AIProviderId, () => AIProvider> = {
  mock: () => new MockAIProvider(),
  anthropic: () => new AnthropicProvider(),
};
```

and select it with `NEXT_PUBLIC_AI_PROVIDER`.

## Move the call server-side

The current provider runs in the browser because it needs no key. A hosted model must
not. Change **one function** — `askAssistant` in `services/ai.ts`:

```ts
const response = await fetch("/api/ai/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(request),
});
if (!response.ok) throw new AIError();
return (await response.json()) as AIResponse;
```

Then add a Route Handler that holds the key, resolves the provider server-side and runs
the tool loop. No component changes.

## Keeping the no-hallucination guarantee

The guarantee comes from tool access, not from the model. Preserve it:

1. **Give the model only `AI_TOOLS`.** No free-text "knowledge" answers about prices,
   availability, policies or bookings.
2. **Build blocks from tool results, not from model prose.** The model chooses *which*
   listing to recommend and writes the reasoning; the price, rating and link are copied
   from the tool result object.
3. **Keep amounts as `{{usd:…}}` tokens** in any generated prose, or post-process the
   model's output into them, so currency switching keeps working.
4. **Keep `relaxed` disclosure.** If a tool reports it dropped a constraint, that must
   reach the answer.
5. **Never expose a tool that confirms a booking or takes payment.** Booking stays a
   drafted `/checkout` hand-off that the traveller confirms.

## Mock data → real API

Orthogonal, and already prepared: the tools call `services/*`, and each service is a
seam whose bodies swap from `mockDelay(...)` to `fetch(...)`. The AI layer is unaffected
because it never imports `constants/listings` or `lib/mock/*`.

## Context budget

Each turn sends only `AITripContext` — roughly a dozen scalar fields — not the
transcript. That is what keeps prompt cost flat as a conversation grows. If you add
transcript memory later, summarise into `AITripContext` rather than appending turns.

## Things to add for production

- Rate limiting and abuse handling on the route handler.
- Streaming (the block model is compatible: stream `text`, then append blocks).
- Server-side auth for `getUserBookings` / `getTripDetails` — today they read the demo
  traveller; a real build must scope them to the session.
- A licensed entry-requirements provider behind `getVisaStatus`. The current answer is
  explicitly prototype data and marked as such in the UI.
- Logging of `intent` and tool calls for quality review.
