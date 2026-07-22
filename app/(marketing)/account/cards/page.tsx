"use client";

import { useState } from "react";
import { CreditCard, Plus, Star, Trash2 } from "lucide-react";
import type { CardBrand, SavedCard } from "@/types/traveler";
import { addCard, removeCard, setDefaultCard, useSavedCards } from "@/features/account/cards-store";
import { useAuth } from "@/features/auth";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const BRANDS: { key: CardBrand; label: string; className: string }[] = [
  { key: "visa", label: "Visa", className: "from-blue-600 to-blue-800" },
  { key: "mastercard", label: "Mastercard", className: "from-orange-500 to-red-600" },
  { key: "amex", label: "Amex", className: "from-sky-500 to-cyan-700" },
  { key: "paypal", label: "PayPal", className: "from-indigo-500 to-blue-700" },
];

const brandClass = (brand: CardBrand) =>
  BRANDS.find((b) => b.key === brand)?.className ?? "from-slate-600 to-slate-800";
const brandLabel = (brand: CardBrand) => BRANDS.find((b) => b.key === brand)?.label ?? brand;

export default function CardsPage() {
  const cards = useSavedCards();
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <AccountPageHeader
        title="Saved cards"
        description="Manage the payment methods used to speed up checkout."
        actions={
          <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add card
          </Button>
        }
      />

      {cards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              onDefault={() => {
                setDefaultCard(card.id);
                toast.success(`${brandLabel(card.brand)} •••• ${card.last4} is now your default`);
              }}
              onRemove={() => {
                removeCard(card.id);
                toast.success("Card removed");
              }}
            />
          ))}
        </div>
      ) : (
        <AccountEmpty
          icon={CreditCard}
          title="No saved cards"
          description="Add a card to check out faster next time."
          action={
            <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add card
            </Button>
          }
        />
      )}

      {adding && <AddCardModal onClose={() => setAdding(false)} />}
    </div>
  );
}

function CardTile({
  card,
  onDefault,
  onRemove,
}: {
  card: SavedCard;
  onDefault: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div
        className={cn(
          "relative flex h-32 flex-col justify-between bg-linear-to-br p-4 text-white",
          brandClass(card.brand),
        )}
      >
        <div className="flex items-center justify-between">
          <CreditCard className="size-6" aria-hidden="true" />
          {card.isDefault && (
            <span className="rounded-pill bg-white/20 px-2 py-0.5 text-xs font-semibold">
              Default
            </span>
          )}
        </div>
        <div>
          <p className="font-mono text-lg tracking-widest">•••• {card.last4}</p>
          <div className="mt-1 flex items-center justify-between text-xs text-white/80">
            <span className="truncate">{card.holder}</span>
            <span>
              {String(card.expMonth).padStart(2, "0")}/{String(card.expYear).slice(-2)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between p-3">
        <span className="text-sm font-medium text-ink">{brandLabel(card.brand)}</span>
        <div className="flex gap-1">
          {!card.isDefault && (
            <button
              type="button"
              onClick={onDefault}
              className="inline-flex items-center gap-1 rounded-field px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-primary-50"
            >
              <Star className="size-4" aria-hidden="true" />
              Default
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove card"
            className="grid size-8 place-items-center rounded-field text-muted hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddCardModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [brand, setBrand] = useState<CardBrand>("visa");
  const [numberValue, setNumberValue] = useState("");
  const [holder, setHolder] = useState(user?.name ?? "");
  const [expiry, setExpiry] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);

  const digits = numberValue.replace(/\D/g, "");
  const [expMonth, expYear] = parseExpiry(expiry);
  const canSubmit =
    digits.length >= 12 && holder.trim().length > 1 && expMonth > 0 && expYear > 0;

  const onSubmit = () => {
    if (!canSubmit) return;
    addCard({
      id: `card_${Date.now().toString(36)}`,
      brand,
      last4: digits.slice(-4),
      expMonth,
      expYear,
      holder: holder.trim(),
      isDefault: makeDefault,
      billingCountry: user?.country,
    });
    toast.success("Card added", { description: `${brandLabel(brand)} •••• ${digits.slice(-4)}` });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add a card"
      description="Your details are only stored in this demo — never send real card numbers."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={!canSubmit}>
            Add card
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Card type</label>
          <div className="flex flex-wrap gap-2">
            {BRANDS.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => setBrand(b.key)}
                aria-pressed={brand === b.key}
                className={cn(
                  "rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  brand === b.key
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-surface text-body hover:border-primary",
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Card number" htmlFor="card-number">
          <input
            id="card-number"
            inputMode="numeric"
            value={numberValue}
            onChange={(e) => setNumberValue(e.target.value)}
            placeholder="4242 4242 4242 4242"
            maxLength={23}
            className={inputClass}
          />
        </Field>

        <Field label="Cardholder name" htmlFor="card-holder">
          <input
            id="card-holder"
            type="text"
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Expiry (MM/YY)" htmlFor="card-expiry">
          <input
            id="card-expiry"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            placeholder="11/28"
            maxLength={5}
            className={inputClass}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-body">
          <input
            type="checkbox"
            checked={makeDefault}
            onChange={(e) => setMakeDefault(e.target.checked)}
            className="size-4 rounded border-line text-primary focus:ring-primary"
          />
          Set as default payment method
        </label>
      </div>
    </Modal>
  );
}

/** Parse "MM/YY" or "MM/YYYY" → [month, fullYear] (0s when invalid). */
function parseExpiry(value: string): [number, number] {
  const match = value.match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/);
  if (!match) return [0, 0];
  const month = Number(match[1]);
  let year = Number(match[2]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12) return [0, 0];
  return [month, year];
}

const inputClass =
  "h-11 w-full rounded-field border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}
