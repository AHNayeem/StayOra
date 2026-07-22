"use client";

import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";

interface MoneyProps {
  /** Amount in base USD; converted + formatted in the active currency. */
  usd: number;
  className?: string;
}

/**
 * Money — a client island that formats a base-USD amount in the visitor's
 * chosen currency (via {@link useLocale}). Lets server-rendered account pages
 * (bookings, invoices, payments) display live-repriced amounts inline without
 * becoming client components themselves.
 */
export function Money({ usd, className }: MoneyProps) {
  const { money } = useLocale();
  return <span className={cn(className)}>{money(usd)}</span>;
}
