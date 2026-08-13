"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Paperclip,
  RotateCcw,
  Send,
  StickyNote,
  UserCheck,
} from "lucide-react";
import {
  CANNED_RESPONSES,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_VALUES,
  TICKET_STATUS_VALUES,
  slaStatus,
  supportService,
  type SupportTicket,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "../../domain";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";
import { useDomainValue } from "@/features/booking";
import { Can } from "../../rbac/permission-guard";
import {
  Button,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
  type StatusTone,
} from "../../ui";
import { formatDateTime } from "../../lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const STATUS_META: Record<SupportTicketStatus, { label: string; tone: StatusTone }> = {
  open: { label: "Open", tone: "info" },
  pending_agent: { label: "Needs reply", tone: "warning" },
  pending_customer: { label: "Awaiting customer", tone: "neutral" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

const PRIORITY_META: Record<SupportTicketPriority, StatusTone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

type Queue = "all" | "unassigned" | "mine" | "breached";

/**
 * The agent's support inbox.
 *
 * This reads the same ticket store the traveller's help centre writes to, so a
 * customer's message lands here and a reply written here shows up in their
 * account. Internal notes never leave this screen — the domain filters them out
 * of the customer thread rather than the UI hiding them.
 *
 * Merchant users see only tickets raised against their own properties, via the
 * standard {@link useDomainScope}.
 */
export function SupportInbox() {
  const scope = useDomainScope();
  const actor = useDomainActor();
  const [queue, setQueue] = useState<Queue>("all");
  const [status, setStatus] = useState<SupportTicketStatus | "">("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const tickets = useDomainValue(
    () => supportService.all({ merchantId: scope.merchantId }),
    [scope.merchantId],
  );
  const counts = useDomainValue(
    () => supportService.counts({ merchantId: scope.merchantId }),
    [scope.merchantId],
  );

  const filtered = useMemo(() => {
    return tickets.filter((ticket) => {
      if (status && ticket.status !== status) return false;
      if (queue === "unassigned") return !ticket.assigneeId && ticket.status !== "closed";
      if (queue === "mine") return ticket.assigneeId === actor.id;
      if (queue === "breached") return slaStatus(ticket).state === "breached";
      return true;
    });
  }, [tickets, status, queue, actor.id]);

  const active = useDomainValue(
    () => (activeId ? supportService.get(activeId) : undefined),
    [activeId],
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open" value={String(counts.open)} icon="Inbox" />
        <StatCard label="Unassigned" value={String(counts.unassigned)} icon="UserPlus" />
        <StatCard label="SLA breached" value={String(counts.breached)} icon="AlarmClock" />
        <StatCard label="Urgent" value={String(counts.urgent)} icon="TriangleAlert" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr] lg:items-start">
        <Panel>
          <PanelHeader
            title="Queue"
            description={`${filtered.length} ticket${filtered.length === 1 ? "" : "s"}`}
            actions={
              <div className="flex gap-2">
                <Select
                  aria-label="Queue"
                  value={queue}
                  onChange={(event) => setQueue(event.target.value as Queue)}
                  options={[
                    { value: "all", label: "All" },
                    { value: "unassigned", label: "Unassigned" },
                    { value: "mine", label: "Assigned to me" },
                    { value: "breached", label: "SLA breached" },
                  ]}
                  wrapperClassName="w-40"
                />
                <Select
                  aria-label="Status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as SupportTicketStatus | "")
                  }
                  options={[
                    { value: "", label: "Any status" },
                    ...TICKET_STATUS_VALUES.map((value) => ({
                      value,
                      label: STATUS_META[value].label,
                    })),
                  ]}
                  wrapperClassName="w-40"
                />
              </div>
            }
          />
          <PanelBody className="max-h-[36rem] overflow-y-auto p-0">
            {filtered.length === 0 ? (
              <EmptyState
                title="Nothing in this queue"
                description="Try another filter — or enjoy the quiet."
              />
            ) : (
              <ul className="divide-y divide-line">
                {filtered.map((ticket) => (
                  <li key={ticket.id}>
                    <QueueRow
                      ticket={ticket}
                      active={ticket.id === activeId}
                      onSelect={() => setActiveId(ticket.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>

        {active ? (
          <TicketDetail ticket={active} actor={actor} />
        ) : (
          <Panel>
            <PanelBody>
              <EmptyState
                title="Select a ticket"
                description="Pick a conversation from the queue to read it and reply."
              />
            </PanelBody>
          </Panel>
        )}
      </div>
    </div>
  );
}

function QueueRow({
  ticket,
  active,
  onSelect,
}: {
  ticket: SupportTicket;
  active: boolean;
  onSelect: () => void;
}) {
  const sla = slaStatus(ticket);
  const meta = STATUS_META[ticket.status];
  const last = supportService.customerThread(ticket).at(-1);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors",
        active ? "bg-primary-50" : "hover:bg-surface-muted/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium text-ink">{ticket.subject}</p>
        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      </div>
      <p className="truncate text-xs text-muted">
        {ticket.reference} · {ticket.requesterName}
        {ticket.bookingRef ? ` · ${ticket.bookingRef}` : ""}
      </p>
      {last && <p className="line-clamp-1 text-xs text-body">{last.body}</p>}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <StatusBadge tone={PRIORITY_META[ticket.priority]}>{ticket.priority}</StatusBadge>
        <span
          className={cn(
            "inline-flex items-center gap-1",
            sla.state === "breached" ? "text-danger" : "text-muted",
          )}
        >
          <Clock className="size-3" aria-hidden="true" />
          {sla.label}
        </span>
        <span className="text-muted">{ticket.assigneeName ?? "Unassigned"}</span>
      </div>
    </button>
  );
}

function TicketDetail({
  ticket,
  actor,
}: {
  ticket: SupportTicket;
  actor: { id: string; name: string };
}) {
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const sla = slaStatus(ticket);

  const send = () => {
    if (reply.trim().length < 2) return;
    supportService.reply(ticket.id, {
      from: internal ? "agent" : "agent",
      authorName: actor.name,
      body: reply.trim(),
      internal,
    });
    setReply("");
    toast.success(internal ? "Internal note added" : "Reply sent to the customer");
  };

  return (
    <Panel>
      <PanelHeader
        title={ticket.subject}
        description={`${ticket.reference} · ${TICKET_CATEGORY_LABELS[ticket.category]} · raised by ${ticket.requesterName}`}
        actions={
          <Can anyPermission={["support:update"]}>
            <div className="flex flex-wrap gap-2">
              {!ticket.assigneeId || ticket.assigneeId !== actor.id ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<UserCheck className="size-4" />}
                  onClick={() => {
                    supportService.assign(ticket.id, actor);
                    toast.success(`Assigned to ${actor.name}`);
                  }}
                >
                  Assign to me
                </Button>
              ) : null}
              <Select
                aria-label="Priority"
                value={ticket.priority}
                onChange={(event) => {
                  supportService.setPriority(
                    ticket.id,
                    event.target.value as SupportTicketPriority,
                  );
                  toast.success("Priority updated");
                }}
                options={TICKET_PRIORITY_VALUES.map((value) => ({
                  value,
                  label: value[0].toUpperCase() + value.slice(1),
                }))}
                wrapperClassName="w-32"
              />
              {ticket.status === "resolved" || ticket.status === "closed" ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RotateCcw className="size-4" />}
                  onClick={() => {
                    supportService.setStatus(ticket.id, "open");
                    toast.success("Ticket reopened");
                  }}
                >
                  Reopen
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="size-4" />}
                  onClick={() => {
                    supportService.setStatus(ticket.id, "resolved");
                    toast.success("Ticket resolved");
                  }}
                >
                  Resolve
                </Button>
              )}
            </div>
          </Can>
        }
      />
      <PanelBody className="space-y-5">
        <dl className="grid gap-3 rounded-field border border-line bg-surface-muted/40 p-3 text-sm sm:grid-cols-4">
          <Fact label="Status">{STATUS_META[ticket.status].label}</Fact>
          <Fact label="Assignee">{ticket.assigneeName ?? "Unassigned"}</Fact>
          <Fact label="Channel">{ticket.channel}</Fact>
          <Fact label="First response">
            <span className={sla.state === "breached" ? "text-danger" : undefined}>
              {sla.label}
            </span>
          </Fact>
        </dl>

        {ticket.bookingRef && (
          <p className="flex flex-wrap items-center gap-2 rounded-field border border-line px-3 py-2 text-sm">
            <Paperclip className="size-4 shrink-0 text-primary" aria-hidden="true" />
            Booking context:{" "}
            <Link
              href={`/dashboard/bookings/${ticket.bookingId}`}
              className="font-medium text-primary underline"
            >
              {ticket.bookingRef}
            </Link>
            {ticket.merchantName && <span className="text-muted">· {ticket.merchantName}</span>}
          </p>
        )}

        {sla.state === "breached" && (
          <p className="flex items-center gap-2 rounded-field border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            First-response SLA missed. Reply now and note why in an internal note.
          </p>
        )}

        <ol className="space-y-3">
          {ticket.messages.map((message) => (
            <li
              key={message.id}
              className={cn(
                "rounded-card border p-3",
                message.internal
                  ? "border-warning/40 bg-warning/8"
                  : message.from === "customer"
                    ? "border-line bg-surface-muted/50"
                    : "border-primary/25 bg-primary-50/50",
              )}
            >
              <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink">
                {message.authorName}
                <span className="font-normal text-muted">{formatDateTime(message.at)}</span>
                {message.internal && (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-warning/20 px-2 py-0.5 text-[11px] text-amber-800">
                    <Lock className="size-3" aria-hidden="true" />
                    Internal only
                  </span>
                )}
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-body">{message.body}</p>
              {message.attachments.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {message.attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-2.5 py-1 text-xs text-body"
                    >
                      <Paperclip className="size-3" aria-hidden="true" />
                      {attachment.name}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>

        <Can anyPermission={["support:update"]}>
          <div className="rounded-card border border-line p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CANNED_RESPONSES.map((canned) => (
                <button
                  key={canned.id}
                  type="button"
                  onClick={() => setReply(canned.body)}
                  className="rounded-pill bg-surface-muted px-3 py-1 text-xs font-medium text-body transition-colors hover:bg-primary-50 hover:text-primary"
                >
                  {canned.label}
                </button>
              ))}
            </div>
            <Textarea
              label={internal ? "Internal note" : "Reply to customer"}
              rows={4}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder={
                internal
                  ? "Only your colleagues will see this."
                  : "This goes straight to the customer's account."
              }
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-body">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(event) => setInternal(event.target.checked)}
                  className="size-4 rounded border-line text-primary focus:ring-primary"
                />
                <StickyNote className="size-4 text-muted" aria-hidden="true" />
                Internal note (not sent to the customer)
              </label>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Send className="size-4" />}
                onClick={send}
                disabled={reply.trim().length < 2}
              >
                {internal ? "Add note" : "Send reply"}
              </Button>
            </div>
          </div>
        </Can>
      </PanelBody>
    </Panel>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium capitalize text-ink">{children}</dd>
    </div>
  );
}
