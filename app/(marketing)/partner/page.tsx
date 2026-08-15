import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgePercent,
  CalendarCheck,
  LineChart,
  Megaphone,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { MERCHANT_PLAN_LIST, PRICING_CONFIG } from "@/features/dashboard/domain";
import { PartnerSignup } from "./partner-signup";

export const metadata: Metadata = {
  title: "Become a Partner",
  description:
    "List your hotel, apartment, tour or transport service on Otithee. Apply in minutes, get verified, and start taking bookings.",
  alternates: { canonical: "/partner" },
};

const STEPS = [
  {
    icon: CalendarCheck,
    title: "Apply",
    body: "Tell us about your business and what you supply. Takes a few minutes.",
  },
  {
    icon: ShieldCheck,
    title: "Get verified",
    body: "Upload your registration, tax and identity documents for compliance review.",
  },
  {
    icon: BadgePercent,
    title: "Agree terms",
    body: "Accept the partner agreement and add the account your settlements are paid to.",
  },
  {
    icon: LineChart,
    title: "Go live",
    body: "Create listings, get them approved, and start taking bookings.",
  },
];

const BENEFITS = [
  {
    icon: Wallet,
    title: "Transparent commission",
    body: `Commission is charged on the net sale value of a confirmed booking — typically ${PRICING_CONFIG.defaultCommissionRate}%, agreed in writing before you list anything.`,
  },
  {
    icon: LineChart,
    title: "One place for the money",
    body: "Bookings, commission, refunds, settlements and payouts all reconcile to the same ledger you can see.",
  },
  {
    icon: Megaphone,
    title: "Reach when you want it",
    body: "Buy promoted placement at published rates. No auction, no minimum spend beyond the rate card.",
  },
];

/**
 * Become a partner — the public entry to merchant onboarding.
 *
 * The form creates the same merchant application the platform reviews in the
 * dashboard, so there is exactly one way into the merchant lifecycle.
 */
export default function PartnerPage() {
  return (
    <>
      <PageBanner
        title="Grow your business with Otithee"
        description="List your stays, tours or transport alongside thousands of others, and reach travellers already planning their trip."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Become a partner" }]}
        image="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80"
        imageAlt=""
      />

      <Section background="surface" spacing="md">
        <SectionHeader
          eyebrow="How it works"
          title="Four steps from application to your first booking"
        />
        <ol className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-card border border-line bg-surface p-6">
              <span className="grid size-10 place-items-center rounded-full bg-primary-50 text-primary">
                <step.icon className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                Step {i + 1}
              </p>
              <h3 className="mt-1 text-base font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section background="muted" spacing="md">
        <SectionHeader eyebrow="Why Otithee" title="What you get" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <article key={benefit.title} className="rounded-card border border-line bg-surface p-6">
              <span className="grid size-10 place-items-center rounded-full bg-accent-50 text-accent">
                <benefit.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">{benefit.title}</h3>
              <p className="mt-2 text-sm text-body">{benefit.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section background="surface" spacing="md">
        <SectionHeader
          eyebrow="Plans"
          title="Start free, upgrade when you outgrow it"
          description="Your plan changes your limits and tools. It never changes your commission."
        />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {MERCHANT_PLAN_LIST.map((plan) => (
            <article key={plan.id} className="rounded-card border border-line bg-surface p-6">
              <h3 className="text-base font-semibold text-ink">{plan.name}</h3>
              <p className="mt-1 text-2xl font-bold text-ink">
                {plan.price > 0 ? `$${plan.price}` : "Free"}
                {plan.price > 0 && (
                  <span className="text-sm font-normal text-muted">/month</span>
                )}
              </p>
              <p className="mt-2 text-sm text-body">{plan.description}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-body">
                {plan.features.map((feature) => (
                  <li key={feature}>· {feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>

      <Section background="muted" spacing="md" id="apply">
        <SectionHeader
          eyebrow="Apply"
          title="Start your application"
          description="No commitment — you can finish the rest of your onboarding later."
        />
        <div className="mx-auto mt-8 max-w-3xl">
          <PartnerSignup />
          <p className="mt-4 text-center text-xs text-muted">
            Already applied?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>{" "}
            to pick up where you left off.
          </p>
        </div>
      </Section>
    </>
  );
}
