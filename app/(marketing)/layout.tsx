import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { JsonLd } from "@/components/shared/json-ld";
import { LocaleProvider } from "@/features/i18n";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";

/**
 * Public site layout — the marketing chrome (header, footer, skip link and
 * organisation/website structured data) shared by every visitor-facing page.
 * Kept out of the root layout so the dashboard shell renders without it.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LocaleProvider>
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
    </LocaleProvider>
  );
}
