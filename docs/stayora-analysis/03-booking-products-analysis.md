# 03 — Booking Products Analysis

Ten bookable product categories exist. Nine are catalog listings; flights are a fare quoted against a search, so they are modelled separately by design.

## Category presence

| Category | Present | Route | Catalog entries (approx.) |
|---|---|---|---|
| Hotel | ✅ | `/hotels`, `/hotels/[slug]` | 55+ |
| Apartment | ✅ | `/apartments` | 55+ |
| Resort | ✅ | `/resorts` | 30+ |
| Shared Room | ✅ | `/shared-rooms` | 25+ |
| Convention Hall | ✅ | `/convention-hall` | 18+ |
| Transport | ✅ | `/transport` | 42+ |
| Tour | ✅ | `/tours` | 45+ |
| Activity | ✅ | `/activities` | 82+ |
| Visa | ✅ | `/all-visa` | 25+ |
| Flight | ✅ | `/flights`, `/flights/search`, `/flights/[id]`, `/flights/book` | Generated per search |

**No additional categories were found.** "Combo" exists as a *product kind* for bundled offers (`ProductKind = BookingVertical \| "combo"`) with its own 15% commission rate, but has no standalone catalogue.

---

## Capability matrix

✅ implemented · 🟡 partial · 🔵 mock/simulated · 🔴 missing

| # | Capability | Hotel / Apartment / Resort / Shared Room | Convention Hall | Transport | Tour / Activity | Visa | Flight |
|---|---|---|---|---|---|---|---|
| 1 | Discovery / search | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (own panel) |
| 2 | Listing page + filters | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (results) |
| 3 | Details page | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 | Availability | ✅ real inventory engine | 🟡 date-only | 🟡 date-only | 🟡 date-only | 🔴 n/a | 🔵 generated |
| 5 | Pricing | ✅ per-night, rate plans | ✅ per-day | ✅ per-trip | ✅ per-person | ✅ per-application | ✅ fare families |
| 6 | Date/time selection | ✅ range | ✅ range | ✅ single | ✅ single | 🔴 (appointment fallback) | ✅ depart/return |
| 7 | Guest / passenger selection | ✅ | ✅ | ✅ | ✅ | ✅ applicants | ✅ adult/child/infant + cabin |
| 8 | Add-ons | ✅ 4 offers | ✅ 2 offers | ✅ 2 offers | ✅ 2 offers | ✅ 2 offers | ✅ seats, bags, meals |
| 9 | Booking creation | ✅ | ✅ (request) | ✅ | ✅ | ✅ (request) | ✅ |
| 10 | Checkout | ✅ 4-step | ✅ | ✅ | ✅ | ✅ | ✅ 4-step |
| 11 | Payment | 🔵 simulated | 🔵 deferred | 🔵 simulated | 🔵 simulated | 🔵 deferred | 🔵 simulated |
| 12 | Confirmation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ + PNR/ticket |
| 13 | Cancellation | ✅ policy-driven | ✅ | ✅ | ✅ | ✅ | 🟡 request only |
| 14 | Refund | ✅ full lifecycle | ✅ | ✅ | ✅ | ✅ | 🟡 request queue |
| 15 | Modification | ✅ date change, upgrade, guests | 🟡 | 🟡 | 🟡 | 🔴 | 🔴 |
| 16 | Vendor management | 🟡 stub CRUD | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 (airline reference data) |
| 17 | Customer management | 🟡 stub CRUD | 🟡 | 🟡 | 🟡 | 🟡 | ✅ passengers view |
| 18 | Notifications | 🔵 5 channels, 10 templates | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 |
| 19 | Reviews | ✅ verified-stay only | ✅ | ✅ | ✅ | ✅ | 🔴 |
| 20 | Commission | ✅ 12–14% | ✅ 9% | ✅ 15% | ✅ 18% | ✅ 8% | ✅ 5% |
| 21 | Reporting | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 22 | Revenue opportunity | High | Medium | Medium | **Highest margin** | Low volume, high attach | High volume, thin margin |

---

## Notes by category

### Stays (hotel, apartment, resort, shared room)

The only categories with a **true availability engine**. `inventory.ts` derives a per-property baseline of room types, per-night allotment and price deterministically from the listing, then applies two deltas: revenue-manager **overrides** and **consumed** units from bookings and holds. Checkout takes a real hold before the traveller types, with a visible countdown, so the last room cannot be double-sold — and there is a regression test proving it. Four cancellation policies (`flexible`, `moderate`, `strict`, `non_refundable`) drive refund quoting. Rate plans and room types are selectable at checkout.

**Gap:** no minimum/maximum stay rules, no closed-to-arrival/departure, no per-channel allotment, no overbooking policy.

### Convention hall and visa — request products

Both correctly bypass immediate payment: `isRequestVertical()` routes them to a `pending` booking with a `due` invoice and a "no payment taken" message. Visa has no date range and falls back to an appointment date.

**Gap:** no quotation workflow (send quote → accept → convert to booking), no document upload for visa applications, no application status tracking beyond booking status, no embassy/appointment integration.

### Transport, tours, activities

Priced per trip or per person with sensible add-ons. Highest commission rates in the book (15–18%), making them the best margin per booking.

**Gap:** no time-slot inventory (a 09:00 and a 14:00 departure are not distinct sellable units), no capacity limits per departure, no pick-up point selection, no supplier confirmation loop.

### Flights

The deepest single vertical, and the only one with a fully separate booking flow, seat map, fare rules and post-booking artefacts (PNR, e-ticket number, boarding pass). Flight bookings deliberately emit the same invoice/payment records as stays so they appear in the shared account screens with no branching.

**Gap:** no supplier. Offers are generated deterministically from a self-describing offer id, which is an elegant stand-in for an offer cache but is not a fare source. No ticketing, no schedule-change or IRROPS handling, no airline settlement, no ancillary fulfilment.

---

## What is missing across every category

| Missing | Impact |
|---|---|
| Server-side availability and price authority | A client can alter what it is charged |
| Real supplier connectivity (channel manager, GDS/NDC, activity APIs) | No real inventory can be sold |
| Rate parity and stop-sell controls | Overselling and price disputes |
| Multi-currency price storage | All prices are USD, converted for display only |
| Voucher / ticket / confirmation PDF | Nothing can be presented at check-in |
| Supplier confirmation loop | A booking is confirmed without the supplier agreeing |
| Time-slot / session inventory for experiences | Cannot sell capacity by departure |
| Waitlist and alternative-date suggestions | Lost demand on sold-out dates |
