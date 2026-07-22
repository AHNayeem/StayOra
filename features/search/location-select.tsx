"use client";

import { useMemo, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { FieldShell } from "./field-popover";

interface LocationSelectProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
}

/**
 * LocationSelect — a destination field: a text input backed by a filterable
 * suggestions dropdown. Free text is allowed (the input value is authoritative);
 * suggestions are a shortcut. Keyboard-navigable and dismissible.
 */
export function LocationSelect({
  label,
  placeholder,
  value,
  onChange,
  suggestions,
}: LocationSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapperRef, () => setOpen(false), open);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((s) => s.toLowerCase().includes(q));
  }, [value, suggestions]);

  const pick = (choice: string) => {
    onChange(choice);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && open && active >= 0 && filtered[active]) {
      e.preventDefault();
      pick(filtered[active]);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <FieldShell icon={<MapPin className="size-4" />} label={label}>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="location-listbox"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full truncate bg-transparent text-sm font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted"
        />
      </FieldShell>

      {open && (
        <ul
          id="location-listbox"
          role="listbox"
          className="animate-pop-in absolute left-0 top-full z-40 mt-2 max-h-72 w-72 overflow-auto rounded-card border border-line bg-surface p-2 shadow-menu"
        >
          {filtered.length === 0 ? (
            <li className="flex items-center gap-2 px-3 py-2 text-sm text-muted">
              <Search className="size-4" aria-hidden="true" />
              No matches — press Enter to use “{value}”.
            </li>
          ) : (
            filtered.map((s, i) => (
              <li key={s} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(s)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-field px-3 py-2 text-left text-sm transition-colors",
                    i === active
                      ? "bg-primary-50 text-primary"
                      : "text-body hover:bg-surface-muted",
                  )}
                >
                  <MapPin className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  {s}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
