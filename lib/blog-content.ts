/**
 * blog-content.ts — the bridge between what an author types and what the store
 * keeps.
 *
 *   editor textarea (markdown-ish text)
 *        ↕  parseBlogContent / serializeBlogContent
 *   BlogBlock[]  ← the canonical stored shape
 *        ↓  RichText / BlogPostBody
 *   React elements
 *
 * **Why not HTML.** A rich-text editor that stores HTML means the public page
 * either renders unsanitised markup or needs a sanitiser on every read. Storing
 * a discriminated block list instead makes unsafe content unrepresentable: a
 * heading is `{type:"heading", text}` and the renderer decides the tag, so there
 * is nothing an author can type that becomes markup. Inline emphasis uses a
 * three-token markdown subset ({@link parseInline}) turned into React elements,
 * never a string of HTML.
 *
 * The grammar is deliberately small and round-trips exactly — parse → serialize
 * → parse is stable, which is what lets the edit screen reopen a stored post as
 * text without losing structure.
 *
 *   ## Heading            → heading (level 2)
 *   ### Heading           → heading (level 3)
 *   - item                → unordered list (also `*` / `+`)
 *   1. item               → ordered list
 *   > quote               → blockquote (`> — Attribution` on the last line)
 *   ![alt](src "caption") → image
 *   anything else         → paragraph (blank line separates)
 *
 * Framework-free and side-effect-free — no React, no clock, no randomness — so
 * server and client always produce the same blocks.
 */

import type { BlogBlock } from "@/types/blog";

/* -------------------------------------------------------------------------- */
/* Inline tokens                                                               */
/* -------------------------------------------------------------------------- */

/** A run of inline content inside a paragraph, heading, list item or quote. */
export type InlineToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "link"; text: string; href: string };

/**
 * Matches, in priority order: `**bold**`, `*italic*`/`_italic_`, `[text](href)`.
 *
 * Bold is listed first so `**x**` never parses as two italics. The pattern is
 * rebuilt per call rather than shared, because a `g` regex carries `lastIndex`
 * between calls and a module-level one would drop tokens on every other parse.
 */
function inlinePattern(): RegExp {
  return /\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|\[([^\]]+)\]\(([^)\s]+)\)/g;
}

/**
 * Only `http(s)` and site-relative targets become links.
 *
 * This is the one place a stored string turns into an `href`, so it is where
 * `javascript:` and `data:` are refused — a link the renderer won't build can't
 * be clicked. Rejected targets fall back to plain text rather than disappearing,
 * so the author still sees their words.
 */
export function isSafeHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (value.startsWith("/") || value.startsWith("#")) return true;
  return /^https?:\/\/\S+$/i.test(value);
}

/**
 * Split inline markdown into tokens. Unrecognised syntax stays literal text, so
 * an author typing an asterisk gets an asterisk rather than an error.
 */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = inlinePattern();
  let cursor = 0;

  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > cursor) {
      tokens.push({ type: "text", text: text.slice(cursor, match.index) });
    }

    const [, bold, star, underscore, linkText, href] = match;
    if (bold !== undefined) {
      tokens.push({ type: "bold", text: bold });
    } else if (star !== undefined || underscore !== undefined) {
      tokens.push({ type: "italic", text: (star ?? underscore) as string });
    } else if (linkText !== undefined && href !== undefined) {
      tokens.push(
        isSafeHref(href)
          ? { type: "link", text: linkText, href: href.trim() }
          : { type: "text", text: linkText },
      );
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) tokens.push({ type: "text", text: text.slice(cursor) });
  return tokens;
}

/** Inline markdown with its markers removed — for excerpts, counts and SEO. */
export function stripInline(text: string): string {
  return parseInline(text)
    .map((token) => token.text)
    .join("");
}

/* -------------------------------------------------------------------------- */
/* Blocks                                                                      */
/* -------------------------------------------------------------------------- */

const HEADING = /^(#{2,3})\s+(.*)$/;
const BULLET = /^[-*+]\s+(.*)$/;
const ORDERED = /^\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
/** `![alt](src)` with an optional `"caption"` after the source. */
const IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;
/** A quote's final `— Attribution` line becomes its `cite`. */
const CITE = /^(?:—|--)\s*(.+)$/;

/**
 * Parse authored text into the canonical block list.
 *
 * Consecutive lines of the same kind group into one block (three `-` lines are
 * one list, not three), and a blank line always ends the current block — the
 * behaviour anyone who has written markdown already expects.
 */
export function parseBlogContent(source: string): BlogBlock[] {
  const blocks: BlogBlock[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");

  // The block being accumulated across consecutive lines.
  let list: { items: string[]; ordered: boolean } | null = null;
  let quote: string[] | null = null;
  let paragraph: string[] | null = null;

  const flush = (): void => {
    if (list) {
      blocks.push(
        list.ordered
          ? { type: "list", items: list.items, ordered: true }
          : { type: "list", items: list.items },
      );
      list = null;
    }
    if (quote) {
      // A trailing attribution line is metadata, not part of the quotation.
      const last = quote[quote.length - 1];
      const cite = last ? CITE.exec(last)?.[1] : undefined;
      const body = (cite ? quote.slice(0, -1) : quote).join(" ").trim();
      if (body) blocks.push(cite ? { type: "quote", text: body, cite } : { type: "quote", text: body });
      quote = null;
    }
    if (paragraph) {
      const text = paragraph.join(" ").trim();
      if (text) blocks.push({ type: "paragraph", text });
      paragraph = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flush();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length === 3 ? 3 : 2;
      blocks.push({ type: "heading", text: heading[2].trim(), level });
      continue;
    }

    const image = IMAGE.exec(line);
    if (image) {
      flush();
      const [, alt, src, caption] = image;
      blocks.push({
        type: "image",
        src,
        alt: alt.trim(),
        ...(caption?.trim() ? { caption: caption.trim() } : {}),
      });
      continue;
    }

    const ordered = ORDERED.exec(line);
    const bullet = ordered ? null : BULLET.exec(line);
    if (ordered || bullet) {
      const item = (ordered?.[1] ?? bullet?.[1] ?? "").trim();
      const wantsOrdered = Boolean(ordered);
      // Switching marker style starts a new list rather than mixing the two.
      if (list && list.ordered !== wantsOrdered) flush();
      if (!list) {
        if (quote || paragraph) flush();
        list = { items: [], ordered: wantsOrdered };
      }
      if (item) list.items.push(item);
      continue;
    }

    const quoted = QUOTE.exec(line);
    if (quoted) {
      if (list || paragraph) flush();
      quote ??= [];
      quote.push(quoted[1].trim());
      continue;
    }

    if (list || quote) flush();
    paragraph ??= [];
    paragraph.push(line);
  }

  flush();
  return blocks;
}

/**
 * Render blocks back to authored text.
 *
 * The exact inverse of {@link parseBlogContent}, so opening a stored post in the
 * editor and saving it again without edits leaves the content byte-identical —
 * which is what makes "edit" safe to run repeatedly.
 */
export function serializeBlogContent(blocks: BlogBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
          return `${"#".repeat(block.level ?? 2)} ${block.text}`;
        case "paragraph":
          return block.text;
        case "list":
          return block.items
            .map((item, i) => (block.ordered ? `${i + 1}. ${item}` : `- ${item}`))
            .join("\n");
        case "quote":
          return block.cite ? `> ${block.text}\n> — ${block.cite}` : `> ${block.text}`;
        case "image":
          return block.caption
            ? `![${block.alt}](${block.src} "${block.caption}")`
            : `![${block.alt}](${block.src})`;
      }
    })
    .join("\n\n");
}

/** Every block's text as one plain string — the basis for counts and excerpts. */
export function blogContentToText(blocks: BlogBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
        case "paragraph":
        case "quote":
          return stripInline(block.text);
        case "list":
          return block.items.map(stripInline).join(" ");
        case "image":
          return block.caption ?? "";
      }
    })
    .join(" ");
}

/** Words in the content — what {@link readingMinutes} is derived from. */
export function blogWordCount(blocks: BlogBlock[]): number {
  const text = blogContentToText(blocks).trim();
  return text ? text.split(/\s+/).length : 0;
}

/**
 * Reading time in whole minutes at ~200 words per minute, never below 1.
 *
 * Derived on save rather than typed by the author, so the "6 min read" on a card
 * cannot drift from the article it labels.
 */
export function readingMinutes(blocks: BlogBlock[]): number {
  return Math.max(1, Math.round(blogWordCount(blocks) / 200));
}

/**
 * The first sentence or so of the content, for an excerpt the author left blank.
 * Cuts on a word boundary so the teaser never ends mid-word.
 */
export function excerptFromContent(blocks: BlogBlock[], limit = 160): string {
  const first = blocks.find((block) => block.type === "paragraph");
  const text = (first ? stripInline(first.text) : blogContentToText(blocks)).trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" ")).trimEnd()}…`;
}
