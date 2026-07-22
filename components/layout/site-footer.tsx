import Link from "next/link";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import {
  FOOTER_QUICK_LINKS,
  type NavLink,
} from "@/constants/navigation";
import { siteConfig } from "@/constants/site";
import { VERTICALS } from "@/constants/verticals";
import { Container } from "@/components/ui/container";
import { SocialIcon } from "@/components/shared/social-icons";
import { Logo } from "./logo";

/** Vertical links surfaced in the footer's "Explore" column. */
const EXPLORE_LINKS: NavLink[] = [
  { label: VERTICALS.hotels.labelPlural, href: VERTICALS.hotels.href },
  { label: VERTICALS.resorts.labelPlural, href: VERTICALS.resorts.href },
  { label: VERTICALS.apartments.labelPlural, href: VERTICALS.apartments.href },
  { label: VERTICALS.transport.labelPlural, href: VERTICALS.transport.href },
  { label: VERTICALS.tours.labelPlural, href: VERTICALS.tours.href },
];

/**
 * SiteFooter — the global footer: brand blurb + socials, quick links, explore
 * verticals, contact details, and a newsletter sign-up. Static server
 * component rendered once in the root layout.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-ink text-white/70">
      <Container className="grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            {siteConfig.description}
          </p>
          <ul className="mt-5 flex items-center gap-3">
            {siteConfig.social.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="grid size-9 place-items-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-primary hover:text-white"
                >
                  <SocialIcon name={s.icon} className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick links */}
        <FooterColumn heading="Company" links={FOOTER_QUICK_LINKS} />

        {/* Explore */}
        <FooterColumn heading="Explore" links={EXPLORE_LINKS} />

        {/* Contact + newsletter */}
        <div>
          <h3 className="text-overline mb-4 text-white">Get in touch</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {siteConfig.contact.address}
            </li>
            <li>
              <a
                href={`tel:${siteConfig.contact.phone}`}
                className="flex items-center gap-3 transition-colors hover:text-white"
              >
                <Phone className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {siteConfig.contact.phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="flex items-center gap-3 transition-colors hover:text-white"
              >
                <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {siteConfig.contact.email}
              </a>
            </li>
          </ul>

          <form className="mt-6" aria-label="Newsletter sign-up">
            <label htmlFor="newsletter" className="mb-2 block text-sm text-white">
              Subscribe to our newsletter
            </label>
            <div className="flex items-center gap-2 rounded-pill border border-white/15 bg-white/5 py-1.5 pl-4 pr-1.5 focus-within:border-primary">
              <input
                id="newsletter"
                type="email"
                placeholder="Your email"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-white transition-colors hover:bg-primary-600"
              >
                <Send className="size-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-3 py-6 text-sm sm:flex-row">
          <p>
            © {year} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/terms-and-conditions" className="transition-colors hover:text-white">
              Terms &amp; Conditions
            </Link>
            <Link href="/faqs" className="transition-colors hover:text-white">
              FAQs
            </Link>
            <Link href="/contact-us" className="transition-colors hover:text-white">
              Contact
            </Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: NavLink[];
}) {
  return (
    <div>
      <h3 className="text-overline mb-4 text-white">{heading}</h3>
      <ul className="space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
