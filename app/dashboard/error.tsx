"use client";

import { useEffect } from "react";
import { ErrorState } from "@/features/dashboard/components/state-views";

/**
 * Dashboard error boundary. Catches render/data errors within the subtree and
 * offers recovery via `reset()`. Renders inside the shell, so navigation stays
 * usable while the failed segment is retried.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Phase 3 wires this to the telemetry/error service.
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      description="This section failed to load. You can retry, or head back to the dashboard."
      onRetry={reset}
    />
  );
}
