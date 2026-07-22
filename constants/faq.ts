/**
 * Frequently-asked-questions content for `/faqs`, grouped into topic sections.
 * Reuses the {@link FaqItem} shape from the detail template so the same
 * Accordion primitive renders both. Icons are Lucide names resolved by
 * `components/shared/lucide-icon`.
 */

import type { FaqItem } from "@/types/detail";

export interface FaqGroup {
  id: string;
  title: string;
  /** Lucide icon name. */
  icon: string;
  items: FaqItem[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "booking",
    title: "Booking & reservations",
    icon: "CalendarCheck",
    items: [
      {
        question: "How do I make a booking?",
        answer:
          "Search for what you need, open a listing, choose your dates and guests in the booking widget, and confirm. You'll get an instant confirmation by email with everything you need for your trip.",
      },
      {
        question: "Can I change or cancel my booking?",
        answer:
          "Most listings offer free cancellation up to a stated deadline — you'll see the exact policy on each listing and in your confirmation. Changes and cancellations are made from your bookings area or by contacting our support team.",
      },
      {
        question: "Do I need to create an account to book?",
        answer:
          "You can browse freely, but an account lets you manage bookings, save favourites and check out faster next time. Creating one takes under a minute.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments & pricing",
    icon: "BadgePercent",
    items: [
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept all major credit and debit cards, and selected digital wallets. Every payment is processed over an encrypted, bank-grade connection.",
      },
      {
        question: "Are there any hidden fees?",
        answer:
          "No. The price breakdown in the booking widget shows the nightly or per-unit rate, any service fee, and your total before you confirm — what you see is what you pay.",
      },
      {
        question: "What is the best price guarantee?",
        answer:
          "If you find the same listing cheaper elsewhere within 24 hours of booking, contact us and we'll match the price — no lengthy forms, no fine-print traps.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & profile",
    icon: "Users",
    items: [
      {
        question: "How do I reset my password?",
        answer:
          "Choose \"Forgot password\" on the sign-in screen and we'll email you a secure reset link. For your protection the link expires after a short time.",
      },
      {
        question: "Can I save listings for later?",
        answer:
          "Yes — tap the heart on any card to add it to your wishlist. Saved listings stay in your account so you can compare and book when you're ready.",
      },
    ],
  },
  {
    id: "support",
    title: "Support & safety",
    icon: "Headphones",
    items: [
      {
        question: "How do I contact support?",
        answer:
          "Our team is available 24/7. Use the contact form, email us, or call the number listed on our contact page — whichever suits you, in any time zone.",
      },
      {
        question: "Is my personal information secure?",
        answer:
          "Protecting your data is fundamental to how we operate. We use industry-standard encryption and never sell your personal information to third parties.",
      },
    ],
  },
];
