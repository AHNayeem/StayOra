import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Code2,
  LifeBuoy,
  Mail,
  Rocket,
  Sparkles,
} from "lucide-react";
import { Tag } from "../../ui";

/** Static help resources — presentational, so it renders as a server component. */
const RESOURCES: {
  icon: typeof BookOpen;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}[] = [
  {
    icon: Rocket,
    title: "Getting started",
    description: "Set up your workspace, invite the team and take your first booking.",
    href: "/dashboard",
  },
  {
    icon: BookOpen,
    title: "Admin guide",
    description: "How catalog, bookings, finance and CMS fit together end to end.",
    href: "https://docs.stayora.example/admin",
    external: true,
  },
  {
    icon: Code2,
    title: "API reference",
    description: "REST endpoints, webhooks and authentication for integrations.",
    href: "https://docs.stayora.example/api",
    external: true,
  },
  {
    icon: Sparkles,
    title: "What's new",
    description: "Release notes and product updates from the StayOra team.",
    href: "https://docs.stayora.example/changelog",
    external: true,
  },
];

const SHORTCUTS: [string, string[]][] = [
  ["Open command palette", ["⌘", "K"]],
  ["Go to dashboard", ["G", "D"]],
  ["Go to bookings", ["G", "B"]],
  ["Create new record", ["C"]],
  ["Focus search", ["/"]],
  ["Toggle theme", ["⌘", "J"]],
];

const PLATFORM_INFO: [string, string][] = [
  ["Version", "StayOra 1.0.0"],
  ["Environment", "Production"],
  ["Region", "eu-west-1"],
  ["Support plan", "Priority"],
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-field border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-body">
      {children}
    </kbd>
  );
}

/**
 * HelpView — the in-dashboard help hub: documentation shortcuts, keyboard
 * shortcuts, a direct line to support and platform build info. Static content
 * today; the doc links point at the (external) knowledge base and the support
 * card deep-links into the existing ticket queue.
 */
export function HelpView() {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Documentation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.title}
                href={r.href}
                target={r.external ? "_blank" : undefined}
                rel={r.external ? "noreferrer" : undefined}
                className="group flex items-start gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-surface-muted"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-field bg-surface-muted text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 font-medium text-ink">
                    {r.title}
                    <ArrowUpRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{r.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink">Keyboard shortcuts</h2>
          <ul className="flex flex-col gap-2.5">
            {SHORTCUTS.map(([action, keys]) => (
              <li key={action} className="flex items-center justify-between gap-4">
                <span className="text-sm text-body">{action}</span>
                <span className="flex items-center gap-1">
                  {keys.map((k, i) => (
                    <Kbd key={`${action}-${i}`}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-card border border-line bg-surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <LifeBuoy className="size-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-ink">Need a hand?</h2>
            </div>
            <p className="text-sm text-muted">
              Can&apos;t find what you need? Open a ticket and our team will get back to
              you — priority plans are answered within an hour.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/support"
                className="inline-flex items-center gap-1.5 rounded-field bg-primary px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                <LifeBuoy className="size-4" aria-hidden="true" />
                Contact support
              </Link>
              <a
                href="mailto:support@stayora.example"
                className="inline-flex items-center gap-1.5 rounded-field border border-line px-3 py-1.5 text-sm font-medium text-body transition-colors hover:bg-surface-muted"
              >
                <Mail className="size-4" aria-hidden="true" />
                support@stayora.example
              </a>
            </div>
          </section>

          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">Platform</h2>
            <dl className="flex flex-col gap-2.5">
              {PLATFORM_INFO.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd>
                    <Tag>{value}</Tag>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
