/**
 * MockTripRepository — trip plans the assistant has built this session.
 *
 * Deliberately in-memory: plans are derived from live inventory and are cheap
 * to rebuild, so persisting them would mostly persist stale prices. The
 * interface is still the one a `POST /trips` would satisfy, which is what the
 * "save this trip" affordance will call when a backend exists.
 */

import type { AITripPlan } from "@/types/ai";
import type { TripRepository } from "./types";

export class MockTripRepository implements TripRepository {
  readonly id = "mock-trips";

  private readonly plans = new Map<string, AITripPlan>();

  async save(plan: AITripPlan): Promise<AITripPlan> {
    this.plans.set(plan.id, plan);
    return plan;
  }

  async get(planId: string): Promise<AITripPlan | undefined> {
    return this.plans.get(planId);
  }

  async list(): Promise<AITripPlan[]> {
    return [...this.plans.values()];
  }
}
