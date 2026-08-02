"use client";

import { useState } from "react";
import { Loader2, Tag, X } from "lucide-react";
import { applyPromoCode } from "@/services/checkout";
import { useLocale } from "@/features/i18n";
import { Button } from "@/components/ui/button";
import { controlClasses } from "@/components/ui/field";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/** An applied coupon: the code and what it takes off, in base USD. */
export interface AppliedCoupon {
  code: string;
  discountUsd: number;
}

interface CouponFieldProps {
  /** Amount the discount is computed against, USD. */
  subtotalUsd: number;
  value: AppliedCoupon | null;
  onChange: (coupon: AppliedCoupon | null) => void;
  className?: string;
}

/**
 * CouponField — promo-code entry for the flight flow.
 *
 * Validates through {@link applyPromoCode}, the *same* service the stay checkout
 * uses, so a coupon in the traveller's wallet works identically whichever
 * vertical they're booking. Building a second promo engine for flights is
 * exactly the duplication this module is meant to avoid.
 */
export function CouponField({
  subtotalUsd,
  value,
  onChange,
  className,
}: CouponFieldProps) {
  const { money } = useLocale();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onApply = async () => {
    const code = input.trim();
    if (!code || busy) return;
    setBusy(true);
    setError(null);

    const result = await applyPromoCode(code, subtotalUsd);
    setBusy(false);

    if (result.ok) {
      onChange({ code: result.coupon.code, discountUsd: result.discountUsd });
      setInput("");
      toast.success(`Coupon applied — you saved ${money(result.discountUsd)}`);
    } else {
      onChange(null);
      setError(result.reason);
    }
  };

  if (value) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-field border border-emerald-500/30 bg-emerald-500/8 px-4 py-3",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-emerald-700">
          <Tag className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{value.code} applied</span>
          <span className="shrink-0 font-bold">− {money(value.discountUsd)}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setError(null);
          }}
          aria-label={`Remove coupon ${value.code}`}
          className="grid size-7 shrink-0 place-items-center rounded-field text-emerald-700 transition-colors hover:bg-emerald-500/15"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onApply();
            }
          }}
          placeholder="Promo code"
          aria-label="Promo code"
          aria-invalid={Boolean(error)}
          className={cn(controlClasses(Boolean(error)), "h-11 flex-1 uppercase")}
        />
        <Button
          variant="outline"
          size="md"
          onClick={onApply}
          disabled={busy || !input.trim()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
