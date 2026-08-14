# 05 — Booking Lifecycle Analysis

## The stay booking lifecycle — traced against code

```mermaid
flowchart TD
  A[Discovery: home / search / map / near-me] --> B[Listing page + filters]
  B --> C[Detail page: gallery, facts, reviews, availability]
  C --> D[Booking widget: dates, guests, room type, rate plan]
  D --> E[HOLD created — countdown timer starts]
  E --> F[Step 1: Travellers + saved-traveller autofill]
  F --> G[Step 2: Add-ons, insurance, membership upsell]
  G --> H[Step 3: Coupon / wallet coupon / loyalty points]
  H --> I[Payment: demo card -> authorize]
  I -->|3DS required| I2[3-D Secure challenge]
  I -->|declined| I3[Failure + retry]
  I2 --> J[Capture]
  I3 --> I
  J --> K[Booking confirmed, hold committed]
  K --> L[Invoice + payment written]
  L --> M[Commission entry created]
  M --> N[Notifications queued -> sent -> delivered]
  N --> O[Loyalty points accrued]
  O --> P[Booking appears in customer + admin + merchant views]
  P --> Q[Check-in -> Complete]
  Q --> R[Review invitation — verified stay only]
  Q --> S[Merchant settlement roll-up]
```

**Every step above exists in code and is exercised by the regression suite.** The three simulated steps are payment authorisation, notification delivery, and the money actually moving.

### Step-by-step verification

| Step | Status | Where |
|---|---|---|
| Discovery | ✅ | `search/`, `discovery/`, home sections |
| Listing + filters | ✅ | `sections/listing/*` |
| Details | ✅ | `sections/detail/*` |
| Availability check | ✅ real engine | `domain/inventory.ts` |
| Inventory hold + timer | ✅ | `createHold`, `components/checkout/hold-timer.tsx` |
| Traveller collection | ✅ | `checkout/traveler-fields.tsx`, saved travellers |
| Add-ons | ✅ per-vertical catalogue | `features/booking/add-ons.ts` |
| Insurance | ✅ | `checkout/insurance-picker.tsx`, `domain/insurance.ts` |
| Membership upsell | ✅ | `checkout/membership-upsell.tsx` |
| Discounts (promo, wallet, points) | ✅ | `offerService`, `engagement.ts` |
| Pricing | ✅ single engine | `domain/money.ts` → `priceBooking` |
| Payment | 🔵 simulated | `domain/payments.ts` |
| 3-D Secure | 🔵 simulated | `submitAuthentication` |
| Retry after decline | ✅ | `attemptPayment` |
| Confirmation | ✅ | `confirmBooking` |
| Invoice + payment record | ✅ | `services/checkout.ts` |
| Commission | ✅ | `commissionService`, `commission-rules.ts` |
| Notifications | 🔵 outbox only | `domain/messaging.ts` |
| Loyalty accrual | ✅ | `loyaltyService` |
| Vendor fulfilment | 🟡 status only | `bookingService.transition` |
| Check-in / completion | ✅ | lifecycle transitions |
| Review | ✅ verified-only | `domain/reviews.ts` |
| Cancellation | ✅ | `quoteCancellation`, policy tiers |
| Refund | ✅ full lifecycle | `refundService` |
| Amendment | ✅ | `domain/amendments.ts` |
| Settlement | ✅ | `settlementService` |

---

## Booking state machine

`lifecycle.ts` is the **only** place a transition is declared legal. Services call `assertTransition` before mutating; UIs call `availableBookingActions` to decide which buttons to render — so the dashboard can never offer an action the domain would reject.

Declared transitions: `capture_payment`, `confirm`, `retry_payment`, `mark_failed`, `check_in`, `complete`, `request_cancellation`, `cancel`, `initiate_refund`, `process_refund`, `complete_refund`.

Cancellation policies: **flexible**, **moderate**, **strict**, **non_refundable** — each with tiers that drive the refund quote by how close to arrival the cancellation lands.

---

## Refund lifecycle

```mermaid
flowchart LR
  A[Customer requests] --> B[Quote against policy]
  B --> C[Pending review]
  C --> D{Finance/Admin decision}
  D -->|Approve| E[Approved]
  D -->|Reject| F[Rejected + reason]
  E --> G[Processing]
  G --> H[Completed]
  H --> I[Commission reversed]
  I --> J[Merchant settlement adjusted]
  H --> K[Loyalty points reversed]
  H --> L[Insurance policy unwound]
  H --> M[Notification to customer]
```

Everything downstream of "Completed" — commission reversal, settlement adjustment, points reversal, policy unwind — is implemented and covered by tests. **What is missing is the money leaving the platform's account**, because there is no gateway.

Refunds can be raised from three directions: the customer (`/account/refunds`), an agent (`refundService.requestExternal`), and the admin queue (`/dashboard/finance/refunds`) — all writing to the same records.

---

## Flight booking lifecycle

```mermaid
flowchart TD
  A[Flight search panel] --> B[Results: filters, sort, price calendar]
  B --> C[Offer detail: fare rules, seat map, amenities]
  C --> D[Step 1 Travellers]
  D --> E[Step 2 Seats]
  E --> F[Step 3 Extras: bags, meals]
  F --> G[Step 4 Review + fare breakdown + coupon]
  G --> H[Payment - simulated]
  H --> I[Confirmation: PNR + e-ticket number]
  I --> J[Flight booking stored]
  J --> K[SAME invoice + payment triple as stays]
  K --> L[Visible in /account/bookings, /invoices, /payments]
  J --> M[My Flights: ticket view, boarding pass]
  M --> N[Refund request queue]
```

**Broken/missing steps:** no supplier confirmation, no ticketing, no schedule-change handling, no automatic refund processing (flight refunds land in a request queue and stop there), and cancellation is a request rather than a state transition.

---

## Trip (multi-product) lifecycle

```mermaid
flowchart TD
  A[Trip context set: destination, dates, travellers] --> B[Recommendations across verticals]
  B --> C[Items added to trip cart]
  C --> D[Trip checkout]
  D --> E[Multiple bookings created]
  E --> F[Trip status derived from component statuses]
  F --> G[Trip detail: per-item status]
```

**Implemented:** shared context, cross-vertical recommendations, combo pricing, combined checkout, derived trip status, partial confirmation as a concept.
**Missing:** one payment split across suppliers with allocation, one cancellation across the trip, refund orchestration when one component fails, a unified itinerary document, a single trip-level booking reference presented to the customer.

---

## Request-product lifecycle (visa, convention hall)

```mermaid
flowchart LR
  A[Enquiry / application] --> B[Booking created: pending]
  B --> C[Invoice: due, no payment taken]
  C --> D{Missing: quotation + acceptance}
  D --> E{Missing: document upload}
  E --> F{Missing: application status tracking}
  F --> G[Manual admin confirmation]
```

Only the first three steps exist. Everything after "invoice due" is manual and undocumented in the product.

---

## Where the lifecycle is broken, mocked or disconnected

| Break | Severity | Detail |
|---|---|---|
| **Payment is simulated** | Critical | Outcome is chosen by which demo card the user picks. No money moves, no gateway, no webhook, no reconciliation with a processor. |
| **Notifications never leave the browser** | Critical | 10 templates across 5 channels write to an in-memory outbox. The customer "receives" them because the same array backs their inbox. |
| **No supplier confirmation loop** | Critical | A booking is confirmed by the platform alone. In reality a hotel or airline must accept it, and can reject it. |
| **Vendor fulfilment is a status change** | High | There is no operational handover — no rooming list, no manifest, no voucher the supplier can scan. |
| **Payouts never execute** | High | Settlements compute correctly and advance status; no bank rail exists. |
| **No documents produced** | High | No PDF invoice, voucher, e-ticket or receipt is generated. |
| **Data is per-browser** | Critical | The customer's booking and the admin's view are the same record *only because they are the same browser*. In reality they are different people on different machines. |
| **Client-authoritative pricing** | Critical | `priceBooking` runs in the browser. A user can alter the inputs. |
| **Flight refunds dead-end** | Medium | They enter a queue but have no processing lifecycle. |
| **Reviews have no notification trigger** | Low | A "review invitation" template exists but no scheduled job sends it — there are no jobs. |
