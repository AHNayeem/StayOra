"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
  icon?: ReactNode;
  content?: ReactNode;
  disabled?: boolean;
}

export type TabsVariant = "underline" | "pill";

interface TabsProps {
  items: TabItem[];
  /** Controlled active key. Omit to use `defaultValue` internally. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (key: string) => void;
  variant?: TabsVariant;
  /** Render the active tab's `content` below the list. Default true. */
  renderPanels?: boolean;
  className?: string;
  listClassName?: string;
}

/**
 * Tabs — an accessible, config-driven tab set. Works controlled (`value` +
 * `onValueChange`) or uncontrolled (`defaultValue`). Supports arrow-key roving
 * focus and two looks: `underline` and `pill`. Renders each item's `content`
 * panel unless `renderPanels` is false (tablist-only).
 */
export function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  variant = "underline",
  renderPanels = true,
  className,
  listClassName,
}: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [internal, setInternal] = useState(
    defaultValue ?? items[0]?.key ?? "",
  );
  const active = value ?? internal;

  const select = (key: string) => {
    if (value === undefined) setInternal(key);
    onValueChange?.(key);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const count = items.length;
    // Skip disabled tabs while walking.
    let next = index;
    for (let step = 0; step < count; step++) {
      next = (next + dir + count) % count;
      if (!items[next].disabled) break;
    }
    tabRefs.current[next]?.focus();
    select(items[next].key);
  };

  const activeItem = items.find((it) => it.key === active);

  return (
    <div className={className}>
      <div
        role="tablist"
        className={cn(
          "flex gap-1",
          variant === "underline" && "border-b border-line",
          variant === "pill" && "rounded-pill bg-surface-muted p-1",
          listClassName,
        )}
      >
        {items.map((item, i) => {
          const selected = item.key === active;
          return (
            <button
              key={item.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.key}`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-40",
                variant === "underline" &&
                  cn(
                    "-mb-px border-b-2 px-4 py-3",
                    selected
                      ? "border-primary text-primary"
                      : "border-transparent text-body hover:text-ink",
                  ),
                variant === "pill" &&
                  cn(
                    "flex-1 justify-center rounded-pill px-4 py-2",
                    selected
                      ? "bg-surface text-ink shadow-card"
                      : "text-body hover:text-ink",
                  ),
              )}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {renderPanels && activeItem?.content && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.key}`}
          aria-labelledby={`${baseId}-tab-${activeItem.key}`}
          className="pt-6"
        >
          {activeItem.content}
        </div>
      )}
    </div>
  );
}
