/**
 * Deterministic pseudo-randomness for mock-data generation.
 *
 * SSR stability is non-negotiable: the server and client must build the exact
 * same datasets, so we never touch `Math.random()` or `Date.now()` at module
 * load. Instead every generator is seeded — same seed in, same data out — which
 * also keeps snapshots and pagination reproducible. Swap this whole layer out
 * when a real API arrives; nothing in the UI depends on it.
 */

/** A seeded, repeatable random source. Not cryptographic — for mock data only. */
export class SeededRandom {
  private state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === "string" ? hashString(seed) : seed >>> 0;
    // Avoid a zero state (mulberry32 degenerates).
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  /** Next float in [0, 1). */
  next(): number {
    // mulberry32
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [min, max) rounded to `decimals` places. */
  float(min: number, max: number, decimals = 2): number {
    const value = this.next() * (max - min) + min;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }

  /** True with probability `p` (default 0.5). */
  bool(p = 0.5): boolean {
    return this.next() < p;
  }

  /** A random element of `items`. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /** `count` distinct elements of `items` (or all, if fewer exist). */
  pickMany<T>(items: readonly T[], count: number): T[] {
    return this.shuffle(items).slice(0, Math.min(count, items.length));
  }

  /** A shuffled copy of `items` (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /**
   * An ISO date offset from a fixed epoch anchor by a random number of days in
   * `[minDays, maxDays]` (negative = past). No wall-clock read, so it's stable.
   */
  isoDate(anchorMs: number, minDays: number, maxDays: number): string {
    const offset = this.int(minDays, maxDays) * 86_400_000;
    return new Date(anchorMs + offset).toISOString();
  }
}

/** FNV-1a string hash → 32-bit unsigned int, for turning labels into seeds. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Fixed anchor for all relative mock dates: 2026-01-01T00:00:00Z.
 * Using a constant (never `Date.now()`) keeps generated timelines identical
 * between server and client renders.
 */
export const MOCK_EPOCH_MS = Date.UTC(2026, 0, 1);
