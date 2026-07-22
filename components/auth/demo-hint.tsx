"use client";

import { Info } from "lucide-react";
import { DEMO_PASSWORD } from "@/services/auth";
import { cn } from "@/lib/utils";

export interface DemoAccount {
  role: string;
  email: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "Traveler", email: "traveler@stayora.com" },
  { role: "Merchant", email: "merchant@stayora.com" },
  { role: "Admin", email: "admin@stayora.com" },
];

/**
 * DemoHint — a discreet panel surfacing the seeded demo credentials so the
 * prototype is actually usable without a real backend. On the login screen the
 * rows are clickable (via `onPick`) to autofill the form.
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
      <ul className="mt-3 space-y-1.5">
        {DEMO_ACCOUNTS.map((acc) => {
          const content = (
            <>
              <span className="font-medium text-ink">{acc.role}</span>
              <span className="font-mono text-xs text-body">{acc.email}</span>
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
                    "hover:bg-primary-50",
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
