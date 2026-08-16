"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  FileText,
  Percent,
  RotateCcw,
  ShieldCheck,
  UserCog,
  XCircle,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "../../data";
import {
  BUSINESS_TYPE_LABELS,
  CHANNEL_PROVIDER_LABELS,
  CHANNEL_STATUS_LABELS,
  CHANNEL_STATUS_TONES,
  DOCUMENT_TYPE_LABELS,
  HEALTH_TIER_LABELS,
  HEALTH_TIER_TONES,
  MERCHANT_PLANS,
  MERCHANT_ROLES,
  PAYOUT_METHOD_LABELS,
  PAYOUT_SCHEDULE_LABELS,
  STAFF_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  VERTICAL_LABELS,
  type Merchant,
  type MerchantStatus,
} from "@/features/dashboard/domain";
import {
  Alert,
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
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import {
  useDecideBank,
  useDecideKyc,
  useMerchant,
  useMerchantPerformance,
  useOnboardingProgress,
  useReviewDocument,
  useSetCommission,
  useSetMerchantStatus,
} from "./hooks";
import { ImpersonationDialog } from "../../auth/impersonation-dialog";
import type { ImpersonationTarget } from "../../auth/impersonation";
import { merchantImpersonationTarget } from "./impersonate";
import { OnboardingChecklist } from "./onboarding-progress";
import { ReasonDialog } from "./review-dialogs";
import { BANK_STATUSES, DOCUMENT_STATUSES, KYC_STATUSES, MERCHANT_STATUSES } from "./types";

const merchantTone = toneMap(MERCHANT_STATUSES);
const merchantLabel = labelMap(MERCHANT_STATUSES);
const kycTone = toneMap(KYC_STATUSES);
const kycLabel = labelMap(KYC_STATUSES);
const docTone = toneMap(DOCUMENT_STATUSES);
const docLabel = labelMap(DOCUMENT_STATUSES);
const bankTone = toneMap(BANK_STATUSES);
const bankLabel = labelMap(BANK_STATUSES);

export function MerchantDetailView({ id }: { id: string }) {
  const { data, isLoading } = useMerchant(id);

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

/** Decisions that must carry a reason the merchant will read. */
const NEEDS_REASON: MerchantStatus[] = ["rejected", "action_required", "suspended"];

function MerchantDetailBody({ merchant }: { merchant: Merchant }) {
  const setStatus = useSetMerchantStatus();
  const setCommission = useSetCommission();
  const progress = useOnboardingProgress(merchant.id);
  const performance = useMerchantPerformance(merchant.id);
  const [overriding, setOverriding] = useState(false);
  const [reasonFor, setReasonFor] = useState<MerchantStatus | null>(null);
  const [impersonating, setImpersonating] = useState<ImpersonationTarget | null>(null);

  const move = async (status: MerchantStatus, note?: string) => {
    try {
      await setStatus.mutateAsync({ id: merchant.id, status, note });
      toast.success(`${merchant.name} → ${merchantLabel[status].toLowerCase()}`);
      setReasonFor(null);
    } catch (error) {
      toast.error("Couldn't update merchant", { description: getErrorMessage(error) });
    }
  };

  const request = (status: MerchantStatus) =>
    NEEDS_REASON.includes(status) ? setReasonFor(status) : void move(status);

  const inReview = merchant.status === "submitted" || merchant.status === "under_review";
  const plan = MERCHANT_PLANS[merchant.subscription.planId];

  const tabs: TabItem[] = [
    { key: "overview", label: "Overview", content: <OverviewTab merchant={merchant} /> },
    {
      key: "onboarding",
      label: "Onboarding",
      content: progress.data ? (
        <OnboardingChecklist progress={progress.data} interactive={false} title="Merchant progress" />
      ) : (
        <CardSkeleton />
      ),
    },
    { key: "kyc", label: "Verification", content: <KycTab merchant={merchant} /> },
    { key: "documents", label: "Documents", content: <DocumentsTab merchant={merchant} /> },
    { key: "contract", label: "Terms & payout", content: <ContractTab merchant={merchant} /> },
    { key: "properties", label: "Properties", content: <PropertiesTab merchant={merchant} /> },
    { key: "staff", label: "Staff", content: <StaffTab merchant={merchant} /> },
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

      {merchant.reviewNote && merchant.status !== "approved" && (
        <Alert
          tone={merchant.status === "rejected" || merchant.status === "suspended" ? "danger" : "warning"}
          title={`Last decision — ${merchantLabel[merchant.status]}`}
        >
          {merchant.reviewNote}
          {merchant.reviewedBy && (
            <span className="mt-1 block text-xs opacity-80">
              {merchant.reviewedBy}
              {merchant.reviewedAt ? ` · ${formatDateTime(merchant.reviewedAt)}` : ""}
            </span>
          )}
        </Alert>
      )}

      {/* Identity + review actions */}
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
              <Badge variant="neutral">{plan.name}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted">{merchant.email}</p>
            <p className="mt-1 text-xs text-muted">
              {merchant.legalName} · {merchant.city}, {merchant.country} · Applied{" "}
              {formatDate(merchant.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Can anyPermission={["merchants:approve"]}>
            {merchant.status === "submitted" && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<RotateCcw className="size-4" />}
                loading={setStatus.isPending}
                onClick={() => request("under_review")}
              >
                Start review
              </Button>
            )}
            {(inReview || merchant.status === "suspended") && (
              <Button
                size="sm"
                leftIcon={<CheckCircle2 className="size-4" />}
                loading={setStatus.isPending}
                onClick={() => request("approved")}
              >
                {merchant.status === "suspended" ? "Reinstate" : "Approve"}
              </Button>
            )}
            {inReview && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<RotateCcw className="size-4" />}
                  onClick={() => request("action_required")}
                >
                  Request changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<XCircle className="size-4" />}
                  onClick={() => request("rejected")}
                >
                  Reject
                </Button>
              </>
            )}
            {merchant.status === "approved" && (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Ban className="size-4" />}
                onClick={() => request("suspended")}
              >
                Suspend
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
          <Can anyPermission={["merchants:impersonate"]} featureFlag="impersonation">
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<UserCog className="size-4" />}
              onClick={() => setImpersonating(merchantImpersonationTarget(merchant))}
            >
              Impersonate
            </Button>
          </Can>
        </div>
      </div>

      {/* Health — derived from bookings and reviews, never stored */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Gross booking value"
          value={
            performance.data
              ? formatCurrency(performance.data.grossBookingValue, performance.data.currency)
              : "—"
          }
          icon="LineChart"
          hint={performance.data ? `${formatNumber(performance.data.bookings)} bookings` : undefined}
        />
        <StatCard
          label="Merchant earnings"
          value={
            performance.data
              ? formatCurrency(performance.data.netEarnings, performance.data.currency)
              : "—"
          }
          icon="Wallet"
          hint="Net of commission and refunds"
        />
        <StatCard
          label="Commission rate"
          value={formatPercent(merchant.commissionRate, { fromRatio: false })}
          icon="BadgePercent"
          hint={`${merchant.commissionBasis} basis`}
        />
        <StatCard
          label="Health score"
          value={performance.data ? `${Math.round(performance.data.healthScore)}/100` : "—"}
          icon="ShieldCheck"
          hint={performance.data ? HEALTH_TIER_LABELS[performance.data.tier] : undefined}
        />
      </div>

      <Tabs items={tabs} variant="underline" />

      {overriding && (
        <CommissionModal
          merchant={merchant}
          pending={setCommission.isPending}
          onClose={() => setOverriding(false)}
          onSave={async (rate) => {
            try {
              await setCommission.mutateAsync({ id: merchant.id, commissionRate: rate });
              setOverriding(false);
              toast.saved("Commission rate");
            } catch (error) {
              toast.error("Couldn't save", { description: getErrorMessage(error) });
            }
          }}
        />
      )}

      <ReasonDialog
        open={Boolean(reasonFor)}
        title={reasonFor ? `${merchantLabel[reasonFor]} — ${merchant.name}` : "Decision"}
        description="The merchant sees this note on their onboarding screen and in their notifications."
        confirmLabel={reasonFor ? merchantLabel[reasonFor] : "Confirm"}
        loading={setStatus.isPending}
        onClose={() => setReasonFor(null)}
        onConfirm={(note) => move(reasonFor!, note)}
      />

      <ImpersonationDialog
        target={impersonating}
        onClose={() => setImpersonating(null)}
      />
    </div>
  );
}

/* --------------------------------- Tabs ---------------------------------- */

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value || "—"}</dd>
    </div>
  );
}

function OverviewTab({ merchant }: { merchant: Merchant }) {
  const performance = useMerchantPerformance(merchant.id);
  const p = performance.data;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Business">
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Legal name" value={merchant.legalName} />
          <Field label="Business type" value={BUSINESS_TYPE_LABELS[merchant.businessType]} />
          <Field label="Registration no." value={<span className="font-mono">{merchant.registrationNo}</span>} />
          <Field label="Tax ID" value={<span className="font-mono">{merchant.taxId}</span>} />
          <Field label="Founded" value={merchant.foundedYear} />
          <Field
            label="Website"
            value={
              merchant.website ? (
                <a href={merchant.website} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  {merchant.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null
            }
          />
          <Field
            label="Address"
            value={`${merchant.addressLine}, ${merchant.city} ${merchant.postalCode}, ${merchant.country}`}
          />
          <Field
            label="Supplies"
            value={
              <span className="flex flex-wrap gap-1">
                {merchant.verticals.map((v) => (
                  <Tag key={v} variant="soft">
                    {VERTICAL_LABELS[v]}
                  </Tag>
                ))}
              </span>
            }
          />
        </dl>
        <p className="mt-4 text-sm text-body">{merchant.description}</p>
      </Card>

      <div className="flex flex-col gap-4">
        <Card title="Contact">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Primary contact" value={merchant.contactName} />
            <Field label="Role" value={merchant.contactRole} />
            <Field label="Email" value={merchant.email} />
            <Field label="Phone" value={merchant.phone} />
            <Field label="Support email" value={merchant.supportEmail} />
            <Field label="Support phone" value={merchant.supportPhone} />
          </dl>
        </Card>

        <Card title="Performance">
          {p ? (
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Bookings" value={formatNumber(p.bookings)} />
              <Field label="Average order value" value={formatCurrency(p.averageOrderValue, p.currency)} />
              <Field label="Cancellation rate" value={`${p.cancellationRate}%`} />
              <Field label="Review response rate" value={`${p.responseRate}%`} />
              <Field
                label="Review score"
                value={p.reviewCount ? `${p.reviewScore} / 5 (${p.reviewCount})` : "No reviews yet"}
              />
              <Field
                label="Health"
                value={
                  <StatusBadge tone={HEALTH_TIER_TONES[p.tier]}>{HEALTH_TIER_LABELS[p.tier]}</StatusBadge>
                }
              />
            </dl>
          ) : (
            <CardSkeleton />
          )}
          <p className="mt-4 text-xs text-muted">
            Derived from this merchant&apos;s bookings, reviews and onboarding completeness — demo
            data, not a production benchmark.
          </p>
        </Card>

        <Card title="Subscription">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Plan" value={MERCHANT_PLANS[merchant.subscription.planId].name} />
            <Field
              label="Status"
              value={SUBSCRIPTION_STATUS_LABELS[merchant.subscription.status]}
            />
            <Field
              label="Price"
              value={
                merchant.subscription.price > 0
                  ? `${formatCurrency(merchant.subscription.price, "USD")}/month`
                  : "Free"
              }
            />
            <Field label="Renews" value={formatDate(merchant.subscription.renewsAt)} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function KycTab({ merchant }: { merchant: Merchant }) {
  const decide = useDecideKyc();
  const [rejecting, setRejecting] = useState(false);
  const { kyc } = merchant;

  return (
    <Card
      title="Verification (KYC)"
      action={
        <Can anyPermission={["merchants:approve"]}>
          <div className="flex gap-2">
            {kyc.status !== "verified" && (
              <Button
                size="sm"
                loading={decide.isPending}
                onClick={async () => {
                  try {
                    await decide.mutateAsync({ id: merchant.id, status: "verified" });
                    toast.success("Verification recorded");
                  } catch (error) {
                    toast.error("Couldn't record", { description: getErrorMessage(error) });
                  }
                }}
              >
                Mark verified
              </Button>
            )}
            {kyc.status !== "rejected" && (
              <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
                Reject
              </Button>
            )}
          </div>
        </Can>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
        <StatusBadge tone={kycTone[kyc.status]}>{kycLabel[kyc.status]}</StatusBadge>
      </div>

      {kyc.rejectionReason && (
        <Alert tone="danger" title="Rejected" className="mb-4">
          {kyc.rejectionReason}
        </Alert>
      )}

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Field label="Legal name" value={kyc.legalName} />
        <Field label="Registration no." value={<span className="font-mono">{kyc.registrationNo}</span>} />
        <Field label="Tax ID" value={<span className="font-mono">{kyc.taxId}</span>} />
        <Field label="Submitted" value={kyc.submittedAt ? formatDate(kyc.submittedAt) : "—"} />
        <Field label="Reviewed" value={kyc.reviewedAt ? formatDate(kyc.reviewedAt) : "—"} />
        <Field label="Reviewer" value={kyc.reviewedBy} />
      </dl>

      <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        Beneficial owners
      </h3>
      {kyc.beneficialOwners.length === 0 ? (
        <p className="text-sm text-muted">None declared yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {kyc.beneficialOwners.map((owner) => (
            <li key={owner.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{owner.fullName}</p>
                <p className="text-xs text-muted">
                  {owner.role} · {owner.nationality} · ID {owner.idNumberMasked}
                </p>
              </div>
              <Badge variant="neutral">{owner.ownershipPercent}%</Badge>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-muted">
        This prototype performs no identity verification. A decision here is a recorded manual
        judgement, nothing more.
      </p>

      <ReasonDialog
        open={rejecting}
        title="Reject verification"
        confirmLabel="Reject"
        loading={decide.isPending}
        onClose={() => setRejecting(false)}
        onConfirm={async (reason) => {
          try {
            await decide.mutateAsync({ id: merchant.id, status: "rejected", reason });
            setRejecting(false);
          } catch (error) {
            toast.error("Couldn't record", { description: getErrorMessage(error) });
          }
        }}
      />
    </Card>
  );
}

function DocumentsTab({ merchant }: { merchant: Merchant }) {
  const review = useReviewDocument();
  const [rejecting, setRejecting] = useState<string | null>(null);

  return (
    <Card title="Documents">
      {merchant.documents.length === 0 ? (
        <p className="text-sm text-muted">No documents uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {merchant.documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{doc.label}</p>
                  <p className="text-xs text-muted">
                    <Tag variant="soft">{DOCUMENT_TYPE_LABELS[doc.type]}</Tag> ·{" "}
                    {formatNumber(doc.sizeKb)} KB · Uploaded {formatDate(doc.uploadedAt)}
                  </p>
                  {doc.rejectionReason && (
                    <p className="mt-1 text-xs font-medium text-danger">{doc.rejectionReason}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={docTone[doc.status]}>{docLabel[doc.status]}</StatusBadge>
                <Can anyPermission={["merchants:approve"]}>
                  {doc.status !== "approved" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={review.isPending}
                      onClick={() =>
                        void review
                          .mutateAsync({ id: merchant.id, documentId: doc.id, status: "approved" })
                          .catch((error) =>
                            toast.error("Couldn't approve", { description: getErrorMessage(error) }),
                          )
                      }
                    >
                      Approve
                    </Button>
                  )}
                  {doc.status !== "rejected" && (
                    <Button size="sm" variant="ghost" onClick={() => setRejecting(doc.id)}>
                      Reject
                    </Button>
                  )}
                </Can>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-muted">
        Documents are metadata only in this prototype — no file is stored and nothing is scanned or
        verified.
      </p>

      <ReasonDialog
        open={Boolean(rejecting)}
        title="Reject document"
        confirmLabel="Reject"
        loading={review.isPending}
        onClose={() => setRejecting(null)}
        onConfirm={async (reason) => {
          if (!rejecting) return;
          try {
            await review.mutateAsync({
              id: merchant.id,
              documentId: rejecting,
              status: "rejected",
              reason,
            });
            setRejecting(null);
          } catch (error) {
            toast.error("Couldn't reject", { description: getErrorMessage(error) });
          }
        }}
      />
    </Card>
  );
}

function ContractTab({ merchant }: { merchant: Merchant }) {
  const decideBank = useDecideBank();
  const [rejecting, setRejecting] = useState(false);
  const { contract, bank } = merchant;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Commercial terms">
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Agreement version" value={contract.version} />
          <Field
            label="Commission"
            value={`${formatPercent(contract.commissionRate, { fromRatio: false })} of ${contract.commissionBasis} sale`}
          />
          <Field label="Payout term" value={`${contract.payoutTermDays} days`} />
          <Field label="Notice period" value={`${contract.noticeDays} days`} />
          <Field
            label="Accepted"
            value={contract.acceptedAt ? formatDateTime(contract.acceptedAt) : "Not accepted"}
          />
          <Field label="Signatory" value={contract.acceptedBy} />
        </dl>
        <ul className="mt-4 space-y-2 text-xs text-muted">
          {contract.clauses.map((clause) => (
            <li key={clause} className="flex gap-2">
              <span aria-hidden="true">·</span>
              <span>{clause}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Payout details"
        action={
          bank && bank.status !== "verified" ? (
            <Can anyPermission={["merchants:approve", "finance:approve"]}>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  loading={decideBank.isPending}
                  onClick={() =>
                    void decideBank
                      .mutateAsync({ id: merchant.id, status: "verified" })
                      .catch((error) =>
                        toast.error("Couldn't verify", { description: getErrorMessage(error) }),
                      )
                  }
                >
                  Mark verified
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRejecting(true)}>
                  Reject
                </Button>
              </div>
            </Can>
          ) : null
        }
      >
        {!bank ? (
          <p className="text-sm text-muted">The merchant has not submitted payout details yet.</p>
        ) : (
          <>
            <div className="mb-4">
              <StatusBadge tone={bankTone[bank.status]}>{bankLabel[bank.status]}</StatusBadge>
            </div>
            {bank.rejectionReason && (
              <Alert tone="danger" title="Rejected" className="mb-4">
                {bank.rejectionReason}
              </Alert>
            )}
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Account holder" value={bank.accountHolder} />
              <Field label="Bank" value={bank.bankName} />
              <Field label="Account" value={<span className="font-mono">{bank.accountNumberMasked}</span>} />
              <Field label="IBAN" value={<span className="font-mono">{bank.iban}</span>} />
              <Field label="SWIFT" value={<span className="font-mono">{bank.swift}</span>} />
              <Field label="Method" value={PAYOUT_METHOD_LABELS[bank.method]} />
              <Field label="Schedule" value={PAYOUT_SCHEDULE_LABELS[bank.schedule]} />
              <Field label="Currency" value={bank.currency} />
            </dl>
          </>
        )}
        <p className="mt-4 text-xs text-muted">
          No banking verification is performed in this prototype; the account number is stored masked.
        </p>

        <ReasonDialog
          open={rejecting}
          title="Reject payout details"
          confirmLabel="Reject"
          loading={decideBank.isPending}
          onClose={() => setRejecting(false)}
          onConfirm={async (reason) => {
            try {
              await decideBank.mutateAsync({ id: merchant.id, status: "rejected", reason });
              setRejecting(false);
            } catch (error) {
              toast.error("Couldn't reject", { description: getErrorMessage(error) });
            }
          }}
        />
      </Card>
    </div>
  );
}

function PropertiesTab({ merchant }: { merchant: Merchant }) {
  return (
    <Card title={`Properties (${merchant.properties.length})`}>
      {merchant.properties.length === 0 ? (
        <p className="text-sm text-muted">No properties added yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {merchant.properties.map((property) => (
            <li key={property.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{property.name}</p>
                <p className="text-xs text-muted">
                  {VERTICAL_LABELS[property.vertical]} · {property.city}, {property.country} ·{" "}
                  {formatNumber(property.units)} units
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Tag variant="soft">{CHANNEL_PROVIDER_LABELS[property.channel.provider]}</Tag>
                <StatusBadge tone={CHANNEL_STATUS_TONES[property.channel.status]}>
                  {CHANNEL_STATUS_LABELS[property.channel.status]}
                </StatusBadge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StaffTab({ merchant }: { merchant: Merchant }) {
  return (
    <Card title={`Team (${merchant.staff.length})`}>
      <ul className="divide-y divide-line">
        {merchant.staff.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{member.name}</p>
              <p className="truncate text-xs text-muted">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Tag variant="soft">{MERCHANT_ROLES[member.role].label}</Tag>
              <Badge variant="neutral">{STAFF_STATUS_LABELS[member.status]}</Badge>
            </div>
          </li>
        ))}
      </ul>
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
  merchant: Merchant;
  pending: boolean;
  onClose: () => void;
  onSave: (rate: number) => void;
}) {
  // Percent in, percent out — the domain's single commission unit.
  const [percent, setPercent] = useState(String(merchant.commissionRate));
  const value = Number(percent);
  const valid = Number.isFinite(value) && value >= 0 && value <= 60;

  return (
    <Modal
      open
      onClose={onClose}
      title="Commission override"
      description={`Set the platform commission rate for ${merchant.name}. This rewrites their contract and prices every new booking.`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} disabled={!valid} onClick={() => onSave(value)}>
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
          max={60}
          step={0.5}
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          error={!valid ? "Enter a percentage between 0 and 60." : undefined}
          wrapperClassName="w-40"
        />
        <span className="pb-2.5 text-sm text-muted">%</span>
        <Badge variant="neutral" className="mb-2.5">
          Current {formatPercent(merchant.commissionRate, { fromRatio: false })}
        </Badge>
      </div>
    </Modal>
  );
}

/* ------------------------------- Skeletons ------------------------------- */

function CardSkeleton() {
  return <div className="h-40 animate-pulse rounded-card bg-surface-muted" />;
}

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
