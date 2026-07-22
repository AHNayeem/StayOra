import { MapPin } from "lucide-react";
import type { Destination } from "@/types/content";
import { Card, CardMedia } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

/**
 * DestinationCard — an image tile with the place name and listing count
 * overlaid. The whole tile is a stretched link (via CardMedia `href`); the
 * caption is `pointer-events-none` so clicks fall through to it.
 */
export function DestinationCard({
  destination,
  className,
}: {
  destination: Destination;
  className?: string;
}) {
  const { slug, name, country, image, propertyCount, startingPrice } = destination;

  return (
    <Card className={className}>
      <CardMedia
        src={image}
        alt={country ? `${name}, ${country}` : name}
        href={`/destinations/${slug}`}
        aspect="portrait"
        gradient
        overlay={
          <div className="pointer-events-none text-white">
            <p className="text-lg font-semibold">{name}</p>
            <p className="inline-flex items-center gap-1 text-sm text-white/85">
              <MapPin className="size-3.5" aria-hidden="true" />
              {propertyCount.toLocaleString()} properties
              {startingPrice && (
                <span className="ml-1">· from {formatPrice(startingPrice.amount)}</span>
              )}
            </p>
          </div>
        }
      />
    </Card>
  );
}
