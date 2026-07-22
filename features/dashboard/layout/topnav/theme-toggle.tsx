"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, type ThemePreference } from "../../theme/theme-provider";
import { MenuPopover, MenuTriggerButton } from "./menu-popover";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Theme switcher — light / dark / system. Persists the choice and drives the
 * `dark` class on the shell root via {@link useTheme}.
 */
export function ThemeToggle() {
  const { preference, resolved, setPreference } = useTheme();
  const TriggerIcon = resolved === "dark" ? Moon : Sun;

  return (
    <MenuPopover
      label="Theme"
      panelClassName="min-w-44"
      trigger={({ props }) => (
        <MenuTriggerButton label="Toggle theme" buttonProps={props}>
          <TriggerIcon className="size-5" aria-hidden="true" />
        </MenuTriggerButton>
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="menuitemradio"
          aria-checked={preference === value}
          onClick={() => setPreference(value)}
          className={cn(
            "flex w-full items-center gap-3 rounded-field px-3 py-2 text-sm transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            preference === value ? "font-semibold text-primary" : "text-body",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </MenuPopover>
  );
}
