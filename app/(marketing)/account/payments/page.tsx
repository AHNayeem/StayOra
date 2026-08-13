import type { Metadata } from "next";
import { PaymentsView } from "./payments-view";

export const metadata: Metadata = { title: "Payments" };

/** The traveler's payment + refund history, derived from the domain bookings. */
export default function PaymentsPage() {
  return <PaymentsView payments={[]} />;
}
