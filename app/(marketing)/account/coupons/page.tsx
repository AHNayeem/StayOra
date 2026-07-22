import type { Metadata } from "next";
import { getCoupons } from "@/services/account";
import { CouponsView } from "./coupons-view";

export const metadata: Metadata = { title: "Coupons" };

/** The traveler's promo-code wallet. */
export default async function CouponsPage() {
  const coupons = await getCoupons();
  return <CouponsView coupons={coupons} />;
}
