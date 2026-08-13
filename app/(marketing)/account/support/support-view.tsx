"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  LifeBuoy,
  Lock,
  Paperclip,
  Plus,
  Send,
  ShieldCheck,
} from "lucide-react";
import {
  TICKET_CATEGORY_LABELS,
  slaStatus,
  supportService,
  type SupportTicket,
  type SupportTicketCategory,
  type SupportTicketStatus,
} from "@/features/dashboard/domain";
import {
  useCustomerBookings,
  useCustomerEmail,
  useCustomerTickets,
  useDomainValue,
} from "@/features/booking";
import { useAuth } from "@/features/auth";
import { useLocale } from "@/features/i18n";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { StatusBadge, type StatusTone } from "@/components/account/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { controlClasses } from "@/components/ui/field";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const STATUS_META: Record<SupportTicketStatus, { label: string; tone: StatusTone }> = {
  open: { label: "Open", tone: "info" },
  pending_agent: { label: "With our team", tone: "warning" },
  pending_customer: { label: "Waiting on you", tone: "warning" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

/**
 * The traveller's support centre.
 *
 * There is one ticket store: what an agent writes in `/dashboard/support`
 * appears in this thread, and a reply here puts the ticket back in their queue.
 * Internal notes the agent leaves are filtered out by the domain, never by this
 * component.
 */
export function SupportView() {
  const tickets = useCustomerTickets();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const active = useDomainValue(
    () => (activeId ? supportService.get(activeId) : undefined),
    [activeId],
  );

  if (active) {
    return <TicketThread ticket={active} onBack={() => setActiveId(null)} />;
  }

  return (
    <div>
      <AccountPageHeader
        title="Help & support"
        description="Ask us anything about a booking, a payment or your account."
        actions={
          <Button variant="primary" size="sm" onClick={() => setComposing(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New request
          </Button>
        }
      />

      {tickets.length === 0 ? (
        <AccountEmpty
          icon={LifeBuoy}
          title="No support requests yet"
          description="If something isn't right with a booking, open a request and we'll pick it up."
          action={
            <Button variant="primary" size="sm" onClick={() => setComposing(true)}>
              Open a request
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <TicketRow ticket={ticket} onOpen={() => setActiveId(ticket.id)} />
            </li>
          ))}
        </ul>
      )}

      {composing && <NewTicketDialog onClose={() => setComposing(false)} onOpened={setActiveId} />}
    </div>
  );
}

function TicketRow({ ticket, onOpen }: { ticket: SupportTicket; onOpen: () => void }) {
  const { dateTime } = useLocale();
  const meta = STATUS_META[ticket.status];
  const thread = supportService.customerThread(ticket);
  const last = thread.at(-1);
  const awaiting = last?.from === "agent" && ticket.status !== "closed";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-card border border-line bg-surface p-4 text-left shadow-card transition-colors hover:border-primary/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
            {ticket.subject}
            {awaiting && (
              <span className="rounded-pill bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                New reply
              </span>
            )}
          </p>
          <p className="text-xs text-muted">
            {ticket.reference} · {TICKET_CATEGORY_LABELS[ticket.category]}
            {ticket.bookingRef ? ` · ${ticket.bookingRef}` : ""}
          </p>
        </div>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>
      {last && <p className="line-clamp-2 text-sm text-body">{last.body}</p>}
      <p className="text-xs text-muted">Updated {dateTime(ticket.updatedAt)}</p>
    </button>
  );
}

function TicketThread({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
  const { dateTime } = useLocale();
  const { user } = useAuth();
  const email = useCustomerEmail();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const messages = supportService.customerThread(ticket);
  const meta = STATUS_META[ticket.status];
  const sla = slaStatus(ticket);

  const send = () => {
    if (reply.trim().length < 2) return;
    setBusy(true);
    supportService.reply(ticket.id, {
      from: "customer",
      authorName: user?.name ?? ticket.requesterName,
      body: reply.trim(),
    });
    setReply("");
    setBusy(false);
    toast.success("Reply sent", { description: "Our team has been notified." });
  };

  return (
    <div>
      <AccountPageHeader
        title={ticket.subject}
        back={{ href: "/account/support", label: "All requests" }}
        actions={<StatusBadge label={meta.label} tone={meta.tone} />}
      />

      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to requests
      </button>

      <dl className="mb-5 grid gap-3 rounded-card border border-line bg-surface p-4 text-sm sm:grid-cols-4">
        <Fact label="Reference">{ticket.reference}</Fact>
        <Fact label="Category">{TICKET_CATEGORY_LABELS[ticket.category]}</Fact>
        <Fact label="Priority">
          <span className="capitalize">{ticket.priority}</span>
        </Fact>
        <Fact label="Response target">
          <span
            className={cn(
              "inline-flex items-center gap-1",
              sla.state === "breached" ? "text-danger" : "text-body",
            )}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            {sla.label}
          </span>
        </Fact>
      </dl>

      {ticket.bookingRef && (
        <p className="mb-5 flex flex-wrap items-center gap-2 rounded-field border border-line bg-surface-muted/50 px-4 py-2.5 text-sm text-body">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
          Linked to booking{" "}
          <Link
            href={`/account/bookings/${ticket.bookingId}`}
            className="font-medium text-primary underline"
          >
            {ticket.bookingRef}
          </Link>
        </p>
      )}

      <ol className="space-y-4">
        {messages.map((message) => {
          const mine = message.from === "customer";
          return (
            <li
              key={message.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-card border p-4",
                  mine
                    ? "border-primary/25 bg-primary-50/70"
                    : "border-line bg-surface shadow-card",
                )}
              >
                <p className="text-xs font-semibold text-ink">
                  {mine ? "You" : message.authorName}
                  <span className="ml-2 font-normal text-muted">{dateTime(message.at)}</span>
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm text-body">{message.body}</p>
                {message.attachments.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {message.attachments.map((attachment) => (
                      <li
                        key={attachment.id}
                        className="inline-flex items-center gap-1.5 rounded-pill bg-surface-muted px-2.5 py-1 text-xs text-body"
                      >
                        <Paperclip className="size-3" aria-hidden="true" />
                        {attachment.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {ticket.status === "closed" ? (
        <p className="mt-6 rounded-card border border-line bg-surface-muted/50 p-4 text-sm text-muted">
          <Lock className="mr-1.5 inline size-3.5" aria-hidden="true" />
          This request is closed. Replying will reopen it.
        </p>
      ) : null}

      <div className="mt-6 rounded-card border border-line bg-surface p-4 shadow-card">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Reply</span>
          <textarea
            rows={4}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Add anything that would help us sort this out…"
            className={cn(controlClasses(false), "resize-none py-2.5")}
          />
        </label>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">Replying as {email}</p>
          <Button
            variant="primary"
            size="md"
            loading={busy}
            disabled={reply.trim().length < 2}
            onClick={send}
          >
            <Send className="size-4" aria-hidden="true" />
            Send reply
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewTicketDialog({
  onClose,
  onOpened,
}: {
  onClose: () => void;
  onOpened: (id: string) => void;
}) {
  const { user } = useAuth();
  const email = useCustomerEmail();
  const bookings = useCustomerBookings();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("booking");
  const [bookingId, setBookingId] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const linked = useMemo(() => bookings.find((b) => b.id === bookingId), [bookings, bookingId]);

  const submit = () => {
    setBusy(true);
    const ticket = supportService.create({
      subject: subject.trim() || `Help with ${linked?.reference ?? "my account"}`,
      category,
      body: body.trim(),
      requesterName: user?.name ?? "Guest",
      requesterEmail: email,
      bookingId: linked?.id,
      bookingRef: linked?.reference,
    });
    setBusy(false);
    onClose();
    onOpened(ticket.id);
    toast.success("Request opened", { description: `${ticket.reference} — we'll reply shortly.` });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Open a support request"
      description="Tell us what's happening and we'll pick it up. You'll get replies right here."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={body.trim().length < 10}
            onClick={submit}
          >
            Send request
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="A short summary"
            className={cn(controlClasses(false), "h-11")}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as SupportTicketCategory)}
              className={cn(controlClasses(false), "h-11")}
            >
              {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Related booking (optional)</span>
            <select
              value={bookingId}
              onChange={(event) => setBookingId(event.target.value)}
              className={cn(controlClasses(false), "h-11")}
            >
              <option value="">Not about a booking</option>
              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.reference} · {booking.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">What&rsquo;s happened?</span>
          <textarea
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Dates, amounts, who you've spoken to — the more detail the faster we can help."
            className={cn(controlClasses(false), "resize-none py-2.5")}
          />
        </label>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Paperclip className="size-3.5" aria-hidden="true" />
          Attachments are simulated in this prototype — mention any documents and an agent will
          ask for them.
        </p>
      </div>
    </Modal>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  );
}
