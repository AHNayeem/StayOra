"use client";

import Link from "next/link";
import { EmptyState } from "../../components/state-views";

/** Shown when a non-merchant principal opens a merchant-only screen. */
export function NoMerchantAccount() {
  return (
    <EmptyState
      title="No merchant account"
      description="This screen belongs to a merchant workspace. Sign in as a merchant to use it."
      action={
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
          Back to dashboard
        </Link>
      }
    />
  );
}

export function WorkspaceSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-card bg-surface-muted" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-card bg-surface-muted" />
    </div>
  );
}
