"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Plane, Ticket, Users } from "lucide-react";
import type { AIBlock } from "@/types/ai";
import { useLocale } from "@/features/i18n";
import { BlockShell } from "./block-shell";

type TripPlanBlock = Extract<AIBlock, { kind: "trip-plan" }>;

/**
 * TripPlanBlock — the "here's your trip" summary card: who, where, when, and
 * the four components that make it up, each linking to the real listing or
 * fare it was built from.
 */
export function TripPlanBlock({ block }: { block: TripPlanBlock }) {
  const { money, date } = useLocale();
  const { plan } = block;
  const party = plan.travelers.adults + plan.travelers.children;

  return (
    <BlockShell title={`${plan.days.length}-day trip · ${plan.destination}`}>
      <dl className="grid grid-cols-2 gap-px bg-line text-xs sm:grid-cols-4">
        <Fact icon={<MapPin className="size-3.5" />} label="Destination" value={plan.destination} />
        <Fact
          icon={<CalendarDays className="size-3.5" />}
          label="Dates"
          value={
            plan.startDate && plan.endDate
              ? `${date(plan.startDate, { month: "short", day: "numeric" })} – ${date(plan.endDate, { month: "short", day: "numeric" })}`
              : `${plan.nights} nights`
          }
        />
        <Fact
          icon={<Users className="size-3.5" />}
          label="Travellers"
          value={`${party} ${party === 1 ? "person" : "people"}`}
        />
        <Fact
          icon={<Ticket className="size-3.5" />}
          label="Estimated"
          value={money(plan.totalUsd)}
          emphasis
        />
      </dl>

      <ul className="divide-y divide-line">
        {plan.flight && (
          <Component
            href={plan.flight.href}
            icon={<Plane className="size-4" />}
            title={`${plan.flight.offer.airlineCode} · ${plan.originCode} ⇄ ${plan.destinationCode}`}
            detail={plan.flight.reason}
            amount={money(plan.flight.offer.fare.totalUsd)}
          />
        )}
        {plan.hotel && (
          <Component
            href={plan.hotel.href}
            icon={<MapPin className="size-4" />}
            title={plan.hotel.listing.title}
            detail={`${plan.nights} nights · ${plan.hotel.listing.location.label}`}
            amount={money(plan.hotel.listing.price.amount * plan.nights)}
          />
        )}
        {plan.transport && (
          <Component
            href={plan.transport.href}
            icon={<Ticket className="size-4" />}
            title={plan.transport.listing.title}
            detail="Airport transfers, both ways"
            amount={money(plan.transport.listing.price.amount * 2)}
          />
        )}
        {plan.activities.map((activity) => (
          <Component
            key={activity.listing.id}
            href={activity.href}
            icon={<Ticket className="size-4" />}
            title={activity.listing.title}
            detail={activity.reason}
            amount={money(activity.listing.price.amount * Math.max(1, party))}
          />
        ))}
      </ul>
    </BlockShell>
  );
}

function Fact({
  icon,
  label,
  value,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <dt className="inline-flex items-center gap-1 text-muted">
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className={emphasis ? "mt-0.5 font-bold text-accent-600" : "mt-0.5 font-semibold text-ink"}>
        {value}
      </dd>
    </div>
  );
}

function Component({
  href,
  icon,
  title,
  detail,
  amount,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail?: string;
  amount: string;
}) {
  return (
    <li>
      <Link href={href} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-muted">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-field bg-primary-50 text-primary">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{title}</span>
          {detail && <span className="block truncate text-xs text-muted">{detail}</span>}
        </span>
        <span className="shrink-0 text-sm font-semibold text-ink">{amount}</span>
      </Link>
    </li>
  );
}
