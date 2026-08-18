import Image from "next/image";
import { Check } from "lucide-react";
import type { BlogAlign, BlogBlock } from "@/types/blog";
import { RichText } from "@/components/shared/rich-text";
import { cn } from "@/lib/utils";

/** Alignment → utility class. Omitted alignment keeps the theme default. */
const ALIGN: Record<BlogAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function alignClass(align?: BlogAlign): string | undefined {
  return align ? ALIGN[align] : undefined;
}

/**
 * BlogPostBody — renders the article body from a {@link BlogBlock} list. Switches
 * exhaustively on the block's `type` (no casts), so a new block variant is a
 * compile-time prompt to handle it here.
 *
 * Every block's text goes through {@link RichText}, which turns the author's
 * inline markdown into elements — the reason nothing here touches
 * `dangerouslySetInnerHTML`.
 *
 * Headings render as `h2`/`h3` under the page's `h1`, so the article keeps a
 * legal heading order for screen readers however the author nests sections.
 */
export function BlogPostBody({ blocks }: { blocks: BlogBlock[] }) {
  if (blocks.length === 0) {
    return <p className="text-body italic">This article has no content yet.</p>;
  }

  return (
    <div className="flex flex-col gap-5 text-body">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const Tag = block.level === 3 ? "h3" : "h2";
            return (
              <Tag
                key={index}
                className={cn(
                  block.level === 3 ? "text-h4" : "text-h3",
                  "mt-3 text-ink",
                  alignClass(block.align),
                )}
              >
                <RichText text={block.text} />
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={index} className={cn("leading-relaxed", alignClass(block.align))}>
                <RichText text={block.text} />
              </p>
            );
          case "list":
            return block.ordered ? (
              <ol key={index} className="flex list-decimal flex-col gap-2.5 pl-5 marker:text-primary marker:font-semibold">
                {block.items.map((item, i) => (
                  <li key={i} className="pl-1">
                    <RichText text={item} />
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={index} className="flex flex-col gap-2.5">
                {block.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    <span>
                      <RichText text={item} />
                    </span>
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
                  “<RichText text={block.text} />”
                </p>
                {block.cite && (
                  <cite className="mt-2 block text-sm text-muted not-italic">
                    — {block.cite}
                  </cite>
                )}
              </blockquote>
            );
          case "image":
            return (
              <figure key={index} className="my-2">
                <span className="relative block aspect-video overflow-hidden rounded-card bg-surface-muted">
                  <Image
                    src={block.src}
                    alt={block.alt}
                    fill
                    sizes="(min-width: 1024px) 720px, 100vw"
                    className="object-cover"
                  />
                </span>
                {block.caption && (
                  <figcaption className="mt-2 text-center text-sm text-muted">
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
        }
      })}
    </div>
  );
}
