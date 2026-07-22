"use client";

import { useMemo, useState } from "react";
import { Copy, Ticket } from "lucide-react";
import type { Coupon, CouponStatus } from "@/types/traveler";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { StatusBadge, couponStatusMeta } from "@/components/account/status-badge";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Scope = CouponStatus | "all";

const SCOPES: { key: Scope; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "used", label: "Used" },
  { key: "expired", label: "Expired" },
];

export function CouponsView({ coupons }: { coupons: Coupon[] }) {
  const [scope, setScope] = useState<Scope>("all");

  const counts = useMemo(() => {
    const map = new Map<CouponStatus, number>();
    for (const c of coupons) map.set(c.status, (map.get(c.status) ?? 0) + 1);
    return map;
  }, [coupons]);

  const filtered = scope === "all" ? coupons : coupons.filter((c) => c.status === scope);

  return (
    <div>
      <AccountPageHeader
        title="Coupons"
        description="Your promo codes and travel credits. Copy a code to use it at checkout."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {SCOPES.map((s) => {
          const count = s.key === "all" ? coupons.length : (counts.get(s.key as CouponStatus) ?? 0);
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s.key)}
              aria-pressed={scope === s.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-pill border px-4 py-2 text-sm font-medium transition-colors",
                scope === s.key
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-surface text-body hover:border-primary hover:text-primary",
              )}
            >
              {s.label}
              <span className="text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </div>
      ) : (
        <AccountEmpty
          icon={Ticket}
          title="No coupons here"
          description="When you receive a promo code or travel credit it'll appear in your wallet."
        />
      )}
    </div>
  );
}

function CouponCard({ coupon }: { coupon: Coupon }) {
  const { date, money } = useLocale();
  const meta = couponStatusMeta(coupon.status);
  const disabled = coupon.status !== "active";

  const valueLabel =
    coupon.kind === "percent" ? `${coupon.value}% OFF` : `${money(coupon.value)} OFF`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      toast.copied(`Copied code ${coupon.code}`);
    } catch {
      toast.error("Couldn't copy the code.");
    }
  };

  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-card border border-line bg-surface shadow-card",
        disabled && "opacity-70",
      )}
    >
      {/* Value stub */}
      <div className="flex w-28 shrink-0 flex-col items-center justify-center gap-1 border-r border-dashed border-line bg-primary-50 p-4 text-center">
        <Ticket className="size-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-extrabold leading-tight text-primary">{valueLabel}</span>
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-ink">{coupon.title}</h3>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>
        <p className="text-sm text-body">{coupon.description}</p>
        <p className="text-xs text-muted">
          {coupon.scope}
          {coupon.minSpendUsd ? ` · Min. spend ${money(coupon.minSpendUsd)}` : ""}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
          <div className="min-w-0">
            <code className="rounded bg-surface-muted px-2 py-1 text-sm font-semibold tracking-wide text-ink">
              {coupon.code}
            </code>
            <p className="mt-1 text-xs text-muted">
              {coupon.status === "expired" ? "Expired" : "Expires"} {date(coupon.expiresAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCopy}
            disabled={disabled}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary disabled:pointer-events-none disabled:opacity-50"
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
