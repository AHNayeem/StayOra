import Link from "next/link";
import { CalendarDays, MapPin, Moon } from "lucide-react";
import type { TravelPackage } from "@/types/home";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardFooter,
  CardMedia,
  CardMetaList,
  CardTitle,
} from "@/components/ui/card";
import { PriceTag } from "@/components/ui/price-tag";
import { RatingStars } from "@/components/ui/rating-stars";
import { cn } from "@/lib/utils";

/**
 * PackageCard — a curated multi-item trip bundle: hero image, destination,
 * duration, rating, what's included and a "from" price. The title links to the
 * package (tours) route; the whole media is a stretched link.
 */
export function PackageCard({
  pkg,
  className,
}: {
  pkg: TravelPackage;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardMedia
        src={pkg.image}
        alt={`${pkg.title}, ${pkg.country}`}
        href={pkg.href}
        aspect="wide"
        gradient
        badges={pkg.tag ? <Badge variant="accent">{pkg.tag}</Badge> : undefined}
        overlay={
          <p className="pointer-events-none inline-flex items-center gap-1 text-sm font-medium text-white">
            <MapPin className="size-3.5" aria-hidden="true" />
            {pkg.destination}, {pkg.country}
          </p>
        }
      />
      <CardBody>
        <CardMetaList
          items={[
            { icon: Moon, label: `${pkg.nights} nights` },
            { icon: CalendarDays, label: `${pkg.days} days` },
          ]}
        />
        <CardTitle href={pkg.href}>{pkg.title}</CardTitle>
        <RatingStars
          value={pkg.rating}
          size="sm"
          showValue
          reviewCount={pkg.reviews}
        />
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {pkg.includes.map((item) => (
            <li
              key={item}
              className="rounded-pill bg-surface-muted px-2.5 py-0.5 text-xs text-body"
            >
              {item}
            </li>
          ))}
        </ul>
      </CardBody>
      <CardFooter>
        <PriceTag price={pkg.price} size="sm" from showDiscount />
        <Link
          href={pkg.href}
          className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
        >
          View trip
        </Link>
      </CardFooter>
    </Card>
  );
}
