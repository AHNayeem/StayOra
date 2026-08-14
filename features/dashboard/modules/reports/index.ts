/**
 * Reports module — ten domain-derived reports behind one builder view.
 *
 * Every report reads the live booking, revenue and settlement records, so it
 * can never disagree with a dashboard screen. Export uses the shared CSV
 * infrastructure rather than a second export framework.
 */
export * from "./types";
export { reportsService, reportKeys, windowFor } from "./service";
export { ReportsView } from "./reports-view";
