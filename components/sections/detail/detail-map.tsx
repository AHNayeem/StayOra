import { MapPin, ExternalLink } from "lucide-react";
import type { GeoLocation } from "@/types/booking";
import { DetailBlock } from "./detail-block";

interface DetailMapProps {
  location: GeoLocation;
}

/**
 * DetailMap — an embedded, interactive map centred on the listing's location
 * plus a "Get directions" link. Uses Google Maps' keyless embed endpoint, so it
 * works out of the box; swap the src for a keyed provider when going to
 * production.
 */
export function DetailMap({ location }: DetailMapProps) {
  const query = [location.label, location.city, location.country]
    .filter(Boolean)
    .join(", ");
  const encoded = encodeURIComponent(query);
  const embedSrc = `https://maps.google.com/maps?q=${encoded}&z=12&output=embed`;
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  return (
    <DetailBlock title="Location">
      <div className="flex items-center gap-2 text-sm text-body">
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
        {location.label}
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-line">
        <iframe
          title={`Map showing ${query}`}
          src={embedSrc}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-[320px] w-full border-0"
        />
      </div>

      <a
        href={directionsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        Get directions
        <ExternalLink className="size-4" aria-hidden="true" />
      </a>
    </DetailBlock>
  );
}
