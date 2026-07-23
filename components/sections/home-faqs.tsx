import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { FAQ_GROUPS } from "@/constants/faq";
import { HOME_SECTIONS } from "@/constants/home";
import { cn } from "@/lib/utils";

/** The most common questions — one or two per topic group, in a flat list. */
const FAQ_ITEMS: AccordionItem[] = FAQ_GROUPS.flatMap((group) =>
  group.items.slice(0, 2).map((item, index) => ({
    id: `${group.id}-${index}`,
    title: item.question,
    content: item.answer,
  })),
).slice(0, 6);

/**
 * HomeFaqs — a compact FAQ band: an intro column beside an {@link Accordion} of
 * the most-asked questions, with a link to the full `/faqs` page.
 */
export function HomeFaqs() {
  return (
    <Section background="surface">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <span className="mb-4 grid size-12 place-items-center rounded-field bg-primary-50 text-primary">
            <HelpCircle className="size-6" aria-hidden="true" />
          </span>
          <p className="text-overline">{HOME_SECTIONS.faqs.eyebrow}</p>
          <h2 className="text-h2 mt-3">{HOME_SECTIONS.faqs.title}</h2>
          <p className="mt-4 text-body">{HOME_SECTIONS.faqs.description}</p>
          <Link
            href="/faqs"
            className={cn(buttonVariants({ variant: "outline", size: "md" }), "mt-6 gap-2")}
          >
            View all FAQs
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <Accordion items={FAQ_ITEMS} type="single" defaultOpen={FAQ_ITEMS[0]?.id} />
      </div>
    </Section>
  );
}
