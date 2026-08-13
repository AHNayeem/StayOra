import type { Metadata } from "next";
import { CouponsView } from "./coupons-view";

export const metadata: Metadata = { title: "Coupons" };

/** The traveller's coupon wallet — the same records checkout validates. */
export default function CouponsPage() {
  return <CouponsView />;
}
