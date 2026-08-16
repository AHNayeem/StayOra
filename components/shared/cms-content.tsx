"use client";

import { useSyncExternalStore } from "react";
import { publishedContent, type PublishedContent } from "@/features/dashboard/modules/cms/published";

/**
 * Renders CMS copy when an editor has published some, and the page's own
 * shipped content when they have not.
 *
 * This is what makes "Publish" in the CMS mean something on the public site.
 * The fallback keeps every marketing page complete: a slug nobody has touched
 * renders exactly as it did before.
 *
 * Client-side because the prototype's CMS is client-persisted. With a real API
 * this becomes a server read in the page itself and the component disappears —
 * which is why nothing else depends on it.
 */

/** Content is written by the dashboard, in another tab at most. */
const subscribe = (listener: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
};

export function useCmsContent(slug: string): PublishedContent | null {
  return useSyncExternalStore(
    subscribe,
    () => publishedContent(slug),
    // The server has no access to the browser's CMS store, so it renders the
    // fallback and the client swaps in published copy after hydration.
    () => null,
  );
}

export function CmsContent({
  slug,
  fallback,
  className,
}: {
  slug: string;
  fallback: React.ReactNode;
  className?: string;
}) {
  const content = useCmsContent(slug);
  if (!content) return <>{fallback}</>;

  return (
    <div className={className} data-cms-slug={slug}>
      {content.body
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} className="mb-4 text-body last:mb-0">
            {paragraph}
          </p>
        ))}
    </div>
  );
}
