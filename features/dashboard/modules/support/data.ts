import type { Ticket, TicketPriority, TicketStatus } from "./types";

const SUBJECTS = [
  "Refund not received", "Cannot modify booking dates", "Payment failed at checkout",
  "Merchant payout delayed", "Visa document upload error", "Double charged for booking",
  "Room amenities incorrect", "Coupon code not applying", "Account locked out",
  "Cancellation policy question", "Invoice missing VAT", "App crashes on search",
];
const REQUESTERS = [
  "Liam Carter", "Sofia Alvarez", "Noah Kim", "Emma Novak", "Arjun Mehta",
  "Chloe Dubois", "Mateo Rossi", "Aisha Rahman",
];
const ASSIGNEES = ["Nina Kowalski", "Theo Martin", "Grace Lin", "Unassigned"];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];
const STATUSES: TicketStatus[] = ["open", "pending", "resolved", "closed"];

function iso(hourOffset: number): string {
  return new Date(Date.UTC(2026, 6, 21, 8, 0) - hourOffset * 3_600_000).toISOString();
}

export const TICKETS_SEED: Ticket[] = SUBJECTS.map((subject, i) => ({
  id: `tkt_${600 + i}`,
  reference: `TKT-${4200 + i}`,
  subject,
  requester: REQUESTERS[i % REQUESTERS.length],
  priority: PRIORITIES[i % PRIORITIES.length],
  status: STATUSES[i % STATUSES.length],
  assignee: ASSIGNEES[i % ASSIGNEES.length],
  updatedAt: iso(i * 5),
}));
