"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronDown, Coins, Globe } from "lucide-react";
import { useLocale } from "@/features/i18n";
import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  hint?: string;
}

/**
 * A small accessible dropdown shared by the locale controls. Selection is
 * committed through the caller's `onSelect`; the trigger shows the active
 * label with a leading icon.
 */
function LocaleDropdown({
  icon,
  triggerLabel,
  ariaLabel,
  options,
  active,
  onSelect,
  className,
}: {
  icon: ReactNode;
  triggerLabel: string;
  ariaLabel: string;
  options: Option[];
  active: string;
  onSelect: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary"
      >
        {icon}
        <span>{triggerLabel}</span>
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 z-50 mt-2 max-h-72 min-w-[11rem] overflow-auto rounded-card border border-line bg-surface py-1 text-ink shadow-menu"
        >
          {options.map((opt) => {
            const selected = opt.value === active;
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm transition-colors hover:bg-primary-50 hover:text-primary",
                    selected && "font-semibold text-primary",
                  )}
                >
                  <span>{opt.label}</span>
                  {opt.hint && (
                    <span className="text-xs uppercase text-muted">
                      {opt.hint}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Language selector — switches the active UI language (and document dir). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, languages, setLanguage } = useLocale();
  return (
    <LocaleDropdown
      className={className}
      icon={<Globe className="size-4" aria-hidden="true" />}
      triggerLabel={language.nativeName}
      ariaLabel="Select language"
      active={language.code}
      onSelect={setLanguage}
      options={languages.map((l) => ({
        value: l.code,
        label: l.nativeName,
        hint: l.code,
      }))}
    />
  );
}

/** Currency selector — reformats every price across the site. */
export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, currencies, setCurrency } = useLocale();
  return (
    <LocaleDropdown
      className={className}
      icon={<Coins className="size-4" aria-hidden="true" />}
      triggerLabel={`${currency.symbol} ${currency.code}`}
      ariaLabel="Select currency"
      active={currency.code}
      onSelect={setCurrency}
      options={currencies.map((c) => ({
        value: c.code,
        label: `${c.name}`,
        hint: c.code,
      }))}
    />
  );
}
