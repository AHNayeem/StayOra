"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useStoredState } from "../lib/use-stored-state";

interface ShellContextValue {
  /** Desktop sidebar collapsed to icon rail. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;

  /** Mobile drawer sidebar open. */
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;

  /** Command palette (⌘K) open. */
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

const COLLAPSED_KEY = "stayora.dashboard.sidebar-collapsed";

interface ShellProviderProps {
  children: ReactNode;
}

/**
 * Holds cross-cutting shell UI state (sidebar collapse, mobile drawer, command
 * palette) so the sidebar, top nav and command palette stay in sync without
 * prop-drilling. Collapse preference persists across sessions.
 */
export function ShellProvider({ children }: ShellProviderProps) {
  const [collapsedRaw, setCollapsedRaw] = useStoredState(COLLAPSED_KEY, "0");
  const collapsed = collapsedRaw === "1";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const setCollapsed = useCallback(
    (v: boolean) => setCollapsedRaw(v ? "1" : "0"),
    [setCollapsedRaw],
  );

  const toggleCollapsed = useCallback(
    () => setCollapsed(!collapsed),
    [collapsed, setCollapsed],
  );

  // Global ⌘K / Ctrl+K to open the command palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<ShellContextValue>(
    () => ({
      collapsed,
      toggleCollapsed,
      setCollapsed,
      mobileOpen,
      setMobileOpen,
      commandOpen,
      setCommandOpen,
    }),
    [collapsed, toggleCollapsed, setCollapsed, mobileOpen, commandOpen],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

/** Access shell UI state. Throws outside {@link ShellProvider}. */
export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within a <ShellProvider>.");
  return ctx;
}
