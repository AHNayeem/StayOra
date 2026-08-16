/**
 * Persistence for module-level (non-domain) data sources.
 *
 * The domain store (`features/dashboard/domain/store.ts`) persists everything
 * that hangs off a booking. Everything else — CMS pages, media, tax rules, cron
 * jobs, templates — lived in module-scoped arrays that vanished on reload, so
 * the dashboard behaved two different ways depending on which screen you were
 * on. This module gives those services the same guarantee behind one small API:
 *
 *   readModuleState(key, fallback)   hydrate once, client-only
 *   writeModuleState(key, rows)      persist after every mutation
 *
 * Keys are namespaced and schema-versioned; bump {@link MODULE_SCHEMA_VERSION}
 * when a stored shape changes and every module's persisted copy is discarded in
 * favour of its seed.
 */

/** Bump to invalidate every persisted module dataset. */
export const MODULE_SCHEMA_VERSION = 1;

const PREFIX = `otithee:module:v${MODULE_SCHEMA_VERSION}:`;

/** Keys already claimed, so two modules can't silently share storage. */
const registered = new Set<string>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Claim a storage key. Returns the key; throws in development when two data
 * sources ask for the same one, which would otherwise cross-wire their rows.
 */
export function registerModuleStore(key: string): string {
  if (registered.has(key) && process.env.NODE_ENV !== "production") {
    throw new Error(
      `Module store "${key}" is already registered. Give one of the services an explicit \`persistKey\`.`,
    );
  }
  registered.add(key);
  return key;
}

/**
 * The persisted rows for a module, or `fallback` when there is nothing stored
 * (first visit, server render, private mode or a corrupt payload).
 */
export function readModuleState<T>(key: string, fallback: T[]): T[] {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

/** Persist a module's rows. Silently ignored on the server or when storage is full. */
export function writeModuleState<T>(key: string, rows: T[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(rows));
  } catch {
    /* quota or private mode — the edit still applies for this session */
  }
}

/** Drop one module's persisted rows (used by "reset demo data"). */
export function clearModuleState(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Drop every persisted module dataset — Settings → "Reset demo data". */
export function clearAllModuleState(): void {
  if (!isBrowser()) return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(PREFIX)) doomed.push(key);
    }
    for (const key of doomed) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
