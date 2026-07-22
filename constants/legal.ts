/**
 * Static legal copy for `/terms-and-conditions`. Plain, serialisable data so the
 * page stays a thin renderer and the wording lives in one editable place.
 */

export interface LegalSection {
  id: string;
  title: string;
  body: string[];
}

/** ISO date the terms were last revised — shown under the page title. */
export const TERMS_UPDATED = "2026-06-01";

export const TERMS_INTRO =
  "These terms govern your use of the StayOra platform. By accessing the site or making a booking you agree to the terms below. Please read them carefully — they explain your rights and responsibilities as well as ours.";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of terms",
    body: [
      "By using this platform you confirm that you are at least 18 years old and able to enter into a binding agreement. If you are booking on behalf of others, you confirm that you have their authority to do so.",
      "We may update these terms from time to time. Continued use of the platform after changes are posted constitutes acceptance of the revised terms.",
    ],
  },
  {
    id: "bookings",
    title: "2. Bookings and payments",
    body: [
      "A booking is confirmed once you receive written confirmation from us. Prices shown include any applicable service fee and are displayed in full before you confirm.",
      "You are responsible for providing accurate booking details. We are not liable for issues arising from incorrect information supplied at the time of booking.",
    ],
  },
  {
    id: "cancellations",
    title: "3. Cancellations and refunds",
    body: [
      "Cancellation terms vary by listing and are shown clearly before you book and in your confirmation. Where free cancellation applies, refunds are processed to your original payment method.",
      "Some rates are non-refundable. These are labelled as such at the point of booking, and you accept those conditions when you confirm.",
    ],
  },
  {
    id: "responsibilities",
    title: "4. User responsibilities",
    body: [
      "You agree to use the platform lawfully and not to misuse it, interfere with its operation, or attempt to access it in any way other than through the interface we provide.",
      "You are responsible for keeping your account credentials secure and for all activity that occurs under your account.",
    ],
  },
  {
    id: "liability",
    title: "5. Limitation of liability",
    body: [
      "We act as an intermediary between you and the providers of listed services. While we work only with vetted partners, we are not responsible for the acts or omissions of third-party providers.",
      "To the fullest extent permitted by law, our liability for any claim arising from your use of the platform is limited to the amount you paid for the booking in question.",
    ],
  },
  {
    id: "contact",
    title: "6. Contact",
    body: [
      "Questions about these terms are welcome. Reach us through the contact page and our team will be glad to help.",
    ],
  },
];
