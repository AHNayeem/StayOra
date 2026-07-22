"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { type NavItem, PRIMARY_NAV } from "@/constants/navigation";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";

/** True when `href` matches the current path (exact for "/", prefix otherwise). */
function useIsActive() {
  const pathname = usePathname();
  return (href: string) => {
    if (href === "#") return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };
}

/**
 * DesktopNav — the primary horizontal navigation for large screens. Plain items
 * render as links; items with a `megaMenu` open a multi-column panel on hover
 * and keyboard focus. Rendered inside the sticky header.
 */
export function DesktopNav({ className }: { className?: string }) {
  const isActive = useIsActive();

  return (
    <nav aria-label="Primary" className={cn("hidden lg:block", className)}>
      <ul className="flex items-center gap-1">
        {PRIMARY_NAV.map((item) =>
          item.megaMenu ? (
            <MegaMenuItem key={item.label} item={item} />
          ) : (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "inline-flex h-16 items-center px-3.5 text-[15px] font-medium text-ink transition-colors hover:text-primary",
                  isActive(item.href) && "text-primary",
                )}
              >
                {item.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

function MegaMenuItem({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const isActive = useIsActive();
  const containsActive = item.megaMenu?.some((col) =>
    col.links.some((l) => isActive(l.href)),
  );

  useClickOutside(ref, () => setOpen(false), open);

  return (
    <li
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={cn(
          "inline-flex h-16 items-center gap-1 px-3.5 text-[15px] font-medium text-ink transition-colors hover:text-primary",
          (open || containsActive) && "text-primary",
        )}
      >
        {item.label}
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && item.megaMenu && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
          <div className="grid w-[44rem] grid-cols-3 gap-6 rounded-panel border border-line bg-surface p-6 shadow-menu">
            {item.megaMenu.map((col) => (
              <div key={col.heading}>
                <p className="text-overline mb-3 text-primary">{col.heading}</p>
                <ul className="space-y-1">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className={cn(
                          "block rounded-field px-3 py-2 text-sm text-body transition-colors hover:bg-primary-50 hover:text-primary",
                          isActive(link.href) &&
                            "bg-primary-50 font-medium text-primary",
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}
