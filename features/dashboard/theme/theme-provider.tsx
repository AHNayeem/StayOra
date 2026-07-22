"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useMediaQuery, useStoredState } from "../lib/use-stored-state";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  /** The user's stored choice. */
  preference: ThemePreference;
  /** The theme actually applied (system resolved to light/dark). */
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  /** Cycle light → dark → system. */
  cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "stayora.dashboard.theme";
const CYCLE: ThemePreference[] = ["light", "dark", "system"];

function normalize(value: string): ThemePreference {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Dashboard theme provider. Persists the user's preference and derives the
 * applied theme, toggling the `dark` class on the shell root (via `resolved`),
 * which re-points every semantic color token (see app/globals.css). Scoped to
 * the dashboard so the public site is unaffected. Follows the OS when set to
 * "system". Storage/OS reads use `useSyncExternalStore` — no effects, SSR-safe.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [stored, setStored] = useStoredState(STORAGE_KEY, "system");
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  const preference = normalize(stored);
  const resolved: ResolvedTheme =
    preference === "system" ? (prefersDark ? "dark" : "light") : preference;

  const setPreference = useCallback(
    (pref: ThemePreference) => setStored(pref),
    [setStored],
  );

  const cycle = useCallback(() => {
    const next = CYCLE[(CYCLE.indexOf(normalize(stored)) + 1) % CYCLE.length];
    setStored(next);
  }, [stored, setStored]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, cycle }),
    [preference, resolved, setPreference, cycle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** Access dashboard theme state. Throws outside {@link ThemeProvider}. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a <ThemeProvider>.");
  return ctx;
}
