"use client";

import { useState } from "react";
import { Laptop, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/validation";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  device: string;
  meta: string;
  current: boolean;
  icon: typeof Laptop;
}

const INITIAL_SESSIONS: Session[] = [
  { id: "s1", device: "Chrome · macOS", meta: "San Francisco, US · Active now", current: true, icon: Laptop },
  { id: "s2", device: "Safari · iPhone", meta: "San Francisco, US · 2 days ago", current: false, icon: Smartphone },
  { id: "s3", device: "Chrome · Windows", meta: "London, UK · 3 weeks ago", current: false, icon: Laptop },
];

export default function SecurityPage() {
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [deleting, setDeleting] = useState(false);

  return (
    <div>
      <AccountPageHeader
        title="Security"
        description="Keep your account safe — password, two-factor and active sessions."
      />

      <div className="max-w-2xl space-y-6">
        <PasswordCard />

        {/* Two-factor */}
        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-field bg-primary-50 text-primary">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-ink">Two-factor authentication</h2>
                <p className="text-sm text-muted">
                  Add a verification step at sign-in for extra security.
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={twoFactor}
              aria-label="Two-factor authentication"
              onClick={() => {
                setTwoFactor((v) => !v);
                toast.success(twoFactor ? "Two-factor disabled" : "Two-factor enabled");
              }}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                twoFactor ? "bg-primary" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
                  twoFactor ? "translate-x-5.5" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
        </section>

        {/* Active sessions */}
        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-ink">Active sessions</h2>
          <ul className="space-y-1">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 border-t border-line py-3 first:border-t-0 first:pt-0"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-field bg-surface-muted text-muted">
                  <s.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <span className="truncate">{s.device}</span>
                    {s.current && (
                      <span className="rounded-pill bg-emerald-500/12 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{s.meta}</p>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => {
                      setSessions((prev) => prev.filter((x) => x.id !== s.id));
                      toast.success("Signed out of that session");
                    }}
                    className="shrink-0 rounded-field px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10"
                  >
                    Sign out
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Danger zone */}
        <section className="rounded-card border border-danger/30 bg-danger/5 p-5">
          <h2 className="text-base font-semibold text-ink">Delete account</h2>
          <p className="mt-1 text-sm text-body">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            onClick={() => setDeleting(true)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete account
          </Button>
        </section>
      </div>

      {deleting && <DeleteModal onClose={() => setDeleting(false)} />}
    </div>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const valid =
    current.length > 0 && next.length >= PASSWORD_MIN_LENGTH && next === confirm;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < PASSWORD_MIN_LENGTH) {
      toast.error(`New password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords don't match.");
      return;
    }
    setSaving(true);
    // Mock: no real backend call.
    setSaving(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Password updated");
  };

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-ink">Change password</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="cur-pw" className="mb-1.5 block text-sm font-medium text-ink">
            Current password
          </label>
          <input
            id="cur-pw"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="new-pw" className="mb-1.5 block text-sm font-medium text-ink">
              New password
            </label>
            <input
              id="new-pw"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="conf-pw" className="mb-1.5 block text-sm font-medium text-ink">
              Confirm new password
            </label>
            <input
              id="conf-pw"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving} disabled={!valid}>
            Update password
          </Button>
        </div>
      </form>
    </section>
  );
}

function DeleteModal({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title="Delete your account?"
      description="This is permanent. Type DELETE to confirm."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={text !== "DELETE"}
            onClick={() => {
              onClose();
              toast.success("Account deletion requested", {
                description: "In a live app you'd be signed out and your data removed.",
              });
            }}
          >
            Delete account
          </Button>
        </div>
      }
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="DELETE"
        aria-label="Type DELETE to confirm"
        className={inputClass}
      />
    </Modal>
  );
}

const inputClass =
  "h-11 w-full rounded-field border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/25";
