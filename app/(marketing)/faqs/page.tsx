import type { Metadata } from "next";
import Link from "next/link";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { Icon } from "@/components/shared/lucide-icon";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { JsonLd } from "@/components/shared/json-ld";
import { faqSchema } from "@/lib/structured-data";
import { FAQ_GROUPS } from "@/constants/faq";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Answers to common questions about booking, payments, accounts and support on StayOra.",
  alternates: { canonical: "/faqs" },
};

/**
 * FAQs — grouped questions rendered with the shared Accordion (multiple panels
 * open per group), closed by a "still have questions" prompt to the contact page.
 */
export default function FaqPage() {
  return (
    <main className="flex-1">
      <JsonLd data={faqSchema(FAQ_GROUPS)} />
      <PageBanner
        title="Frequently asked questions"
        description="Everything you need to know about booking with StayOra. Can't find an answer? Our team is a message away."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "FAQs" }]}
      />

      <Section>
        <div className="mx-auto flex max-w-3xl flex-col gap-12">
          {FAQ_GROUPS.map((group) => {
            const items: AccordionItem[] = group.items.map((item, i) => ({
              id: `${group.id}-${i}`,
              title: item.question,
              content: item.answer,
            }));
            return (
              <section key={group.id} aria-labelledby={`faq-${group.id}`}>
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-field bg-primary-50 text-primary">
                    <Icon name={group.icon} className="size-5" aria-hidden="true" />
                  </span>
                  <h2 id={`faq-${group.id}`} className="text-h3">
                    {group.title}
                  </h2>
                </div>
                <Accordion items={items} type="multiple" className="mt-5" />
              </section>
            );
          })}

          {/* Still stuck */}
          <div className="rounded-panel bg-surface-muted px-6 py-10 text-center">
            <h2 className="text-h3">Still have questions?</h2>
            <p className="mx-auto mt-2 max-w-md text-body">
              Our support team is available 24/7 and happy to help with anything
              you can&apos;t find here.
            </p>
            <Link
              href="/contact-us"
              className={cn(buttonVariants({ variant: "primary", size: "lg" }), "mt-6")}
            >
              Contact us
            </Link>
          </div>
        </div>
      </Section>

      <NewsletterSection />
    </main>
  );
}
