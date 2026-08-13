"use client";

import * as Icons from "lucide-react";
import { Check } from "lucide-react";
import {
  INSURANCE_OFFER,
  quantityFor,
  scaleLabel,
  type AddOnOffer,
  type AddOnScale,
} from "@/features/booking";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";

/**
 * Add-on selection. Quantities are derived from the trip (per night, per guest,
 * per room) rather than typed, so the line total always matches the booking —
 * see {@link quantityFor}.
 */
export function AddOnsPicker({
  offers,
  selected,
  onToggle,
  scale,
  insuranceSelected,
  onToggleInsurance,
}: {
  offers: AddOnOffer[];
  selected: string[];
  onToggle: (id: string) => void;
  scale: AddOnScale;
  insuranceSelected: boolean;
  onToggleInsurance: (next: boolean) => void;
}) {
  const { money } = useLocale();

  return (
    <div className="space-y-3">
      {offers.length === 0 && !insuranceSelected && (
        <p className="text-sm text-muted">No extras are offered for this product.</p>
      )}

      <ul className="space-y-2">
        {offers.map((offer) => {
          const quantity = quantityFor(offer, scale);
          const isSelected = selected.includes(offer.id);
          return (
            <li key={offer.id}>
              <AddOnRow
                offer={offer}
                selected={isSelected}
                onToggle={() => onToggle(offer.id)}
                priceLabel={money(offer.unitPrice * quantity)}
                qualifier={scaleLabel(offer, quantity)}
              />
            </li>
          );
        })}
      </ul>

      <div className="rounded-card border border-primary/25 bg-primary-50/50 p-1">
        <AddOnRow
          offer={INSURANCE_OFFER}
          selected={insuranceSelected}
          onToggle={() => onToggleInsurance(!insuranceSelected)}
          priceLabel={money(INSURANCE_OFFER.unitPrice * quantityFor(INSURANCE_OFFER, scale))}
          qualifier={scaleLabel(INSURANCE_OFFER, quantityFor(INSURANCE_OFFER, scale))}
          recommended
        />
      </div>
    </div>
  );
}

function AddOnRow({
  offer,
  selected,
  onToggle,
  priceLabel,
  qualifier,
  recommended,
}: {
  offer: AddOnOffer;
  selected: boolean;
  onToggle: () => void;
  priceLabel: string;
  qualifier: string;
  recommended?: boolean;
}) {
  const Icon =
    (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[offer.icon] ??
    Icons.Plus;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 rounded-card border px-4 py-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary-50"
          : "border-line bg-surface hover:border-primary/40",
      )}
    >
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-field bg-surface-muted text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-ink">{offer.label}</span>
          {recommended && (
            <span className="rounded-pill bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
              Recommended
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-muted">{offer.description}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold text-ink">{priceLabel}</span>
        <span className="block text-[11px] text-muted">{qualifier}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "mt-1 grid size-5 shrink-0 place-items-center rounded border-2",
          selected ? "border-primary bg-primary text-white" : "border-line",
        )}
      >
        {selected && <Check className="size-3" />}
      </span>
    </button>
  );
}
