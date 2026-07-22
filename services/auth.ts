/**
 * auth.ts — service seam for authentication.
 *
 * A fake backend over localStorage: seed accounts live in
 * {@link SEED_ACCOUNTS}, runtime sign-ups/edits are persisted locally, and every
 * call is async (via {@link mockDelay}) so the UI is written exactly as it would
 * be against a real `/auth/*` API. Swap these bodies for `fetch` calls and no
 * component changes. All functions run client-side (they touch localStorage).
 */

import type {
  AuthSession,
  AuthUser,
  LoginPayload,
  RegisterPayload,
} from "@/types/account";
import { DEMO_PASSWORD, SEED_ACCOUNTS, type MockAccount } from "@/constants/accounts";
import { mockDelay } from "./http";

const ACCOUNTS_KEY = "stayora:accounts";
const SESSION_KEY = "stayora:session";
/** The one OTP the mock accepts, surfaced in the UI as a hint. */
export const MOCK_OTP = "123456";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/** Thrown for expected auth failures; carries a user-safe `message`. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// ---- local persistence helpers -------------------------------------------

function readAccounts(): MockAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as MockAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(list: MockAccount[]): void {
  try {
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — sign-up won't persist across reloads, that's fine */
  }
}

/** All accounts the fake backend knows: runtime records override seeds by email. */
function allAccounts(): MockAccount[] {
  const runtime = readAccounts();
  const overridden = new Set(runtime.map((a) => a.email.toLowerCase()));
  const seeds = SEED_ACCOUNTS.filter(
    (a) => !overridden.has(a.email.toLowerCase()),
  );
  return [...seeds, ...runtime];
}

function findByEmail(email: string): MockAccount | undefined {
  const target = email.trim().toLowerCase();
  return allAccounts().find((a) => a.email.toLowerCase() === target);
}

/** Persist a runtime account record (create or replace by email). */
function upsertAccount(account: MockAccount): void {
  const list = readAccounts();
  const idx = list.findIndex(
    (a) => a.email.toLowerCase() === account.email.toLowerCase(),
  );
  if (idx >= 0) list[idx] = account;
  else list.push(account);
  writeAccounts(list);
}

/** Strip the password before an account crosses the service boundary. */
function toUser(account: MockAccount): AuthUser {
  const clone: Partial<MockAccount> = { ...account };
  delete clone.password;
  return clone as AuthUser;
}

/** Reject after a mock delay — the error-path twin of {@link mockDelay}. */
function mockFail(message: string, ms = 600): Promise<never> {
  return new Promise((_, reject) => {
    if (process.env.NODE_ENV === "test") return reject(new AuthError(message));
    setTimeout(() => reject(new AuthError(message)), ms);
  });
}

function makeSession(user: AuthUser): AuthSession {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = `mock.${btoa(`${user.id}:${expiresAt}`)}`;
  return { user, token, expiresAt };
}

// ---- session persistence (read by the store on boot) ----------------------

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (session.expiresAt < Date.now()) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function persistSession(session: AuthSession | null): void {
  try {
    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    /* ignore */
  }
}

// ---- public API ------------------------------------------------------------

export async function login({
  email,
  password,
}: LoginPayload): Promise<AuthSession> {
  const account = findByEmail(email);
  if (!account || account.password !== password) {
    return mockFail("Invalid email or password.");
  }
  const session = makeSession(toUser(account));
  persistSession(session);
  return mockDelay(session, 600);
}

export async function register({
  name,
  email,
  password,
  role = "traveler",
}: RegisterPayload): Promise<AuthSession> {
  if (findByEmail(email)) {
    return mockFail("An account with this email already exists.");
  }
  const account: MockAccount = {
    id: `usr_${btoa(email).replace(/[^a-z0-9]/gi, "").slice(0, 12).toLowerCase()}`,
    name,
    email,
    password,
    role,
    country: undefined,
    emailVerified: false,
    profileComplete: false,
    loyaltyTier: "bronze",
    points: 0,
    createdAt: new Date().toISOString(),
  };
  upsertAccount(account);
  const session = makeSession(toUser(account));
  persistSession(session);
  return mockDelay(session, 700);
}

export async function logout(): Promise<void> {
  persistSession(null);
  return mockDelay(undefined, 200);
}

/** Request a password-reset OTP. Always "succeeds" so we don't leak which emails exist. */
export async function forgotPassword(email: string): Promise<{ sent: true }> {
  void email;
  return mockDelay({ sent: true }, 700);
}

export async function verifyOtp(code: string): Promise<{ valid: boolean }> {
  return mockDelay({ valid: code === MOCK_OTP }, 500);
}

export async function resetPassword(
  email: string,
  newPassword: string,
): Promise<{ ok: true }> {
  const account = findByEmail(email);
  if (account) upsertAccount({ ...account, password: newPassword });
  return mockDelay({ ok: true }, 600);
}

/** Mark the current user's email verified and return the refreshed session. */
export async function verifyEmail(user: AuthUser): Promise<AuthSession> {
  const account = findByEmail(user.email);
  const next: AuthUser = { ...user, emailVerified: true };
  if (account) upsertAccount({ ...account, emailVerified: true });
  const session = makeSession(next);
  persistSession(session);
  return mockDelay(session, 500);
}

/** Patch the current user's profile and return the refreshed session. */
export async function updateProfile(
  user: AuthUser,
  patch: Partial<AuthUser>,
): Promise<AuthSession> {
  const next: AuthUser = { ...user, ...patch };
  next.profileComplete = Boolean(next.name && next.phone && next.country);
  const account = findByEmail(user.email);
  if (account) {
    upsertAccount({ ...account, ...patch, profileComplete: next.profileComplete });
  }
  const session = makeSession(next);
  persistSession(session);
  return mockDelay(session, 600);
}

export { DEMO_PASSWORD };
