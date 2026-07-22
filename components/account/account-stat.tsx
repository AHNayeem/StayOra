import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountStatProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: string;
  /** Turns the whole card into a link. */
  href?: string;
  className?: string;
}

/**
 * AccountStat — a compact metric tile (icon, value, label) used on the overview
 * and section headers. Becomes a link when `href` is given.
 */
export function AccountStat({ label, value, icon: Icon, hint, href, className }: AccountStatProps) {
  const body = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-field bg-primary-50 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold text-ink">{value}</span>
        <span className="block truncate text-sm text-muted">{label}</span>
        {hint && <span className="mt-0.5 block truncate text-xs text-muted">{hint}</span>}
      </span>
    </>
  );

  const base = cn(
    "flex items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card",
    href && "transition-colors hover:border-primary/50",
    className,
  );

  return href ? (
    <Link href={href} className={base}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}
