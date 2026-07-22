import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BedDouble, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { Logo } from "@/components/layout/logo";

export const metadata: Metadata = {
  title: { default: "Account", template: `%s | ${siteConfig.name}` },
  robots: { index: false, follow: false },
};

const HIGHLIGHTS = [
  { icon: Globe2, text: "Book stays, tours & transport across 45+ destinations" },
  { icon: ShieldCheck, text: "Secure checkout with buyer protection on every trip" },
  { icon: BedDouble, text: "Manage bookings, wishlists and reviews in one place" },
];

/**
 * (auth) layout — the split-screen shell wrapping every account flow (login,
 * register, password reset, verification, profile completion). A branded panel
 * on the left, the active form centred on the right. Kept out of the marketing
 * chrome so there's no header/footer distraction during sign-in.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-accent/20 blur-2xl"
        />

        <Logo tone="light" className="relative" />

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1 text-xs font-medium text-white">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {siteConfig.tagline}
          </span>
          <h2 className="mt-5 text-3xl font-bold leading-tight text-white">
            Your next journey starts here.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-white/90">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-field bg-white/15">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-sm leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/70">
          © {siteConfig.name}. Crafted for travellers worldwide.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:px-10">
          <span className="lg:hidden">
            <Logo />
          </span>
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 pt-2 lg:px-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
