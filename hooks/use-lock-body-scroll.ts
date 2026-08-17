"use client";

import { useEffect } from "react";

/**
 * Module-level lock counter. Overlays overlap (a drawer that opens the auth
 * modal, a modal that opens the search dialog), and each consumer used to
 * snapshot `body.style.overflow` independently — so whichever unmounted last
 * restored the *locked* value it had observed, leaving the page frozen. One
 * shared counter means only the first lock captures the original styles and
 * only the last release puts them back.
 */
let lockCount = 0;
let restore: (() => void) | null = null;

function acquireLock() {
  lockCount += 1;
  if (lockCount > 1) return;

  const { body, documentElement: html } = document;
  const previousOverflow = body.style.overflow;
  const previousPaddingRight = body.style.paddingRight;
  const previousOverscroll = html.style.overscrollBehavior;

  // Hiding the scrollbar reflows the page ~15px wider on desktop, which shifts
  // the sticky header sideways the moment an overlay opens. Swap the gutter for
  // equivalent padding so nothing moves.
  const scrollbarWidth = window.innerWidth - html.clientWidth;

  body.style.overflow = "hidden";
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
  // `overflow: hidden` alone does not stop touch scroll from chaining to the
  // page once an overlay's own scroll area hits its end.
  html.style.overscrollBehavior = "none";

  restore = () => {
    body.style.overflow = previousOverflow;
    body.style.paddingRight = previousPaddingRight;
    html.style.overscrollBehavior = previousOverscroll;
  };
}

function releaseLock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && restore) {
    restore();
    restore = null;
  }
}

/**
 * Freezes background scrolling while `locked` is true (open drawers/modals).
 *
 * Locks are reference-counted across every consumer, so overlapping overlays
 * cannot clobber each other's restore state. Pass `false` whenever the overlay
 * is not actually visible — a lock held for a `display: none` panel is the
 * classic "page won't scroll and nothing is on screen" bug.
 */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    acquireLock();
    return releaseLock;
  }, [locked]);
}
