"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";
import type { BookingVertical } from "@/types/booking";
import { catalogueService, type CatalogueItem } from "@/features/dashboard/domain";
import { getErrorMessage } from "../../data";
import { Alert, Button, Modal, Textarea } from "../../ui";
import { useDomainActor, useDomainScope } from "../../domain/use-domain";

/**
 * Bulk catalogue operations — CSV in, CSV out.
 *
 * Operators with more than a handful of products do not create them one form at
 * a time. Export produces the same columns import accepts, so the round trip is
 * an edit-in-a-spreadsheet workflow. Imported rows land as **drafts**: a bulk
 * upload must not be a way around the review workflow.
 */

const COLUMNS = ["title", "city", "country", "basePrice", "summary", "image"] as const;

function escape(value: string | number): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Catalogue items → CSV, including the read-only status columns. */
export function toCsv(items: CatalogueItem[]): string {
  const header = [...COLUMNS, "status", "merchant", "id"].join(",");
  const lines = items.map((item) =>
    [
      escape(item.title),
      escape(item.city),
      escape(item.country),
      escape(item.basePrice),
      escape(item.summary),
      escape(item.image),
      escape(item.status),
      escape(item.merchantName),
      escape(item.id),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Split one CSV line, honouring quoted fields. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.map((value) => value.trim());
}

export interface ParsedRow {
  line: number;
  title: string;
  city: string;
  country: string;
  basePrice: number;
  summary: string;
  image?: string;
  problem?: string;
}

/** Parse and validate a CSV payload without importing anything. */
export function parseCsv(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const index = (name: string) => header.indexOf(name.toLowerCase());

  return lines.slice(1).map((line, i) => {
    const cells = splitLine(line);
    const at = (name: string) => (index(name) >= 0 ? (cells[index(name)] ?? "") : "");
    const basePrice = Number(at("basePrice"));
    const row: ParsedRow = {
      line: i + 2,
      title: at("title"),
      city: at("city"),
      country: at("country"),
      basePrice,
      summary: at("summary"),
      image: at("image") || undefined,
    };
    if (row.title.length < 4) row.problem = "Title must be at least 4 characters.";
    else if (row.summary.length < 20) row.problem = "Description must be at least 20 characters.";
    else if (!row.city || !row.country) row.problem = "City and country are required.";
    else if (!Number.isFinite(basePrice) || basePrice <= 0) row.problem = "Price must be above zero.";
    return row;
  });
}

const SAMPLE = `title,city,country,basePrice,summary,image
Harbour View Suites,Lisbon,Portugal,140,"Bright suites five minutes from the waterfront with breakfast included.",
Cedar Ridge Lodge,Banff,Canada,220,"Timber lodge rooms with mountain views and ski storage.",`;

export function BulkImportDialog({
  open,
  vertical,
  merchantId,
  onClose,
  onDone,
}: {
  open: boolean;
  vertical: BookingVertical;
  merchantId?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const actor = useDomainActor();
  const scope = useDomainScope();
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);

  const rows = text.trim() ? parseCsv(text) : [];
  const valid = rows.filter((row) => !row.problem);
  const invalid = rows.filter((row) => row.problem);

  const run = async () => {
    if (!merchantId) return;
    setImporting(true);
    let created = 0;
    try {
      for (const row of valid) {
        await catalogueService.create(
          merchantId,
          {
            title: row.title,
            vertical,
            summary: row.summary,
            city: row.city,
            country: row.country,
            basePrice: row.basePrice,
            image: row.image,
          },
          actor,
          scope,
        );
        created += 1;
      }
      toast.success(`Imported ${created} listing${created === 1 ? "" : "s"}`, {
        description: "They are drafts — submit them for review when they're ready.",
      });
      setText("");
      onDone();
    } catch (error) {
      toast.error(`Stopped after ${created} row(s)`, { description: getErrorMessage(error) });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Import listings" size="lg">
      {!merchantId && (
        <Alert tone="warning" title="Pick a merchant first" className="mb-4">
          Every listing needs an owner to settle against. Import from the merchant&apos;s own
          workspace.
        </Alert>
      )}
      <p className="mb-3 text-sm text-body">
        Paste CSV with the columns <code className="font-mono text-xs">{COLUMNS.join(", ")}</code>.
        Rows arrive as drafts and still go through review before they can be sold.
      </p>
      <Textarea
        label="CSV"
        rows={8}
        className="font-mono text-xs"
        placeholder={SAMPLE}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {rows.length > 0 && (
        <div className="mt-4 rounded-card border border-line bg-surface-muted/40 p-3 text-sm">
          <p className="text-body">
            {valid.length} row{valid.length === 1 ? "" : "s"} ready
            {invalid.length > 0 && `, ${invalid.length} to fix`}.
          </p>
          {invalid.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-danger">
              {invalid.slice(0, 5).map((row) => (
                <li key={row.line}>
                  Line {row.line}: {row.problem}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          loading={importing}
          disabled={!merchantId || valid.length === 0}
          onClick={() => void run()}
        >
          Import {valid.length || ""} listing{valid.length === 1 ? "" : "s"}
        </Button>
      </div>
    </Modal>
  );
}
