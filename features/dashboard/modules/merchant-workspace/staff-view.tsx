"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  MERCHANT_CAPABILITIES,
  MERCHANT_ROLES,
  MERCHANT_ROLE_LIST,
  STAFF_STATUS_LABELS,
  limitLabel,
  merchantRoleCan,
  planFor,
  withinLimit,
  type Merchant,
  type MerchantCapability,
  type MerchantRoleId,
  type MerchantStaff,
} from "@/features/dashboard/domain";
import { getErrorMessage } from "../../data";
import { applyServerErrors, useZodForm } from "../../forms";
import {
  Alert,
  Badge,
  Button,
  Drawer,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  StatCard,
  Tag,
} from "../../ui";
import { ConfirmDialog } from "../../crud";
import { formatDate } from "../../lib/format";
import { staffSchema, type StaffValues } from "../merchants/schemas";
import { useAddStaff, useRemoveStaff, useUpdateStaff } from "../merchants/hooks";
import { useOwnMerchant } from "./use-merchant";
import { NoMerchantAccount, WorkspaceSkeleton } from "./no-merchant";

/** The capabilities worth showing in the role matrix, in reading order. */
const MATRIX_CAPABILITIES: MerchantCapability[] = [
  "catalogue.manage",
  "pricing.manage",
  "bookings.manage",
  "finance.view",
  "payout.manage",
  "staff.manage",
  "advertising.manage",
  "subscription.manage",
];

const CAPABILITY_LABELS: Record<MerchantCapability, string> = {
  "profile.view": "View profile",
  "profile.manage": "Edit profile",
  "onboarding.manage": "Onboarding",
  "catalogue.view": "View listings",
  "catalogue.manage": "Manage listings",
  "catalogue.submit": "Submit listings",
  "inventory.manage": "Inventory",
  "pricing.manage": "Rates & pricing",
  "bookings.view": "View bookings",
  "bookings.manage": "Manage bookings",
  "guests.view": "Guest records",
  "finance.view": "See the money",
  "payout.manage": "Payout details",
  "staff.manage": "Manage staff",
  "promotions.manage": "Promotions",
  "advertising.manage": "Advertising",
  "subscription.manage": "Subscription",
  "reviews.respond": "Reply to reviews",
  "disputes.respond": "Respond to disputes",
  "channel.manage": "Channel manager",
  "reports.view": "Reports",
};

/**
 * Merchant staff and roles.
 *
 * Roles are the domain's, and so is the capability matrix below — the same
 * `merchantRoleCan` that decides what a member may actually do renders this
 * table, so the documentation cannot drift from the enforcement.
 */
export function MerchantStaffView() {
  const { merchantId, data: merchant, isLoading } = useOwnMerchant();
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<MerchantStaff | null>(null);
  const updateStaff = useUpdateStaff();
  const removeStaff = useRemoveStaff();

  if (!merchantId) return <NoMerchantAccount />;
  if (isLoading && !merchant) return <WorkspaceSkeleton />;
  if (!merchant) return <NoMerchantAccount />;

  const plan = planFor(merchant);
  const canAdd = withinLimit(plan.limits.staff, merchant.staff.length);

  const changeRole = async (member: MerchantStaff, role: MerchantRoleId) => {
    try {
      await updateStaff.mutateAsync({ id: merchant.id, staffId: member.id, input: { role } });
      toast.saved(`${member.name}'s role`);
    } catch (error) {
      toast.error("Couldn't change the role", { description: getErrorMessage(error) });
    }
  };

  const toggleStatus = async (member: MerchantStaff) => {
    const next = member.status === "suspended" ? "active" : "suspended";
    try {
      await updateStaff.mutateAsync({ id: merchant.id, staffId: member.id, input: { status: next } });
      toast.success(`${member.name} ${next === "active" ? "reactivated" : "suspended"}`);
    } catch (error) {
      toast.error("Couldn't update", { description: getErrorMessage(error) });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Team members" value={String(merchant.staff.length)} icon="Users" />
        <StatCard label="Plan limit" value={limitLabel(plan.limits.staff)} icon="ShieldCheck" hint={plan.name} />
        <StatCard
          label="Owners"
          value={String(merchant.staff.filter((s) => s.role === "owner").length)}
          icon="UserCog"
        />
        <StatCard
          label="Pending invites"
          value={String(merchant.staff.filter((s) => s.status === "invited").length)}
          icon="Mail"
        />
      </div>

      {!canAdd && (
        <Alert tone="warning" title="Staff limit reached">
          Your {plan.name} plan allows {plan.limits.staff} accounts. Upgrade to add more.
        </Alert>
      )}

      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Team</h2>
          <Button
            size="sm"
            leftIcon={<Plus className="size-4" />}
            disabled={!canAdd}
            onClick={() => setInviting(true)}
          >
            Invite
          </Button>
        </div>

        <ul className="divide-y divide-line">
          {merchant.staff.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{member.name}</p>
                <p className="truncate text-xs text-muted">
                  {member.email} · invited {formatDate(member.invitedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  aria-label={`Role for ${member.name}`}
                  value={member.role}
                  onChange={(e) => changeRole(member, e.target.value as MerchantRoleId)}
                  options={MERCHANT_ROLE_LIST.map((r) => ({ value: r.id, label: r.label }))}
                  wrapperClassName="w-48"
                />
                <Badge variant={member.status === "active" ? "success" : "neutral"}>
                  {STAFF_STATUS_LABELS[member.status]}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={updateStaff.isPending}
                  onClick={() => toggleStatus(member)}
                >
                  {member.status === "suspended" ? "Reactivate" : "Suspend"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Remove ${member.name}`}
                  onClick={() => setRemoving(member)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-card border border-line bg-surface p-5 shadow-card">
        <h2 className="mb-1 text-sm font-semibold text-ink">What each role can do</h2>
        <p className="mb-4 text-xs text-muted">
          Rendered from the same rules the platform enforces — a Front Desk account cannot reach
          payouts however it is invited.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="pb-2 font-medium">Capability</th>
                {MERCHANT_ROLE_LIST.map((role) => (
                  <th key={role.id} className="pb-2 text-center font-medium">
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MATRIX_CAPABILITIES.map((capability) => (
                <tr key={capability}>
                  <td className="py-2.5 text-body">{CAPABILITY_LABELS[capability]}</td>
                  {MERCHANT_ROLE_LIST.map((role) => (
                    <td key={role.id} className="py-2.5 text-center">
                      {merchantRoleCan(role.id, capability) ? (
                        <span className="text-success" aria-label="Allowed">
                          ✓
                        </span>
                      ) : (
                        <span className="text-muted" aria-label="Not allowed">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          {MERCHANT_CAPABILITIES.length} capabilities in total; the eight above are the ones that
          separate the roles.
        </p>
      </section>

      <Drawer open={inviting} onClose={() => setInviting(false)} size="md" title="Invite a team member">
        {inviting && <StaffForm merchant={merchant} onDone={() => setInviting(false)} />}
      </Drawer>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        loading={removeStaff.isPending}
        title="Remove team member?"
        message={
          <>
            <strong className="font-semibold text-ink">{removing?.name}</strong> will lose access to
            this merchant account.
          </>
        }
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!removing) return;
          try {
            await removeStaff.mutateAsync({ id: merchant.id, staffId: removing.id });
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

function StaffForm({ merchant, onDone }: { merchant: Merchant; onDone: () => void }) {
  const add = useAddStaff();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useZodForm(staffSchema, {
    defaultValues: { name: "", email: "", role: "reservations" as MerchantRoleId, propertyIds: [] },
  });

  const role = form.watch("role");

  const onSubmit = form.handleSubmit(async (values: StaffValues) => {
    setSubmitError(null);
    try {
      await add.mutateAsync({ id: merchant.id, input: values });
      toast.success("Invitation sent (demo — no email leaves the browser)");
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="px-1">
      {submitError && (
        <Alert tone="danger" title="Couldn't invite" className="mb-4">
          {submitError}
        </Alert>
      )}
      <FormSection title="Team member">
        <FormGrid cols={1}>
          <Input label="Full name" required {...form.register("name")} error={form.formState.errors.name?.message} />
          <Input
            label="Email"
            type="email"
            required
            {...form.register("email")}
            error={form.formState.errors.email?.message}
          />
          <Select
            label="Role"
            options={MERCHANT_ROLE_LIST.map((r) => ({ value: r.id, label: r.label }))}
            {...form.register("role")}
            error={form.formState.errors.role?.message}
          />
        </FormGrid>
        {role && (
          <div className="mt-3 rounded-field border border-line bg-surface-muted p-3">
            <p className="text-xs font-medium text-ink">{MERCHANT_ROLES[role].description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {MERCHANT_ROLES[role].capabilities.slice(0, 8).map((c) => (
                <Tag key={c} variant="soft">
                  {CAPABILITY_LABELS[c]}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </FormSection>
      <FormActions>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={add.isPending}>
          Send invite
        </Button>
      </FormActions>
    </form>
  );
}
