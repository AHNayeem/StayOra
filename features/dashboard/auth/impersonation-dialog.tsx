"use client";

import { useState } from "react";
import { UserCog } from "lucide-react";
import { toast } from "@/lib/toast";
import { Alert, Button, Input } from "../ui";
import { Modal } from "@/components/ui/modal";
import { getRole } from "../rbac/roles";
import { useSession } from "./session-provider";
import { ImpersonationError, type ImpersonationTarget } from "./impersonation";

interface ImpersonationDialogProps {
  /** The user to become; `null` closes the dialog. */
  target: ImpersonationTarget | null;
  onClose: () => void;
}

/**
 * Confirmation before an impersonated session starts.
 *
 * Asks for a reason rather than just an "are you sure": the reason is what makes
 * the audit entry worth reading afterwards, and typing one is the moment an
 * operator reconsiders.
 */
export function ImpersonationDialog({ target, onClose }: ImpersonationDialogProps) {
  const { startImpersonation } = useSession();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const close = () => {
    setReason("");
    setError(null);
    onClose();
  };

  const confirm = () => {
    if (!target) return;
    setPending(true);
    setError(null);
    try {
      startImpersonation(target, reason);
    } catch (err) {
      setPending(false);
      const message =
        err instanceof ImpersonationError
          ? err.message
          : "Impersonation could not be started.";
      setError(message);
      toast.error("Couldn't start impersonation", { description: message });
    }
  };

  return (
    <Modal
      open={Boolean(target)}
      onClose={close}
      size="md"
      title="Start impersonation"
      description={
        target
          ? `You'll see the dashboard exactly as ${target.name} does, with their role and their data only.`
          : undefined
      }
    >
      {target && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-card border border-line bg-surface-muted/50 p-4">
            <span className="grid size-9 place-items-center rounded-field bg-primary-50 text-primary-700">
              <UserCog className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{target.name}</p>
              <p className="truncate text-xs text-muted">
                {target.email} · {getRole(target.roleId).label}
              </p>
            </div>
          </div>

          <Input
            label="Reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Ticket #4821 — guest can't see their voucher"
            hint="Recorded on the audit entry for this session."
            error={error ?? undefined}
          />

          <Alert tone="warning" title="Everything you do is recorded">
            Actions you take will be attributed to {target.name}, and the audit log
            will show that {`you`} performed them while impersonating. Exit as soon
            as you&rsquo;re done.
          </Alert>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirm}
              loading={pending}
              disabled={reason.trim().length < 4}
            >
              Start impersonating
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
