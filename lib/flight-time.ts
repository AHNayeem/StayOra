/**
 * Local wall-clock time arithmetic for flights.
 *
 * A flight's "08:40 departure" is a fact about the *origin airport's* clock, not
 * about the viewer's device. So every flight time in this module is stored as a
 * naive local ISO string (`YYYY-MM-DDTHH:mm`) paired with the airport's UTC
 * offset, and all maths happens here — never via `new Date(iso)`, which would
 * silently reinterpret the string in the browser's timezone and shift every
 * departure by the viewer's offset.
 *
 * The trick throughout: parse a naive local string into a `Date` **as if it were
 * UTC**. That gives a stable arithmetic space with no timezone leakage; we only
 * ever format back out of it with the UTC getters.
 */

/** Parse `YYYY-MM-DDTHH:mm` into epoch ms, treating the string as UTC. */
export function parseLocal(iso: string): number {
  const [datePart, timePart = "00:00"] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
}

/** Format epoch ms (in the UTC-as-local space) back to `YYYY-MM-DDTHH:mm`. */
export function toLocalIso(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(
    d.getUTCHours(),
  )}:${p(d.getUTCMinutes())}`;
}

/** Shift a local ISO datetime by minutes, staying in local wall-clock terms. */
export function addMinutesLocal(iso: string, minutes: number): string {
  return toLocalIso(parseLocal(iso) + minutes * 60_000);
}

/** Shift an ISO date (`YYYY-MM-DD`) by whole days. */
export function addDays(isoDate: string, days: number): string {
  return toLocalIso(parseLocal(isoDate) + days * 86_400_000).slice(0, 10);
}

/**
 * Local arrival time at the destination, given a local departure, the two
 * airports' UTC offsets and the gate-to-gate duration.
 *
 * This is the one calculation that makes cross-timezone flights read correctly:
 * a 07:00 DAC → DXB flight of 5h20m arrives at 10:20 local, not 12:20, because
 * Dubai is two hours behind Dhaka.
 */
export function arrivalLocal(
  departLocal: string,
  fromOffsetMinutes: number,
  toOffsetMinutes: number,
  durationMinutes: number,
): string {
  const offsetDelta = toOffsetMinutes - fromOffsetMinutes;
  return addMinutesLocal(departLocal, durationMinutes + offsetDelta);
}

/**
 * Gate-to-gate minutes between a local departure and a local arrival, undoing
 * the timezone shift. The inverse of {@link arrivalLocal}.
 */
export function durationBetweenLocal(
  departLocal: string,
  fromOffsetMinutes: number,
  arriveLocal: string,
  toOffsetMinutes: number,
): number {
  const wallClockDelta = (parseLocal(arriveLocal) - parseLocal(departLocal)) / 60_000;
  return Math.round(wallClockDelta - (toOffsetMinutes - fromOffsetMinutes));
}

/** Calendar days the arrival date falls after the departure date (0 = same day). */
export function dayOffset(departLocal: string, arriveLocal: string): number {
  const from = parseLocal(departLocal.slice(0, 10));
  const to = parseLocal(arriveLocal.slice(0, 10));
  return Math.round((to - from) / 86_400_000);
}

/** `"08:40"` — the 24-hour clock time from a local ISO datetime. */
export function formatTime(iso: string): string {
  return iso.slice(11, 16);
}

/** `"2026-08-12"` — the date part of a local ISO datetime. */
export function dateOf(iso: string): string {
  return iso.slice(0, 10);
}

/** Minutes since local midnight — the basis for time-band filtering. */
export function minutesOfDay(iso: string): number {
  const [hh, mm] = formatTime(iso).split(":").map(Number);
  return hh * 60 + mm;
}

/** `"14h 05m"` / `"55m"` — a duration for display. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** `"14h 05m"` in a screen-reader-friendly long form. */
export function describeDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m > 0) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  return parts.join(" ") || "0 minutes";
}

/** `"UTC+6"` / `"UTC−5:30"` — a human offset label for airport info panels. */
export function formatUtcOffset(minutes: number): string {
  const sign = minutes < 0 ? "−" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

/**
 * The clock difference a traveller experiences on a route, e.g. `"−2h"` flying
 * Dhaka → Dubai. Empty string when both airports share an offset.
 */
export function timeDifferenceLabel(
  fromOffsetMinutes: number,
  toOffsetMinutes: number,
): string {
  const delta = toOffsetMinutes - fromOffsetMinutes;
  if (delta === 0) return "";
  const sign = delta < 0 ? "−" : "+";
  const abs = Math.abs(delta);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}h`;
}

/** Time-of-day buckets used by the departure/arrival filters. */
export const TIME_BAND_RANGES = {
  early: { label: "Early morning", hint: "00:00 – 05:59", from: 0, to: 359 },
  morning: { label: "Morning", hint: "06:00 – 11:59", from: 360, to: 719 },
  afternoon: { label: "Afternoon", hint: "12:00 – 17:59", from: 720, to: 1079 },
  evening: { label: "Evening", hint: "18:00 – 23:59", from: 1080, to: 1439 },
} as const;

export type TimeBandKey = keyof typeof TIME_BAND_RANGES;

/** Which band a local ISO datetime falls in. */
export function bandOf(iso: string): TimeBandKey {
  const m = minutesOfDay(iso);
  if (m < 360) return "early";
  if (m < 720) return "morning";
  if (m < 1080) return "afternoon";
  return "evening";
}

/** Whole days between two ISO dates (`YYYY-MM-DD`), `to − from`. */
export function daysBetween(fromDate: string, toDate: string): number {
  return Math.round((parseLocal(toDate) - parseLocal(fromDate)) / 86_400_000);
}
