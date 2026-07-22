import Image from "next/image";
import type { ReactNode } from "react";
import { Container } from "./container";
import { Breadcrumb, type BreadcrumbItem } from "./breadcrumb";
import { cn } from "@/lib/utils";

interface PageBannerProps {
  title: ReactNode;
  /** Supporting line under the title. */
  description?: ReactNode;
  /** Breadcrumb trail rendered beneath the title. */
  breadcrumb?: BreadcrumbItem[];
  /** Background image URL. Falls back to a solid dark band when absent. */
  image?: string;
  imageAlt?: string;
  /** Extra content (e.g. a search bar) rendered below the heading block. */
  children?: ReactNode;
  className?: string;
}

/**
 * PageBanner — the inner-page header: a compact dark hero with an optional
 * background image, title, description and breadcrumb. The standard opener for
 * listing, details and content pages (distinct from the home {@link Hero}).
 */
export function PageBanner({
  title,
  description,
  breadcrumb,
  image,
  imageAlt = "",
  children,
  className,
}: PageBannerProps) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-dark py-14 text-white md:py-20",
        className,
      )}
    >
      {image && (
        <div className="absolute inset-0 -z-10">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/65 to-ink/40" />
        </div>
      )}

      <Container>
        <h1 className="text-h1 max-w-3xl text-white/90">{title}</h1>
        {description && (
          <p className="mt-4 max-w-2xl text-lg text-white/80">{description}</p>
        )}
        {breadcrumb && (
          <Breadcrumb items={breadcrumb} tone="onDark" className="mt-5" />
        )}
        {children && <div className="mt-8">{children}</div>}
      </Container>
    </section>
  );
}
