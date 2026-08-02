"use client";

import { useState } from "react";
import { Check, CreditCard, Plus } from "lucide-react";
import type { CardBrand } from "@/types/traveler";
import { useSavedCards, addCard } from "@/features/account/cards-store";
import { controlClasses } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * Shared payment-method layer.
 *
 * Extracted from the stay checkout so the flight flow reuses it verbatim rather
 * than growing a parallel payment implementation. There is exactly one place
 * that knows how a card is entered, validated, brand-detected, resolved into a
 * label and persisted to the traveller's saved cards — which is the only way the
 * two flows can stay in step as payment evolves.
 *
 * State lives in {@link usePaymentSelection} so hosts can read validity for
 * their own step gating; the component is purely presentational.
 */

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  paypal: "PayPal",
};

/** Detect the card brand from its leading digits (the standard IIN ranges). */
export function brandFromNumber(digits: string): CardBrand {
  if (digits.startsWith("4")) return "visa";
  if (/^3[47]/.test(digits)) return "amex";
  if (digits.startsWith("5") || digits.startsWith("2")) return "mastercard";
  return "visa";
}

/** What the host needs to record against the booking. */
export interface ResolvedPayment {
  /** Human label, e.g. "Visa •••• 4242". */
  method: string;
  brand: CardBrand;
}

export interface PaymentSelection {
  /** A saved card's id, `"new"`, or `"paypal"`. */
  methodId: string;
  setMethodId: (id: string) => void;
  cardNumber: string;
  setCardNumber: (v: string) => void;
  cardHolder: string;
  setCardHolder: (v: string) => void;
  cardExpiry: string;
  setCardExpiry: (v: string) => void;
  saveCard: boolean;
  setSaveCard: (v: boolean) => void;
  savedCards: ReturnType<typeof useSavedCards>;
  /** Enough has been entered to attempt a charge. */
  isValid: boolean;
  /** The label + brand to store on the booking. */
  resolve: () => ResolvedPayment;
  /** Persist a freshly-typed card if the traveller asked us to. */
  persist: (nowMs: number, billingCountry?: string) => void;
}

/**
 * Payment state for a checkout step. Defaults to the traveller's default saved
 * card, falling back to the new-card form when they have none.
 */
export function usePaymentSelection(defaultHolder: string): PaymentSelection {
  const savedCards = useSavedCards();
  const defaultCard = savedCards.find((c) => c.isDefault) ?? savedCards[0];

  const [methodId, setMethodId] = useState<string>(defaultCard ? defaultCard.id : "new");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState(defaultHolder);
  const [cardExpiry, setCardExpiry] = useState("");
  const [saveCard, setSaveCard] = useState(true);

  const digits = cardNumber.replace(/\D/g, "");
  const newCardValid =
    digits.length >= 12 &&
    cardHolder.trim().length > 1 &&
    /^\d{1,2}\s*\/\s*\d{2,4}$/.test(cardExpiry);

  return {
    methodId,
    setMethodId,
    cardNumber,
    setCardNumber,
    cardHolder,
    setCardHolder,
    cardExpiry,
    setCardExpiry,
    saveCard,
    setSaveCard,
    savedCards,
    isValid: methodId !== "new" || newCardValid,

    resolve(): ResolvedPayment {
      if (methodId === "paypal") return { method: "PayPal", brand: "paypal" };
      if (methodId === "new") {
        const brand = brandFromNumber(digits);
        return { method: `${BRAND_LABEL[brand]} •••• ${digits.slice(-4)}`, brand };
      }
      const card = savedCards.find((c) => c.id === methodId);
      if (card) {
        return { method: `${BRAND_LABEL[card.brand]} •••• ${card.last4}`, brand: card.brand };
      }
      return { method: "Card", brand: "visa" };
    },

    persist(nowMs, billingCountry) {
      if (methodId !== "new" || !saveCard || !newCardValid) return;
      const [mm, yy] = cardExpiry.split("/");
      addCard({
        id: `card_${nowMs.toString(36)}`,
        brand: brandFromNumber(digits),
        last4: digits.slice(-4),
        expMonth: Number(mm),
        expYear: Number(yy.length === 2 ? `20${yy}` : yy),
        holder: cardHolder.trim(),
        isDefault: savedCards.length === 0,
        billingCountry: billingCountry || undefined,
      });
    },
  };
}

/**
 * PaymentMethodPicker — saved cards, a new-card form and PayPal.
 * Presentation only; drive it with {@link usePaymentSelection}.
 */
export function PaymentMethodPicker({ selection }: { selection: PaymentSelection }) {
  const {
    savedCards,
    methodId,
    setMethodId,
    cardNumber,
    setCardNumber,
    cardHolder,
    setCardHolder,
    cardExpiry,
    setCardExpiry,
    saveCard,
    setSaveCard,
  } = selection;

  return (
    <div className="space-y-2">
      {savedCards.map((card) => (
        <MethodRow
          key={card.id}
          id={card.id}
          selected={methodId === card.id}
          onSelect={setMethodId}
          icon={<CreditCard className="size-5 text-primary" aria-hidden="true" />}
          title={`${BRAND_LABEL[card.brand]} •••• ${card.last4}`}
          subtitle={`Expires ${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`}
        />
      ))}

      <MethodRow
        id="new"
        selected={methodId === "new"}
        onSelect={setMethodId}
        icon={<Plus className="size-5 text-primary" aria-hidden="true" />}
        title="Pay with a new card"
      />

      {methodId === "new" && (
        <div className="grid gap-3 rounded-card border border-line bg-surface-muted/40 p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-ink">Card number</span>
            <input
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="4242 4242 4242 4242"
              maxLength={23}
              className={cn(controlClasses(false), "h-11")}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Cardholder name</span>
            <input
              type="text"
              autoComplete="cc-name"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              className={cn(controlClasses(false), "h-11")}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Expiry (MM/YY)</span>
            <input
              autoComplete="cc-exp"
              value={cardExpiry}
              onChange={(e) => setCardExpiry(e.target.value)}
              placeholder="11/28"
              maxLength={5}
              className={cn(controlClasses(false), "h-11")}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-body sm:col-span-2">
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(e) => setSaveCard(e.target.checked)}
              className="size-4 rounded border-line text-primary focus:ring-primary"
            />
            Save this card for next time
          </label>
        </div>
      )}

      <MethodRow
        id="paypal"
        selected={methodId === "paypal"}
        onSelect={setMethodId}
        icon={<span className="text-sm font-bold text-indigo-600">Pay</span>}
        title="PayPal"
        subtitle="You'll confirm in a mock PayPal window"
      />
    </div>
  );
}

function MethodRow({
  id,
  selected,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  id: string;
  selected: boolean;
  onSelect: (id: string) => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-card border px-4 py-3 text-left transition-colors",
        selected ? "border-primary bg-primary-50" : "border-line bg-surface hover:border-primary/40",
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-field bg-surface-muted">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2",
          selected ? "border-primary bg-primary text-white" : "border-line",
        )}
      >
        {selected && <Check className="size-3" aria-hidden="true" />}
      </span>
    </button>
  );
}
