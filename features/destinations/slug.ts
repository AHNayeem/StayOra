/**
 * Slug generation and uniqueness.
 *
 * A destination's slug is its public identity, so it is derived once from the
 * name and then owned by the record. Two rules make the URLs safe:
 *
 *  - `slugify` is the only thing allowed to turn text into a URL segment. It is
 *    what the create form suggests as you type, and what validation re-runs on
 *    submit, so "New York City" can only ever become `new-york-city`.
 *  - `uniqueSlug` never overwrites: it suffixes `-2`, `-3`, … so publishing a
 *    second "Paris" cannot silently take over the first one's URL.
 */

/** Characters that carry meaning in a URL but not in a place name. */
const NON_SLUG = /[^a-z0-9]+/g;

/**
 * Latin transliteration for the accented characters place names actually use,
 * so "Türkiye" becomes `turkiye` rather than `t-rkiye`.
 */
const FOLD: Record<string, string> = {
  à: "a", á: "a", â: "a", ã: "a", ä: "a", å: "a", ā: "a",
  ç: "c", č: "c",
  è: "e", é: "e", ê: "e", ë: "e", ē: "e",
  ì: "i", í: "i", î: "i", ï: "i", ī: "i", ı: "i",
  ñ: "n",
  ò: "o", ó: "o", ô: "o", õ: "o", ö: "o", ø: "o", ō: "o",
  ş: "s", š: "s",
  ù: "u", ú: "u", û: "u", ü: "u", ū: "u",
  ý: "y", ÿ: "y",
  ž: "z",
  ğ: "g",
  ß: "ss",
  æ: "ae", œ: "oe",
};

/**
 * A URL-safe slug for a display name: lowercase, hyphen-separated, ASCII only.
 *
 * Apostrophes are dropped rather than replaced, so "Cox's Bazar" is
 * `coxs-bazar` and not `cox-s-bazar`.
 */
export function slugify(value: string): string {
  const folded = value
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^\x00-\x7F]/g, (char) => FOLD[char] ?? " ");

  return folded.replace(NON_SLUG, "-").replace(/^-+|-+$/g, "");
}

/** Whether a string is already in canonical slug form. */
export function isValidSlug(value: string): boolean {
  return value.length > 0 && value === slugify(value);
}

/**
 * `base`, or the first free `base-N`, given the slugs already in use.
 *
 * Pass the slug being edited as `ignore` so re-saving a record without renaming
 * it doesn't push it to `paris-2`.
 */
export function uniqueSlug(base: string, taken: Iterable<string>, ignore?: string): string {
  const used = new Set(taken);
  if (ignore) used.delete(ignore);

  const root = slugify(base) || "destination";
  if (!used.has(root)) return root;

  for (let n = 2; ; n += 1) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}
