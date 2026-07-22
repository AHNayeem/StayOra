/**
 * http.ts — thin data-access seam.
 *
 * Every service in this folder returns Promises so the UI is already written
 * against an async API. Today they resolve mock data; swapping to a real
 * backend means changing only these functions, not the components.
 */

/** Simulate network latency for realistic loading states in development. */
export function mockDelay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((resolve) => {
    // In tests/SSR we resolve immediately to avoid blocking.
    if (process.env.NODE_ENV === "test") return resolve(data);
    setTimeout(() => resolve(data), ms);
  });
}

/** Paginated response envelope used by list endpoints. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function paginate<T>(all: T[], page = 1, pageSize = 6): Paginated<T> {
  const start = (page - 1) * pageSize;
  return {
    items: all.slice(start, start + pageSize),
    total: all.length,
    page,
    pageSize,
  };
}
