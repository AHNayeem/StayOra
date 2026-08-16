/**
 * Contact and traveller details from free text.
 *
 * Travellers answer "I need the lead guest's name and contact number" in prose,
 * not in fields — "It's Ayesha Rahman, ayesha@example.com, +8801711223344". This
 * module lifts the three facts out of that sentence so the agent doesn't have to
 * force a form on someone who already answered.
 *
 * It errs towards *not* extracting. A wrong name on a booking is worse than one
 * more question, so a fragment that doesn't look like a name is left alone.
 */

/** Email addresses are matched on the raw text — normalising would break them. */
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]{2,}/;
/** International or local dialling, 8–15 digits with the usual separators. */
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,17}\d)/;

export interface ExtractedContact {
  fullName?: string;
  email?: string;
  phone?: string;
}

/** Words that mean the following fragment is a name. */
const NAME_LEADERS = [
  "my name is",
  "name is",
  "i am",
  "im",
  "this is",
  "the lead guest is",
  "lead guest is",
  "book it for",
  "book for",
  "guest name is",
  "its for",
  "it's for",
  "under the name",
  "the guests are",
  "guests are",
  "the guest is",
  "travelling with",
  "traveling with",
];

/** Title-case a captured name without mangling particles or initials. */
function tidyName(raw: string): string {
  return raw
    .replace(/[^A-Za-zÀ-ɏ'.\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      word.length <= 3 && word === word.toUpperCase()
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

/** Plausible as a person's name: two to four words, letters only. */
function looksLikeName(candidate: string): boolean {
  const words = candidate.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  return words.every((word) => /^[A-Za-zÀ-ɏ'.-]{2,}$/.test(word));
}

/**
 * Pull contact details out of a message.
 *
 * The name is only taken when the sentence *introduces* it ("my name is …") or
 * when the message is nothing but a name — guessing a name out of an arbitrary
 * sentence would put "Cox's Bazar" on a passport line.
 */
export function extractContact(raw: string): ExtractedContact {
  const out: ExtractedContact = {};

  const email = raw.match(EMAIL_RE)?.[0];
  if (email) out.email = email.toLowerCase();

  // Strip the email before hunting for a phone, or its digits confuse the match.
  const withoutEmail = email ? raw.replace(email, " ") : raw;
  const phone = withoutEmail.match(PHONE_RE)?.[0];
  if (phone) {
    const digits = phone.replace(/[^\d+]/g, "");
    if (digits.replace(/\D/g, "").length >= 8) out.phone = digits;
  }

  const lower = raw.toLowerCase();
  for (const leader of NAME_LEADERS) {
    const at = lower.indexOf(leader);
    if (at === -1) continue;
    const after = raw.slice(at + leader.length);
    const fragment = after.split(/[,.;\n]|\band\b|\bemail\b|\bphone\b/i)[0];
    const candidate = tidyName(fragment);
    if (looksLikeName(candidate)) {
      out.fullName = candidate;
      break;
    }
  }

  // A bare "Ayesha Rahman" on its own line is a name too.
  if (!out.fullName) {
    const stripped = raw
      .replace(EMAIL_RE, " ")
      .replace(PHONE_RE, " ")
      .replace(/[,;]/g, " ")
      .trim();
    const candidate = tidyName(stripped);
    if (candidate && looksLikeName(candidate) && stripped.split(/\s+/).length <= 4) {
      out.fullName = candidate;
    }
  }

  return out;
}

/** True when the message carries at least one contact fact. */
export function hasContactDetails(extracted: ExtractedContact): boolean {
  return Boolean(extracted.fullName || extracted.email || extracted.phone);
}

/**
 * Names for a multi-guest booking: "Ayesha Rahman and Tanvir Ahmed", or a
 * comma-separated list. Returns them in the order given.
 */
export function extractTravelerNames(raw: string): string[] {
  const cleaned = raw
    .replace(EMAIL_RE, " ")
    .replace(PHONE_RE, " ")
    .replace(/^(?:the\s+)?(?:guests?|travell?ers?|names?)\s*(?:are|is)?\s*:?\s*/i, "");
  return cleaned
    .split(/,|\band\b|\+|&|\n/i)
    .map((part) => tidyName(part))
    .filter((name) => looksLikeName(name));
}
