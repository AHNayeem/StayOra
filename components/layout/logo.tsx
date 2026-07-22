import Link from "next/link";
import { Compass } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { cn } from "@/lib/utils";

/**
 * Logo — brand wordmark with an icon lockup, linking home. Text-based so it
 * stays crisp at any size; swap the mark for an <Image> when brand art exists.
 * `tone` adapts the wordmark for light vs. dark backgrounds.
 */
export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href="/"
      aria-label={`${siteConfig.name} home`}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span className="grid size-9 place-items-center rounded-card bg-primary text-white">
        <Compass className="size-5" aria-hidden="true" />
      </span>
      <span
        className={cn(
          "text-2xl font-bold tracking-tight",
          tone === "dark" ? "text-ink" : "text-white",
        )}
      >
        {siteConfig.name}
      </span>
    </Link>
  );
}
