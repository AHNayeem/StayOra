/** Global site configuration — brand, contact, and social links. */
export const siteConfig = {
  name: "Otithee",
  tagline: "Book Your Next Journey",
  description:
    "Otithee is a complete booking platform for hotels, apartments, resorts, shared rooms, convention halls, transport, and tours — plan and book your next journey with ease.",
  url: "https://otithee.example.com",
  contact: {
    phone: "+880 1784-998432",
    email: "info@otithee.com",
    address: "Block A, House 82, Rd No 2, Banani, Dhaka",
  },
  locales: [
    { code: "en", label: "English" },
    { code: "ar", label: "Arabic" },
    { code: "bn", label: "Bangla" },
  ],
  social: [
    { label: "Facebook", href: "https://facebook.com", icon: "facebook" },
    { label: "Twitter", href: "https://twitter.com", icon: "twitter" },
    { label: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
    { label: "YouTube", href: "https://youtube.com", icon: "youtube" },
    { label: "Instagram", href: "https://instagram.com", icon: "instagram" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
