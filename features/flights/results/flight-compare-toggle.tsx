"use client";

import { Check, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  FLIGHT_COMPARE_LIMIT,
  toggleFlightCompare,
  useIsComparingFlight,
} from "../compare-store";

interface FlightCompareToggleProps {
  offerId: string;
  /** Human description of the offer — the toast body and the accessible name. */
  label: string;
  className?: string;
}

/**
 * FlightCompareToggle — the tray toggle in a result card's action column.
 *
 * A labelled button rather than the icon-only overlay the stay cards use: a
 * flight card has no media to overlay, and its action column is where travellers
 * already look for "Select" and "Flight details". `aria-pressed` carries the
 * state, so the label stays short.
 */
export function FlightCompareToggle({
  offerId,
  label,
  className,
}: FlightCompareToggleProps) {
  const comparing = useIsComparingFlight(offerId);

  const toggle = () => {
    const result = toggleFlightCompare(offerId);
    if (result === "full") {
      toast.info(`Compare holds ${FLIGHT_COMPARE_LIMIT} flights`, {
        description: "Remove one from the compare tray to add another.",
      });
      return;
    }
    toast[result === "added" ? "success" : "info"](
      result === "added" ? "Added to compare" : "Removed from compare",
      { description: label },
    );
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-pressed={comparing}
      aria-label={comparing ? `Remove ${label} from compare` : `Add ${label} to compare`}
      leftIcon={
        comparing ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Scale className="size-4" aria-hidden="true" />
        )
      }
      className={className}
    >
      {comparing ? "In compare" : "Compare"}
    </Button>
  );
}
