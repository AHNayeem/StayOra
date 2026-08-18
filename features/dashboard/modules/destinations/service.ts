/**
 * Dashboard data source for destinations.
 *
 * This is an *adapter*, not a second store: every read and write goes to the same
 * `features/destinations` repository the public site uses, which is what makes
 * "publish" in this module change `/destinations` immediately. It exists only to
 * present that repository as the {@link ResourceService} the dashboard's list
 * engine expects — search, facets, sorting and pagination.
 *
 * When destinations move to an API, `features/destinations/repository.ts` changes
 * and this file does not.
 */

import { ApiError } from "../../data/errors";
import type { ID, ListParams, Paginated } from "../../data/types";
import { paginate } from "../../data/types";
import type { ResourceService } from "../../crud";
import { destinationRepository } from "@/features/destinations/repository";
import type {
  Destination,
  DestinationInput,
  DestinationPatch,
} from "@/types/destination";
import type { DestinationSummary } from "./types";

/** Fields free-text search scans. */
function haystack(row: Destination): string {
  return [row.name, row.country, row.region, row.slug].filter(Boolean).join(" ").toLowerCase();
}

/** Facets the list toolbar offers. Unknown keys fall through to no-ops. */
const FILTERS: Record<string, (row: Destination, value: string) => boolean> = {
  status: (row, value) => row.status === value,
  country: (row, value) => row.country === value,
  featured: (row, value) => String(Boolean(row.featured)) === value,
};

function sortValue(row: Destination, field: string): string | number {
  switch (field) {
    case "name":
      return row.name;
    case "country":
      return row.country;
    case "status":
      return row.status;
    case "updatedAt":
      return new Date(row.updatedAt).getTime();
    case "createdAt":
      return new Date(row.createdAt).getTime();
    default:
      return row.name;
  }
}

export const destinationsService: ResourceService<
  Destination,
  DestinationInput,
  DestinationPatch
> = {
  async list(params: ListParams = {}): Promise<Paginated<Destination>> {
    const { page = 1, pageSize = 10, sort, search, filters } = params;
    let rows = await destinationRepository.list();

    const term = search?.trim().toLowerCase();
    if (term) rows = rows.filter((row) => haystack(row).includes(term));

    if (filters) {
      for (const [key, raw] of Object.entries(filters)) {
        if (raw === undefined || raw === null || raw === "") continue;
        const predicate = FILTERS[key];
        if (predicate) rows = rows.filter((row) => predicate(row, String(raw)));
      }
    }

    const direction = sort?.direction === "desc" ? -1 : 1;
    const field = sort?.field ?? "updatedAt";
    rows = [...rows].sort((a, b) => {
      const av = sortValue(a, field);
      const bv = sortValue(b, field);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * direction;
    });

    const total = rows.length;
    const start = (page - 1) * pageSize;
    return paginate(rows.slice(start, start + pageSize), { page, pageSize, total });
  },

  async get(id: ID): Promise<Destination> {
    const row = await destinationRepository.getById(String(id));
    if (!row) {
      throw new ApiError({
        kind: "not-found",
        message: "That destination could not be found.",
      });
    }
    return row;
  },

  create: (input) => destinationRepository.create(input),
  update: (id, input) => destinationRepository.update(String(id), input),
  remove: (id) => destinationRepository.remove(String(id)),
  peek: () => destinationRepository.peek(),
};

export const destinationKeys = {
  all: ["destinations"] as const,
  summary: ["destinations", "summary"] as const,
  detail: (id: string) => ["destinations", id] as const,
};

/** Aggregate KPIs for the list header — a seam a real backend serves directly. */
export function getDestinationSummary(): Promise<DestinationSummary> {
  const rows = destinationRepository.peek();
  const published = rows.filter((row) => row.status === "published");
  return Promise.resolve({
    total: rows.length,
    published: published.length,
    draft: rows.filter((row) => row.status === "draft").length,
    featured: rows.filter((row) => row.featured).length,
    countries: new Set(published.map((row) => row.country)).size,
  });
}

/** Countries already in use, for the list's country facet. */
export function getDestinationCountryOptions(): string[] {
  return [...new Set(destinationRepository.peek().map((row) => row.country))].sort((a, b) =>
    a.localeCompare(b),
  );
}
