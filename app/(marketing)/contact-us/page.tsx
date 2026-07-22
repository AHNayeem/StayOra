import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PageBanner } from "@/components/ui/page-banner";
import { Section } from "@/components/ui/section";
import { ContactForm } from "@/components/forms/contact-form";
import { SocialIcon } from "@/components/shared/social-icons";
import { NewsletterSection } from "@/components/sections/newsletter-section";
import { siteConfig } from "@/constants/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the StayOra team. Reach us by phone, email or the contact form — we're available 24/7 to help with your booking.",
  alternates: { canonical: "/contact-us" },
};

const CONTACT_ITEMS = [
  {
    icon: Phone,
    label: "Call us",
    value: siteConfig.contact.phone,
    href: `tel:${siteConfig.contact.phone.replace(/\s/g, "")}`,
  },
  {
    icon: Mail,
    label: "Email us",
    value: siteConfig.contact.email,
    href: `mailto:${siteConfig.contact.email}`,
  },
  {
    icon: MapPin,
    label: "Visit us",
    value: siteConfig.contact.address,
  },
  {
    icon: Clock,
    label: "Support hours",
    value: "24/7 — every day of the year",
  },
];

const MAP_SRC = `https://maps.google.com/maps?q=${encodeURIComponent(
  siteConfig.contact.address,
)}&z=14&output=embed`;

/**
 * Contact — the enquiry page: a contact-details column beside the
 * {@link ContactForm}, followed by an embedded map. Reuses the site's canonical
 * contact info so it stays in sync with the footer.
 */
export default function ContactPage() {
  return (
    <main className="flex-1">
      <PageBanner
        title="Get in touch"
        description="Questions, feedback or need a hand with a booking? We'd love to hear from you."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          {/* Details */}
          <div>
            <p className="text-overline">Contact information</p>
            <h2 className="text-h2 mt-3">Talk to a real person</h2>
            <p className="mt-4 text-body">
              Our team is here around the clock. Choose whichever way is easiest —
              we typically reply within one business day.
            </p>

            <ul className="mt-8 flex flex-col gap-4">
              {CONTACT_ITEMS.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <li
                    key={item.label}
                    className="flex items-start gap-4 rounded-card border border-line bg-surface p-4"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-field bg-primary-50 text-primary">
                      <ItemIcon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.label}</p>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="text-sm text-body transition-colors hover:text-primary"
                        >
                          {item.value}
                        </Link>
                      ) : (
                        <p className="text-sm text-body">{item.value}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8">
              <p className="text-sm font-semibold text-ink">Follow us</p>
              <ul className="mt-3 flex gap-2.5">
                {siteConfig.social.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="grid size-10 place-items-center rounded-full border border-line text-ink transition-colors hover:border-primary hover:bg-primary hover:text-white"
                    >
                      <SocialIcon name={social.icon} className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Form */}
          <ContactForm />
        </div>

        {/* Map */}
        <div className="mt-12 overflow-hidden rounded-panel border border-line">
          <iframe
            src={MAP_SRC}
            title={`Map showing ${siteConfig.contact.address}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-80 w-full border-0"
          />
        </div>
      </Section>

      <NewsletterSection />
    </main>
  );
}
