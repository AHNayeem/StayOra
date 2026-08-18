"use client";

import { useRouter } from "next/navigation";
import { ErrorState } from "../../components/state-views";
import { FormSkeleton } from "../../ui";
import { BLOG_DASHBOARD_HREF } from "@/features/blog/links";
import { useBlogPost } from "./hooks";
import { BlogForm } from "./form";

/**
 * Loads a post by id and hands it to the form.
 *
 * Split out of the route so the page stays a server component (metadata,
 * permission guard) while the fetch, loading skeleton and not-found state are
 * handled here — the same split every other dashboard detail screen uses.
 */
export function BlogEditor({ id }: { id: string }) {
  const router = useRouter();
  const query = useBlogPost(id);

  if (query.isLoading) return <FormSkeleton />;

  if (query.error || !query.data) {
    return (
      <ErrorState
        title="Post not found"
        description="It may have been deleted. Head back to the list and try again."
        onRetry={() => router.push(BLOG_DASHBOARD_HREF)}
      />
    );
  }

  return <BlogForm initial={query.data} />;
}
