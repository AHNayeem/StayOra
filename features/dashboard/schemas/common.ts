/**
 * Reusable Zod building blocks.
 *
 * Feature modules compose their entity/form schemas from these so validation
 * rules (id shape, email, pagination envelope) stay consistent and are defined
 * once. Response schemas here feed the transport's `schema` option; form schemas
 * feed `useZodForm`. No business-specific literals live in this file.
 */
import { z } from "zod";

/** A non-empty, trimmed string — the default for required text fields. */
export const requiredString = z.string().trim().min(1, "Required");

/** Opaque resource identifier. */
export const idSchema = z.string().min(1);

/** RFC-ish email. */
export const emailSchema = z.email("Enter a valid email address");

/** ISO-8601 timestamp string. */
export const isoDateSchema = z.iso.datetime();

/** Sort direction, matching the data layer's `SortDirection`. */
export const sortDirectionSchema = z.enum(["asc", "desc"]);

/** Validates {@link import("../data/types").ListParams}-shaped input. */
export const listParamsSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(200).optional(),
  search: z.string().optional(),
  sort: z
    .object({ field: z.string(), direction: sortDirectionSchema })
    .nullish(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Wrap an item schema into a paginated-envelope schema whose inferred type is
 * assignable to `Paginated<Item>`. Pass the result to a repository as its
 * `page` schema to validate list responses.
 */
export function paginatedSchema<Item extends z.ZodTypeAny>(item: Item) {
  return z.object({
    items: z.array(item),
    page: z.number().int().nonnegative(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  });
}
