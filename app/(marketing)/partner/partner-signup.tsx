"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { QueryProvider } from "@/features/dashboard/data/query/query-provider";
import { RbacProvider } from "@/features/dashboard/rbac/rbac-provider";
import { resolveCurrentUser } from "@/features/dashboard/rbac/current-user";
import { MerchantForm } from "@/features/dashboard/modules/merchants";
import { Button } from "@/components/ui/button";

/**
 * The public "become a partner" form.
 *
 * It creates the *same* merchant record the dashboard reads — the application
 * appears in the platform's review queue immediately, and the applicant
 * continues onboarding in the dashboard. There is no second registration path.
 *
 * The dashboard's data and RBAC providers are mounted locally because this form
 * lives outside the dashboard shell; the principal is the anonymous applicant,
 * which is why they get the least-privileged role.
 */
export function PartnerSignup() {
  const [created, setCreated] = useState<string | null>(null);

  const applicant = resolveCurrentUser({
    id: "usr_applicant",
    name: "Partner applicant",
    email: "applicant@stayora.app",
    roleId: "vendor",
  });

  if (created) {
    return (
      <div className="rounded-card border border-line bg-surface p-8 text-center shadow-card">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-h4 text-ink">Application started</h2>
        <p className="mx-auto mt-2 max-w-lg text-body">
          Your reference is <strong className="font-mono text-ink">{created}</strong>. Next: finish
          your business documents, verification, agreement and payout details, then submit for
          review.
        </p>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
          This is a prototype — nothing has been verified and no account email was sent. Sign in
          with the merchant demo account to continue the onboarding flow.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard/onboarding">
            <Button size="sm">Continue onboarding</Button>
          </Link>
          <Link href="/login">
            <Button size="sm" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <QueryProvider>
      <RbacProvider user={applicant}>
        <MerchantForm
          submitLabel="Start my application"
          onDone={(merchantId) => setCreated(merchantId)}
          onCancel={() => history.back()}
        />
      </RbacProvider>
    </QueryProvider>
  );
}
