import type { StatusDef } from "../../lib/status";

export const TICKET_STATUS_VALUES = ["open", "pending", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUS_VALUES)[number];

export const TICKET_PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITY_VALUES)[number];

export interface Ticket {
  id: string;
  reference: string;
  subject: string;
  requester: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string;
  updatedAt: string;
}

export const TICKET_STATUSES: readonly StatusDef<TicketStatus>[] = [
  { value: "open", label: "Open", tone: "info" },
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "resolved", label: "Resolved", tone: "success" },
  { value: "closed", label: "Closed", tone: "neutral" },
];

export const TICKET_PRIORITIES: readonly StatusDef<TicketPriority>[] = [
  { value: "low", label: "Low", tone: "neutral" },
  { value: "medium", label: "Medium", tone: "info" },
  { value: "high", label: "High", tone: "warning" },
  { value: "urgent", label: "Urgent", tone: "danger" },
];
