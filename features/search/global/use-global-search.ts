"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSearchSuggestions } from "@/services/search";
import type { SearchSuggestions } from "@/types/search";
import { pushRecentSearch } from "./recent-searches";

const DEBOUNCE_MS = 220;
const MIN_CHARS = 2;

export interface UseGlobalSearchResult {
  query: string;
  suggestions: SearchSuggestions | null;
  loading: boolean;
  /** Whether the query is long enough to have triggered a lookup. */
  active: boolean;
  setQuery: (value: string) => void;
  reset: () => void;
  /** Persist a term to recent searches (call right before navigating). */
  remember: (term: string) => void;
}

/**
 * useGlobalSearch — owns the search dialog's query state and debounced
 * suggestion fetching. The fetch is scheduled from the change handler (not an
 * effect), and a request-id guard drops out-of-order responses so the newest
 * query always wins. The only effect just clears the pending timer on unmount.
 */
export function useGlobalSearch(): UseGlobalSearchResult {
  const [query, setQueryState] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  const [loading, setLoading] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    if (timer.current) clearTimeout(timer.current);

    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS) {
      requestId.current++; // invalidate any in-flight request
      setSuggestions(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestId.current;
    timer.current = setTimeout(async () => {
      const result = await getSearchSuggestions(trimmed);
      if (id === requestId.current) {
        setSuggestions(result);
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    requestId.current++;
    setQueryState("");
    setSuggestions(null);
    setLoading(false);
  }, []);

  const remember = useCallback((term: string) => pushRecentSearch(term), []);

  // Clear any pending debounce timer on unmount (no state update here).
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return {
    query,
    suggestions,
    loading,
    active: query.trim().length >= MIN_CHARS,
    setQuery,
    reset,
    remember,
  };
}
