import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/constants/site";
import { Container } from "@/components/ui/container";
import { SocialIcon } from "@/components/shared/social-icons";
import { CurrencySwitcher, LanguageSwitcher } from "./locale-switcher";

/**
 * TopBar — the slim utility strip above the main navigation. Shows contact
 * details on the left and social links plus the language switcher on the right.
 * Hidden on small screens where it would crowd the header.
 */
export function TopBar() {
  return (
    <div className="hidden border-b border-white/10 bg-ink text-white/80 lg:block">
      <Container className="flex h-11 items-center justify-between text-sm">
        <div className="flex items-center gap-6">
          <a
            href={`tel:${siteConfig.contact.phone}`}
            className="inline-flex items-center gap-2 transition-colors hover:text-white"
          >
            <Phone className="size-4 text-primary" aria-hidden="true" />
            {siteConfig.contact.phone}
          </a>
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="inline-flex items-center gap-2 transition-colors hover:text-white"
          >
            <Mail className="size-4 text-primary" aria-hidden="true" />
            {siteConfig.contact.email}
          </a>
          <span className="inline-flex items-center gap-2">
            <MapPin className="size-4 text-primary" aria-hidden="true" />
            {siteConfig.contact.address}
          </span>
        </div>

        <div className="flex items-center gap-5">
          <ul className="flex items-center gap-3">
            {siteConfig.social.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-white/70 transition-colors hover:text-primary"
                >
                  <SocialIcon name={s.icon} className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
          <span className="h-4 w-px bg-white/20" aria-hidden="true" />
          <CurrencySwitcher className="text-white/80" />
          <span className="h-4 w-px bg-white/20" aria-hidden="true" />
          <LanguageSwitcher className="text-white/80" />
        </div>
      </Container>
    </div>
  );
}
