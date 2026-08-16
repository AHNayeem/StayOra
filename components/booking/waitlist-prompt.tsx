"use client";

import { useState } from "react";
import { BellRing, Check } from "lucide-react";
import { toast } from "@/lib/toast";
import type { Listing } from "@/types/catalog";
import { joinWaitlist, type PropertyRef } from "@/features/dashboard/domain";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * "Tell me when it opens up" — the last resort before a traveller leaves.
 *
 * Sold-out dates used to be the end of the journey. A waitlist entry keeps the
 * demand: the `waitlist:notify` job re-checks availability and writes to the
 * traveller the moment a cancellation puts the room back, with a link straight
 * to the same selection.
 */
export function WaitlistPrompt({
  listing,
  property,
  roomTypeId,
  roomTypeName,
  checkIn,
  checkOut,
  units,
  guests,
}: {
  listing: Listing;
  property: PropertyRef;
  roomTypeId: string;
  roomTypeName?: string;
  checkIn: string;
  checkOut: string;
  units: number;
  guests: number;
}) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [joined, setJoined] = useState(false);

  const join = () => {
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      toast.error("Enter a valid email so we can reach you.");
      return;
    }
    joinWaitlist({
      customerEmail: trimmed,
      customerName: user?.name,
      property,
      roomTypeId,
      roomTypeName,
      checkIn,
      checkOut: checkOut || checkIn,
      units,
      guests,
    });
    setJoined(true);
    toast.success("You're on the waitlist", {
      description: `We'll email you if ${roomTypeName ?? "this room"} frees up for those dates.`,
    });
  };

  if (joined) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-card border border-primary/25 bg-primary-50/60 p-4 text-sm text-ink">
        <Check className="size-4 text-primary" aria-hidden="true" />
        You&rsquo;re on the waitlist for {listing.title}. We&rsquo;ll be in touch the moment
        those dates open up.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-card border border-line bg-surface-muted/40 p-5">
      <div className="flex items-center gap-2">
        <BellRing className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-ink">Join the waitlist</h3>
      </div>
      <p className="mt-1 text-sm text-muted">
        Cancellations happen. We&rsquo;ll email you if these dates come back — no obligation.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          wrapperClassName="min-w-56 flex-1"
        />
        <Button size="md" onClick={join}>
          Notify me
        </Button>
      </div>
    </div>
  );
}
