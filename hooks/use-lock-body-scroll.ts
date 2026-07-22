"use client";

import { useEffect } from "react";

/**
 * Freezes background scrolling while `locked` is true (open drawers/modals).
 * Restores the previous overflow value on unlock/unmount so nested consumers
 * don't clobber each other.
 */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}
