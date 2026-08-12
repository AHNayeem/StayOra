import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/constants/site";
import { cn } from "@/lib/utils";

/** Intrinsic size of `/images/logo.png`, used to reserve space and keep ratio. */
const LOGO_WIDTH = 1694;
const LOGO_HEIGHT = 324;

/**
 * Logo — brand mark image, linking home. Rendered at a fixed height with an
 * auto width so the wordmark keeps its aspect ratio; pass `className` to
 * change the height. `tone="light"` flattens the mark to white for dark
 * backgrounds, where the near-black tagline would otherwise disappear.
 */
export function Logo({
  className,
  tone = "dark",
  preload = false,
}: {
  className?: string;
  tone?: "dark" | "light";
  preload?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} home`}
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <Image
        src="/images/logo.png"
        alt=""
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        preload={preload}
        // Rendered ~146px wide (h-7) / ~188px (sm:h-9); without this the
        // optimizer would serve the full-width source.
        sizes="(min-width: 640px) 188px, 146px"
        className={cn(
          "h-7 w-auto sm:h-9",
          tone === "light" && "brightness-0 invert",
        )}
      />
    </Link>
  );
}
