/**
 * B2B module — agency/corporate travel commerce.
 *
 * The B2B side reuses the platform's booking lifecycle, commission engine and
 * refund rules; what differs is the pricing build-up (net rate + markup), the
 * payment arrangement (credit, not card) and the document trail (consolidated
 * invoices settled on terms).
 */
export * from "./types";
export { accountColumns, invoiceColumns } from "./columns";
export {
  b2bKeys,
  useB2BAccounts,
  useB2BInvoices,
  useB2BSummary,
  useCreateB2BAccount,
  useCreditStatus,
  usePayInvoice,
  useUpdateB2BAccount,
} from "./hooks";
export { B2BOverview } from "./overview";
export { B2BAccountsList } from "./accounts-list";
export { B2BBookingsList } from "./bookings-list";
export { B2BInvoicesList } from "./invoices-list";
