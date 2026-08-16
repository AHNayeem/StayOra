"use client";

import type { TripBooking, TripComponent } from "@/types/trip";
import { VERTICALS } from "@/constants/verticals";
import { getState, supplierConfirmationFor } from "@/features/dashboard/domain";
import { downloadText } from "@/features/booking/documents";

/**
 * The trip document — one itinerary for a trip made of independent bookings.
 *
 * Each component already has its own voucher and its own calendar event
 * (`features/booking/documents`). What a traveller actually carries is the
 * *trip*: every leg in order, under one reference, with each component's own
 * supplier reference beside it — which is exactly what a front desk, a driver
 * and a guide each need to see.
 *
 * Generated in the browser from the trip record and the live bookings behind it,
 * so a component confirmed or cancelled since booking is reflected the moment
 * the document is produced. A real deployment renders the same content
 * server-side as a PDF, behind these same call signatures.
 */

/** Legs in the order they happen. */
function ordered(trip: TripBooking): TripComponent[] {
  return [...trip.components].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** The component's current status, read off the platform booking. */
function liveStatus(component: TripComponent): string {
  const booking = getState().bookings.find((b) => b.id === component.bookingId);
  return (booking?.status ?? component.status).replace(/_/g, " ");
}

function icsDate(date: string): string {
  return date.replace(/-/g, "");
}

function icsEscape(value: string): string {
  return value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

/**
 * The whole trip as one calendar, one VEVENT per leg.
 *
 * Cancelled and failed legs are carried with `STATUS:CANCELLED` rather than
 * dropped — a calendar that silently loses an event leaves the traveller
 * wondering whether they ever booked it.
 */
export function tripICS(trip: TripBooking): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Otithee//Trip//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(`${trip.destination} trip · ${trip.reference}`)}`,
  ];

  for (const component of ordered(trip)) {
    const cancelled = ["cancelled", "failed", "refunded"].includes(component.status);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${component.bookingId}@otithee.com`,
      `DTSTART;VALUE=DATE:${icsDate(component.startDate)}`,
      `DTEND;VALUE=DATE:${icsDate(component.endDate || component.startDate)}`,
      `SUMMARY:${icsEscape(`${VERTICALS[component.kind].label}: ${component.title}`)}`,
      `DESCRIPTION:${icsEscape(
        [
          `Trip ${trip.reference}`,
          `Booking ${component.reference}`,
          component.detail,
          `Operated by ${component.merchantName}`,
          `Status: ${liveStatus(component)}`,
        ]
          .filter(Boolean)
          .join("\n"),
      )}`,
      `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** The printable itinerary — every leg, in order, under one reference. */
export function itineraryText(trip: TripBooking): string {
  const rule = "=".repeat(60);
  const thin = "-".repeat(60);
  const legs = ordered(trip);

  const body: string[] = [
    rule,
    "  OTITHEE — TRIP ITINERARY  (prototype, not valid for travel)",
    rule,
    "",
    `Trip reference   ${trip.reference}`,
    `Destination      ${trip.destinationLabel}`,
    `Dates            ${trip.startDate || "—"}${
      trip.endDate && trip.endDate !== trip.startDate ? ` → ${trip.endDate}` : ""
    }`,
    `Travellers       ${trip.travelers.adults} adult${trip.travelers.adults === 1 ? "" : "s"}${
      trip.travelers.children ? `, ${trip.travelers.children} children` : ""
    }${trip.travelers.infants ? `, ${trip.travelers.infants} infants` : ""}`,
    `Booked           ${trip.createdAt.slice(0, 10)}`,
    trip.comboName ? `Bundle           ${trip.comboName}` : "",
    "",
    thin,
    `  ${legs.length} booking${legs.length === 1 ? "" : "s"}, each confirmed with its own supplier`,
    thin,
    "",
  ];

  legs.forEach((component, index) => {
    const supplier = supplierConfirmationFor(component.bookingId);
    body.push(
      `${index + 1}. ${VERTICALS[component.kind].label.toUpperCase()} — ${component.title}`,
      `   Reference     ${component.reference}`,
      `   Status        ${liveStatus(component).toUpperCase()}`,
      `   Dates         ${component.startDate}${
        component.endDate && component.endDate !== component.startDate
          ? ` → ${component.endDate}`
          : ""
      }`,
      `   Detail        ${component.detail}`,
      `   Operated by   ${component.merchantName}`,
      supplier?.supplierRef ? `   Supplier ref  ${supplier.supplierRef}` : "",
      `   Price         ${trip.currency} ${component.totalUsd.toFixed(2)}`,
      component.failureNote ? `   Note          ${component.failureNote}` : "",
      "",
    );
  });

  body.push(
    thin,
    `Subtotal         ${trip.currency} ${trip.subtotalUsd.toFixed(2)}`,
    trip.discountUsd > 0 ? `Savings          −${trip.currency} ${trip.discountUsd.toFixed(2)}` : "",
    `Taxes            ${trip.currency} ${trip.taxesUsd.toFixed(2)}`,
    `Fees             ${trip.currency} ${trip.feesUsd.toFixed(2)}`,
    `Total paid       ${trip.currency} ${trip.totalUsd.toFixed(2)}`,
    `Paid by          ${trip.paymentMethod}`,
    "",
    rule,
    "Each leg is a separate booking with its own supplier and its own",
    "cancellation policy. Cancelling one leaves the rest of the trip in place.",
    rule,
  );

  return body.filter((line) => line !== "").join("\n");
}

export function downloadTripICS(trip: TripBooking): void {
  downloadText(`${trip.reference}-itinerary.ics`, tripICS(trip), "text/calendar");
}

export function downloadItinerary(trip: TripBooking): void {
  downloadText(`${trip.reference}-itinerary.txt`, itineraryText(trip), "text/plain");
}
