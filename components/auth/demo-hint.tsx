"use client";

import { Info } from "lucide-react";
import { DEMO_ACCOUNT_HINTS } from "@/constants/accounts";
import { DEMO_PASSWORD } from "@/services/auth";
import { cn } from "@/lib/utils";

export interface DemoAccount {
  role: string;
  email: string;
}

/**
 * DemoHint — surfaces the seeded demo credentials so the prototype is usable
 * without a real backend. Every role the platform models is listed with where it
 * lands after sign-in, which is how a reviewer walks the admin / merchant /
 * agency / customer boundaries. On the login screen the rows autofill the form.
 */
export function DemoHint({
  onPick,
}: {
  onPick?: (account: { email: string; password: string }) => void;
}) {
  return (
    <div className="rounded-card border border-line bg-surface-muted/60 p-4 text-sm">
      <p className="flex items-center gap-1.5 font-medium text-ink">
        <Info className="size-4 text-primary" aria-hidden="true" />
        Demo accounts
      </p>
      <p className="mt-1 text-xs text-muted">
        Password for all: <span className="font-mono text-body">{DEMO_PASSWORD}</span>
      </p>
      <ul className="mt-3 space-y-1">
        {DEMO_ACCOUNT_HINTS.map((acc) => {
          const content = (
            <>
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{acc.label}</span>
                <span className="block truncate text-xs text-muted">{acc.note}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-xs text-body">{acc.email}</span>
                <span className="block text-[0.6875rem] text-muted">→ {acc.lands}</span>
              </span>
            </>
          );
          return (
            <li key={acc.email}>
              {onPick ? (
                <button
                  type="button"
                  onClick={() => onPick({ email: acc.email, password: DEMO_PASSWORD })}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-field px-2.5 py-1.5 text-left transition-colors",
                    "hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3 px-2.5 py-1.5">
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
