/**
 * MockAccountRepository — the traveller's own profile, saved travellers and
 * existing stays.
 *
 * Reads through `services/account` and the account's client stores, so a
 * traveller the user added under Account → Travellers is the same one the
 * assistant offers to autofill. Nothing here is invented: if the account has no
 * phone number, the assistant asks for one rather than making one up.
 */

import type { AIBookingRecord, AIContactInformation, AITravelerInfo } from "@/types/ai";
import type { TravelerBooking, SavedTraveler } from "@/types/traveler";
import { listingHref } from "@/constants/verticals";
import { getBookings, getRewardsSummary } from "@/services/account";
import { getSavedTravelers } from "@/features/account/travelers-store";
import type { AccountRepository, AIUserProfile } from "./types";

/** Map an account record onto the assistant's booking shape. */
export function toBookingRecord(booking: TravelerBooking): AIBookingRecord {
  return {
    id: booking.id,
    reference: booking.reference,
    title: booking.title,
    status: booking.status,
    startDate: booking.checkIn.slice(0, 10),
    endDate: booking.checkOut.slice(0, 10),
    location: booking.location,
    guests: booking.guests,
    totalUsd: booking.totalUsd,
    cancellationPolicy: booking.cancellationPolicy,
    href: listingHref({ vertical: booking.vertical, slug: booking.listingSlug }),
    image: booking.image,
    kind: "stay",
  };
}

function toTravelerInfo(traveler: SavedTraveler): AITravelerInfo {
  return {
    fullName: traveler.fullName,
    type: "adult",
    email: traveler.email,
    phone: traveler.phone,
    nationality: traveler.nationality,
    passportNumber: traveler.passportNumber,
    savedTravelerId: traveler.id,
  };
}

export class MockAccountRepository implements AccountRepository {
  readonly id = "mock-account";

  /**
   * The profile the *session* provides is authoritative for identity; this adds
   * the loyalty facts the assistant is allowed to mention. Identity itself is
   * injected per turn (see `AIRequest.auth`) rather than read here, because the
   * mock account dataset is a demo persona, not the signed-in user.
   */
  async getProfile(): Promise<AIUserProfile | null> {
    const rewards = await getRewardsSummary();
    return {
      membership: rewards.tier,
      points: rewards.balance,
    };
  }

  async getSavedTravelers(): Promise<AITravelerInfo[]> {
    return getSavedTravelers().map(toTravelerInfo);
  }

  async getSavedContact(): Promise<AIContactInformation | null> {
    const primary = getSavedTravelers().find((t) => t.isPrimary) ?? getSavedTravelers()[0];
    if (!primary?.email) return null;
    return {
      fullName: primary.fullName,
      email: primary.email,
      phone: primary.phone,
      countryCode: primary.nationality,
    };
  }

  listStays(): Promise<TravelerBooking[]> {
    return getBookings();
  }

  async listStayBookings(): Promise<AIBookingRecord[]> {
    const bookings = await getBookings();
    return bookings.map(toBookingRecord);
  }
}
