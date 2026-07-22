"use client";

import { type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tag } from "@/components/ui/tag";

interface FilterBarProps {
  /** Controlled search value. Omit `search`/`onSearchChange` to hide the box. */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Filter controls (selects, dropdowns…), rendered after the search box. */
  children?: ReactNode;
  /** Right-aligned actions (e.g. an "Add" button, column toggle). */
  actions?: ReactNode;
  className?: string;
}

/**
 * FilterBar — the toolbar above a table/list: a search box, a slot for filter
 * controls, and a slot for actions. Fully controlled and presentation-only, so
 * the query/filter state lives with the caller (and, later, the URL). Pair with
 * {@link FilterChips} to show the applied filters.
 */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  children,
  actions,
  className,
}: FilterBarProps) {
  const showSearch = search !== undefined && onSearchChange !== undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {showSearch && (
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            leftIcon={<Search className="size-4" aria-hidden="true" />}
            wrapperClassName="sm:max-w-xs sm:flex-1"
          />
        )}
        {children && (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export interface ActiveFilter {
  /** Stable key used when removing (e.g. "status" or "status:active"). */
  key: string;
  /** Human label, e.g. "Status: Active". */
  label: string;
}

interface FilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  /** Called when "Clear all" is clicked. Omit to hide the clear button. */
  onClear?: () => void;
  className?: string;
}

/**
 * FilterChips — the row of applied-filter chips under a {@link FilterBar}. Each
 * chip removes its filter; an optional "Clear all" resets them. Renders nothing
 * when there are no active filters.
 */
export function FilterChips({
  filters,
  onRemove,
  onClear,
  className,
}: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {filters.map((f) => (
        <Tag key={f.key} variant="soft" onRemove={() => onRemove(f.key)}>
          {f.label}
        </Tag>
      ))}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-field px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <X className="size-3.5" aria-hidden="true" />
          Clear all
        </button>
      )}
    </div>
  );
}
