import type { Metadata } from "next";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { TERMS_INTRO, TERMS_SECTIONS, TERMS_UPDATED } from "@/constants/legal";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms governing your use of the StayOra platform, including bookings, payments, cancellations and liability.",
  alternates: { canonical: "/terms-and-conditions" },
};

/** Format an ISO date as "1 June 2026". */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Terms & Conditions — static legal copy with an in-page contents list. Content
 * lives in `constants/legal` so the wording is edited in one place.
 */
export default function TermsPage() {
  return (
    <main className="flex-1">
      <PageBanner
        title="Terms & conditions"
        description={`Last updated ${formatDate(TERMS_UPDATED)}`}
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Terms & Conditions" }]}
      />

      <Section>
        <div className="mx-auto max-w-3xl">
          <p className="text-body">{TERMS_INTRO}</p>

          {/* Contents */}
          <nav
            aria-label="On this page"
            className="mt-8 rounded-panel border border-line bg-surface-muted p-6"
          >
            <p className="text-sm font-semibold text-ink">On this page</p>
            <ol className="mt-3 flex flex-col gap-2">
              {TERMS_SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-sm text-body transition-colors hover:text-primary"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Sections */}
          <div className="mt-12 flex flex-col gap-10">
            {TERMS_SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="text-h3">{section.title}</h2>
                <div className="mt-4 flex flex-col gap-4 text-body">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Section>

      <NewsletterSection />
    </main>
  );
}
