import { cn } from "@/lib/utils";
import type { ElementType, ReactNode } from "react";
import { Container } from "./container";

type SectionBackground = "surface" | "muted" | "dark";
type SectionSpacing = "sm" | "md" | "lg";

interface SectionProps {
  children: ReactNode;
  className?: string;
  /** Inner container className. */
  containerClassName?: string;
  /** Background band. Alternate "surface"/"muted" for vertical rhythm. */
  background?: SectionBackground;
  /** Vertical padding scale. Default "lg". */
  spacing?: SectionSpacing;
  /** Skip the inner Container (for full-bleed sections). */
  fluid?: boolean;
  as?: ElementType;
  id?: string;
}

const backgroundMap: Record<SectionBackground, string> = {
  surface: "bg-surface text-ink",
  muted: "bg-surface-muted text-ink",
  dark: "bg-dark text-white",
};

const spacingMap: Record<SectionSpacing, string> = {
  sm: "py-12 md:py-16",
  md: "py-14 md:py-20",
  lg: "py-16 md:py-24",
};

/**
 * Section — a full-width band with consistent vertical rhythm and an optional
 * centered Container. Backgrounds alternate to structure the page.
 */
export function Section({
  children,
  className,
  containerClassName,
  background = "surface",
  spacing = "lg",
  fluid = false,
  as,
  id,
}: SectionProps) {
  const Component = as ?? "section";
  return (
    <Component
      id={id}
      className={cn(backgroundMap[background], spacingMap[spacing], className)}
    >
      {fluid ? children : <Container className={containerClassName}>{children}</Container>}
    </Component>
  );
}
