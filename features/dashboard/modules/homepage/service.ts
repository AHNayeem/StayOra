import { createStubService } from "../../crud";
import { HOME_BLOCKS_SEED } from "./data";
import type { HomeBlock } from "./types";

/** Homepage section blocks data source (in-memory stub; repository-ready). */
export const homepageService = createStubService<HomeBlock>({
  seed: HOME_BLOCKS_SEED,
  getId: (row) => row.id,
  searchFields: ["name", "description"],
  idPrefix: "block",
  applyUpdate: (existing, input) => ({
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  }),
});

export const homepageKeys = {
  all: ["cms", "homepage"] as const,
};

/** Total sections — the max order is `count - 1` (this set is add/remove-free). */
export const HOME_BLOCK_COUNT = HOME_BLOCKS_SEED.length;

/**
 * Move a block one slot up (-1) or down (+1) by swapping `order` with its
 * neighbour. Reorder lives in the data layer (not the component) so a real
 * repository can implement it transactionally behind the same seam.
 */
export async function moveBlock(id: string, direction: -1 | 1): Promise<HomeBlock> {
  const { items } = await homepageService.list({
    page: 1,
    pageSize: 100,
    sort: { field: "order", direction: "asc" },
  });
  const index = items.findIndex((b) => b.id === id);
  const current = items[index];
  const neighbor = items[index + direction];
  if (!current || !neighbor) return current ?? items[0];
  await homepageService.update(current.id, { order: neighbor.order });
  return homepageService.update(neighbor.id, { order: current.order });
}
