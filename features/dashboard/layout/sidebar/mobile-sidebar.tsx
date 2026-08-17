"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useShell } from "../shell-context";
import { SidebarContent } from "./sidebar";

/**
 * Off-canvas sidebar for tablet/mobile. Reuses {@link SidebarContent}, traps
 * focus while open, locks background scroll, closes on Escape/overlay tap and
 * auto-dismisses on route change.
 */
export function MobileSidebar() {
  const { mobileOpen, setMobileOpen } = useShell();
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  // Matches the `lg:hidden` below and the trigger in TopNav.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useLockBodyScroll(mobileOpen && !isDesktop);
  useFocusTrap(panelRef, mobileOpen, () => setMobileOpen(false));

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Resizing up to the permanent sidebar hides this panel; drop the state so it
  // does not hold a scroll lock (or reappear) once nothing is on screen.
  useEffect(() => {
    if (mobileOpen && isDesktop) setMobileOpen(false);
  }, [mobileOpen, isDesktop, setMobileOpen]);

  if (!mobileOpen || isDesktop) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="animate-fade-in absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        className="animate-slide-in-left absolute inset-y-0 left-0 w-72 border-r border-line shadow-menu outline-none"
      >
        <SidebarContent />
      </div>
    </div>
  );
}
