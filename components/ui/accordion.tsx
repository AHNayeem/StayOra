"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  /** "single" allows one open panel; "multiple" allows many. Default "single". */
  type?: "single" | "multiple";
  /** Item id(s) open on first render. */
  defaultOpen?: string | string[];
  className?: string;
}

/**
 * Accordion — expandable panels for FAQs and detail sections. Animates height
 * with the grid-rows 0fr→1fr technique (smooth, no JS measuring). Single or
 * multiple open panels; fully keyboard/screen-reader accessible.
 */
export function Accordion({
  items,
  type = "single",
  defaultOpen,
  className,
}: AccordionProps) {
  const baseId = useId();
  const [open, setOpen] = useState<Set<string>>(
    () =>
      new Set(
        defaultOpen
          ? Array.isArray(defaultOpen)
            ? defaultOpen
            : [defaultOpen]
          : [],
      ),
  );

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (type === "single") next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => {
        const isOpen = open.has(item.id);
        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-card border border-line bg-surface"
          >
            <h3>
              <button
                type="button"
                id={`${baseId}-trigger-${item.id}`}
                aria-expanded={isOpen}
                aria-controls={`${baseId}-region-${item.id}`}
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-ink transition-colors hover:bg-surface-muted"
              >
                {item.title}
                <ChevronDown
                  className={cn(
                    "size-5 shrink-0 text-muted transition-transform duration-300",
                    isOpen && "rotate-180 text-primary",
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={`${baseId}-region-${item.id}`}
              role="region"
              aria-labelledby={`${baseId}-trigger-${item.id}`}
              inert={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out-soft",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 text-body">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
