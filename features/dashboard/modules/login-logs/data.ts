import type { LoginLog, LoginMethod, LoginStatus } from "./types";

/** Fixed epoch so the ledger is deterministic across reloads. */
export const LOGIN_EPOCH = Date.UTC(2026, 6, 20, 9, 0);

function iso(minuteOffset: number): string {
  return new Date(LOGIN_EPOCH - minuteOffset * 60_000).toISOString();
}

const USERS: [string, string][] = [
  ["AH Nayeem", "ava@stayora.app"],
  ["Marcus Bell", "marcus@stayora.app"],
  ["Elena Petrova", "elena@partner.io"],
  ["Sam Okafor", "sam.okafor@gmail.com"],
  ["Nina Kowalski", "nina@stayora.app"],
  ["Theo Martin", "theo@merchants.co"],
  ["Priya Nair", "priya@stayora.app"],
  ["Unknown", "attacker@spoof.ru"],
];
const METHODS: LoginMethod[] = ["password", "google", "otp", "sso"];
const DEVICES = [
  "Chrome · macOS",
  "Safari · iOS",
  "Edge · Windows",
  "Firefox · Linux",
  "Chrome · Android",
];
const LOCATIONS = [
  "London, UK",
  "Dubai, AE",
  "New York, US",
  "Berlin, DE",
  "Singapore, SG",
  "Toronto, CA",
];

export const LOGIN_LOGS_SEED: LoginLog[] = Array.from({ length: 30 }, (_, i) => {
  const [user, email] = USERS[i % USERS.length];
  const isAttacker = user === "Unknown";
  const status: LoginStatus = isAttacker
    ? "blocked"
    : i % 7 === 0
      ? "failed"
      : "success";
  return {
    id: `lgn_${7000 + i}`,
    user,
    email,
    method: METHODS[i % METHODS.length],
    ip: `${20 + (i % 80)}.${(i * 11) % 255}.${(i * 5) % 255}.${(i * 13) % 255}`,
    location: LOCATIONS[i % LOCATIONS.length],
    device: DEVICES[i % DEVICES.length],
    status,
    createdAt: iso(i * 23),
  };
});
