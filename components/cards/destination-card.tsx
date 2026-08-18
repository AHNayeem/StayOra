import { MapPin } from "lucide-react";
import type { Destination } from "@/types/destination";
import { Card, CardMedia } from "@/components/ui/card";
import { destinationHref } from "@/features/destinations/links";
import { formatPrice } from "@/lib/utils";

/**
 * DestinationCard — an image tile with the place name and listing count
 * overlaid. The whole tile is a stretched link (via CardMedia `href`); the
 * caption is `pointer-events-none` so clicks fall through to it.
 *
 * The href comes from {@link destinationHref} rather than being assembled here,
 * so a card can only ever link to a real destination slug.
 */
export function DestinationCard({
  destination,
  className,
}: {
  destination: Destination;
  className?: string;
}) {
  const { name, country, image, propertyCount, startingPrice, shortDescription } = destination;

  return (
    <Card className={className}>
      <CardMedia
        src={image}
        alt={country ? `${name}, ${country}` : name}
        href={destinationHref(destination)}
        aspect="portrait"
        gradient
        overlay={
          <div className="pointer-events-none text-white">
            <p className="text-lg font-semibold">{name}</p>
            <p className="inline-flex items-center gap-1 text-sm text-white/85">
              <MapPin className="size-3.5" aria-hidden="true" />
              {/* Destinations created in the dashboard have no listing count
                  until inventory is matched, so fall back to the country. */}
              {propertyCount ? `${propertyCount.toLocaleString()} properties` : country}
              {startingPrice && (
                <span className="ml-1">· from {formatPrice(startingPrice.amount)}</span>
              )}
            </p>
            {shortDescription && (
              <p className="mt-1 line-clamp-2 text-xs text-white/75">{shortDescription}</p>
            )}
          </div>
        }
      />
    </Card>
  );
}
