/**
 * Provider selection — the one place the app decides *who answers*.
 *
 * Today there is a single deterministic provider. Adding a real LLM means
 * writing one class that implements {@link AIProvider} and returning it here;
 * every component, hook and block renderer stays untouched, because they only
 * ever see an {@link AIResponse}.
 *
 * The switch is env-driven rather than a code edit so the same build can run
 * mock in preview and a real model in production:
 *
 *   NEXT_PUBLIC_AI_PROVIDER=mock   (default — no key, no network)
 */

import type { AIProvider } from "@/types/ai";
import { MockAIProvider } from "./mock-provider";

/** Provider ids this build knows how to construct. */
export type AIProviderId = "mock";

const PROVIDERS: Record<AIProviderId, () => AIProvider> = {
  mock: () => new MockAIProvider(),
};

let cached: AIProvider | null = null;

/**
 * The active provider (memoised — providers are stateless, so one instance is
 * enough and it keeps identity stable across renders).
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const requested = (process.env.NEXT_PUBLIC_AI_PROVIDER ?? "mock") as AIProviderId;
  const factory = PROVIDERS[requested] ?? PROVIDERS.mock;
  cached = factory();
  return cached;
}

export { MockAIProvider };
