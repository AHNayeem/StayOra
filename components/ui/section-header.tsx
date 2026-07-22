import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionHeaderAlign = "left" | "center";

interface SectionHeaderProps {
  /** Small uppercase kicker above the title. */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: SectionHeaderAlign;
  /** Action node (e.g. a "View all" button) shown opposite the text on desktop. */
  action?: ReactNode;
  /** Heading level for the title. Default "h2". */
  as?: "h2" | "h3";
  className?: string;
}

/**
 * SectionHeader — the standard eyebrow + title + description block that opens
 * every home/listing section, with an optional trailing action. Centered or
 * left-aligned; when an action is present the layout splits on desktop.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  as = "h2",
  className,
}: SectionHeaderProps) {
  const Heading = as;
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        action && !centered
          ? "md:flex-row md:items-end md:justify-between"
          : centered && "items-center text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        {eyebrow && <p className="text-overline">{eyebrow}</p>}
        <Heading className={cn(as === "h2" ? "text-h2" : "text-h3", "mt-3")}>
          {title}
        </Heading>
        {description && (
          <p className="mt-4 text-body">{description}</p>
        )}
      </div>
      {action && <div className={cn("shrink-0", centered && "mx-auto")}>{action}</div>}
    </div>
  );
}
