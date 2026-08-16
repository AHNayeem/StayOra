/**
 * Catalogue products module — the canonical per-vertical product list.
 *
 * Replaces the eight stub-backed vertical modules (hotels, apartments, …) that
 * managed data the storefront could not see. Everything here reads and writes
 * the same catalogue the public site sells from.
 */
export { CatalogueProductsView } from "./products-view";
export { BulkImportDialog, parseCsv, toCsv, downloadCsv } from "./bulk";
export type { ParsedRow } from "./bulk";
