import { Check } from "lucide-react";
import { DetailBlock } from "./detail-block";

interface DetailOverviewProps {
  title: string;
  overview: string[];
  highlights: string[];
}

/**
 * DetailOverview — the opening content block: a short description followed by a
 * "Highlights" grid of the listing's standout selling points.
 */
export function DetailOverview({ title, overview, highlights }: DetailOverviewProps) {
  return (
    <DetailBlock title={`About ${title}`}>
      <div className="flex flex-col gap-4 text-body">
        {overview.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {highlights.length > 0 && (
        <>
          <h3 className="mt-8 text-lg font-semibold text-ink">Highlights</h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-2.5 text-sm text-body">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {highlight}
              </li>
            ))}
          </ul>
        </>
      )}
    </DetailBlock>
  );
}
