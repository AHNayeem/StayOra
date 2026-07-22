import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StateView } from "@/features/dashboard/components/state-views";

/** 404 for unknown dashboard routes — rendered inside the shell chrome. */
export default function DashboardNotFound() {
  return (
    <StateView
      icon={<Compass className="size-6" aria-hidden="true" />}
      title="Page not found"
      description="This dashboard page doesn't exist or may have moved."
      action={
        <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "sm" })}>
          Back to dashboard
        </Link>
      }
    />
  );
}
