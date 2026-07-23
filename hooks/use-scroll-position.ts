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
 * on scroll direction: hides when scrolling down past `threshold`, reveals when
 * scrolling back up or near the top. Reads via requestAnimationFrame to stay
 * smooth. Drives the top bar's collapse/expand behaviour.
 */
export function useHideOnScrollDown(threshold = 44): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    function update() {
      const y = window.scrollY;
      if (y <= threshold) {
        setHidden(false); // near the top — always show
      } else if (y > lastY) {
        setHidden(true); // scrolling down — hide
      } else if (y < lastY) {
        setHidden(false); // scrolling up — show
      }
      lastY = y;
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
