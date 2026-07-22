"use client";

import { SocialIcon } from "@/components/shared/social-icons";
import { toast } from "@/lib/toast";

const PROVIDERS = [
  { slug: "facebook", label: "Facebook" },
  { slug: "twitter", label: "X" },
  { slug: "instagram", label: "Instagram" },
] as const;

/**
 * SocialAuth — the "or continue with" divider and provider buttons shared by
 * the login and register forms. Social sign-in has no mock backend, so a click
 * explains that and points the visitor back to email/password.
 */
export function SocialAuth({ action = "continue" }: { action?: string }) {
  const notify = (label: string) =>
    toast.info(`${label} sign-in isn't available in this demo.`, {
      description: "Use an email and password to continue.",
    });

  return (
    <div>
      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or {action} with
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex gap-3">
        {PROVIDERS.map(({ slug, label }) => (
          <button
            key={slug}
            type="button"
            onClick={() => notify(label)}
            aria-label={`${action} with ${label}`}
            className="inline-flex flex-1 items-center justify-center rounded-pill border border-line py-2.5 text-muted transition-colors hover:border-primary hover:text-primary"
          >
            <SocialIcon name={slug} className="size-5" />
          </button>
        ))}
      </div>
    </div>
  );
}
