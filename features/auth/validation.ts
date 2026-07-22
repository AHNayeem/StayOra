/**
 * Shared client-side validation for the auth forms. Kept in one place so login,
 * register and reset stay consistent (and so the rules move to a schema library
 * in one edit if the real backend dictates different ones).
 */

/** Pragmatic email shape — good enough for UX; the backend is the real check. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;

export const passwordRules = {
  required: "Password is required",
  minLength: {
    value: PASSWORD_MIN_LENGTH,
    message: `Use at least ${PASSWORD_MIN_LENGTH} characters`,
  },
};

/** A 0–4 strength score with a label and tone, for the register meter. */
export function passwordStrength(value: string): {
  score: number;
  label: string;
  tone: "danger" | "warning" | "primary";
} {
  let score = 0;
  if (value.length >= PASSWORD_MIN_LENGTH) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  if (score <= 1) return { score, label: "Weak", tone: "danger" };
  if (score <= 2) return { score, label: "Fair", tone: "warning" };
  if (score <= 3) return { score, label: "Good", tone: "primary" };
  return { score, label: "Strong", tone: "primary" };
}
