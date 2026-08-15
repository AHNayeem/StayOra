"use client";

import { useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { toast } from "@/lib/toast";
import { BOOKING_VERTICALS, VERTICAL_LABELS, type BookingVertical } from "@/types/booking";
import {
  BUSINESS_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
  MERCHANT_DOCUMENT_TYPES,
  PAYOUT_METHODS,
  PAYOUT_METHOD_LABELS,
  PAYOUT_SCHEDULES,
  PAYOUT_SCHEDULE_LABELS,
  REQUIRED_DOCUMENT_TYPES,
  type Merchant,
  type MerchantDocumentType,
} from "@/features/dashboard/domain";
import { getErrorMessage } from "../../data";
import { applyServerErrors, useZodForm } from "../../forms";
import {
  Alert,
  Button,
  Checkbox,
  FormActions,
  FormGrid,
  FormSection,
  Input,
  Select,
  StatusBadge,
  Tag,
  Textarea,
} from "../../ui";
import { formatDate, formatNumber, formatPercent } from "../../lib/format";
import { labelMap, toneMap } from "../../lib/status";
import {
  bankDetailsSchema,
  businessProfileSchema,
  contactDetailsSchema,
  contractSchema,
  kycSchema,
  type BankDetailsValues,
  type BusinessProfileValues,
  type ContactDetailsValues,
  type ContractValues,
  type KycValues,
} from "../merchants/schemas";
import { DOCUMENT_STATUSES } from "../merchants/types";
import {
  useAcceptContract,
  useRemoveDocument,
  useSaveBankDetails,
  useSubmitKyc,
  useUpdateMerchantProfile,
  useUploadDocument,
} from "../merchants/hooks";

const docTone = toneMap(DOCUMENT_STATUSES);
const docLabel = labelMap(DOCUMENT_STATUSES);

const BUSINESS_TYPE_OPTIONS = Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/** Shared save/continue footer so every step behaves the same way. */
function StepActions({
  pending,
  onBack,
  label = "Save & continue",
}: {
  pending: boolean;
  onBack?: () => void;
  label?: string;
}) {
  return (
    <FormActions>
      {onBack && (
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
      )}
      <Button type="submit" size="sm" loading={pending}>
        {label}
      </Button>
    </FormActions>
  );
}

export interface StepProps {
  merchant: Merchant;
  onDone: () => void;
  onBack?: () => void;
  /** True once the application is with the platform — the form goes read-only. */
  locked: boolean;
}

function LockedNotice() {
  return (
    <Alert tone="info" title="Locked while under review" className="mb-4">
      Your application is with our team. You can look but not edit until we come back to you.
    </Alert>
  );
}

/* ----------------------------- 1. Business ------------------------------- */

export function BusinessStep({ merchant, onDone, locked }: StepProps) {
  const update = useUpdateMerchantProfile();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useZodForm(businessProfileSchema, {
    defaultValues: {
      name: merchant.name,
      legalName: merchant.legalName,
      businessType: merchant.businessType,
      registrationNo: merchant.registrationNo,
      taxId: merchant.taxId,
      foundedYear: merchant.foundedYear,
      website: merchant.website ?? "",
      description: merchant.description,
      addressLine: merchant.addressLine,
      city: merchant.city,
      country: merchant.country,
      postalCode: merchant.postalCode,
      verticals: merchant.verticals,
    },
  });

  const verticals = form.watch("verticals") ?? [];
  const toggle = (vertical: BookingVertical, on: boolean) =>
    form.setValue(
      "verticals",
      on ? [...verticals, vertical] : verticals.filter((v) => v !== vertical),
      { shouldValidate: form.formState.isSubmitted },
    );

  const onSubmit = form.handleSubmit(async (values: BusinessProfileValues) => {
    setSubmitError(null);
    try {
      await update.mutateAsync({
        id: merchant.id,
        input: { ...values, website: values.website || undefined },
      });
      toast.saved("Business profile");
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {locked && <LockedNotice />}
      {submitError && (
        <Alert tone="danger" title="Couldn't save" className="mb-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Legal entity" description="Exactly as it appears on your registration.">
        <FormGrid cols={2}>
          <Input label="Trading name" required disabled={locked} {...form.register("name")} error={form.formState.errors.name?.message} />
          <Input label="Registered legal name" required disabled={locked} {...form.register("legalName")} error={form.formState.errors.legalName?.message} />
          <Select label="Business type" disabled={locked} options={BUSINESS_TYPE_OPTIONS} {...form.register("businessType")} error={form.formState.errors.businessType?.message} />
          <Input label="Registration number" required disabled={locked} {...form.register("registrationNo")} error={form.formState.errors.registrationNo?.message} />
          <Input label="Tax / VAT number" required disabled={locked} {...form.register("taxId")} error={form.formState.errors.taxId?.message} />
          <Input label="Founded" type="number" disabled={locked} {...form.register("foundedYear")} error={form.formState.errors.foundedYear?.message} />
        </FormGrid>
      </FormSection>

      <FormSection title="Registered address">
        <FormGrid cols={2}>
          <Input label="Street address" required disabled={locked} {...form.register("addressLine")} error={form.formState.errors.addressLine?.message} />
          <Input label="City" required disabled={locked} {...form.register("city")} error={form.formState.errors.city?.message} />
          <Input label="Country" required disabled={locked} {...form.register("country")} error={form.formState.errors.country?.message} />
          <Input label="Postal code" required disabled={locked} {...form.register("postalCode")} error={form.formState.errors.postalCode?.message} />
          <Input label="Website" placeholder="https://" disabled={locked} {...form.register("website")} error={form.formState.errors.website?.message} />
        </FormGrid>
      </FormSection>

      <FormSection
        title="What you supply"
        description="This decides which listings you can create once you're approved."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {BOOKING_VERTICALS.map((vertical) => (
            <Checkbox
              key={vertical}
              label={VERTICAL_LABELS[vertical]}
              disabled={locked}
              checked={verticals.includes(vertical)}
              onChange={(e) => toggle(vertical, e.target.checked)}
            />
          ))}
        </div>
        {form.formState.errors.verticals?.message && (
          <p className="mt-2 text-xs font-medium text-danger">{form.formState.errors.verticals.message}</p>
        )}
      </FormSection>

      <FormSection title="About you" description="The first thing customers read about your business.">
        <Textarea
          label="Description"
          rows={4}
          required
          disabled={locked}
          {...form.register("description")}
          error={form.formState.errors.description?.message}
          hint="At least 40 characters."
        />
      </FormSection>

      {!locked && <StepActions pending={update.isPending} />}
    </form>
  );
}

/* ------------------------------ 2. Contact ------------------------------- */

export function ContactStep({ merchant, onDone, onBack, locked }: StepProps) {
  const update = useUpdateMerchantProfile();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useZodForm(contactDetailsSchema, {
    defaultValues: {
      contactName: merchant.contactName,
      contactRole: merchant.contactRole,
      email: merchant.email,
      phone: merchant.phone,
      supportEmail: merchant.supportEmail ?? "",
      supportPhone: merchant.supportPhone ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values: ContactDetailsValues) => {
    setSubmitError(null);
    try {
      await update.mutateAsync({
        id: merchant.id,
        input: {
          ...values,
          supportEmail: values.supportEmail || undefined,
          supportPhone: values.supportPhone || undefined,
        },
      });
      toast.saved("Contact details");
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {locked && <LockedNotice />}
      {submitError && (
        <Alert tone="danger" title="Couldn't save" className="mb-4">
          {submitError}
        </Alert>
      )}
      <FormSection title="Primary contact" description="Compliance and payout notices go here.">
        <FormGrid cols={2}>
          <Input label="Full name" required disabled={locked} {...form.register("contactName")} error={form.formState.errors.contactName?.message} />
          <Input label="Role" required disabled={locked} {...form.register("contactRole")} error={form.formState.errors.contactRole?.message} />
          <Input label="Email" type="email" required disabled={locked} {...form.register("email")} error={form.formState.errors.email?.message} />
          <Input label="Phone" required disabled={locked} {...form.register("phone")} error={form.formState.errors.phone?.message} />
        </FormGrid>
      </FormSection>
      <FormSection title="Guest support" description="Shown to travellers who need to reach you. Optional.">
        <FormGrid cols={2}>
          <Input label="Support email" type="email" disabled={locked} {...form.register("supportEmail")} error={form.formState.errors.supportEmail?.message} />
          <Input label="Support phone" disabled={locked} {...form.register("supportPhone")} error={form.formState.errors.supportPhone?.message} />
        </FormGrid>
      </FormSection>
      {!locked && <StepActions pending={update.isPending} onBack={onBack} />}
    </form>
  );
}

/* ----------------------------- 3. Documents ------------------------------ */

export function DocumentsStep({ merchant, onDone, onBack, locked }: StepProps) {
  const upload = useUploadDocument();
  const remove = useRemoveDocument();
  const [type, setType] = useState<MerchantDocumentType>("business_registration");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitUpload = async (replacesId?: string) => {
    if (!fileName.trim()) {
      setError("Enter a file name to simulate the upload.");
      return;
    }
    setError(null);
    try {
      await upload.mutateAsync({
        id: merchant.id,
        input: { type, fileName: fileName.trim(), replacesId },
      });
      setFileName("");
      toast.success("Document uploaded");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const outstanding = REQUIRED_DOCUMENT_TYPES.filter(
    (t) => !merchant.documents.some((d) => d.type === t && d.status === "approved"),
  );

  return (
    <div>
      {locked && <LockedNotice />}

      <Alert tone="info" title="Simulated uploads" className="mb-4">
        No file leaves your browser and nothing is scanned or verified. Naming a file records the
        document metadata a real upload pipeline would produce, so the review, rejection and
        re-upload flows work end to end.
      </Alert>

      {outstanding.length > 0 && (
        <Alert tone="warning" title="Still needed" className="mb-4">
          {outstanding.map((t) => DOCUMENT_TYPE_LABELS[t]).join(", ")}
        </Alert>
      )}

      {!locked && (
        <FormSection title="Upload a document">
          <FormGrid cols={2}>
            <Select
              label="Document type"
              value={type}
              onChange={(e) => setType(e.target.value as MerchantDocumentType)}
              options={MERCHANT_DOCUMENT_TYPES.map((t) => ({
                value: t,
                label: DOCUMENT_TYPE_LABELS[t],
              }))}
            />
            <Input
              label="File name"
              placeholder="business-registration.pdf"
              value={fileName}
              error={error ?? undefined}
              onChange={(e) => setFileName(e.target.value)}
            />
          </FormGrid>
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              leftIcon={<Upload className="size-4" />}
              loading={upload.isPending}
              onClick={() => void submitUpload()}
            >
              Upload
            </Button>
          </div>
        </FormSection>
      )}

      <FormSection title={`Uploaded (${merchant.documents.length})`}>
        {merchant.documents.length === 0 ? (
          <p className="text-sm text-muted">Nothing uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {merchant.documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{doc.fileName}</p>
                  <p className="text-xs text-muted">
                    <Tag variant="soft">{DOCUMENT_TYPE_LABELS[doc.type]}</Tag> ·{" "}
                    {formatNumber(doc.sizeKb)} KB · {formatDate(doc.uploadedAt)}
                  </p>
                  {doc.rejectionReason && (
                    <p className="mt-1 text-xs font-medium text-danger">{doc.rejectionReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={docTone[doc.status]}>{docLabel[doc.status]}</StatusBadge>
                  {doc.status === "rejected" && !locked && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setType(doc.type);
                        setFileName(`${doc.type}-v2.pdf`);
                        toast.info("Ready to re-upload", {
                          description: "Adjust the file name and upload the corrected document.",
                        });
                      }}
                    >
                      Replace
                    </Button>
                  )}
                  {!locked && doc.status !== "approved" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${doc.fileName}`}
                      loading={remove.isPending}
                      onClick={() =>
                        void remove
                          .mutateAsync({ id: merchant.id, documentId: doc.id })
                          .catch((err) =>
                            toast.error("Couldn't remove", { description: getErrorMessage(err) }),
                          )
                      }
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <FormActions>
        {onBack && (
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="button" size="sm" onClick={onDone}>
          Continue
        </Button>
      </FormActions>
    </div>
  );
}

/* -------------------------------- 4. KYC --------------------------------- */

const EMPTY_OWNER = {
  fullName: "",
  role: "Director",
  ownershipPercent: 100,
  nationality: "",
  idNumberMasked: "",
};

export function KycStep({ merchant, onDone, onBack, locked }: StepProps) {
  const submit = useSubmitKyc();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useZodForm(kycSchema, {
    defaultValues: {
      owners: merchant.kyc.beneficialOwners.length
        ? merchant.kyc.beneficialOwners.map((o) => ({
            fullName: o.fullName,
            role: o.role,
            ownershipPercent: o.ownershipPercent,
            nationality: o.nationality,
            idNumberMasked: o.idNumberMasked,
          }))
        : [EMPTY_OWNER],
    },
  });

  const owners = form.watch("owners") ?? [];
  const total = owners.reduce((n, o) => n + (Number(o.ownershipPercent) || 0), 0);

  const addOwner = () => form.setValue("owners", [...owners, { ...EMPTY_OWNER, ownershipPercent: 0 }]);
  const removeOwner = (index: number) =>
    form.setValue(
      "owners",
      owners.filter((_, i) => i !== index),
    );

  const onSubmit = form.handleSubmit(async (values: KycValues) => {
    setSubmitError(null);
    try {
      await submit.mutateAsync({ id: merchant.id, owners: values.owners });
      toast.success("Submitted for verification");
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {locked && <LockedNotice />}

      <Alert tone="info" title="No identity check is performed" className="mb-4">
        This prototype records what you declare and shows it to a reviewer. It does not run any
        identity, sanctions or document verification.
      </Alert>

      {merchant.kyc.rejectionReason && (
        <Alert tone="danger" title="Sent back by compliance" className="mb-4">
          {merchant.kyc.rejectionReason}
        </Alert>
      )}

      {submitError && (
        <Alert tone="danger" title="Couldn't submit" className="mb-4">
          {submitError}
        </Alert>
      )}

      <FormSection
        title="Beneficial owners"
        description={`Anyone who owns or controls the business. Declared so far: ${total}%.`}
      >
        <div className="flex flex-col gap-4">
          {owners.map((_, index) => (
            <div key={index} className="rounded-field border border-line p-4">
              <FormGrid cols={2}>
                <Input
                  label="Full name"
                  required
                  disabled={locked}
                  {...form.register(`owners.${index}.fullName` as const)}
                  error={form.formState.errors.owners?.[index]?.fullName?.message}
                />
                <Input
                  label="Role"
                  required
                  disabled={locked}
                  {...form.register(`owners.${index}.role` as const)}
                  error={form.formState.errors.owners?.[index]?.role?.message}
                />
                <Input
                  label="Ownership (%)"
                  type="number"
                  min={0}
                  max={100}
                  disabled={locked}
                  {...form.register(`owners.${index}.ownershipPercent` as const)}
                  error={form.formState.errors.owners?.[index]?.ownershipPercent?.message}
                />
                <Input
                  label="Nationality"
                  required
                  disabled={locked}
                  {...form.register(`owners.${index}.nationality` as const)}
                  error={form.formState.errors.owners?.[index]?.nationality?.message}
                />
                <Input
                  label="ID number (last digits)"
                  required
                  disabled={locked}
                  {...form.register(`owners.${index}.idNumberMasked` as const)}
                  error={form.formState.errors.owners?.[index]?.idNumberMasked?.message}
                  hint="Only the last few digits — never the full number."
                />
              </FormGrid>
              {owners.length > 1 && !locked && (
                <div className="mt-3">
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeOwner(index)}>
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        {form.formState.errors.owners?.message && (
          <p className="mt-2 text-xs font-medium text-danger">{form.formState.errors.owners.message}</p>
        )}
        {total > 100 && (
          <p className="mt-2 text-xs font-medium text-danger">
            Declared ownership adds up to {total}% — that cannot exceed 100%.
          </p>
        )}
        {!locked && (
          <div className="mt-3">
            <Button type="button" size="sm" variant="outline" onClick={addOwner}>
              Add another owner
            </Button>
          </div>
        )}
      </FormSection>

      {!locked && <StepActions pending={submit.isPending} onBack={onBack} label="Submit for verification" />}
    </form>
  );
}

/* ------------------------------ 5. Contract ------------------------------ */

export function ContractStep({ merchant, onDone, onBack, locked }: StepProps) {
  const accept = useAcceptContract();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { contract } = merchant;
  const alreadyAccepted = Boolean(contract.acceptedAt);

  const form = useZodForm(contractSchema, {
    defaultValues: { acceptedBy: merchant.contactName, accepted: false as unknown as true },
  });

  const onSubmit = form.handleSubmit(async (values: ContractValues) => {
    setSubmitError(null);
    try {
      await accept.mutateAsync({ id: merchant.id, acceptedBy: values.acceptedBy });
      toast.success("Agreement accepted");
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      {alreadyAccepted && (
        <Alert tone="success" title="Accepted" className="mb-4">
          {contract.acceptedBy} accepted version {contract.version} on{" "}
          {formatDate(contract.acceptedAt)}.
        </Alert>
      )}
      {submitError && (
        <Alert tone="danger" title="Couldn't accept" className="mb-4">
          {submitError}
        </Alert>
      )}

      <FormSection title={`Partner agreement ${contract.version}`}>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">Commission</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">
              {formatPercent(contract.commissionRate, { fromRatio: false })}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Charged on</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{contract.commissionBasis} sale</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Payout term</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{contract.payoutTermDays} days</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Notice period</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink">{contract.noticeDays} days</dd>
          </div>
        </dl>
        <ol className="mt-4 space-y-3 text-sm text-body">
          {contract.clauses.map((clause, i) => (
            <li key={clause} className="flex gap-3">
              <span className="shrink-0 font-mono text-xs text-muted">{i + 1}.</span>
              <span>{clause}</span>
            </li>
          ))}
        </ol>
      </FormSection>

      {!alreadyAccepted && !locked && (
        <>
          <FormSection title="Accept" description="Typing your name here stands in for an e-signature.">
            <FormGrid cols={2}>
              <Input
                label="Authorised signatory"
                required
                {...form.register("acceptedBy")}
                error={form.formState.errors.acceptedBy?.message}
              />
            </FormGrid>
            <div className="mt-3">
              <Checkbox
                label={`I accept the Otithee partner agreement ${contract.version} on behalf of ${merchant.legalName}.`}
                {...form.register("accepted")}
              />
              {form.formState.errors.accepted?.message && (
                <p className="mt-2 text-xs font-medium text-danger">
                  {form.formState.errors.accepted.message}
                </p>
              )}
            </div>
          </FormSection>
          <StepActions pending={accept.isPending} onBack={onBack} label="Accept agreement" />
        </>
      )}

      {(alreadyAccepted || locked) && (
        <FormActions>
          {onBack && (
            <Button type="button" variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
          <Button type="button" size="sm" onClick={onDone}>
            Continue
          </Button>
        </FormActions>
      )}
    </form>
  );
}

/* -------------------------------- 6. Bank -------------------------------- */

export function BankStep({ merchant, onDone, onBack, locked }: StepProps) {
  const save = useSaveBankDetails();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const bank = merchant.bank;

  const form = useZodForm(bankDetailsSchema, {
    defaultValues: {
      accountHolder: bank?.accountHolder ?? merchant.legalName,
      bankName: bank?.bankName ?? "",
      accountNumber: "",
      branch: bank?.branch ?? "",
      iban: bank?.iban ?? "",
      swift: bank?.swift ?? "",
      country: bank?.country ?? merchant.country,
      currency: bank?.currency ?? merchant.currency,
      method: bank?.method ?? "bank_transfer",
      schedule: bank?.schedule ?? "monthly",
    },
  });

  const onSubmit = form.handleSubmit(async (values: BankDetailsValues) => {
    setSubmitError(null);
    try {
      await save.mutateAsync({ id: merchant.id, input: values });
      toast.success("Payout details submitted");
      onDone();
    } catch (error) {
      if (!applyServerErrors(form.setError, error)) setSubmitError(getErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Alert tone="info" title="No bank verification happens here" className="mb-4">
        Only the last four digits are kept. A reviewer marks the account verified by hand; there is
        no payout provider behind this screen.
      </Alert>

      {bank?.rejectionReason && (
        <Alert tone="danger" title="Sent back" className="mb-4">
          {bank.rejectionReason}
        </Alert>
      )}
      {bank && bank.status === "verified" && (
        <Alert tone="success" title="Verified" className="mb-4">
          Settlements are paid to {bank.bankName} {bank.accountNumberMasked}.
        </Alert>
      )}
      {submitError && (
        <Alert tone="danger" title="Couldn't save" className="mb-4">
          {submitError}
        </Alert>
      )}

      <FormSection title="Account" description="The account your settlements are paid into.">
        <FormGrid cols={2}>
          <Input label="Account holder" required disabled={locked} {...form.register("accountHolder")} error={form.formState.errors.accountHolder?.message} />
          <Input label="Bank name" required disabled={locked} {...form.register("bankName")} error={form.formState.errors.bankName?.message} />
          <Input
            label="Account number"
            required
            disabled={locked}
            {...form.register("accountNumber")}
            error={form.formState.errors.accountNumber?.message}
            hint={bank ? `Currently ${bank.accountNumberMasked}. Re-enter to change it.` : "Only the last four digits are stored."}
          />
          <Input label="Branch" disabled={locked} {...form.register("branch")} error={form.formState.errors.branch?.message} />
          <Input label="IBAN" disabled={locked} {...form.register("iban")} error={form.formState.errors.iban?.message} />
          <Input label="SWIFT / BIC" disabled={locked} {...form.register("swift")} error={form.formState.errors.swift?.message} />
          <Input label="Bank country" required disabled={locked} {...form.register("country")} error={form.formState.errors.country?.message} />
          <Input label="Payout currency" required disabled={locked} {...form.register("currency")} error={form.formState.errors.currency?.message} />
        </FormGrid>
      </FormSection>

      <FormSection title="Schedule" description="How your settlements are sent.">
        <FormGrid cols={2}>
          <Select
            label="Payout method"
            disabled={locked}
            options={PAYOUT_METHODS.map((m) => ({ value: m, label: PAYOUT_METHOD_LABELS[m] }))}
            {...form.register("method")}
            error={form.formState.errors.method?.message}
          />
          <Select
            label="Payout schedule"
            disabled={locked}
            options={PAYOUT_SCHEDULES.map((s) => ({ value: s, label: PAYOUT_SCHEDULE_LABELS[s] }))}
            {...form.register("schedule")}
            error={form.formState.errors.schedule?.message}
          />
        </FormGrid>
      </FormSection>

      {!locked && <StepActions pending={save.isPending} onBack={onBack} label="Save payout details" />}
    </form>
  );
}
