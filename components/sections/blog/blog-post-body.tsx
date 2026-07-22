import { Check } from "lucide-react";
import type { BlogBlock } from "@/types/blog";

/**
 * BlogPostBody — renders the article body from a {@link BlogBlock} list. Switches
 * exhaustively on the block's `type` (no casts), so a new block variant is a
 * compile-time prompt to handle it here.
 */
export function BlogPostBody({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="flex flex-col gap-5 text-body">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return (
              <h2 key={index} className="text-h3 mt-3 text-ink">
                {block.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={index} className="leading-relaxed">
                {block.text}
              </p>
            );
          case "list":
            return (
              <ul key={index} className="flex flex-col gap-2.5">
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote
                key={index}
                className="rounded-card border-l-4 border-primary bg-surface-muted px-6 py-5"
              >
                <p className="text-lg font-medium text-ink italic">
                  “{block.text}”
                </p>
                {block.cite && (
                  <cite className="mt-2 block text-sm text-muted not-italic">
                    — {block.cite}
                  </cite>
                )}
              </blockquote>
            );
        }
      })}
    </div>
  );
}
