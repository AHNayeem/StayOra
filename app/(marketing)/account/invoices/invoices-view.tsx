"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import type { Invoice } from "@/types/traveler";
import { useLocale } from "@/features/i18n";
import { useMergedInvoices } from "@/features/account/created-bookings";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountEmpty } from "@/components/account/account-empty";
import { StatusBadge, invoiceStatusMeta } from "@/components/account/status-badge";
import { Money } from "@/components/account/money";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/lib/toast";

function download(invoice: Invoice) {
  toast.success("Invoice downloaded", { description: invoice.number });
}

export function InvoicesView({ invoices: serverInvoices }: { invoices: Invoice[] }) {
  const { date } = useLocale();
  const invoices = useMergedInvoices(serverInvoices);
  const [active, setActive] = useState<Invoice | null>(null);

  if (invoices.length === 0) {
    return (
      <div>
        <AccountPageHeader title="Invoices" description="Download receipts for your bookings." />
        <AccountEmpty
          icon={FileText}
          title="No invoices yet"
          description="Invoices are generated automatically when you make a booking."
        />
      </div>
    );
  }

  return (
    <div>
      <AccountPageHeader
        title="Invoices"
        description="Download receipts and billing documents for every booking."
      />

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-card border border-line bg-surface shadow-card md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-muted/50 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Invoice</th>
              <th className="px-4 py-3 font-semibold">Booking</th>
              <th className="px-4 py-3 font-semibold">Issued</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {invoices.map((inv) => {
              const meta = invoiceStatusMeta(inv.status);
              return (
                <tr key={inv.id} className="hover:bg-surface-muted/30">
                  <td className="px-4 py-3 font-medium text-ink">{inv.number}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-body">{inv.title}</td>
                  <td className="px-4 py-3 text-body">{date(inv.issuedAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={meta.label} tone={meta.tone} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">
                    <Money usd={inv.totalUsd} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setActive(inv)}
                        className="rounded-field px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-primary-50"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => download(inv)}
                        aria-label="Download invoice"
                        className="grid size-8 place-items-center rounded-field text-muted hover:bg-surface-muted hover:text-ink"
                      >
                        <Download className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {invoices.map((inv) => {
          const meta = invoiceStatusMeta(inv.status);
          return (
            <div key={inv.id} className="rounded-card border border-line bg-surface p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{inv.number}</p>
                  <p className="truncate text-sm text-body">{inv.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{date(inv.issuedAt)}</p>
                </div>
                <StatusBadge label={meta.label} tone={meta.tone} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold text-ink">
                  <Money usd={inv.totalUsd} />
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setActive(inv)}>
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => download(inv)}>
                    <Download className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <InvoiceModal invoice={active} onClose={() => setActive(null)} onDownload={download} />
      )}
    </div>
  );
}

function InvoiceModal({
  invoice,
  onClose,
  onDownload,
}: {
  invoice: Invoice;
  onClose: () => void;
  onDownload: (inv: Invoice) => void;
}) {
  const { date } = useLocale();
  const meta = invoiceStatusMeta(invoice.status);
  return (
    <Modal
      open
      onClose={onClose}
      title={invoice.number}
      description={invoice.title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={() => onDownload(invoice)}>
            <Download className="size-4" aria-hidden="true" />
            Download
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <StatusBadge label={meta.label} tone={meta.tone} />
          <span className="text-muted">Issued {date(invoice.issuedAt)}</span>
        </div>

        <div className="rounded-field bg-surface-muted/50 p-3">
          <p className="text-xs text-muted">Billed to</p>
          <p className="font-medium text-ink">{invoice.billTo.name}</p>
          <p className="text-body">{invoice.billTo.email}</p>
        </div>

        <dl className="space-y-2">
          <Row label="Booking reference">{invoice.bookingRef}</Row>
          <Row label="Subtotal">
            <Money usd={invoice.subtotalUsd} />
          </Row>
          <Row label="Taxes">
            <Money usd={invoice.taxesUsd} />
          </Row>
          <Row label="Fees">
            <Money usd={invoice.feesUsd} />
          </Row>
          {invoice.discountUsd > 0 && (
            <Row label="Discount">
              −<Money usd={invoice.discountUsd} />
            </Row>
          )}
          <div className="flex items-center justify-between border-t border-line pt-3 text-base">
            <span className="font-semibold text-ink">Total</span>
            <span className="font-bold text-accent-600">
              <Money usd={invoice.totalUsd} />
            </span>
          </div>
        </dl>
      </div>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-body">{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  );
}
