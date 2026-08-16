"use client";

import { useState } from "react";
import { Play, Plus, Send, Trash2, Users } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  allCampaigns,
  campaignReport,
  campaignService,
  segmentSizes,
  type MarketingCampaign,
  type MarketingCampaignChannel,
} from "@/features/dashboard/domain";
import { useDomainValue } from "@/features/booking";
import { getErrorMessage } from "../../data";
import {
  Alert,
  Button,
  Drawer,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  StatCard,
  StatusBadge,
  Textarea,
} from "../../ui";
import { EmptyState } from "../../components/state-views";
import { Can } from "../../rbac/permission-guard";
import { formatDateTime } from "../../lib/format";
import { useDomainActor } from "../../domain/use-domain";

const STATUS_TONE = {
  draft: "neutral",
  scheduled: "info",
  sending: "info",
  sent: "success",
  cancelled: "neutral",
} as const;

const CHANNELS: { value: MarketingCampaignChannel; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Push" },
];

/**
 * Campaigns — write to a segment, on a schedule.
 *
 * The audience is a live query over bookings, memberships, abandoned checkouts
 * and the waitlist, so a campaign always goes to who *is* in the segment at
 * send time. Sending goes through the same messaging layer as a booking
 * confirmation, which means marketing preferences are honoured (suppressed
 * recipients are reported, never silently dropped) and the report below reads
 * the real delivery log.
 */
export function CampaignsView() {
  const actor = useDomainActor();
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  // Both read straight from the store and re-render on any mutation, so a send
  // updates the report without a refetch.
  const list = useDomainValue(() => allCampaigns(), []) ?? [];
  const segments = useDomainValue(() => segmentSizes(), []) ?? [];

  const send = async (campaign: MarketingCampaign) => {
    setBusy(true);
    try {
      const sent = await campaignService.sendNow(campaign.id, actor);
      const report = campaignReport(sent);
      toast.success(`“${sent.name}” sent`, {
        description: `${report.sent} of ${report.audience} recipients · ${report.suppressed} suppressed by preferences · simulated delivery`,
      });
    } catch (error) {
      toast.error("Not sent", { description: getErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (campaign: MarketingCampaign) => {
    await campaignService.remove(campaign.id, actor);
    toast.success("Campaign deleted");
  };

  const totalAudience = segments.find((s) => s.id === "all")?.size ?? 0;

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Campaigns" value={String(list.length)} icon="Megaphone" />
        <StatCard
          label="Sent"
          value={String(list.filter((c) => c.status === "sent").length)}
          icon="Send"
        />
        <StatCard
          label="Scheduled"
          value={String(list.filter((c) => c.status === "scheduled").length)}
          icon="Clock"
        />
        <StatCard label="Reachable customers" value={String(totalAudience)} icon="Users" />
      </div>

      <Alert tone="warning" title="Simulated sending" className="mb-4">
        Campaigns are delivered through the prototype&apos;s messaging simulator — nothing
        reaches a real inbox. Recipients who have marketing messages switched off are
        suppressed, exactly as they would be in production.
      </Alert>

      <div className="mb-4 flex justify-end">
        <Can anyPermission={["promotions:create"]}>
          <Button size="sm" onClick={() => setComposing(true)}>
            <Plus className="size-4" aria-hidden="true" /> New campaign
          </Button>
        </Can>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No campaigns yet"
          description="Compose one, pick a segment and send it now or schedule it."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((campaign) => {
            const report = campaignReport(campaign);
            const segment = segments.find((s) => s.id === campaign.segmentId);
            return (
              <div
                key={campaign.id}
                className="rounded-card border border-line bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ink">{campaign.name}</h3>
                      <StatusBadge tone={STATUS_TONE[campaign.status]}>
                        {campaign.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-body">{campaign.subject}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <Users className="size-3.5" aria-hidden="true" />
                      {segment?.name ?? campaign.segmentId} · {segment?.size ?? 0} people ·{" "}
                      {campaign.channel}
                      {campaign.scheduledFor &&
                        ` · scheduled ${formatDateTime(campaign.scheduledFor)}`}
                      {campaign.sentAt && ` · sent ${formatDateTime(campaign.sentAt)}`}
                    </p>
                  </div>
                  <Can anyPermission={["promotions:update"]}>
                    <div className="flex items-center gap-2">
                      {campaign.status !== "sent" && (
                        <Button size="sm" loading={busy} onClick={() => void send(campaign)}>
                          <Send className="size-3.5" aria-hidden="true" /> Send now
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => void remove(campaign)}>
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">Delete {campaign.name}</span>
                      </Button>
                    </div>
                  </Can>
                </div>

                {campaign.status === "sent" && (
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-5">
                    <Metric label="Audience" value={report.audience} />
                    <Metric label="Sent" value={report.sent} />
                    <Metric label="Delivered" value={report.delivered} />
                    <Metric label="Failed" value={report.failed} />
                    <Metric label="Suppressed" value={report.suppressed} />
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ComposeDrawer
        open={composing}
        onClose={() => setComposing(false)}
        onDone={() => setComposing(false)}
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

function ComposeDrawer({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const actor = useDomainActor();
  const segments = segmentSizes();
  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState("all");
  const [channel, setChannel] = useState<MarketingCampaignChannel>("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [saving, setSaving] = useState(false);

  const audience = segments.find((s) => s.id === segmentId);

  const save = async () => {
    setSaving(true);
    try {
      await campaignService.create(
        {
          name,
          segmentId,
          channel,
          subject,
          body,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        },
        actor,
      );
      toast.success("Campaign created", {
        description: scheduledFor
          ? "It will send itself when the scheduler reaches that time."
          : "Send it when you're ready.",
      });
      setName("");
      setSubject("");
      setBody("");
      setScheduledFor("");
      onDone();
    } catch (error) {
      toast.error("Not created", { description: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="New campaign" size="lg">
      <FormSection title="Audience" description="Segments are evaluated at send time.">
        <FormGrid cols={2}>
          <Input label="Campaign name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            label="Segment"
            options={segments.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.size})`,
            }))}
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
          />
          <Select
            label="Channel"
            options={CHANNELS}
            value={channel}
            onChange={(e) => setChannel(e.target.value as MarketingCampaignChannel)}
          />
          <Input
            label="Schedule (optional)"
            type="datetime-local"
            hint="Leave blank to send manually."
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
          />
        </FormGrid>
        {audience && (
          <p className="text-sm text-muted">
            {audience.description} — {audience.size} customer{audience.size === 1 ? "" : "s"}.
          </p>
        )}
      </FormSection>

      <FormSection
        title="Message"
        description="Use {{name}} for the recipient's first name."
      >
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea label="Body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
      </FormSection>

      <FormActions>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" loading={saving} onClick={() => void save()}>
          <Play className="size-4" aria-hidden="true" /> Create campaign
        </Button>
      </FormActions>
    </Drawer>
  );
}
