"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, UserRound, Users } from "lucide-react";
import type { SavedTraveler } from "@/types/traveler";
import {
  addTraveler,
  removeTraveler,
  updateTraveler,
  useSavedTravelers,
} from "@/features/account/travelers-store";
import { COUNTRIES, findCountry } from "@/constants/geo";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/lib/toast";

type Editing = SavedTraveler | "new" | null;

const RELATIONSHIPS = ["Self", "Spouse", "Partner", "Child", "Parent", "Friend", "Colleague"];

export default function TravelersPage() {
  const travelers = useSavedTravelers();
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <div>
      <AccountPageHeader
        title="Saved travelers"
        description="Store companion details once and reuse them at checkout."
        actions={
          <Button variant="primary" size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden="true" />
            Add traveler
          </Button>
        }
      />

      {travelers.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {travelers.map((t) => (
            <TravelerCard
              key={t.id}
              traveler={t}
              onEdit={() => setEditing(t)}
              onRemove={() => {
                removeTraveler(t.id);
                toast.success("Traveler removed");
              }}
            />
          ))}
        </div>
      ) : (
        <AccountEmpty
          icon={Users}
          title="No saved travelers"
          description="Add the people you travel with to make booking faster."
          action={
            <Button variant="primary" size="sm" onClick={() => setEditing("new")}>
              <Plus className="size-4" aria-hidden="true" />
              Add traveler
            </Button>
          }
        />
      )}

      {editing && (
        <TravelerModal
          traveler={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TravelerCard({
  traveler,
  onEdit,
  onRemove,
}: {
  traveler: SavedTraveler;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const country = traveler.nationality ? findCountry(traveler.nationality) : undefined;
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-primary-50 text-primary">
            <UserRound className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <span className="truncate">{traveler.fullName}</span>
              {traveler.isPrimary && (
                <span className="rounded-pill bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary">
                  Primary
                </span>
              )}
            </p>
            <p className="text-sm text-muted">{traveler.relationship}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit traveler"
            className="grid size-8 place-items-center rounded-field text-muted hover:bg-surface-muted hover:text-primary"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          {!traveler.isPrimary && (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove traveler"
              className="grid size-8 place-items-center rounded-field text-muted hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-sm">
        {traveler.email && <Info label="Email">{traveler.email}</Info>}
        {traveler.phone && <Info label="Phone">{traveler.phone}</Info>}
        {country && <Info label="Nationality">{country.flag} {country.name}</Info>}
        {traveler.dateOfBirth && <Info label="Date of birth">{traveler.dateOfBirth}</Info>}
        {traveler.passportNumber && <Info label="Passport">{traveler.passportNumber}</Info>}
        {traveler.passportExpiry && <Info label="Passport expiry">{traveler.passportExpiry}</Info>}
      </dl>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="truncate font-medium text-ink">{children}</dd>
    </div>
  );
}

function TravelerModal({
  traveler,
  onClose,
}: {
  traveler: SavedTraveler | null;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    fullName: traveler?.fullName ?? "",
    relationship: traveler?.relationship ?? "Friend",
    email: traveler?.email ?? "",
    phone: traveler?.phone ?? "",
    nationality: traveler?.nationality ?? "",
    dateOfBirth: traveler?.dateOfBirth ?? "",
    passportNumber: traveler?.passportNumber ?? "",
    passportExpiry: traveler?.passportExpiry ?? "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSubmit = form.fullName.trim().length > 1;

  const onSubmit = () => {
    if (!canSubmit) return;
    const payload = {
      fullName: form.fullName.trim(),
      relationship: form.relationship,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      nationality: form.nationality || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      passportNumber: form.passportNumber.trim() || undefined,
      passportExpiry: form.passportExpiry || undefined,
    };
    if (traveler) {
      updateTraveler(traveler.id, payload);
      toast.success("Traveler updated");
    } else {
      addTraveler({ id: `trv_${Date.now().toString(36)}`, isPrimary: false, ...payload });
      toast.success("Traveler added");
    }
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={traveler ? "Edit traveler" : "Add traveler"}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={!canSubmit}>
            {traveler ? "Save changes" : "Add traveler"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="t-name">
          <input id="t-name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Relationship" htmlFor="t-rel">
          <select id="t-rel" value={form.relationship} onChange={(e) => set("relationship", e.target.value)} className={inputClass}>
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Email" htmlFor="t-email">
          <input id="t-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="t-phone">
          <input id="t-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Nationality" htmlFor="t-nat">
          <select id="t-nat" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} className={inputClass}>
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date of birth" htmlFor="t-dob">
          <input id="t-dob" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Passport number" htmlFor="t-pass">
          <input id="t-pass" value={form.passportNumber} onChange={(e) => set("passportNumber", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Passport expiry" htmlFor="t-passx">
          <input id="t-passx" type="date" value={form.passportExpiry} onChange={(e) => set("passportExpiry", e.target.value)} className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
}

const inputClass =
  "h-11 w-full rounded-field border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}
