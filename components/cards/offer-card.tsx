import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Offer } from "@/types/content";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardMedia } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** OfferCard — a promotional deal: discount badge, copy, promo code and CTA. */
export function OfferCard({ offer, className }: { offer: Offer; className?: string }) {
  return (
    <Card className={className}>
      <CardMedia
        src={offer.image}
        alt={offer.title}
        aspect="wide"
        gradient
        badges={<Badge variant="accent">{offer.discountLabel}</Badge>}
      />
      <CardBody>
        <h3 className="text-lg font-semibold text-ink">{offer.title}</h3>
        <p className="line-clamp-2 text-sm text-body">{offer.description}</p>
        {offer.code && (
          <p className="mt-1 text-sm text-body">
            Use code{" "}
            <span className="rounded-sm border border-dashed border-primary bg-primary-50 px-2 py-0.5 font-semibold text-primary-700">
              {offer.code}
            </span>
          </p>
        )}
      </CardBody>
      <CardFooter>
        <Link
          href={offer.href}
          className={cn(buttonVariants({ variant: "primary", size: "sm" }), "gap-1.5")}
        >
          Grab deal
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
