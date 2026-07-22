import { Loader2 } from "lucide-react";

/**
 * Full-height placeholder shown while a route guard resolves the session or a
 * redirect is in flight — keeps protected content from flashing before access
 * is confirmed.
 */
export function AuthGate({ label = "Checking your session…" }: { label?: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="flex flex-col items-center gap-3 text-muted">
        <Loader2 className="size-7 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}
