import type { Airline } from "@/types/flight";
import { AIRLINES_BY_CODE } from "@/lib/mock/airlines";
import { cn } from "@/lib/utils";

const sizeMap = {
  xs: "size-6 text-[0.5625rem]",
  sm: "size-8 text-[0.6875rem]",
  md: "size-10 text-xs",
  lg: "size-14 text-base",
} as const;

export type AirlineLogoSize = keyof typeof sizeMap;

interface AirlineLogoProps {
  /** IATA designator, e.g. "EK". */
  code: string;
  size?: AirlineLogoSize;
  className?: string;
}

/**
 * AirlineLogo — a generated brand mark for a carrier.
 *
 * Deliberately *not* a fetched image. Airline logos are trademarked assets with
 * real licensing constraints, and a demo shouldn't hotlink twenty of them. A
 * coloured tile carrying the IATA code is instantly recognisable to anyone who
 * books flights, renders offline, never 404s, and costs no network round-trip in
 * a list of forty results. Swapping in real artwork later means changing only
 * this component.
 */
export function AirlineLogo({ code, size = "md", className }: AirlineLogoProps) {
  const airline: Airline | undefined = AIRLINES_BY_CODE[code];
  const name = airline?.name ?? code;

  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-field font-bold tracking-tight tabular-nums",
        sizeMap[size],
        className,
      )}
      style={{
        backgroundColor: airline?.brandColor ?? "var(--color-surface-muted)",
        color: airline?.logoTextColor ?? "var(--color-ink)",
      }}
    >
      {code}
    </span>
  );
}

/**
 * A row of overlapping logos for an itinerary flown by more than one carrier.
 * Falls back to a single mark when there's only one.
 */
export function AirlineLogoStack({
  codes,
  size = "md",
  className,
}: {
  codes: string[];
  size?: AirlineLogoSize;
  className?: string;
}) {
  const unique = [...new Set(codes)];
  if (unique.length === 1) {
    return <AirlineLogo code={unique[0]} size={size} className={className} />;
  }
  return (
    <span className={cn("inline-flex items-center -space-x-2", className)}>
      {unique.slice(0, 3).map((code) => (
        <AirlineLogo
          key={code}
          code={code}
          size={size}
          className="ring-2 ring-surface"
        />
      ))}
    </span>
  );
}
