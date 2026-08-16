"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import {
  TAX_JURISDICTIONS,
  assessTax,
  isPercentageBasis,
  type ProductKind,
} from "@/features/dashboard/domain";
import { Select } from "../../ui";
import { formatCurrency } from "../../lib/format";

const PRODUCTS: { value: ProductKind; label: string }[] = [
  { value: "hotels", label: "Hotel" },
  { value: "apartments", label: "Apartment" },
  { value: "resorts", label: "Resort" },
  { value: "shared-rooms", label: "Shared room" },
  { value: "convention-hall", label: "Convention hall" },
  { value: "tours", label: "Tour" },
  { value: "activities", label: "Activity" },
  { value: "transport", label: "Transport" },
  { value: "visa", label: "Visa" },
];

const SAMPLE = { netSale: 600, fees: 12, nights: 3, units: 1, guests: 2 };

/**
 * Rule check — what the current rule book would charge on a sample sale.
 *
 * The point of this panel is to make the wiring visible: change a rate in the
 * table above and the lines here move, because both read the same rule book the
 * checkout does. `revision` is bumped by the list after every mutation so the
 * panel re-reads.
 */
export function TaxRuleCheck({ revision }: { revision: number }) {
  const [country, setCountry] = useState("AE");
  const [product, setProduct] = useState<ProductKind>("hotels");

  const assessment = useMemo(
    () => assessTax({ ...SAMPLE, productKind: product, countryCode: country }),
    // `revision` is the dependency that matters: the rule book is read inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, country, revision],
  );

  const charged = assessment.lines.filter((l) => l.type === "exclusive");
  const included = assessment.lines.filter((l) => l.type === "inclusive");

  return (
    <section className="mt-6 rounded-panel border border-line bg-surface p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Calculator className="size-4 text-primary" aria-hidden="true" />
            Rule check
          </h2>
          <p className="mt-1 text-xs text-muted">
            What these rules charge on a sample {SAMPLE.nights}-night sale of{" "}
            {formatCurrency(SAMPLE.netSale, "USD")} for {SAMPLE.guests} guests. This is the
            same assessment the checkout runs.
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            aria-label="Destination"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            options={TAX_JURISDICTIONS.filter((j) => j.code !== "GLOBAL" && j.code !== "EU").map(
              (j) => ({ value: j.code, label: j.label }),
            )}
            wrapperClassName="w-52"
          />
          <Select
            aria-label="Product"
            value={product}
            onChange={(e) => setProduct(e.target.value as ProductKind)}
            options={PRODUCTS}
            wrapperClassName="w-44"
          />
        </div>
      </header>

      <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        {charged.length === 0 && included.length === 0 ? (
          <p className="text-sm text-muted">
            No rule matches — the booking would be charged nothing in tax.
          </p>
        ) : (
          <>
            {charged.map((line) => (
              <div key={line.ruleId} className="flex items-center justify-between gap-3">
                <dt className="min-w-0 truncate text-body">
                  {line.name}
                  <span className="ml-1.5 text-xs text-muted">
                    {line.rate !== undefined ? `${line.rate}%` : line.detail}
                  </span>
                </dt>
                <dd className="font-medium tabular-nums text-ink">
                  {formatCurrency(line.amount, "USD")}
                </dd>
              </div>
            ))}
            {charged.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
                <dt className="font-semibold text-ink">Added to the total</dt>
                <dd className="font-bold tabular-nums text-accent-600">
                  {formatCurrency(assessment.exclusiveTotal, "USD")}
                </dd>
              </div>
            )}
            {included.map((line) => (
              <div
                key={line.ruleId}
                className="flex items-center justify-between gap-3 text-muted"
              >
                <dt className="min-w-0 truncate">
                  {line.name} — already in the price
                  <span className="ml-1.5 text-xs">
                    {isPercentageBasis(line.basis) ? `${line.rate}%` : line.detail}
                  </span>
                </dt>
                <dd className="tabular-nums">{formatCurrency(line.amount, "USD")}</dd>
              </div>
            ))}
          </>
        )}
        {!assessment.matched && assessment.exclusiveTotal > 0 && (
          <p className="pt-1 text-xs text-muted">
            No rule covers this destination, so the platform default tax rate from
            Settings → Economics applied.
          </p>
        )}
      </dl>
    </section>
  );
}
