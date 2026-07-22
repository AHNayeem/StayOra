import type { JsonLd as JsonLdData } from "@/lib/structured-data";

interface JsonLdProps {
  /** One schema.org node or an array of them. */
  data: JsonLdData | JsonLdData[];
}

/**
 * JsonLd — renders schema.org structured data as a `application/ld+json` script.
 * This is the Next.js-recommended way to add JSON-LD; the payload is our own
 * serialized data (never user HTML), so `dangerouslySetInnerHTML` is safe here.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
