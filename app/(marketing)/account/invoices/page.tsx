import type { Metadata } from "next";
import { getInvoices } from "@/services/account";
import { InvoicesView } from "./invoices-view";

export const metadata: Metadata = { title: "Invoices" };

/** Billing documents for the traveler's bookings. */
export default async function InvoicesPage() {
  const invoices = await getInvoices();
  return <InvoicesView invoices={invoices} />;
}
