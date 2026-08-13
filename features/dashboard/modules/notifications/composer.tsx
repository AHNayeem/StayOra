"use client";

import { useMemo, useState } from "react";
import { Eye, Mail, MessageSquare, Send, Smartphone, TriangleAlert } from "lucide-react";
import {
  CHANNEL_LABELS,
  MESSAGE_CATEGORY_LABELS,
  MESSAGE_TEMPLATES,
  findTemplate,
  getState,
  messagingService,
  type DeliveryStatus,
  type MessageChannel,
} from "../../domain";
import { useDomainScope } from "../../domain/use-domain";
import { useDomainValue } from "@/features/booking";
import { Can } from "../../rbac/permission-guard";
import {
  Button,
  EmptyState,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  Select,
  StatCard,
  StatusBadge,
  type StatusTone,
} from "../../ui";
import { formatDateTime } from "../../lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<DeliveryStatus, StatusTone> = {
  queued: "neutral",
  sent: "info",
  delivered: "success",
  read: "success",
  failed: "danger",
  bounced: "danger",
};

const CHANNEL_ICON: Record<MessageChannel, typeof Mail> = {
  email: Mail,
  sms: Smartphone,
  push: Smartphone,
  whatsapp: MessageSquare,
  inapp: Mail,
};

/**
 * Notification composer and delivery report.
 *
 * "Sending" renders a template against a real booking and appends to the same
 * outbox the customer's inbox reads, so a test send is visible end-to-end. No
 * provider is contacted — the delivery status is chosen here, which is how the
 * failure path gets demonstrated without breaking anything.
 */
export function NotificationComposer() {
  const scope = useDomainScope();
  const [templateKey, setTemplateKey] = useState(MESSAGE_TEMPLATES[0].key);
  const [channel, setChannel] = useState<MessageChannel>("email");
  const [bookingId, setBookingId] = useState("");
  const [override, setOverride] = useState("");
  const [outcome, setOutcome] = useState<DeliveryStatus>("delivered");
  const [channelFilter, setChannelFilter] = useState<MessageChannel | "">("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "">("");

  const template = findTemplate(templateKey) ?? MESSAGE_TEMPLATES[0];

  const bookings = useDomainValue(
    () =>
      getState()
        .bookings.filter((b) => !scope.merchantId || b.merchant.id === scope.merchantId)
        .slice(0, 40),
    [scope.merchantId],
  );
  const booking = bookings.find((b) => b.id === bookingId) ?? bookings[0];

  const stats = useDomainValue(() => messagingService.stats(), []);
  const log = useDomainValue(
    () =>
      messagingService.log({
        channel: channelFilter || undefined,
        status: statusFilter || undefined,
      }),
    [channelFilter, statusFilter],
  );

  const context = useMemo(
    () => ({
      name: booking?.customer.name.split(" ")[0] ?? "there",
      reference: booking?.reference ?? "SO-00000",
      product: booking?.productTitle ?? "your booking",
      dates: booking
        ? `${booking.startAt.slice(0, 10)} → ${booking.endAt.slice(0, 10)}`
        : "your dates",
      total: booking ? `USD ${booking.money.total.toFixed(2)}` : "USD 0.00",
      refund: booking ? `USD ${booking.money.refunded.toFixed(2)}` : "USD 0.00",
      fee: "USD 0.00",
      reason: "Card declined by the issuer",
      instrument: booking?.payment.instrument ?? "Card on file",
      txn: booking?.payment.reference ?? "TXN-00000",
      code: "482913",
      subject: "Your support request",
      body: "Here's the update I promised.",
    }),
    [booking],
  );

  const preview = messagingService.preview(templateKey, channel, context);

  const send = () => {
    if (!booking) return;
    const created = messagingService.send({
      templateKey,
      channels: [channel],
      to: {
        email: override || booking.customer.email,
        phone: "+8801711000000",
        device: `${booking.customer.email} · app`,
      },
      customerEmail: booking.customer.email,
      bookingId: booking.id,
      bookingRef: booking.reference,
      href: `/account/bookings/${booking.id}`,
      context,
      forceStatus: outcome,
      manual: true,
      // A hand-composed send is an operational action, so it bypasses the
      // customer's marketing preferences the way a real console would.
      ignorePreferences: true,
    });
    if (created.length === 0) {
      toast.error("Nothing sent", {
        description: `The ${CHANNEL_LABELS[channel]} channel isn't defined for this template.`,
      });
      return;
    }
    toast.success(`${CHANNEL_LABELS[channel]} ${outcome}`, {
      description: `${template.name} → ${created[0].to}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Messages sent" value={String(stats.total)} icon="Send" />
        <StatCard label="Delivered" value={String(stats.delivered)} icon="CheckCheck" />
        <StatCard label="Failed" value={String(stats.failed)} icon="TriangleAlert" />
        <StatCard
          label="Delivery rate"
          value={`${stats.total ? Math.round((stats.delivered / stats.total) * 100) : 0}%`}
          icon="ChartNoAxesColumn"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Can anyPermission={["notifications:update"]}>
          <Panel>
            <PanelHeader
              title="Compose"
              description="Render a template against a real booking and send it on one channel."
            />
            <PanelBody className="space-y-3">
              <Select
                label="Template"
                value={templateKey}
                onChange={(event) => setTemplateKey(event.target.value)}
                options={MESSAGE_TEMPLATES.map((item) => ({
                  value: item.key,
                  label: `${item.name} · ${MESSAGE_CATEGORY_LABELS[item.category]}`,
                }))}
              />
              <Select
                label="Channel"
                value={channel}
                onChange={(event) => setChannel(event.target.value as MessageChannel)}
                options={template.channels.map((value) => ({
                  value,
                  label: CHANNEL_LABELS[value],
                }))}
              />
              <Select
                label="Booking context"
                value={booking?.id ?? ""}
                onChange={(event) => setBookingId(event.target.value)}
                options={bookings.map((item) => ({
                  value: item.id,
                  label: `${item.reference} · ${item.customer.name} · ${item.productTitle}`,
                }))}
              />
              <Input
                label="Send to (override)"
                placeholder={booking?.customer.email}
                value={override}
                onChange={(event) => setOverride(event.target.value)}
                hint="Leave blank to use the customer's own address."
              />
              <Select
                label="Simulated outcome"
                value={outcome}
                onChange={(event) => setOutcome(event.target.value as DeliveryStatus)}
                options={[
                  { value: "delivered", label: "Delivered" },
                  { value: "sent", label: "Sent (no delivery receipt)" },
                  { value: "queued", label: "Queued" },
                  { value: "failed", label: "Failed" },
                  { value: "bounced", label: "Bounced" },
                ]}
                hint="No provider is contacted — pick the outcome you want to demonstrate."
              />
              <Button
                variant="primary"
                leftIcon={<Send className="size-4" />}
                onClick={send}
                disabled={!booking}
              >
                Send mock message
              </Button>
              <p className="flex items-start gap-2 text-xs text-muted">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                Prototype only. Nothing leaves the browser; the message is written to the
                delivery log and, for in-app sends, the customer&rsquo;s inbox.
              </p>
            </PanelBody>
          </Panel>
        </Can>

        <Panel>
          <PanelHeader
            title="Preview"
            description={`${template.name} on ${CHANNEL_LABELS[channel]}`}
          />
          <PanelBody>
            {/* The preview rewrites itself as the template, channel or booking
                changes, with no focus move to announce it. */}
            {preview ? (
              <div
                aria-live="polite"
                className="rounded-card border border-line bg-surface-muted/40 p-4"
              >
                <p className="flex items-center gap-2 text-xs text-muted">
                  <Eye className="size-3.5" aria-hidden="true" />
                  To {override || booking?.customer.email}
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">{preview.subject}</p>
                <p className="mt-2 whitespace-pre-line text-sm text-body">{preview.body}</p>
              </div>
            ) : (
              <EmptyState title="No preview" description="Pick a template to preview it." />
            )}
            <details className="mt-3 rounded-field bg-surface-muted/50 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-body">
                Tokens available to this template
              </summary>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {Object.keys(context).map((token) => (
                  <li
                    key={token}
                    className="rounded bg-surface px-2 py-0.5 font-mono text-[11px] text-muted"
                  >
                    {`{{${token}}}`}
                  </li>
                ))}
              </ul>
            </details>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Delivery log"
          description={`${log.length} message${log.length === 1 ? "" : "s"}`}
          actions={
            <div className="flex gap-2">
              <Select
                aria-label="Channel"
                value={channelFilter}
                onChange={(event) =>
                  setChannelFilter(event.target.value as MessageChannel | "")
                }
                options={[
                  { value: "", label: "All channels" },
                  ...Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label })),
                ]}
                wrapperClassName="w-40"
              />
              <Select
                aria-label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as DeliveryStatus | "")}
                options={[
                  { value: "", label: "All statuses" },
                  { value: "delivered", label: "Delivered" },
                  { value: "read", label: "Read" },
                  { value: "sent", label: "Sent" },
                  { value: "queued", label: "Queued" },
                  { value: "failed", label: "Failed" },
                  { value: "bounced", label: "Bounced" },
                ]}
                wrapperClassName="w-40"
              />
            </div>
          }
        />
        <PanelBody className="p-0">
          {log.length === 0 ? (
            <EmptyState
              title="Nothing sent yet"
              description="Messages appear here as the platform sends them."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-3xl text-sm">
                <caption className="sr-only">Notification delivery log</caption>
                <thead className="border-b border-line bg-surface-muted/50 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Sent</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Channel</th>
                    <th scope="col" className="px-4 py-3 font-semibold">To</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Subject</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Booking</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {log.slice(0, 60).map((message) => {
                    const Icon = CHANNEL_ICON[message.channel];
                    return (
                      <tr key={message.id} className="hover:bg-surface-muted/30">
                        <td className="whitespace-nowrap px-4 py-3 text-muted">
                          {formatDateTime(message.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-body">
                            <Icon className="size-3.5" aria-hidden="true" />
                            {CHANNEL_LABELS[message.channel]}
                          </span>
                        </td>
                        <td className="max-w-40 truncate px-4 py-3 text-body">{message.to}</td>
                        <td className="max-w-64 truncate px-4 py-3 text-ink">
                          {message.subject}
                          {message.manual && (
                            <span className="ml-2 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] uppercase text-muted">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted">{message.bookingRef ?? "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={STATUS_TONE[message.status]}>
                            {message.status}
                          </StatusBadge>
                          {message.failureReason && (
                            <span className={cn("mt-1 block text-[11px] text-danger")}>
                              {message.failureReason}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
