"use client";

import type { Invoice, PaymentTxn, TravelerBooking } from "@/types/traveler";
import { useAuth } from "@/features/auth";
import {
  DEMO_CUSTOMER,
  couponService,
  getState,
  loyaltyService,
  messagingService,
  reviewService,
  supportService,
  type Booking,
} from "@/features/dashboard/domain";
import { toInvoice, toPaymentTxns, toTravelerBooking } from "./projection";
import { useDomainValue } from "./use-domain";

/**
 * Customer-scoped reads of the domain store.
 *
 * Every `/account` screen goes through here, which is what guarantees the
 * traveller and the operator are looking at the same records: there is no
 * second customer database, only a filter on `customer.email`.
 */

/** The email the customer surfaces are scoped to (demo traveller when signed out). */
export function useCustomerEmail(): string {
  const { user } = useAuth();
  return (user?.email ?? DEMO_CUSTOMER.email).toLowerCase();
}

function bookingsFor(email: string): Booking[] {
  const key = email.toLowerCase();
  return getState()
    .bookings.filter((b) => b.customer.email.toLowerCase() === key)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Raw domain bookings belonging to the signed-in customer. */
export function useCustomerDomainBookings(): Booking[] {
  const email = useCustomerEmail();
  return useDomainValue(() => bookingsFor(email), [email]);
}

/** The account view model — projected, never stored. */
export function useCustomerBookings(): TravelerBooking[] {
  const email = useCustomerEmail();
  return useDomainValue(() => bookingsFor(email).map(toTravelerBooking), [email]);
}

/** One booking by id, scoped to the signed-in customer. */
export function useCustomerBooking(id: string): Booking | undefined {
  const email = useCustomerEmail();
  return useDomainValue(
    () => bookingsFor(email).find((b) => b.id === id),
    [email, id],
  );
}

export function useCustomerInvoices(): Invoice[] {
  const email = useCustomerEmail();
  return useDomainValue(() => bookingsFor(email).map(toInvoice), [email]);
}

export function useCustomerPayments(): PaymentTxn[] {
  const email = useCustomerEmail();
  return useDomainValue(
    () =>
      bookingsFor(email)
        .flatMap(toPaymentTxns)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [email],
  );
}

/** Refunds raised against the customer's bookings. */
export function useCustomerRefunds() {
  const email = useCustomerEmail();
  return useDomainValue(() => {
    const key = email.toLowerCase();
    return getState()
      .refunds.filter((r) => r.customer.email.toLowerCase() === key)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }, [email]);
}

export function useLoyalty() {
  const email = useCustomerEmail();
  return useDomainValue(() => loyaltyService.summary(email), [email]);
}

export function useWalletCoupons() {
  const email = useCustomerEmail();
  return useDomainValue(() => couponService.list(email), [email]);
}

export function useCustomerTickets() {
  const email = useCustomerEmail();
  return useDomainValue(() => supportService.forCustomer(email), [email]);
}

export function useCustomerTicket(id: string) {
  const email = useCustomerEmail();
  return useDomainValue(
    () => supportService.forCustomer(email).find((t) => t.id === id),
    [email, id],
  );
}

export function useCustomerInbox() {
  const email = useCustomerEmail();
  return useDomainValue(() => messagingService.inbox(email), [email]);
}

export function useUnreadCount(): number {
  const email = useCustomerEmail();
  return useDomainValue(() => messagingService.unreadCount(email), [email]);
}

export function useCustomerReviews() {
  const email = useCustomerEmail();
  return useDomainValue(() => reviewService.forCustomer(email), [email]);
}

/** Completed bookings the customer can still review. */
export function useReviewInvitations(): Booking[] {
  const email = useCustomerEmail();
  return useDomainValue(() => reviewService.pendingInvitations(email), [email]);
}

export function useNotificationPreferences() {
  const email = useCustomerEmail();
  return useDomainValue(() => messagingService.getPreferences(email), [email]);
}
