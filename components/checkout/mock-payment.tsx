"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import {
  DEMO_3DS_CODE,
  DEMO_CARDS,
  type DemoCard,
  type MockInstrument,
  type PaymentAttempt,
  type PaymentOutcome,
} from "@/features/dashboard/domain";
import { Button } from "@/components/ui/button";
import { controlClasses } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * The mock payment surface.
 *
 * This is a *simulator*, and it says so: the traveller picks a demo card and
 * that choice decides the outcome, exactly like a gateway sandbox. No card
 * number is ever captured or stored — the selected demo card contributes only a
 * brand, a last-4 and an expiry label, which is all a tokenised instrument
 * gives you in production either.
 */

export type PaymentMethodId = "card" | "wallet" | "bank";

export interface MockPaymentState {
  methodId: PaymentMethodId;
  setMethodId: (id: PaymentMethodId) => void;
  demoCardId: string;
  setDemoCardId: (id: string) => void;
  card: DemoCard;
  instrument: MockInstrument;
  outcome: PaymentOutcome;
}

const WALLETS: { id: string; label: string; last4: string }[] = [
  { id: "bkash", label: "bKash", last4: "0142" },
  { id: "nagad", label: "Nagad", last4: "0142" },
];

/** Payment selection state. Defaults to the card that approves. */
export function useMockPayment(): MockPaymentState {
  const [methodId, setMethodId] = useState<PaymentMethodId>("card");
  const [demoCardId, setDemoCardId] = useState(DEMO_CARDS[0].id);
  const card = DEMO_CARDS.find((c) => c.id === demoCardId) ?? DEMO_CARDS[0];

  const instrument: MockInstrument =
    methodId === "card"
      ? {
          provider: "mock",
          kind: "card",
          brand: card.brand,
          last4: card.last4,
          expiryLabel: card.expiryLabel,
          label: `${card.brand === "amex" ? "Amex" : card.brand === "mastercard" ? "Mastercard" : "Visa"} •••• ${card.last4}`,
        }
      : methodId === "wallet"
        ? {
            provider: "mock",
            kind: "wallet",
            brand: "bkash",
            last4: WALLETS[0].last4,
            label: `bKash •••• ${WALLETS[0].last4}`,
          }
        : {
            provider: "mock",
            kind: "bank",
            brand: "bank",
            last4: "8841",
            label: "Bank transfer •••• 8841",
          };

  return {
    methodId,
    setMethodId,
    demoCardId,
    setDemoCardId,
    card,
    instrument,
    // Wallet and bank always approve — the failure scenarios live on the cards.
    outcome: methodId === "card" ? card.outcome : "success",
  };
}

// ---------------------------------------------------------------------------
// Method picker
// ---------------------------------------------------------------------------

export function MockPaymentPicker({ state }: { state: MockPaymentState }) {
  const { methodId, setMethodId, demoCardId, setDemoCardId } = state;

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label="Payment method"
        className="grid gap-2 sm:grid-cols-3"
      >
        <MethodTile
          id="card"
          selected={methodId === "card"}
          onSelect={setMethodId}
          icon={<CreditCard className="size-5" aria-hidden="true" />}
          label="Card"
        />
        <MethodTile
          id="wallet"
          selected={methodId === "wallet"}
          onSelect={setMethodId}
          icon={<Smartphone className="size-5" aria-hidden="true" />}
          label="Mobile wallet"
        />
        <MethodTile
          id="bank"
          selected={methodId === "bank"}
          onSelect={setMethodId}
          icon={<Wallet className="size-5" aria-hidden="true" />}
          label="Bank transfer"
        />
      </div>

      {methodId === "card" && (
        <fieldset className="rounded-card border border-line bg-surface-muted/40 p-4">
          <legend className="px-1 text-sm font-medium text-ink">Demo card</legend>
          <p className="mb-3 text-xs text-muted">
            This prototype has no payment gateway. Pick a card to choose what the
            simulated issuer does — that&rsquo;s how you demo a decline or a 3-D
            Secure challenge. Nothing is charged and no card number is stored.
          </p>
          <div className="space-y-2">
            {DEMO_CARDS.map((card) => (
              <label
                key={card.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-field border px-3 py-2.5 transition-colors",
                  demoCardId === card.id
                    ? "border-primary bg-primary-50"
                    : "border-line bg-surface hover:border-primary/40",
                )}
              >
                <input
                  type="radio"
                  name="demo-card"
                  value={card.id}
                  checked={demoCardId === card.id}
                  onChange={() => setDemoCardId(card.id)}
                  className="mt-1 size-4 border-line text-primary focus:ring-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-ink">{card.display}</span>
                    <span
                      className={cn(
                        "rounded-pill px-2 py-0.5 text-[11px] font-semibold",
                        card.outcome === "success"
                          ? "bg-emerald-500/12 text-emerald-700"
                          : card.outcome === "requires_3ds"
                            ? "bg-warning/15 text-amber-700"
                            : "bg-danger/12 text-danger",
                      )}
                    >
                      {card.label}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{card.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {methodId === "wallet" && (
        <div className="rounded-card border border-line bg-surface-muted/40 p-4 text-sm text-body">
          You&rsquo;ll be shown a simulated {WALLETS[0].label} approval screen. No
          real wallet is contacted.
        </div>
      )}

      {methodId === "bank" && (
        <div className="rounded-card border border-line bg-surface-muted/40 p-4 text-sm text-body">
          A simulated bank transfer is marked as received immediately so the demo
          can continue. A real integration would hold the booking until the
          transfer clears.
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Lock className="size-3.5" aria-hidden="true" />
        Simulated checkout — no card details are collected or stored.
      </p>
    </div>
  );
}

function MethodTile({
  id,
  selected,
  onSelect,
  icon,
  label,
}: {
  id: PaymentMethodId;
  selected: boolean;
  onSelect: (id: PaymentMethodId) => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(id)}
      className={cn(
        "flex items-center gap-2.5 rounded-card border px-4 py-3 text-left text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary-50 text-primary-700"
          : "border-line bg-surface text-body hover:border-primary/40",
      )}
    >
      <span className="text-primary">{icon}</span>
      <span className="flex-1">{label}</span>
      {selected && <Check className="size-4 text-primary" aria-hidden="true" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// 3-D Secure challenge
// ---------------------------------------------------------------------------

export function ThreeDsChallenge({
  attempt,
  onSubmit,
  onCancel,
  busy,
  error,
}: {
  attempt: PaymentAttempt;
  onSubmit: (code: string) => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [code, setCode] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  // The challenge replaces the pay button mid-flow. Without moving focus, a
  // keyboard or screen-reader user is left on a control that no longer exists
  // and has no idea a code is being asked for.
  useEffect(() => {
    codeRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby="three-ds-title"
      className="rounded-card border border-primary/30 bg-primary-50/60 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="three-ds-title" className="text-base font-semibold text-ink">
            Your bank needs to check it&rsquo;s you
          </h3>
          <p className="mt-1 text-sm text-body">
            We&rsquo;ve sent a one-time code for {attempt.instrument.label}.
            <span className="block text-muted">
              Simulation — the code is <strong className="font-mono">{DEMO_3DS_CODE}</strong>.
              Enter anything else to demo a failed authentication.
            </span>
          </p>

          <form
            className="mt-4 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit(code);
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Authentication code</span>
              <input
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                maxLength={6}
                aria-describedby={error ? "three-ds-error" : undefined}
                aria-invalid={error ? true : undefined}
                className={cn(controlClasses(Boolean(error)), "h-11 w-40 font-mono tracking-widest")}
              />
            </label>
            <Button type="submit" variant="primary" size="md" disabled={busy || !code.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Authenticate
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </form>

          {error && (
            <p id="three-ds-error" role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Failure + retry
// ---------------------------------------------------------------------------

export function PaymentFailure({
  attempt,
  onRetry,
  busy,
}: {
  attempt: PaymentAttempt;
  onRetry: () => void;
  busy: boolean;
}) {
  return (
    <section
      role="alert"
      aria-live="assertive"
      className="rounded-card border border-danger/30 bg-danger/8 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger/12 text-danger">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-ink">Payment didn&rsquo;t go through</h3>
          <p className="mt-1 text-sm text-body">{attempt.failureMessage}</p>
          <p className="mt-1 text-xs text-muted">
            Attempt {attempt.attemptNumber} · {attempt.reference} · your dates are still held.
          </p>
          <Button
            variant="primary"
            size="md"
            className="mt-3"
            onClick={onRetry}
            disabled={busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Choose another method and retry
          </Button>
        </div>
      </div>
    </section>
  );
}
