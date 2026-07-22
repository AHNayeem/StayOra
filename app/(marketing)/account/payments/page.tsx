import type { Metadata } from "next";
import { getPayments } from "@/services/account";
import { PaymentsView } from "./payments-view";

export const metadata: Metadata = { title: "Payments" };

/** The traveler's payment + refund history. */
export default async function PaymentsPage() {
  const payments = await getPayments();
  return <PaymentsView payments={payments} />;
}
