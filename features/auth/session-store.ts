"use client";

import { useSyncExternalStore } from "react";
import type { AuthSession } from "@/types/account";
import { readSession } from "@/services/auth";

/**
 * Client session store. The persisted session (localStorage, owned by the auth
 * service) is the source of truth on boot; this keeps a reference-stable
 * in-memory mirror and notifies React through `useSyncExternalStore` — so the
 * header, guards and account pages all react to sign-in/out without any
 * `setState`-in-effect.
 */

const EVENT = "stayora:session-change";

let snapshot: AuthSession | null = null;
let hydrated = false;

function getSnapshot(): AuthSession | null {
  if (!hydrated) {
    snapshot = readSession();
    hydrated = true;
  }
  return snapshot;
}

function getServerSnapshot(): AuthSession | null {
  return null;
}

function subscribe(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/** Mirror a new session (or sign-out) into React. Persistence is the service's job. */
export function syncSession(session: AuthSession | null): void {
  snapshot = session;
  hydrated = true;
  window.dispatchEvent(new Event(EVENT));
}

export function useSessionSnapshot(): AuthSession | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
