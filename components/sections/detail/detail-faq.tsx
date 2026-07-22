import type { FaqItem } from "@/types/detail";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { DetailBlock } from "./detail-block";

interface DetailFaqProps {
  faqs: FaqItem[];
}

/**
 * DetailFaq — the frequently-asked-questions block, rendered with the shared
 * {@link Accordion} (single-open). The first question is expanded by default.
 */
export function DetailFaq({ faqs }: DetailFaqProps) {
  if (faqs.length === 0) return null;

  const items: AccordionItem[] = faqs.map((faq, i) => ({
    id: `faq-${i}`,
    title: faq.question,
    content: faq.answer,
  }));

  return (
    <DetailBlock title="Frequently asked questions">
      <Accordion items={items} type="single" defaultOpen="faq-0" />
    </DetailBlock>
  );
}
