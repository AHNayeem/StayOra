"use client";

import { type ReactNode } from "react";
import { Modal, Button } from "../ui";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  /** Runs on confirm. May be async — the confirm button shows `loading`. */
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Confirm button styling — destructive by default. */
  tone?: "danger" | "primary";
  loading?: boolean;
}

/**
 * ConfirmDialog — a small {@link Modal}-based confirmation for destructive or
 * irreversible actions (delete, suspend…). While `loading`, the dialog can't be
 * dismissed and the confirm button spins. The reusable partner to every row /
 * bulk delete across the dashboard.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            size="sm"
            loading={loading}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="text-sm text-body">{message}</p>}
    </Modal>
  );
}
