"use client";

import { useState } from "react";
import { Button, Modal, Textarea } from "../../ui";

interface ReasonDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  loading?: boolean;
  minLength?: number;
  onClose: () => void;
  onConfirm: (note: string) => void | Promise<void>;
}

/**
 * A decision that has to carry a reason.
 *
 * Rejections, change requests and suspensions all reach the merchant as copy,
 * so the note is validated here rather than left optional — a merchant should
 * never be told "rejected" with no explanation.
 *
 * The body is a separate component that only mounts while `open`, which is what
 * clears the draft note between two different decisions without an effect.
 */
export function ReasonDialog(props: ReasonDialogProps) {
  if (!props.open) return null;
  return <ReasonDialogBody {...props} />;
}

function ReasonDialogBody({
  title,
  description,
  confirmLabel,
  loading,
  minLength = 10,
  onClose,
  onConfirm,
}: ReasonDialogProps) {
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);

  const tooShort = note.trim().length < minLength;
  const error = touched && tooShort ? `Write at least ${minLength} characters.` : undefined;

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={() => {
              setTouched(true);
              if (tooShort) return;
              void onConfirm(note.trim());
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <Textarea
        label="Reason"
        rows={4}
        required
        value={note}
        error={error}
        onBlur={() => setTouched(true)}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Explain what needs to change so the merchant can act on it."
      />
    </Modal>
  );
}

/** A confirmation with no free text — used for reversible, self-explanatory moves. */
export function ConfirmActionDialog({
  open,
  title,
  message,
  confirmLabel,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!open) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={() => void onConfirm()}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-sm text-body">{message}</div>
    </Modal>
  );
}
