"use client";

import { useState } from "react";
import { Download, Link2, Pause, Play, Plus, RefreshCw, Trash2, Unlink } from "lucide-react";
import { toast } from "@/lib/toast";
import { VERTICAL_LABELS } from "@/types/booking";
import { downloadText } from "@/features/booking/documents";
import {
  CHANNEL_PROVIDER_LABELS,
  CHANNEL_SCOPES,
  CHANNEL_SCOPE_LABELS,
  CHANNEL_STATUS_LABELS,
  CHANNEL_STATUS_TONES,
  PROPERTY_STATUS_LABELS,
  blocksForProperty,
  calendarFeed,
  clearBlocksForProperty,
  limitLabel,
  planAllows,
  planFor,
  withinLimit,
  type ChannelScope,
  type Merchant,
  type MerchantProperty,
} from "@/features/dashboard/domain";
import { getErrorMessage } from "../../data";
import { applyServerErrors, useZodForm } from "../../forms";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Drawer,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  StatCard,
  StatusBadge,
  Tag,
} from "../../ui";
import { ConfirmDialog } from "../../crud";
import { formatDate, formatDateTime, formatNumber } from "../../lib/format";
import { channelSchema, propertySchema, type ChannelValues, type PropertyValues } from "../merchants/schemas";
import {
  useAddProperty,
  useConnectChannel,
  useDisconnectChannel,
  usePauseCalendarSync,
  useRemoveProperty,
  useResumeCalendarSync,
  useSyncCalendar,
} from "../merchants/hooks";
import { useOwnMerchant } from "./use-merchant";
import { NoMerchantAccount, WorkspaceSkeleton } from "./no-merchant";

/**
 * Multi-property management and the channel-manager / PMS connection surface.
 *
 * Merchant-level facts (legal entity, contract, payout) and property-level
 * facts (address, capacity, PMS link) are kept apart here exactly as they are in
 * the domain — a hotel group signs one agreement and operates many properties,
 * and a channel connection is always per property.
 */
export function MerchantPropertiesView() {
  const { merchantId, data: merchant, isLoading } = useOwnMerchant();
  const [adding, setAdding] = useState(false);
  const [connecting, setConnecting] = useState<MerchantProperty | null>(null);
  const [removing, setRemoving] = useState<MerchantProperty | null>(null);
  const disconnect = useDisconnectChannel();
  const syncCalendar = useSyncCalendar();
  const pauseSync = usePauseCalendarSync();
  const resumeSync = useResumeCalendarSync();
  const removeProperty = useRemoveProperty();

  if (!merchantId) return <NoMerchantAccount />;
  if (isLoading && !merchant) return <WorkspaceSkeleton />;
  if (!merchant) return <NoMerchantAccount />;

  const plan = planFor(merchant);
  const canAdd = withinLimit(plan.limits.properties, merchant.properties.length);
  const channelUnlocked = planAllows(merchant, "channel_manager");
  const connected = merchant.properties.filter((p) => p.channel.status === "connected").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Properties" value={String(merchant.properties.length)} icon="Building2" />
        <StatCard
          label="Plan limit"
          value={limitLabel(plan.limits.properties)}
          icon="ShieldCheck"
          hint={plan.name}
        />
        <StatCard
          label="Total capacity"
          value={formatNumber(merchant.properties.reduce((n, p) => n + p.units, 0))}
          icon="Boxes"
          hint="Rooms, units or seats"
        />
        <StatCard label="Channel connected" value={`${connected}/${merchant.properties.length}`} icon="Link" />
      </div>

      {!canAdd && (
        <Alert tone="warning" title="Property limit reached">
          Your {plan.name} plan allows {limitLabel(plan.limits.properties)}. Upgrade to add more.
        </Alert>
      )}

      <Alert tone="info" title="Calendar sync is simulated, and it is real inventory">
        No request leaves the browser: a feed is generated deterministically from your property
        code. What it imports is not simulated — blocked nights come straight out of what this
        platform will sell, exactly as a live channel manager would take them.
      </Alert>

      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Properties</h2>
          <Button size="sm" leftIcon={<Plus className="size-4" />} disabled={!canAdd} onClick={() => setAdding(true)}>
            Add property
          </Button>
        </div>

        {merchant.properties.length === 0 ? (
          <p className="text-sm text-muted">
            No properties yet. Add the first one you want to sell from.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {merchant.properties.map((property) => (
              <li key={property.id} className="rounded-field border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{property.name}</p>
                      <Badge variant="neutral">{PROPERTY_STATUS_LABELS[property.status]}</Badge>
                      <Tag variant="soft">{VERTICAL_LABELS[property.vertical]}</Tag>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {property.addressLine}, {property.city}, {property.country} ·{" "}
                      {formatNumber(property.units)} units · added {formatDate(property.createdAt)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${property.name}`}
                    onClick={() => setRemoving(property)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={CHANNEL_STATUS_TONES[property.channel.status]}>
                      {CHANNEL_STATUS_LABELS[property.channel.status]}
                    </StatusBadge>
                    <span className="text-xs text-muted">
                      {CHANNEL_PROVIDER_LABELS[property.channel.provider]}
                      {property.channel.externalRef ? ` · ${property.channel.externalRef}` : ""}
                      {property.channel.lastSyncAt
                        ? ` · last sync ${formatDateTime(property.channel.lastSyncAt)}`
                        : ""}
                    </span>
                    {property.channel.scopes.map((scope) => (
                      <Tag key={scope} variant="soft">
                        {CHANNEL_SCOPE_LABELS[scope]}
                      </Tag>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {property.channel.status === "not_connected" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Link2 className="size-4" />}
                        disabled={!channelUnlocked}
                        onClick={() => setConnecting(property)}
                      >
                        Connect
                      </Button>
                    ) : (
                      <>
                        {property.channel.status === "paused" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Play className="size-4" />}
                            loading={resumeSync.isPending}
                            onClick={() =>
                              void resumeSync
                                .mutateAsync({ id: merchant.id, propertyId: property.id })
                                .then((outcome) =>
                                  toast.success("Sync resumed", {
                                    description: outcome.message,
                                  }),
                                )
                                .catch((e) =>
                                  toast.error("Couldn't resume", {
                                    description: getErrorMessage(e),
                                  }),
                                )
                            }
                          >
                            Resume sync
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<RefreshCw className="size-4" />}
                              loading={syncCalendar.isPending}
                              onClick={() =>
                                void syncCalendar
                                  .mutateAsync({ id: merchant.id, propertyId: property.id })
                                  .then((outcome) =>
                                    outcome.status === "error"
                                      ? toast.error("Sync failed", {
                                          description: outcome.message,
                                        })
                                      : toast.success("Calendar synced", {
                                          description: outcome.message,
                                        }),
                                  )
                                  .catch((e) =>
                                    toast.error("Couldn't sync", {
                                      description: getErrorMessage(e),
                                    }),
                                  )
                              }
                            >
                              Sync now
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<Pause className="size-4" />}
                              loading={pauseSync.isPending}
                              onClick={() =>
                                void pauseSync
                                  .mutateAsync({ id: merchant.id, propertyId: property.id })
                                  .then(() =>
                                    toast.success("Sync paused", {
                                      description:
                                        "Imported blocks were released back into availability.",
                                    }),
                                  )
                                  .catch((e) =>
                                    toast.error("Couldn't pause", {
                                      description: getErrorMessage(e),
                                    }),
                                  )
                              }
                            >
                              Pause
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Download className="size-4" />}
                          onClick={() => downloadFeed(merchant.id, property.id, property.name)}
                        >
                          Export .ics
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Unlink className="size-4" />}
                          loading={disconnect.isPending}
                          onClick={() =>
                            void disconnect
                              .mutateAsync({ id: merchant.id, propertyId: property.id })
                              .then(() => {
                                clearBlocksForProperty(property.id);
                                toast.success("Disconnected", {
                                  description: "Imported blocks were released.",
                                });
                              })
                              .catch((e) =>
                                toast.error("Couldn't disconnect", { description: getErrorMessage(e) }),
                              )
                          }
                        >
                          Disconnect
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {property.channel.message && (
                  <p
                    className={
                      property.channel.status === "error"
                        ? "mt-2 text-xs font-medium text-danger"
                        : "mt-2 text-xs text-muted"
                    }
                  >
                    {property.channel.message}
                  </p>
                )}

                <ImportedBlocks propertyId={property.id} />
              </li>
            ))}
          </ul>
        )}

        {!channelUnlocked && (
          <p className="mt-4 text-xs text-muted">
            Channel manager connections are available on Professional and Premium. You&apos;re on{" "}
            {plan.name}.
          </p>
        )}
      </section>

      <Drawer open={adding} onClose={() => setAdding(false)} size="md" title="Add a property">
        {adding && <PropertyForm merchant={merchant} onDone={() => setAdding(false)} />}
      </Drawer>

      <Drawer
        open={Boolean(connecting)}
        onClose={() => setConnecting(null)}
        size="md"
        title={connecting ? `Connect ${connecting.name}` : "Connect"}
      >
        {connecting && (
          <ChannelForm
            merchant={merchant}
            property={connecting}
            onDone={() => setConnecting(null)}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        loading={removeProperty.isPending}
        title="Remove property?"
        message={
          <>
            <strong className="font-semibold text-ink">{removing?.name}</strong> will be removed.
            Published listings must be taken down first.
          </>
        }
        confirmLabel="Remove property"
        onConfirm={async () => {
          if (!removing) return;
          try {
            await removeProperty.mutateAsync({ id: merchant.id, propertyId: removing.id });
            toast.success(`${removing.name} removed`);
            setRemoving(null);
          } catch (error) {
            toast.error("Couldn't remove", { description: getErrorMessage(error) });
          }
        }}
      />
    </div>
  );
}

/** Hand the merchant the feed other channels would subscribe to. */
function downloadFeed(merchantId: string, propertyId: string, name: string): void {
  try {
    downloadText(
      `${name.toLowerCase().replace(/\W+/g, "-")}-availability.ics`,
      calendarFeed(merchantId, propertyId),
      "text/calendar",
    );
  } catch (error) {
    toast.error("Couldn't build the feed", { description: getErrorMessage(error) });
  }
}

/**
 * What the last import actually took. Without this the sync is a status badge;
 * with it, the merchant can see the nights they have lost to another channel
 * and go and check them in the rate manager.
 */
function ImportedBlocks({ propertyId }: { propertyId: string }) {
  const blocks = blocksForProperty(propertyId);
  if (blocks.length === 0) return null;

  const nights = new Set(blocks.map((b) => b.date));
  const bySource = new Map<string, number>();
  for (const block of blocks) {
    bySource.set(block.summary, (bySource.get(block.summary) ?? 0) + 1);
  }
  const sorted = [...bySource.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="mt-3 rounded-field bg-subtle px-3 py-2">
      <p className="text-xs font-medium text-ink">
        {formatNumber(blocks.length)} blocked night
        {blocks.length === 1 ? "" : "s"} across {nights.size} date
        {nights.size === 1 ? "" : "s"} — held by other channels and not sellable here
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {sorted.slice(0, 4).map(([source, count]) => (
          <Tag key={source} variant="soft">
            {source} · {count}
          </Tag>
        ))}
        <span className="self-center text-xs text-muted">
          Next {blocks[0]?.date}
        </span>
      </div>
    </div>
  );
}

function PropertyForm({ merchant, onDone }: { merchant: Merchant; onDone: () => void }) {
  const add = useAddProperty();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useZodForm(propertySchema, {
    defaultValues: {
      name: "",
      vertical: merchant.verticals[0],
      city: merchant.city,
      country: merchant.country,
      addressLine: "",
      units: 10,
      status: "active" as const,
    },
  });

  const onSubmit = form.handleSubmit(async (values: PropertyValues) => {
    setSubmitError(null);
    try {
      await add.mutateAsync({ id: merchant.id, input: values });
      toast.success("Property added");
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="px-1">
      {submitError && (
        <Alert tone="danger" title="Couldn't add the property" className="mb-4">
          {submitError}
        </Alert>
      )}
      <FormSection title="Property">
        <FormGrid cols={1}>
          <Input label="Name" required {...form.register("name")} error={form.formState.errors.name?.message} />
          <Select
            label="Type"
            options={merchant.verticals.map((v) => ({ value: v, label: VERTICAL_LABELS[v] }))}
            {...form.register("vertical")}
            error={form.formState.errors.vertical?.message}
          />
          <Input
            label="Street address"
            required
            {...form.register("addressLine")}
            error={form.formState.errors.addressLine?.message}
          />
          <Input label="City" required {...form.register("city")} error={form.formState.errors.city?.message} />
          <Input
            label="Country"
            required
            {...form.register("country")}
            error={form.formState.errors.country?.message}
          />
          <Input
            label="Rooms / units / seats"
            type="number"
            min={1}
            required
            {...form.register("units")}
            error={form.formState.errors.units?.message}
          />
        </FormGrid>
      </FormSection>
      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={add.isPending}>
          Add property
        </Button>
      </FormActions>
    </form>
  );
}

function ChannelForm({
  merchant,
  property,
  onDone,
}: {
  merchant: Merchant;
  property: MerchantProperty;
  onDone: () => void;
}) {
  const connect = useConnectChannel();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useZodForm(channelSchema, {
    defaultValues: {
      provider: "siteminder" as const,
      externalRef: "",
      scopes: ["inventory", "rates", "availability"] as ChannelScope[],
    },
  });

  const scopes = form.watch("scopes") ?? [];
  const toggle = (scope: ChannelScope, on: boolean) =>
    form.setValue("scopes", on ? [...scopes, scope] : scopes.filter((s) => s !== scope), {
      shouldValidate: form.formState.isSubmitted,
    });

  const onSubmit = form.handleSubmit(async (values: ChannelValues) => {
    setSubmitError(null);
    try {
      await connect.mutateAsync({
        id: merchant.id,
        propertyId: property.id,
        provider: values.provider,
        externalRef: values.externalRef,
        scopes: values.scopes,
      });
      toast.success("Connection recorded", {
        description: "Nothing was contacted — this is the prototype's PMS placeholder.",
      });
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="px-1">
      {submitError && (
        <Alert tone="danger" title="Couldn't connect" className="mb-4">
          {submitError}
        </Alert>
      )}
      <Alert tone="info" title="No external system is contacted" className="mb-4">
        This records the connection so the states — connected, syncing, error — can be exercised.
      </Alert>
      <FormSection title="Provider">
        <FormGrid cols={1}>
          <Select
            label="Channel manager / PMS"
            options={[
              { value: "siteminder", label: CHANNEL_PROVIDER_LABELS.siteminder },
              { value: "cloudbeds", label: CHANNEL_PROVIDER_LABELS.cloudbeds },
              { value: "channex", label: CHANNEL_PROVIDER_LABELS.channex },
              { value: "custom_api", label: CHANNEL_PROVIDER_LABELS.custom_api },
            ]}
            {...form.register("provider")}
            error={form.formState.errors.provider?.message}
          />
          <Input
            label="Property code"
            required
            placeholder="e.g. SM-88231"
            {...form.register("externalRef")}
            error={form.formState.errors.externalRef?.message}
            hint="The identifier your provider uses for this property."
          />
        </FormGrid>
        <div className="mt-3">
          <p className="mb-2 text-xs font-medium text-ink">What to sync</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CHANNEL_SCOPES.map((scope) => (
              <Checkbox
                key={scope}
                label={CHANNEL_SCOPE_LABELS[scope]}
                checked={scopes.includes(scope)}
                onChange={(e) => toggle(scope, e.target.checked)}
              />
            ))}
          </div>
          {form.formState.errors.scopes?.message && (
            <p className="mt-2 text-xs font-medium text-danger">
              {form.formState.errors.scopes.message}
            </p>
          )}
        </div>
      </FormSection>
      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={connect.isPending}>
          Connect
        </Button>
      </FormActions>
    </form>
  );
}
