/**
 * MockAIProvider — the deterministic engine behind the prototype.
 *
 * It now does exactly what an LLM-backed provider would do, in the same order
 * and through the same objects:
 *
 *   1. understand the message  → `nlu/parse`
 *   2. decide what to do       → `agent/planner` (a model would emit the same
 *                                {@link AgentAction} union here)
 *   3. call tools              → `agent/tool-runner`, which checks permissions,
 *                                enforces the turn's budget and logs
 *   4. compose a response      → `agent/actions/*` → typed blocks
 *
 * The important property is what it *cannot* do: it has no access to listings,
 * fares, inventory or bookings except through the tool barrel, so no price,
 * availability or policy in an answer can be anything other than what Otithee's
 * own services returned. Swapping this class for an LLM-backed one keeps that
 * guarantee, because the guarantee lives in the runner rather than in the
 * prompt.
 */

import type { AIProvider, AIRequest, AIRespondOptions, AIResponse } from "@/types/ai";
import { runAgent } from "../agent/orchestrator";

export class MockAIProvider implements AIProvider {
  readonly id = "mock";
  readonly label = "Otithee Mock Engine";

  respond(request: AIRequest, options?: AIRespondOptions): Promise<AIResponse> {
    return runAgent(request, options);
  }
}
