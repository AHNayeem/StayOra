"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  MERCHANT_STATUS_LABELS,
  MERCHANT_STATUS_TONES,
  canSubmitApplication,
  catalogueProgress,
  type Merchant,
} from "@/features/dashboard/domain";
import { getErrorMessage } from "../../data";
import { Alert, Button, StatusBadge } from "../../ui";
import { EmptyState } from "../../components/state-views";
import { useRbac } from "../../rbac/rbac-provider";
import { formatDate } from "../../lib/format";
import {
  useMerchant,
  useMerchantCatalogue,
  useOnboardingProgress,
  useSubmitApplication,
} from "../merchants/hooks";
import { OnboardingChecklist } from "../merchants/onboarding-progress";
import { WIZARD_STEP_LIST, isWizardStep, type WizardStepId } from "./steps";
import {
  BankStep,
  BusinessStep,
  ContactStep,
  ContractStep,
  DocumentsStep,
  KycStep,
  type StepProps,
} from "./step-forms";

const STEP_COMPONENTS: Record<Exclude<WizardStepId, "review">, (props: StepProps) => React.ReactNode> = {
  business: BusinessStep,
  contact: ContactStep,
  documents: DocumentsStep,
  kyc: KycStep,
  contract: ContractStep,
  bank: BankStep,
};

/**
 * The merchant onboarding wizard.
 *
 * Step order lives in `steps.ts`, completion comes from the domain checklist,
 * and submission is validated by the service — the wizard itself holds no rules
 * of its own, so what it shows and what the platform enforces cannot diverge.
 */
export function MerchantOnboardingView() {
  const { user } = useRbac();
  const merchantId = user.merchantId;

  if (!merchantId) {
    return (
      <EmptyState
        title="No merchant account"
        description="Onboarding is for merchant principals. Sign in as a merchant to see this."
        action={
          <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
            Back to dashboard
          </Link>
        }
      />
    );
  }
  return <OnboardingBody merchantId={merchantId} />;
}

function OnboardingBody({ merchantId }: { merchantId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const merchantQuery = useMerchant(merchantId);
  const catalogue = useMerchantCatalogue(merchantId);
  const progressQuery = useOnboardingProgress(merchantId);
  const submit = useSubmitApplication();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stepParam = params.get("step");
  const step: WizardStepId = isWizardStep(stepParam) ? stepParam : "business";

  const goto = useCallback(
    (next: WizardStepId) => {
      router.replace(`${pathname}?step=${next}`, { scroll: true });
    },
    [pathname, router],
  );

  const merchant = merchantQuery.data;
  const progress = progressQuery.data;

  const index = WIZARD_STEP_LIST.findIndex((s) => s.id === step);
  const current = WIZARD_STEP_LIST[index];

  const submission = useMemo(
    () =>
      merchant
        ? canSubmitApplication(merchant, catalogueProgress(catalogue.data ?? []))
        : { ok: false, problems: [] },
    [merchant, catalogue.data],
  );

  if (merchantQuery.isLoading && !merchant) return <WizardSkeleton />;
  if (!merchant) {
    return (
      <EmptyState
        title="Merchant not found"
        description="This merchant account could not be loaded."
      />
    );
  }

  // Everything is read-only once the application is with the platform.
  const locked = merchant.status === "submitted" || merchant.status === "under_review";
  const StepComponent = step === "review" ? null : STEP_COMPONENTS[step];

  const runSubmit = async () => {
    setSubmitError(null);
    try {
      await submit.mutateAsync(merchantId);
      toast.success("Application submitted", {
        description: "We'll come back to you once it has been reviewed.",
      });
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <StatusBanner merchant={merchant} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-4">
          {/* Step rail */}
          <nav aria-label="Onboarding steps" className="rounded-card border border-line bg-surface p-2 shadow-card">
            <ol className="flex flex-wrap gap-1">
              {WIZARD_STEP_LIST.map((s, i) => {
                const item = s.checklistId
                  ? progress?.items.find((c) => c.id === s.checklistId)
                  : undefined;
                const done = item?.state === "complete";
                const active = s.id === step;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goto(s.id)}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-field px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-white"
                          : "text-muted hover:bg-surface-muted hover:text-ink",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-5 place-items-center rounded-full text-[11px]",
                          active
                            ? "bg-white/20 text-white"
                            : done
                              ? "bg-success/15 text-success"
                              : "bg-surface-muted text-muted",
                        )}
                      >
                        {done ? <Check className="size-3" aria-hidden="true" /> : i + 1}
                      </span>
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <header className="mb-5">
              <h2 className="text-base font-semibold text-ink">{current.title}</h2>
              <p className="mt-0.5 text-sm text-muted">{current.description}</p>
            </header>

            {StepComponent ? (
              <StepComponent
                merchant={merchant}
                locked={locked}
                onBack={index > 0 ? () => goto(WIZARD_STEP_LIST[index - 1].id) : undefined}
                onDone={() => goto(WIZARD_STEP_LIST[Math.min(index + 1, WIZARD_STEP_LIST.length - 1)].id)}
              />
            ) : (
              <ReviewStep
                merchant={merchant}
                problems={submission.problems}
                canSubmit={submission.ok}
                pending={submit.isPending}
                error={submitError}
                onBack={() => goto(WIZARD_STEP_LIST[index - 1].id)}
                onSubmit={runSubmit}
              />
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          {progress ? (
            <OnboardingChecklist progress={progress} />
          ) : (
            <div className="h-96 animate-pulse rounded-card bg-surface-muted" />
          )}
          {progress?.nextAction && (
            <Alert tone="info" title="Next up">
              {progress.nextAction.label} — {progress.nextAction.description}
            </Alert>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatusBanner({ merchant }: { merchant: Merchant }) {
  const tone = MERCHANT_STATUS_TONES[merchant.status];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={tone}>{MERCHANT_STATUS_LABELS[merchant.status]}</StatusBadge>
        <span className="text-sm text-muted">
          {merchant.status === "approved"
            ? `Approved ${formatDate(merchant.approvedAt)} — you can create and publish listings.`
            : merchant.status === "submitted" || merchant.status === "under_review"
              ? `Submitted ${formatDate(merchant.submittedAt)} — with our review team.`
              : merchant.status === "action_required"
                ? "We need a few corrections before we can continue."
                : merchant.status === "rejected"
                  ? "This application was not approved."
                  : merchant.status === "suspended"
                    ? "This account is suspended."
                    : "Finish the checklist to submit your application."}
        </span>
      </div>
      {merchant.status === "approved" && (
        <Link href="/dashboard/catalog/approvals" className="text-sm font-medium text-primary hover:underline">
          Manage your listings
        </Link>
      )}
    </div>
  );
}

function ReviewStep({
  merchant,
  problems,
  canSubmit,
  pending,
  error,
  onBack,
  onSubmit,
}: {
  merchant: Merchant;
  problems: string[];
  canSubmit: boolean;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const submitted = merchant.status === "submitted" || merchant.status === "under_review";

  return (
    <div className="flex flex-col gap-4">
      {merchant.reviewNote && (merchant.status === "action_required" || merchant.status === "rejected") && (
        <Alert
          tone={merchant.status === "rejected" ? "danger" : "warning"}
          title={merchant.status === "rejected" ? "Application rejected" : "Changes requested"}
        >
          {merchant.reviewNote}
        </Alert>
      )}

      {submitted ? (
        <Alert tone="info" title="Submitted">
          Your application is with our team. We&apos;ll email {merchant.email} as soon as there is a
          decision.
        </Alert>
      ) : problems.length > 0 ? (
        <Alert tone="warning" title="Not ready yet">
          <ul className="mt-1 space-y-1">
            {problems.map((p) => (
              <li key={p}>· {p}</li>
            ))}
          </ul>
        </Alert>
      ) : (
        <Alert tone="success" title="Ready to submit">
          Everything required is complete. Submitting locks your details while we review them.
        </Alert>
      )}

      {error && (
        <Alert tone="danger" title="Couldn't submit">
          {error}
        </Alert>
      )}

      <dl className="grid gap-4 sm:grid-cols-2">
        <Summary label="Legal entity" value={merchant.legalName} />
        <Summary label="Registration" value={merchant.registrationNo} />
        <Summary label="Tax ID" value={merchant.taxId} />
        <Summary label="Primary contact" value={`${merchant.contactName} · ${merchant.email}`} />
        <Summary label="Documents" value={`${merchant.documents.length} uploaded`} />
        <Summary
          label="Agreement"
          value={
            merchant.contract.acceptedAt
              ? `Accepted ${formatDate(merchant.contract.acceptedAt)}`
              : "Not accepted"
          }
        />
        <Summary
          label="Payout account"
          value={merchant.bank ? `${merchant.bank.bankName} ${merchant.bank.accountNumberMasked}` : "Not provided"}
        />
        <Summary label="Commission" value={`${merchant.contract.commissionRate}%`} />
      </dl>

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button
          size="sm"
          leftIcon={<Send className="size-4" />}
          loading={pending}
          disabled={!canSubmit || submitted}
          onClick={onSubmit}
        >
          {submitted ? "Submitted" : "Submit application"}
        </Button>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-field border border-line px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{value || "—"}</dd>
    </div>
  );
}

function WizardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" aria-busy="true">
      <div className="flex flex-col gap-4">
        <div className="h-14 animate-pulse rounded-card bg-surface-muted" />
        <div className="h-96 animate-pulse rounded-card bg-surface-muted" />
      </div>
      <div className="h-96 animate-pulse rounded-card bg-surface-muted" />
    </div>
  );
}
