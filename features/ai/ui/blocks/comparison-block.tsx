"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import type { AIBlock } from "@/types/ai";
import { cn } from "@/lib/utils";
import { AiText } from "./ai-text";
import { BlockShell } from "./block-shell";

type ComparisonBlock = Extract<AIBlock, { kind: "comparison" }>;

/**
 * ComparisonBlock — the side-by-side table.
 *
 * Horizontal scrolling is contained to the table (`overflow-x-auto`) so a
 * four-way comparison never makes the chat column or the page scroll sideways
 * on a phone. The winning cell in each row is marked, so the verdict underneath
 * is visibly derived from the rows above it rather than asserted.
 */
export function ComparisonBlock({ block }: { block: ComparisonBlock }) {
  return (
    <BlockShell title={block.title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] border-collapse text-xs">
          <caption className="sr-only">{block.title}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-24 px-3 py-2 text-left font-medium text-muted">
                <span className="sr-only">Attribute</span>
              </th>
              {block.subjects.map((subject) => (
                <th key={subject.id} scope="col" className="min-w-36 px-3 py-2 text-left align-top">
                  {subject.image && (
                    <span className="relative mb-1.5 block h-14 w-full overflow-hidden rounded-field bg-surface-muted">
                      <Image
                        src={subject.image}
                        alt={subject.title}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    </span>
                  )}
                  <Link
                    href={subject.href}
                    className="line-clamp-2 font-semibold text-ink hover:text-primary"
                  >
                    {subject.title}
                  </Link>
                  {subject.subtitle && (
                    <span className="mt-0.5 block truncate font-normal text-muted">
                      {subject.subtitle}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {block.rows.map((row) => (
              <tr key={row.label} className="align-top">
                <th scope="row" className="px-3 py-2 text-left font-medium text-muted">
                  {row.label}
                </th>
                {row.values.map((value, index) => (
                  <td
                    key={`${row.label}-${block.subjects[index]?.id ?? index}`}
                    className={cn(
                      "px-3 py-2 text-body",
                      row.bestIndex === index && "font-semibold text-ink",
                    )}
                  >
                    <span className="inline-flex items-start gap-1">
                      {row.bestIndex === index && (
                        <Check
                          className="mt-0.5 size-3 shrink-0 text-primary"
                          aria-label="Best in this row"
                        />
                      )}
                      <AiText text={value} />
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="flex gap-2 border-t border-line bg-primary-50 px-4 py-3 text-xs text-primary-700">
        <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <AiText text={block.recommendation} />
      </p>
    </BlockShell>
  );
}
