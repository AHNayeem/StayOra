"use client";

import { Lock } from "lucide-react";
import { MERCHANT_ROLES, type MerchantCapability } from "@/features/dashboard/domain";
import { useMerchantAccess } from "../../rbac/use-merchant-access";
import { StateView } from "../../components/state-views";

/**
 * Gate a merchant screen on a merchant-side capability.
 *
 * Permission checks stay central: this asks {@link useMerchantAccess}, which
 * asks the domain's role book. A screen never inspects a role id itself, so
 * moving a capability between roles is one edit in `domain/merchants.ts`.
 */
export function MerchantCapabilityGuard({
  capability,
  children,
}: {
  capability: MerchantCapability;
  children: React.ReactNode;
}) {
  const access = useMerchantAccess();

  // Not a merchant staff principal at all — the page's own empty state applies.
  if (!access.role) return <>{children}</>;
  if (access.can(capability)) return <>{children}</>;

  return (
    <StateView
      icon={<Lock className="size-6" aria-hidden="true" />}
      title="Not available to your role"
      description={`You're signed in as ${MERCHANT_ROLES[access.role].label}. Ask an owner or manager for access.`}
    />
  );
}
