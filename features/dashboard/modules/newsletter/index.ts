/** Newsletter module — subscriber audience (types, service, columns, hooks, UI). */
export * from "./types";
export { newsletterService, newsletterKeys, getNewsletterSummary } from "./service";
export { newsletterColumns } from "./columns";
export {
  useSubscribers,
  useNewsletterSummary,
  useSetSubscriberStatus,
  useDeleteSubscriber,
} from "./hooks";
export { NewsletterList } from "./list";
