import type { Metadata } from "next";
import { AccountShell } from "@/components/account";

export const metadata: Metadata = {
  title: { default: "My account", template: "%s · My account · StayOra" },
  description: "Manage your trips, bookings, wishlist and account settings.",
  robots: { index: false, follow: false },
};

/**
 * Account area layout. Wraps every `/account/*` page in the client-guarded
 * {@link AccountShell} (identity strip + section sidebar). Nested inside the
 * marketing group, so the site header/footer and locale provider are already
 * in place.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
