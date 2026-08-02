import {
  BadgeCheck,
  Headphones,
  Leaf,
  Luggage,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { Reveal } from "@/components/shared/reveal";

/** Reasons to book flights here, each tied to something the module actually does. */
const REASONS = [
  {
    icon: ShieldCheck,
    title: "The price you see is the price you pay",
    body: "Taxes, carrier charges and our booking fee are in every total from the first result — no fees appearing at the last step.",
  },
  {
    icon: Luggage,
    title: "Baggage shown up front",
    body: "Every fare states its cabin and checked allowance, so a cheap fare that charges for a bag can't hide behind a lower headline price.",
  },
  {
    icon: Wallet,
    title: "Fare families explained",
    body: "Saver, Value and Flex sit side by side with their change and refund rules spelled out, so you know what you're giving up to save.",
  },
  {
    icon: Leaf,
    title: "Emissions on every result",
    body: "We show per-passenger CO₂ and how it compares to the route average, so a greener routing is an easy choice to make.",
  },
  {
    icon: BadgeCheck,
    title: "20+ airlines, one checkout",
    body: "Full-service and low-cost carriers in one search, paid for with your saved cards, wallet and coupons like any other Otithee booking.",
  },
  {
    icon: Headphones,
    title: "Support that knows your booking",
    body: "Change requests, refunds and special assistance are handled from My Flights, with your reference already attached.",
  },
] as const;

/** WhyFlyWithUs — the trust band on the flights landing page. */
export function WhyFlyWithUs() {
  return (
    <Section background="surface">
      <SectionHeader
        title="Why book flights with Otithee"
        description="The things that decide whether a fare is actually a good deal — surfaced, not buried."
        align="center"
      />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {REASONS.map((reason, i) => {
          const Icon = reason.icon;
          return (
            <Reveal key={reason.title} step={i % 3}>
              <article className="flex h-full flex-col rounded-card border border-line bg-surface p-6 shadow-card">
                <span className="grid size-11 place-items-center rounded-field bg-primary-50 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{reason.title}</h3>
                <p className="mt-2 text-sm text-body">{reason.body}</p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
