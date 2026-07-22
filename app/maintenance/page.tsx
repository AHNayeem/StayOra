import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export const metadata: Metadata = {
  title: "Down for maintenance",
  robots: { index: false, follow: false },
};

/**
 * Maintenance screen — a standalone page (outside the marketing chrome) shown
 * while the platform is temporarily offline. Phase 7's admin "maintenance mode"
 * toggle will route visitors here; today it's directly reachable at
 * `/maintenance`.
 */
export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <Logo />
      <span className="grid size-16 place-items-center rounded-full bg-primary-50 text-primary">
        <Wrench className="size-8" aria-hidden="true" />
      </span>
      <div className="max-w-md">
        <h1 className="text-h3 text-ink">We&apos;ll be right back</h1>
        <p className="mt-2 text-body">
          We&apos;re carrying out some scheduled maintenance to make things better. Please check
          back in a little while — your bookings and account are safe.
        </p>
      </div>
      <p className="text-sm text-muted">Thanks for your patience.</p>
    </main>
  );
}
