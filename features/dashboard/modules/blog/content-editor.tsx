"use client";

import { useId, useRef, useState } from "react";
import {
  Bold,
  Eye,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pencil,
  Quote,
} from "lucide-react";
import { Button, FieldWrapper, Input, Modal, controlClasses } from "../../ui";
import { BlogPostBody } from "@/components/sections/blog";
import { parseBlogContent, readingMinutes, blogWordCount } from "@/lib/blog-content";
import { cn } from "@/lib/utils";

/**
 * How each toolbar button transforms the selection.
 *
 *  - `wrap` puts a marker either side of the selected text (bold, italic).
 *  - `prefix` puts a marker at the start of every selected line (headings,
 *    lists, quotes) and toggles it off when it is already there.
 */
type Command =
  | { kind: "wrap"; marker: string; placeholder: string }
  | { kind: "prefix"; marker: string | ((index: number) => string); placeholder: string };

interface ToolButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Keyboard shortcut letter, combined with ⌘/Ctrl. */
  shortcut?: string;
  command: Command;
}

const TOOLS: ToolButton[] = [
  {
    id: "bold",
    label: "Bold",
    shortcut: "b",
    icon: <Bold className="size-4" />,
    command: { kind: "wrap", marker: "**", placeholder: "bold text" },
  },
  {
    id: "italic",
    label: "Italic",
    shortcut: "i",
    icon: <Italic className="size-4" />,
    command: { kind: "wrap", marker: "*", placeholder: "italic text" },
  },
  {
    id: "h2",
    label: "Heading",
    icon: <Heading2 className="size-4" />,
    command: { kind: "prefix", marker: "## ", placeholder: "Section heading" },
  },
  {
    id: "h3",
    label: "Subheading",
    icon: <Heading3 className="size-4" />,
    command: { kind: "prefix", marker: "### ", placeholder: "Subheading" },
  },
  {
    id: "ul",
    label: "Bulleted list",
    icon: <List className="size-4" />,
    command: { kind: "prefix", marker: "- ", placeholder: "List item" },
  },
  {
    id: "ol",
    label: "Numbered list",
    icon: <ListOrdered className="size-4" />,
    command: {
      kind: "prefix",
      marker: (index: number) => `${index + 1}. `,
      placeholder: "List item",
    },
  },
  {
    id: "quote",
    label: "Blockquote",
    icon: <Quote className="size-4" />,
    command: { kind: "prefix", marker: "> ", placeholder: "A line worth pulling out" },
  },
];

interface BlogContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  name?: string;
}

/**
 * The blog authoring surface: a formatting toolbar over a plain textarea, with a
 * live preview that renders through the *same* {@link BlogPostBody} the public
 * article uses.
 *
 * **Why not a contenteditable rich-text editor.** A WYSIWYG surface stores HTML,
 * and HTML from an author has to be sanitised on every read or it becomes an
 * injection vector. This editor writes the same markdown-flavoured text the
 * store parses into blocks (`lib/blog-content`), so what is saved is a typed
 * structure and there is no HTML to sanitise. It also keeps the toolbar entirely
 * keyboard-operable: every control is a real `<button>` in a `role="toolbar"`
 * group, ⌘/Ctrl+B, I and K work in the textarea, and nothing depends on
 * `document.execCommand` or a mouse selection.
 *
 * The preview is exact rather than approximate because it is not a second
 * renderer — the text is parsed to blocks and handed to the article component.
 */
export function BlogContentEditor({
  value,
  onChange,
  onBlur,
  label = "Content",
  hint,
  error,
  required,
  name,
}: BlogContentEditorProps) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const [showPreview, setShowPreview] = useState(false);
  const [linkDialog, setLinkDialog] = useState<null | "link" | "image">(null);
  const [linkText, setLinkText] = useState("");
  const [linkHref, setLinkHref] = useState("");

  const blocks = parseBlogContent(value);
  const words = blogWordCount(blocks);

  /** Replace the current selection and restore focus with a sensible caret. */
  const replaceSelection = (
    next: string,
    selectionStart: number,
    selectionEnd: number,
    text: string,
  ): void => {
    onChange(next);
    // The value is controlled, so the caret has to be restored after React has
    // written the new value — otherwise it jumps to the end of the textarea.
    requestAnimationFrame(() => {
      const area = areaRef.current;
      if (!area) return;
      area.focus();
      area.setSelectionRange(selectionStart, selectionEnd);
      void text;
    });
  };

  const applyCommand = (command: Command): void => {
    const area = areaRef.current;
    if (!area) return;

    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = value.slice(start, end);

    if (command.kind === "wrap") {
      const { marker, placeholder } = command;
      const inner = selected || placeholder;
      // Toggling off: the selection is already wrapped, so unwrap it.
      const already =
        value.slice(start - marker.length, start) === marker &&
        value.slice(end, end + marker.length) === marker;

      if (already) {
        const next =
          value.slice(0, start - marker.length) + selected + value.slice(end + marker.length);
        replaceSelection(next, start - marker.length, end - marker.length, selected);
        return;
      }

      const next = `${value.slice(0, start)}${marker}${inner}${marker}${value.slice(end)}`;
      const caret = start + marker.length;
      replaceSelection(next, caret, caret + inner.length, inner);
      return;
    }

    // Prefix commands operate on whole lines, so widen the range to line bounds.
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEndIndex = value.indexOf("\n", end);
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
    const block = value.slice(lineStart, lineEnd) || command.placeholder;

    const lines = block.split("\n");
    const markerAt = (index: number) =>
      typeof command.marker === "function" ? command.marker(index) : command.marker;

    // Every line already prefixed ⇒ this is a toggle-off.
    const allPrefixed = lines.every((line, index) => line.startsWith(markerAt(index)));
    const updated = lines
      .map((line, index) =>
        allPrefixed ? line.slice(markerAt(index).length) : `${markerAt(index)}${line}`,
      )
      .join("\n");

    const next = value.slice(0, lineStart) + updated + value.slice(lineEnd);
    replaceSelection(next, lineStart, lineStart + updated.length, updated);
  };

  /** Insert a link or image using whatever is selected as the default label. */
  const openLinkDialog = (kind: "link" | "image"): void => {
    const area = areaRef.current;
    setLinkText(area ? value.slice(area.selectionStart, area.selectionEnd) : "");
    setLinkHref("");
    setLinkDialog(kind);
  };

  const confirmLink = (): void => {
    const area = areaRef.current;
    if (!area || !linkHref.trim()) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    const label = linkText.trim() || (linkDialog === "image" ? "Image" : linkHref.trim());
    const snippet =
      linkDialog === "image"
        ? `![${label}](${linkHref.trim()})`
        : `[${label}](${linkHref.trim()})`;
    const next = value.slice(0, start) + snippet + value.slice(end);
    setLinkDialog(null);
    replaceSelection(next, start + snippet.length, start + snippet.length, snippet);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (!event.metaKey && !event.ctrlKey) return;
    const key = event.key.toLowerCase();
    if (key === "k") {
      event.preventDefault();
      openLinkDialog("link");
      return;
    }
    const tool = TOOLS.find((item) => item.shortcut === key);
    if (tool) {
      event.preventDefault();
      applyCommand(tool.command);
    }
  };

  const modifier = "⌘/Ctrl";

  return (
    <FieldWrapper
      htmlFor={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <div
        className={cn(
          "overflow-hidden rounded-field border",
          error ? "border-danger" : "border-line",
        )}
      >
        <div
          role="toolbar"
          aria-label="Formatting"
          // Only points at the textarea while it is mounted — an `aria-controls`
          // referencing a removed node is a dangling reference to a screen reader.
          aria-controls={showPreview ? undefined : fieldId}
          className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-muted px-2 py-1.5"
        >
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => applyCommand(tool.command)}
              title={tool.shortcut ? `${tool.label} (${modifier}+${tool.shortcut.toUpperCase()})` : tool.label}
              aria-label={tool.label}
              className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {tool.icon}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
          <button
            type="button"
            onClick={() => openLinkDialog("link")}
            title={`Insert link (${modifier}+K)`}
            aria-label="Insert link"
            className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Link2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => openLinkDialog("image")}
            title="Insert image"
            aria-label="Insert image"
            className="grid size-8 place-items-center rounded-field text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ImageIcon className="size-4" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted">
              {words} words · {readingMinutes(blocks)} min read
            </span>
            <button
              type="button"
              onClick={() => setShowPreview((open) => !open)}
              aria-pressed={showPreview}
              className="inline-flex items-center gap-1.5 rounded-field px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {showPreview ? <Pencil className="size-3.5" /> : <Eye className="size-3.5" />}
              {showPreview ? "Write" : "Preview"}
            </button>
          </div>
        </div>

        {showPreview ? (
          <div
            role="region"
            aria-label="Article preview"
            tabIndex={0}
            className="max-h-[32rem] overflow-y-auto bg-surface px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <BlogPostBody blocks={blocks} />
          </div>
        ) : (
          <textarea
            ref={areaRef}
            id={fieldId}
            name={name}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            rows={18}
            required={required}
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              controlClasses(false),
              "resize-y rounded-none border-0 py-3 font-mono text-[13px] leading-relaxed focus:ring-0",
            )}
            placeholder={"Write the article.\n\n## A section heading\n\nA paragraph with **bold**, *italic* and [a link](https://example.com).\n\n- A list item\n- Another item\n\n> A pull-quote\n> — Attribution"}
          />
        )}
      </div>

      <Modal
        open={linkDialog !== null}
        onClose={() => setLinkDialog(null)}
        title={linkDialog === "image" ? "Insert image" : "Insert link"}
        description={
          linkDialog === "image"
            ? "Paste an image URL. It renders full-width in the article."
            : "Only https:// and site-relative (/…) targets are allowed."
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setLinkDialog(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmLink} disabled={!linkHref.trim()}>
              Insert
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label={linkDialog === "image" ? "Alt text" : "Link text"}
            value={linkText}
            onChange={(event) => setLinkText(event.target.value)}
            hint={
              linkDialog === "image"
                ? "Describe the image for screen readers"
                : "What the reader sees"
            }
          />
          <Input
            label="URL"
            required
            value={linkHref}
            onChange={(event) => setLinkHref(event.target.value)}
            placeholder={linkDialog === "image" ? "https://images.unsplash.com/…" : "https://…"}
          />
        </div>
      </Modal>
    </FieldWrapper>
  );
}
