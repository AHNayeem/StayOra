"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, HelpCircle, UserPlus } from "lucide-react";
import type { AIBlock, AITravelerInfo } from "@/types/ai";
import { useLocale } from "@/features/i18n";
import { cn } from "@/lib/utils";
import { BlockShell } from "./block-shell";
import type { BlockActionProps } from "./booking-blocks";

/**
 * Interactive blocks — the places where the assistant needs something back.
 *
 * They raise *structured* actions rather than composing a sentence for the
 * parser to re-read: a chosen card is a card id, not the phrase "use the visa
 * one". Free text still works for everyone who prefers to type, but the tapped
 * path is lossless.
 */

type Block<K extends AIBlock["kind"]> = Extract<AIBlock, { kind: K }>;

/* -------------------------------------------------------------------------- */
/* Clarification                                                               */
/* -------------------------------------------------------------------------- */

export function ClarificationBlock({
  block,
  onAsk,
  disabled,
}: {
  block: Block<"clarification">;
  onAsk?: (prompt: string) => void;
  disabled?: boolean;
}) {
  if (block.options.length === 0) return null;
  return (
    <section className="rounded-card border border-line bg-surface-muted px-4 py-3">
      <p className="flex items-start gap-2 text-sm text-ink">
        <HelpCircle className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        {block.question}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {block.options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onAsk?.(option)}
            className="rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-medium text-body transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Action required                                                             */
/* -------------------------------------------------------------------------- */

export function ActionRequiredBlock({ block }: { block: Block<"action-required"> }) {
  const warning = block.tone === "warning";
  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border px-4 py-3",
        warning ? "border-warning/40 bg-warning/5" : "border-primary/30 bg-primary-50/60",
      )}
    >
      <p className="text-sm font-semibold text-ink">{block.title}</p>
      <p className="mt-0.5 text-sm text-body">{block.text}</p>
      {block.href && (
        <Link
          href={block.href}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-pill bg-primary px-4 text-xs font-semibold text-white transition-colors hover:bg-primary-600"
        >
          {block.actionLabel}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Traveller form                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The details the property needs.
 *
 * Prefilled from the account wherever possible, and every field the booking
 * doesn't need is simply absent — a form that asks for a passport number to
 * book a city hotel is a form nobody finishes.
 */
export function TravelerFormBlock({
  block,
  onAction,
  disabled,
}: { block: Block<"traveler-form"> } & BlockActionProps) {
  const [fullName, setFullName] = useState(block.contact?.fullName ?? "");
  const [email, setEmail] = useState(block.contact?.email ?? "");
  const [phone, setPhone] = useState(block.contact?.phone ?? "");
  const [extra, setExtra] = useState<AITravelerInfo[]>(() =>
    block.travelers.slice(1, block.required),
  );
  const [requests, setRequests] = useState("");

  const extraNeeded = Math.max(0, block.required - 1);
  const valid = fullName.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const submit = () => {
    if (!valid) return;
    const travelers: AITravelerInfo[] = [
      { fullName: fullName.trim(), type: "adult", email: email.trim(), phone: phone.trim() || undefined },
      ...Array.from({ length: extraNeeded }, (_, index) => ({
        fullName: (extra[index]?.fullName ?? "").trim(),
        type: "adult" as const,
        passportNumber: extra[index]?.passportNumber,
      })).filter((traveler) => traveler.fullName.length > 1),
    ];
    onAction?.(
      {
        kind: "provide-info",
        contact: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
        },
        travelers,
        specialRequests: requests.trim() || undefined,
      },
      `Booking for ${fullName.trim()}`,
    );
  };

  return (
    <BlockShell title={block.title} note={block.note}>
      <div className="space-y-3 p-4">
        <Field label="Lead guest name" value={fullName} onChange={setFullName} autoComplete="name" />
        <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" />
        <Field label="Phone (optional)" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />

        {Array.from({ length: extraNeeded }, (_, index) => (
          <div key={index} className="space-y-2 rounded-field border border-line p-3">
            <p className="text-xs font-semibold text-muted">Guest {index + 2}</p>
            <Field
              label="Full name"
              value={extra[index]?.fullName ?? ""}
              onChange={(value) =>
                setExtra((prev) => {
                  const next = [...prev];
                  next[index] = { ...(next[index] ?? { type: "adult" }), fullName: value, type: "adult" };
                  return next;
                })
              }
            />
            {block.needsDocuments && (
              <Field
                label="Passport number"
                value={extra[index]?.passportNumber ?? ""}
                onChange={(value) =>
                  setExtra((prev) => {
                    const next = [...prev];
                    next[index] = {
                      ...(next[index] ?? { fullName: "", type: "adult" }),
                      passportNumber: value,
                    };
                    return next;
                  })
                }
              />
            )}
          </div>
        ))}

        <Field label="Special requests (optional)" value={requests} onChange={setRequests} />

        {block.saved.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {block.saved.slice(0, 3).map((traveler) => (
              <button
                key={traveler.savedTravelerId ?? traveler.fullName}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setFullName(traveler.fullName);
                  if (traveler.email) setEmail(traveler.email);
                  if (traveler.phone) setPhone(traveler.phone);
                }}
                className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-xs font-medium text-body transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
              >
                <UserPlus className="size-3.5" aria-hidden="true" />
                {traveler.fullName}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line p-4">
        <button
          type="button"
          disabled={disabled || !valid}
          onClick={submit}
          className="flex h-11 w-full items-center justify-center rounded-pill bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </BlockShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  const id = `ai-field-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-field border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-primary"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Payment selection                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Choosing how to pay.
 *
 * The methods are display metadata only — an id, a brand and four digits. No
 * card number reaches this component, and choosing one authorises nothing: the
 * charge happens only after the review block's explicit confirmation.
 */
export function PaymentSelectionBlock({
  block,
  onAction,
  disabled,
}: { block: Block<"payment-selection"> } & BlockActionProps) {
  const { money } = useLocale();
  return (
    <BlockShell
      title={block.title}
      note={
        block.amountUsd > 0
          ? `${money(block.amountUsd)} will be charged only after you confirm the review.`
          : undefined
      }
    >
      <ul className="divide-y divide-line">
        {block.methods.map((method) => {
          const selected = method.id === block.selectedId;
          return (
            <li key={method.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAction?.({ kind: "select-payment", methodId: method.id }, `Pay with ${method.label}`)}
                className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-surface-muted disabled:opacity-50"
              >
                <CreditCard className="size-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{method.label}</span>
                  {method.description && (
                    <span className="block truncate text-xs text-muted">{method.description}</span>
                  )}
                </span>
                {selected && <Check className="size-4 shrink-0 text-success" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </BlockShell>
  );
}
