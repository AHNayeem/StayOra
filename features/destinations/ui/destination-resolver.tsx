"use client";

import { useMemo } from "react";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Spinner } from "@/components/ui/spinner";
import { destinationRelations } from "../related";
import { useDestination, useDestinations } from "../hooks";
import { DestinationDetailView } from "./destination-detail-view";

/**
 * Resolves a destination slug the server could not.
 *
 * The prototype persists editor changes in the browser, so a destination created
 * in the dashboard exists in `localStorage` and nowhere the server can read. The
 * route renders this instead of 404-ing immediately: it waits for the store to be
 * read, then either renders the destination or hands control to the project's
 * standard not-found experience.
 *
 * Once a backend serves destinations the route resolves every slug server-side
 * and this component is deleted — nothing else depends on it.
 */
export function DestinationResolver({ slug }: { slug: string }) {
  const { destination, resolved } = useDestination(slug);
  const published = useDestinations({ status: "published" });

  const relations = useMemo(
    () => (destination ? destinationRelations(destination, { destinations: published }) : null),
    [destination, published],
  );

  if (!resolved) {
    return (
      <main className="flex flex-1 items-center">
        <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20">
          <Spinner size="lg" label="Loading destination" />
          <p className="text-sm text-muted">Loading destination…</p>
        </Container>
      </main>
    );
  }

  // Genuinely unknown: fall through to `app/(marketing)/not-found.tsx`, which
  // already offers a way back to /destinations.
  if (!destination || !relations) notFound();

  return <DestinationDetailView destination={destination} relations={relations} />;
}
