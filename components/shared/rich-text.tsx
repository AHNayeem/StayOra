import Link from "next/link";
import { parseInline } from "@/lib/blog-content";

/**
 * RichText — renders the inline emphasis authors type (`**bold**`, `*italic*`,
 * `[label](href)`) as React elements.
 *
 * This is the safe half of the content pipeline. The stored string is *parsed*
 * into tokens and each token becomes a specific element, so there is no path
 * from authored text to raw markup — no `dangerouslySetInnerHTML` anywhere in
 * the blog. Unsafe link targets are rejected during parsing and fall back to
 * plain text, so a `javascript:` href renders as words rather than a link.
 *
 * Internal links go through `next/link` for client navigation; external ones get
 * `rel="noopener noreferrer"` and open in a new tab.
 */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((token, index) => {
        switch (token.type) {
          case "bold":
            return (
              <strong key={index} className="font-semibold text-ink">
                {token.text}
              </strong>
            );
          case "italic":
            return <em key={index}>{token.text}</em>;
          case "link":
            return token.href.startsWith("http") ? (
              <a
                key={index}
                href={token.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2 hover:text-primary-700"
              >
                {token.text}
              </a>
            ) : (
              <Link
                key={index}
                href={token.href}
                className="font-medium text-primary underline underline-offset-2 hover:text-primary-700"
              >
                {token.text}
              </Link>
            );
          case "text":
            return <span key={index}>{token.text}</span>;
        }
      })}
    </>
  );
}
