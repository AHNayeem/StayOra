import Link from "next/link";
import { ArrowLeft, Compass, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { VERTICALS } from "@/constants/verticals";
import { cn } from "@/lib/utils";

/** A few high-traffic destinations to offer instead of the dead end. */
const SUGGESTIONS = [
  { label: "Hotels", href: VERTICALS.hotels.href },
  { label: "Tours", href: VERTICALS.tours.href },
  { label: "Destinations", href: "/destinations" },
  { label: "Blog", href: "/blogs" },
  { label: "Contact", href: "/contact-us" },
];

/**
 * Global 404 — shown for `notFound()` calls (e.g. unknown listing/blog slugs)
 * and any unmatched URL. Renders inside the root layout, so the header and
 * footer stay in place; offers a way back plus popular destinations.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center py-20 md:py-28">
      <Container className="flex flex-col items-center text-center">
        <p className="text-[6rem] leading-none font-bold text-primary/20 md:text-[9rem]">
          404
        </p>
        <h1 className="text-h1 -mt-4">This page took a wrong turn</h1>
        <p className="mt-4 max-w-md text-body">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
          Let&apos;s get you back on the map.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "gap-2")}>
            <Home className="size-4" aria-hidden="true" />
            Back to home
          </Link>
          <Link
            href="/destinations"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
          >
            <Compass className="size-4" aria-hidden="true" />
            Explore destinations
          </Link>
        </div>

        <div className="mt-12">
          <p className="text-sm font-semibold text-ink">Popular pages</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 rounded-pill border border-line px-4 py-2 text-sm text-body transition-colors hover:border-primary hover:text-primary"
                >
                  <ArrowLeft className="size-3.5 rotate-180" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </main>
  );
}
