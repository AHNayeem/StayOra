import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { JsonLd } from "@/components/shared/json-ld";
import { AssistantLauncher, AssistantProvider } from "@/features/ai";
import { CompareTray } from "@/features/discovery";
import { FlightCompareTray } from "@/features/flights/results/flight-compare-tray";
import { LocaleProvider } from "@/features/i18n";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";

/**
 * Public site layout — the marketing chrome (header, footer, skip link and
 * organisation/website structured data) shared by every visitor-facing page.
 * Kept out of the root layout so the dashboard shell renders without it.
 *
 * The AI assistant lives here rather than per-page for two reasons: the
 * conversation (and its trip memory) survives navigation between pages, and
 * every public surface gets the launcher without opting in. It sits *inside*
 * `LocaleProvider` because its answers are priced in the visitor's currency.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LocaleProvider>
      <AssistantProvider>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <a
          href="#main-content"
          className="sr-only rounded-field bg-primary px-4 py-2 font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
        <SiteFooter />
        {/* Both compare trays dock to the same edge, so they share one stacking
            column — a traveller holding stays *and* flights gets two bars above
            each other rather than one hidden under the other. Each renders
            nothing until something is added, so an empty column costs no layout,
            but the trays follow the traveller across every public page. */}
        <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col print:hidden">
          <CompareTray />
          <FlightCompareTray />
        </div>
        <AssistantLauncher />
      </AssistantProvider>
    </LocaleProvider>
  );
}
