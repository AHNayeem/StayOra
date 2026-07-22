"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

/** Subscribe to the browser's online/offline events. */
function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/**
 * OfflineBanner — a fixed notice shown when the browser loses its connection.
 * Uses {@link useSyncExternalStore} over the native online/offline events, so
 * there's no `setState`-in-effect and the server snapshot is always "online"
 * (avoiding a hydration flash). Renders nothing while connected.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-2 bg-ink px-4 py-2 text-sm font-medium text-white"
    >
      <WifiOff className="size-4" aria-hidden="true" />
      You&apos;re offline — some features may not work until you reconnect.
    </div>
  );
}
