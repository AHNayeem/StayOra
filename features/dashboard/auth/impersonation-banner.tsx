"use client";

import { useState } from "react";
import { LogOut, UserCog } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { useRbac } from "../rbac/rbac-provider";
import { getRole } from "../rbac/roles";
import { useSession } from "./session-provider";

function elapsed(since: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(since).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

/**
 * The impersonation indicator.
 *
 * Sticky, high-contrast and impossible to dismiss: someone acting as another
 * user must never be able to forget it. Rendered by the shell above everything
 * else, and the only exit from an impersonated session.
 */
export function ImpersonationBanner() {
  const { impersonator, endImpersonation } = useSession();
  const { user } = useRbac();
  const [leaving, setLeaving] = useState(false);

  if (!impersonator) return null;

  const stop = () => {
    setLeaving(true);
    try {
      endImpersonation();
    } catch (error) {
      setLeaving(false);
      toast.error("Couldn't exit impersonation", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-warning/40 bg-warning/15 px-4 py-2.5 sm:px-6 lg:px-8"
    >
      <p className="flex min-w-0 items-center gap-2 text-sm text-ink">
        <UserCog className="size-4 shrink-0 text-warning" aria-hidden="true" />
        <span className="min-w-0">
          Viewing as <strong className="font-semibold">{user.name}</strong>{" "}
          <span className="text-muted">({getRole(user.roleId).label})</span> — started{" "}
          {elapsed(impersonator.startedAt)} by {impersonator.name}
          {impersonator.reason ? (
            <span className="text-muted"> · {impersonator.reason}</span>
          ) : null}
        </span>
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={stop}
        loading={leaving}
        leftIcon={<LogOut className="size-4" />}
      >
        Exit impersonation
      </Button>
    </div>
  );
}
