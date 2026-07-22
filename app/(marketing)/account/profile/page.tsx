"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, MailWarning } from "lucide-react";
import { useAuth } from "@/features/auth";
import { COUNTRIES } from "@/constants/geo";
import { AuthError } from "@/services/auth";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

/**
 * Profile — edit the traveler's personal details. Writes through
 * {@link useAuth}'s `updateProfile`, which persists to the client session, so
 * changes reflect immediately across the site (header, account hero).
 */
export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [country, setCountry] = useState(user?.country ?? "");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const dirty =
    name.trim() !== user.name ||
    (phone.trim() || "") !== (user.phone ?? "") ||
    (country || "") !== (user.country ?? "");

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
        country: country || undefined,
        profileComplete: true,
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof AuthError ? err.message : "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AccountPageHeader
        title="Profile"
        description="Your personal details, used to speed up checkout and personalise your trips."
      />

      <form onSubmit={onSave} className="max-w-2xl space-y-6">
        {/* Identity */}
        <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
          <Avatar src={user.avatar} name={user.name} size="xl" />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-ink">{user.name}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted">
              {user.email}
              {user.emailVerified ? (
                <BadgeCheck className="size-4 text-emerald-600" aria-label="Verified" />
              ) : null}
            </p>
            <p className="mt-0.5 text-xs capitalize text-muted">{user.role} account</p>
          </div>
        </div>

        {/* Email verification notice */}
        {!user.emailVerified && (
          <div className="flex items-start gap-3 rounded-card border border-warning/40 bg-warning/10 p-4">
            <MailWarning className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">Verify your email</p>
              <p className="text-sm text-body">
                Confirm your address to secure your account and receive booking updates.
              </p>
            </div>
            <Link
              href="/verify-email"
              className="shrink-0 text-sm font-semibold text-primary hover:underline"
            >
              Verify
            </Link>
          </div>
        )}

        {/* Editable fields */}
        <div className="space-y-4 rounded-card border border-line bg-surface p-5 shadow-card">
          <Field label="Full name" htmlFor="profile-name">
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Email" htmlFor="profile-email" hint="Contact support to change your email.">
            <input
              id="profile-email"
              type="email"
              value={user.email}
              readOnly
              className={`${inputClass} cursor-not-allowed bg-surface-muted/60 text-muted`}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="profile-phone">
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                className={inputClass}
              />
            </Field>

            <Field label="Country" htmlFor="profile-country">
              <select
                id="profile-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving} disabled={!dirty || saving}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-field border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
