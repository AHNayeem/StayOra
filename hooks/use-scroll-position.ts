"use client";

import { useEffect, useState } from "react";

/**
 * Returns true once the window has scrolled past `threshold` pixels.
 * Drives the sticky header's condensed/elevated state. Reads the initial
 * position on mount so a mid-page refresh renders the correct state.
 */
export function useScrolledPast(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}

/**
 * Reports whether a slim element (e.g. the top utility bar) should hide based
 * on scroll direction: hides when scrolling down, reveals when scrolling back
 * up or near the top. Reads via requestAnimationFrame to stay smooth.
 *
 * Toggling only happens after the user moves further than `threshold` (the
 * collapsing element's own height) from the furthest point reached in the
 * current direction. Collapsing the bar shifts the document by ~`threshold`px,
 * which the browser's scroll anchoring turns into a phantom scroll event; by
 * requiring a larger move to flip state, that phantom can never re-toggle us —
 * which is what caused the header to jitter on slow up-scrolls.
 */
export function useHideOnScrollDown(threshold = 44): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // A move must beat the collapsing bar's height plus a safety margin so the
    // reflow it triggers stays below the toggle threshold.
    const delta = threshold + 20;
    let hiddenNow = false; // mirror of state, avoids a stale-closure read
    let anchorY = window.scrollY; // furthest point reached since the last flip
    let ticking = false;

    function update() {
      const y = window.scrollY;

      if (y <= threshold) {
        // Near the top — always show, and reset the anchor to here.
        if (hiddenNow) {
          hiddenNow = false;
          setHidden(false);
        }
        anchorY = y;
      } else if (!hiddenNow && y > anchorY + delta) {
        hiddenNow = true; // scrolled down far enough — hide
        setHidden(true);
        anchorY = y;
      } else if (hiddenNow && y < anchorY - delta) {
        hiddenNow = false; // scrolled up far enough — show
        setHidden(false);
        anchorY = y;
      } else if (hiddenNow ? y > anchorY : y < anchorY) {
        // Extend the anchor to the furthest point in the current direction so
        // the next reversal is measured from the extreme, not the last flip.
        anchorY = y;
      }

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}
