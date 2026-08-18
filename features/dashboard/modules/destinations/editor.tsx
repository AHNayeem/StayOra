"use client";

import { useRouter } from "next/navigation";
import { ErrorState } from "../../components/state-views";
import { FormSkeleton } from "../../ui";
import { useDestination } from "./hooks";
import { DestinationForm } from "./form";

/**
 * Loads a destination by id and hands it to the form.
 *
 * Split out of the route so the page stays a server component (metadata,
 * permission guard) while the fetch, loading skeleton and not-found state are
 * handled here — the same split every other dashboard detail screen uses.
 */
export function DestinationEditor({ id }: { id: string }) {
  const router = useRouter();
  const query = useDestination(id);

  if (query.isLoading) return <FormSkeleton />;

  if (query.error || !query.data) {
    return (
      <ErrorState
        title="Destination not found"
        description="It may have been deleted. Head back to the list and try again."
        onRetry={() => router.push("/dashboard/destinations")}
      />
    );
  }

  return <DestinationForm initial={query.data} />;
}
