import type { BlogComment } from "@/types/blog";
import { Avatar } from "@/components/ui/avatar";
import { CommentForm } from "@/components/forms/comment-form";

/** Format an ISO date as "22 Jun 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * BlogComments — the reader-discussion block under an article: the existing
 * comment thread followed by the (front-end stub) {@link CommentForm}.
 */
export function BlogComments({ comments }: { comments: BlogComment[] }) {
  return (
    <section className="border-t border-line pt-10">
      <h2 className="text-h3">
        {comments.length} {comments.length === 1 ? "comment" : "comments"}
      </h2>

      {comments.length > 0 && (
        <ul className="mt-6 flex flex-col gap-6">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-4">
              <Avatar src={comment.avatar} name={comment.author} size="md" />
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="font-semibold text-ink">{comment.author}</span>
                  <span className="text-xs text-muted">
                    {formatDate(comment.date)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-body">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-12 rounded-panel border border-line bg-surface p-6 md:p-8">
        <h3 className="text-h3">Leave a comment</h3>
        <p className="mt-2 text-sm text-muted">
          Your email address won&apos;t be published.
        </p>
        <div className="mt-6">
          <CommentForm />
        </div>
      </div>
    </section>
  );
}
