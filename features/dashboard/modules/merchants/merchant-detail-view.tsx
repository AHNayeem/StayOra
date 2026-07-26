"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Percent,
  ShieldCheck,
  UserCog,
  XCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  Badge,
  Button,
  Input,
  Modal,
  StatCard,
  StatusBadge,
  Tabs,
  Tag,
  type TabItem,
} from "../../ui";
import { Can } from "../../rbac/permission-guard";
import { EmptyState } from "../../components/state-views";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "../../lib/format";
import { labelMap, toneMap, type StatusDef } from "../../lib/status";
import { useMerchantDetail, useSetMerchantStatus, useUpdateMerchant } from "./hooks";
import { MERCHANT_STATUSES, type MerchantStatus } from "./types";
import type {
  DocumentStatus,
  KycStatus,
  MerchantDetail,
  SettlementStatus,
} from "./detail";

const merchantTone = toneMap(MERCHANT_STATUSES);
const merchantLabel = labelMap(MERCHANT_STATUSES);

const KYC_STATUSES: readonly StatusDef<KycStatus>[] = [
  { value: "verified", label: "Verified", tone: "success" },
  { value: "pending", label: "Pending review", tone: "warning" },
  { value: "rejected", label: "Rejected", tone: "danger" },
  { value: "unsubmitted", label: "Not submitted", tone: "neutral" },
];
const kycTone = toneMap(KYC_STATUSES);
const kycLabel = labelMap(KYC_STATUSES);

const DOC_STATUSES: readonly StatusDef<DocumentStatus>[] = [
  { value: "approved", label: "Approved", tone: "success" },
  { value: "pending", label: "Pending", tone: "warning" },
  { value: "rejected", label: "Rejected", tone: "danger" },
];
const docTone = toneMap(DOC_STATUSES);
const docLabel = labelMap(DOC_STATUSES);

const SETTLEMENT_STATUSES: readonly StatusDef<SettlementStatus>[] = [
  { value: "paid", label: "Paid", tone: "success" },
  { value: "processing", label: "Processing", tone: "warning" },
  { value: "scheduled", label: "Scheduled", tone: "neutral" },
];
const settlementTone = toneMap(SETTLEMENT_STATUSES);
const settlementLabel = labelMap(SETTLEMENT_STATUSES);

export function MerchantDetailView({ id }: { id: string }) {
  const { data, isLoading } = useMerchantDetail(id);

  if (isLoading && !data) return <DetailSkeleton />;
  if (!data) {
    return (
      <EmptyState
        title="Merchant not found"
        description="This merchant may have been removed."
        action={
          <Link href="/dashboard/merchants" className="text-sm font-medium text-primary hover:underline">
            Back to merchants
          </Link>
        }
      />
    );
  }

  return <MerchantDetailBody merchant={data} />;
}

function MerchantDetailBody({ merchant }: { merchant: MerchantDetail }) {
  const setStatus = useSetMerchantStatus();
  const updateMerchant = useUpdateMerchant();
  const [overriding, setOverriding] = useState(false);

  const changeStatus = async (status: MerchantStatus, verb: string) => {
    await setStatus.mutateAsync({ id: merchant.id, status });
    toast.success(`${merchant.name} ${verb}`);
  };

  const impersonate = () =>
    toast.info("Impersonation session started", {
      description: `You're now viewing the platform as ${merchant.name} (demo).`,
    });

  const tabs: TabItem[] = [
    { key: "overview", label: "Overview", content: <OverviewTab merchant={merchant} /> },
    { key: "kyc", label: "KYC", content: <KycTab merchant={merchant} /> },
    { key: "documents", label: "Documents", content: <DocumentsTab merchant={merchant} /> },
    { key: "wallet", label: "Wallet", content: <WalletTab merchant={merchant} /> },
    { key: "settlement", label: "Settlement", content: <SettlementTab merchant={merchant} /> },
    { key: "audit", label: "Audit", content: <AuditTab merchant={merchant} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/merchants"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Merchants
        </Link>
      </div>

      {/* Identity + actions */}
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-field bg-primary-50 text-lg font-bold text-primary">
            {merchant.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-ink">{merchant.name}</h1>
              <StatusBadge tone={merchantTone[merchant.status]}>
                {merchantLabel[merchant.status]}
              </StatusBadge>
            </div>
            <p className="mt-0.5 text-sm text-muted">{merchant.email}</p>
            <p className="mt-1 text-xs text-muted">
              {merchant.category} · {merchant.country} · Joined {formatDate(merchant.joinedAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Can anyPermission={["merchants:approve"]}>
            {(merchant.status === "pending" || merchant.status === "rejected") && (
              <Button
                size="sm"
                leftIcon={<CheckCircle2 className="size-4" />}
                loading={setStatus.isPending}
                onClick={() => changeStatus("active", "approved")}
              >
                Approve
              </Button>
            )}
            {merchant.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<XCircle className="size-4" />}
                loading={setStatus.isPending}
                onClick={() => changeStatus("rejected", "rejected")}
              >
                Reject
              </Button>
            )}
            {merchant.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Ban className="size-4" />}
                loading={setStatus.isPending}
                onClick={() => changeStatus("suspended", "suspended")}
              >
                Suspend
              </Button>
            )}
            {merchant.status === "suspended" && (
              <Button
                size="sm"
                leftIcon={<CheckCircle2 className="size-4" />}
                loading={setStatus.isPending}
                onClick={() => changeStatus("active", "reactivated")}
              >
                Activate
              </Button>
            )}
          </Can>
          <Can anyPermission={["merchants:update"]}>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Percent className="size-4" />}
              onClick={() => setOverriding(true)}
            >
              Commission
            </Button>
          </Can>
          <Can anyPermission={["merchants:impersonate"]}>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<UserCog className="size-4" />}
              onClick={impersonate}
            >
              Impersonate
            </Button>
          </Can>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Wallet balance"
          value={formatCurrency(merchant.wallet.balance, merchant.currency)}
          icon="Wallet"
          hint={`${formatCurrency(merchant.wallet.pending, merchant.currency)} pending`}
        />
        <StatCard
          label="Lifetime earnings"
          value={formatCurrency(merchant.wallet.lifetimeEarnings, merchant.currency)}
          icon="LineChart"
        />
        <StatCard
          label="Commission rate"
          value={formatPercent(merchant.commissionRate)}
          icon="BadgePercent"
        />
        <StatCard
          label="Properties"
          value={formatNumber(merchant.properties)}
          icon="Boxes"
        />
      </div>

      <Tabs items={tabs} variant="underline" />

      {overriding && (
        <CommissionModal
          merchant={merchant}
          pending={updateMerchant.isPending}
          onClose={() => setOverriding(false)}
          onSave={async (rate) => {
            await updateMerchant.mutateAsync({ id: merchant.id, input: { commissionRate: rate } });
            setOverriding(false);
            toast.saved("Commission rate");
          }}
        />
      )}
    </div>
  );
}

/* --------------------------------- Tabs ---------------------------------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function OverviewTab({ merchant }: { merchant: MerchantDetail }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Business">
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Legal name" value={merchant.kyc.legalName} />
          <Field label="Category" value={merchant.category} />
          <Field label="Country" value={merchant.country} />
          <Field label="Contact" value={merchant.contactName} />
          <Field label="Email" value={merchant.email} />
          <Field label="Currency" value={merchant.currency} />
        </dl>
      </Card>
      <Card title="Compliance & performance">
        <dl className="grid grid-cols-2 gap-4">
          <Field
            label="KYC status"
            value={<StatusBadge tone={kycTone[merchant.kyc.status]}>{kycLabel[merchant.kyc.status]}</StatusBadge>}
          />
          <Field label="Revenue (all time)" value={formatCurrency(merchant.revenue, merchant.currency)} />
          <Field label="Commission" value={formatPercent(merchant.commissionRate)} />
          <Field label="Properties" value={formatNumber(merchant.properties)} />
          <Field label="Last payout" value={formatDate(merchant.wallet.lastPayoutAt)} />
          <Field label="Member since" value={formatDate(merchant.joinedAt)} />
        </dl>
      </Card>
    </div>
  );
}

function KycTab({ merchant }: { merchant: MerchantDetail }) {
  const { kyc } = merchant;
  return (
    <Card title="Know Your Customer">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
        <StatusBadge tone={kycTone[kyc.status]}>{kycLabel[kyc.status]}</StatusBadge>
      </div>
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Field label="Legal name" value={kyc.legalName} />
        <Field label="Registration no." value={<span className="font-mono">{kyc.registrationNo}</span>} />
        <Field label="Tax ID" value={<span className="font-mono">{kyc.taxId}</span>} />
        <Field label="Submitted" value={formatDate(kyc.submittedAt)} />
        <Field label="Reviewed" value={kyc.reviewedAt ? formatDate(kyc.reviewedAt) : "—"} />
        <Field label="Reviewer" value={kyc.reviewer ?? "—"} />
      </dl>
    </Card>
  );
}

function DocumentsTab({ merchant }: { merchant: MerchantDetail }) {
  return (
    <Card title="Documents">
      <ul className="divide-y divide-line">
        {merchant.documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{doc.name}</p>
              <p className="text-xs text-muted">
                <Tag variant="soft">{doc.category}</Tag> · {formatNumber(doc.sizeKb)} KB · Uploaded {formatDate(doc.uploadedAt)}
              </p>
            </div>
            <StatusBadge tone={docTone[doc.status]}>{docLabel[doc.status]}</StatusBadge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function WalletTab({ merchant }: { merchant: MerchantDetail }) {
  const { wallet } = merchant;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Available balance">
        <p className="text-2xl font-bold text-ink">{formatCurrency(wallet.balance, wallet.currency)}</p>
        <p className="mt-1 text-xs text-muted">Withdrawable now</p>
      </Card>
      <Card title="Pending (escrow)">
        <p className="text-2xl font-bold text-ink">{formatCurrency(wallet.pending, wallet.currency)}</p>
        <p className="mt-1 text-xs text-muted">Releases on settlement</p>
      </Card>
      <Card title="Lifetime earnings">
        <p className="text-2xl font-bold text-ink">{formatCurrency(wallet.lifetimeEarnings, wallet.currency)}</p>
        <p className="mt-1 text-xs text-muted">Last payout {formatDate(wallet.lastPayoutAt)}</p>
      </Card>
    </div>
  );
}

function SettlementTab({ merchant }: { merchant: MerchantDetail }) {
  return (
    <Card title="Settlement history">
      <div className="overflow-x-auto">
        <table className="w-full min-w-2xl text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="pb-2 font-medium">Period</th>
              <th className="pb-2 text-right font-medium">Gross</th>
              <th className="pb-2 text-right font-medium">Commission</th>
              <th className="pb-2 text-right font-medium">Net payout</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Settled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {merchant.settlements.map((s) => (
              <tr key={s.id}>
                <td className="py-3 font-medium text-ink">{s.period}</td>
                <td className="py-3 text-right tabular-nums text-body">{formatCurrency(s.gross, merchant.currency)}</td>
                <td className="py-3 text-right tabular-nums text-body">−{formatCurrency(s.commission, merchant.currency)}</td>
                <td className="py-3 text-right font-medium tabular-nums text-ink">{formatCurrency(s.net, merchant.currency)}</td>
                <td className="py-3">
                  <StatusBadge tone={settlementTone[s.status]}>{settlementLabel[s.status]}</StatusBadge>
                </td>
                <td className="py-3 text-muted">{formatDate(s.settledAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AuditTab({ merchant }: { merchant: MerchantDetail }) {
  const entries = [...merchant.audit].sort((a, z) => (a.at < z.at ? 1 : -1));
  return (
    <Card title="Activity log">
      <ol className="relative space-y-4 border-l border-line pl-5">
        {entries.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[1.4rem] top-1 size-2.5 rounded-full bg-primary ring-4 ring-surface" />
            <p className="text-sm font-medium text-ink">{e.action}</p>
            <p className="text-xs text-muted">
              {e.actor} · {formatDateTime(e.at)}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

/* ------------------------------ Commission ------------------------------- */

function CommissionModal({
  merchant,
  pending,
  onClose,
  onSave,
}: {
  merchant: MerchantDetail;
  pending: boolean;
  onClose: () => void;
  onSave: (rate: number) => void;
}) {
  const [percent, setPercent] = useState((merchant.commissionRate * 100).toFixed(1));
  const value = Number(percent);
  const valid = Number.isFinite(value) && value >= 0 && value <= 100;

  return (
    <Modal
      open
      onClose={onClose}
      title="Commission override"
      description={`Set the platform commission rate for ${merchant.name}.`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} disabled={!valid} onClick={() => onSave(value / 100)}>
            Save rate
          </Button>
        </div>
      }
    >
      <div className="flex items-end gap-3">
        <Input
          label="Commission rate"
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          wrapperClassName="w-40"
        />
        <span className="pb-2.5 text-sm text-muted">%</span>
        <Badge variant="neutral" className="mb-2.5">
          Current {formatPercent(merchant.commissionRate)}
        </Badge>
      </div>
    </Modal>
  );
}

/* ------------------------------- Skeleton -------------------------------- */

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="h-5 w-28 animate-pulse rounded bg-surface-muted" />
      <div className="h-24 animate-pulse rounded-card bg-surface-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-card bg-surface-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-card bg-surface-muted" />
    </div>
  );
}
