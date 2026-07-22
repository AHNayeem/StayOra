import { VERTICALS } from "./verticals";

export interface NavLink {
  label: string;
  href: string;
}

export interface MegaMenuColumn {
  heading: string;
  links: NavLink[];
}

export interface NavItem extends NavLink {
  /** When present, this item renders a mega-menu instead of a plain link. */
  megaMenu?: MegaMenuColumn[];
}

/**
 * Primary navigation. The "Pages" item expands into a mega-menu that exposes
 * every booking vertical plus utility pages — the growth surface for the
 * platform.
 */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Tours", href: VERTICALS.tours.href },
  { label: "Destinations", href: "/destinations" },
  { label: "About Us", href: "/about-us" },
  {
    label: "Pages",
    href: "#",
    megaMenu: [
      {
        heading: "Stays",
        links: [
          { label: VERTICALS.hotels.labelPlural, href: VERTICALS.hotels.href },
          { label: VERTICALS.apartments.labelPlural, href: VERTICALS.apartments.href },
          { label: VERTICALS.resorts.labelPlural, href: VERTICALS.resorts.href },
          { label: VERTICALS["shared-rooms"].labelPlural, href: VERTICALS["shared-rooms"].href },
        ],
      },
      {
        heading: "Book & Go",
        links: [
          { label: VERTICALS["convention-hall"].labelPlural, href: VERTICALS["convention-hall"].href },
          { label: VERTICALS.transport.labelPlural, href: VERTICALS.transport.href },
          { label: VERTICALS.activities.labelPlural, href: VERTICALS.activities.href },
          { label: VERTICALS.visa.labelPlural, href: VERTICALS.visa.href },
        ],
      },
      {
        heading: "Company",
        links: [
          { label: "FAQs", href: "/faqs" },
          { label: "Terms & Conditions", href: "/terms-and-conditions" },
          { label: "Contact Us", href: "/contact-us" },
        ],
      },
    ],
  },
  { label: "Blog", href: "/blogs" },
  { label: "Contact Us", href: "/contact-us" },
];

/** Footer quick links. */
export const FOOTER_QUICK_LINKS: NavLink[] = [
  { label: "About Us", href: "/about-us" },
  { label: "Tours", href: VERTICALS.tours.href },
  { label: "All Visa", href: VERTICALS.visa.href },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Contact Us", href: "/contact-us" },
];
