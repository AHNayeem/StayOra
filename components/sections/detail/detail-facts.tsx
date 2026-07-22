import { Check, X } from "lucide-react";
import type { DetailSpec } from "@/types/detail";
import { Icon } from "@/components/shared/lucide-icon";
import { DetailBlock } from "./detail-block";

interface DetailFactsProps {
  specs: DetailSpec[];
  amenities: string[];
  included: string[];
  excluded: string[];
}

/**
 * DetailFacts — the "at a glance" quick-facts grid, the amenities list (when the
 * vertical has one), and the what's-included / not-included columns. All three
 * are driven by the derived {@link DetailSpec}s and inclusion lists, so the same
 * block serves every vertical.
 */
export function DetailFacts({ specs, amenities, included, excluded }: DetailFactsProps) {
  return (
    <div className="flex flex-col gap-12">
      <DetailBlock title="At a glance">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {specs.map((spec) => (
            <div
              key={`${spec.label}-${spec.value}`}
              className="flex items-start gap-3 rounded-card border border-line bg-surface p-4"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-field bg-primary-50 text-primary">
                <Icon name={spec.icon} className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <dt className="text-xs text-muted">{spec.label}</dt>
                <dd className="truncate text-sm font-semibold text-ink">{spec.value}</dd>
              </span>
            </div>
          ))}
        </dl>
      </DetailBlock>

      {amenities.length > 0 && (
        <DetailBlock title="Amenities">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {amenities.map((amenity) => (
              <li key={amenity} className="flex items-center gap-2.5 text-sm text-body">
                <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {amenity}
              </li>
            ))}
          </ul>
        </DetailBlock>
      )}

      <DetailBlock title="What's included">
        <div className="grid gap-6 sm:grid-cols-2">
          <InclusionList items={included} kind="included" />
          <InclusionList items={excluded} kind="excluded" />
        </div>
      </DetailBlock>
    </div>
  );
}

function InclusionList({
  items,
  kind,
}: {
  items: string[];
  kind: "included" | "excluded";
}) {
  const included = kind === "included";
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">
        {included ? "Included" : "Not included"}
      </h3>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-body">
            {included ? (
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <X className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
            )}
            <span className={included ? undefined : "text-muted"}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
