"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, TimerOff } from "lucide-react";
import type { InventoryHold } from "@/features/dashboard/domain";
import { cn } from "@/lib/utils";

/**
 * Price-lock / inventory-hold countdown.
 *
 * The hold is real: those units are out of availability until it lapses, so the
 * timer is not decoration — when it hits zero the rooms go back on sale and the
 * quote has to be rebuilt. `onExpire` fires exactly once.
 *
 * Render it with `key={hold.id}` so a new hold gets a fresh countdown rather
 * than one that has to be reset from inside an effect.
 */
export function HoldTimer({
  hold,
  onExpire,
  className,
}: {
  hold: InventoryHold;
  onExpire: () => void;
  className?: string;
}) {
  const expiresAtMs = new Date(hold.expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, expiresAtMs - Date.now()));

  // The callback is read through a ref so a new closure from the parent doesn't
  // tear down and restart the interval every render.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = Math.max(0, expiresAtMs - Date.now());
      setRemaining(next);
      if (next === 0) {
        window.clearInterval(id);
        onExpireRef.current();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [expiresAtMs]);

  const expired = remaining === 0;
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const urgent = !expired && remaining < 3 * 60_000;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-field border px-3.5 py-2 text-sm",
        expired
          ? "border-danger/30 bg-danger/8 text-danger"
          : urgent
            ? "border-warning/40 bg-warning/12 text-amber-700"
            : "border-line bg-surface-muted/60 text-body",
        className,
      )}
    >
      {expired ? (
        <TimerOff className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <Clock className="size-4 shrink-0" aria-hidden="true" />
      )}
      <span aria-live={urgent ? "polite" : "off"}>
        {expired ? (
          "Your hold expired — we'll re-check availability and pricing."
        ) : (
          <>
            We&rsquo;re holding {hold.units} {hold.units === 1 ? "unit" : "units"} and this
            price for{" "}
            <strong className="font-mono font-semibold tabular-nums">
              {minutes}:{String(seconds).padStart(2, "0")}
            </strong>
          </>
        )}
      </span>
    </div>
  );
}
