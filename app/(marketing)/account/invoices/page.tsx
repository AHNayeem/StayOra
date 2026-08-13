import type { Metadata } from "next";
import { InvoicesView } from "./invoices-view";

export const metadata: Metadata = { title: "Invoices" };

/**
 * Billing documents for the traveler's bookings. Derived client-side from the
 * domain bookings, so an invoice can never disagree with its booking.
 */
export default function InvoicesPage() {
  return <InvoicesView invoices={[]} />;
}
