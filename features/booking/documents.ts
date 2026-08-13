"use client";

import type { Booking } from "@/features/dashboard/domain";

/**
 * Booking documents — the things a traveller downloads or prints.
 *
 * Everything is generated in the browser from the booking record, so there is
 * no document store to keep in sync. A real deployment would render these
 * server-side (PDF, signed voucher) behind the same call signatures.
 */

/** Escape the characters iCalendar treats as structural. */
function icsEscape(value: string): string {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

function icsStamp(iso: string): string {
  return `${new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** An RFC 5545 VEVENT for the trip, ready to import into any calendar. */
export function toICS(booking: Booking): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Otithee//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@otithee.com`,
    `DTSTAMP:${icsStamp(booking.createdAt)}`,
    `DTSTART:${icsStamp(booking.startAt)}`,
    `DTEND:${icsStamp(booking.endAt)}`,
    `SUMMARY:${icsEscape(booking.productTitle)}`,
    `LOCATION:${icsEscape(booking.destination)}`,
    `DESCRIPTION:${icsEscape(
      [
        `Booking reference ${booking.reference}`,
        booking.stay ? `${booking.stay.units} × ${booking.stay.roomTypeName} · ${booking.stay.ratePlanName}` : "",
        `Total ${booking.money.currency} ${booking.money.total.toFixed(2)}`,
        `Travellers: ${booking.travelers.map((t) => t.fullName).join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n"),
    )}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(`Tomorrow: ${booking.productTitle}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // iCalendar requires CRLF line endings.
  return lines.join("\r\n");
}

/** Trigger a client-side download of a text document. */
export function downloadText(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadICS(booking: Booking): void {
  downloadText(`${booking.reference}.ics`, toICS(booking), "text/calendar");
}

/**
 * The property voucher, as plain text.
 *
 * Deliberately not a PDF: a prototype that pretends to issue a signed PDF
 * invites someone to treat it as one. This is unmistakably a demo artefact,
 * while still carrying everything a front desk would need.
 */
export function voucherText(booking: Booking): string {
  const rule = "=".repeat(52);
  return [
    rule,
    "  OTITHEE — BOOKING VOUCHER  (prototype, not valid for travel)",
    rule,
    "",
    `Reference        ${booking.reference}`,
    `Status           ${booking.status.replace(/_/g, " ").toUpperCase()}`,
    `Property         ${booking.productTitle}`,
    `Destination      ${booking.destination}`,
    `Operated by      ${booking.merchant.name}`,
    "",
    `Check-in         ${booking.startAt.slice(0, 10)} from 14:00`,
    `Check-out        ${booking.endAt.slice(0, 10)} by 11:00`,
    booking.nights ? `Nights           ${booking.nights}` : "",
    booking.stay
      ? `Room             ${booking.stay.units} × ${booking.stay.roomTypeName}\nRate plan        ${booking.stay.ratePlanName}`
      : "",
    "",
    "Travellers",
    ...booking.travelers.map((t) => `  · ${t.fullName}${t.passportNumber ? ` (${t.passportNumber})` : ""}`),
    "",
    ...(booking.addOns?.length
      ? ["Included extras", ...booking.addOns.map((a) => `  · ${a.label} × ${a.quantity}`), ""]
      : []),
    `Total            ${booking.money.currency} ${booking.money.total.toFixed(2)}`,
    `Invoice          ${booking.invoiceNumber}`,
    booking.specialRequests ? `\nGuest notes      ${booking.specialRequests}` : "",
    "",
    rule,
    "Present this voucher at check-in with photo ID for every guest.",
    rule,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function downloadVoucher(booking: Booking): void {
  downloadText(`${booking.reference}-voucher.txt`, voucherText(booking), "text/plain");
}

/** Open the browser print dialog for the current confirmation view. */
export function printConfirmation(): void {
  window.print();
}
