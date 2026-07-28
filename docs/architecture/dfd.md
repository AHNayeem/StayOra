# Otithee — Data Flow Diagram (DFD) Suite

A complete, multi-level Data Flow Diagram for the Otithee all-in-one travel booking
platform (Stays, Experiences & Services, Promotions & Loyalty, and User/Provider
Management).

**Notation used throughout**

- External Entity → `[Rectangle]`
- Process → `((Circle))`
- Data Store → `[(Cylinder)]`

---

## 1. Context Diagram — DFD Level 0

The entire platform is modeled as a single process (`0`). Only the boundary flows
between Otithee and the outside world are shown.

```mermaid
flowchart TD
    %% External Entities
    CUST[Customer]
    PROV[Service Provider / Partner]
    PAY[Payment Gateway]
    VISA[External Visa Processor]
    NOTIF[Notification Service<br/>Email / SMS]
    ADMIN[System Admin]

    %% Central System
    SYS(("0<br/>Otithee<br/>Booking Platform"))

    %% Customer flows
    CUST -->|Registration, Login, Search Criteria,<br/>Booking Request, Payment Details,<br/>Reviews, Promo Codes, Visa Docs| SYS
    SYS -->|Search Results, Booking Confirmation,<br/>E-Tickets/Vouchers, Receipts,<br/>Wishlist, Flash Deals| CUST

    %% Provider flows
    PROV -->|Listings, Availability Calendar,<br/>Pricing, Promotions| SYS
    SYS -->|Booking Alerts, Payout Statements,<br/>Occupancy & Performance Reports| PROV

    %% Payment Gateway
    SYS -->|Payment Intent, Charge / Refund Request| PAY
    PAY -->|Auth Result, Settlement,<br/>Refund Confirmation| SYS

    %% Visa Processor
    SYS -->|Applicant Data, Uploaded Documents| VISA
    VISA -->|Application Status,<br/>Approval / Rejection| SYS

    %% Notification Service
    SYS -->|Templated Messages,<br/>Recipient + Payload| NOTIF
    NOTIF -->|Delivery Receipts / Status| SYS

    %% Admin
    ADMIN -->|Config, Moderation Actions,<br/>Refund Approvals, Content| SYS
    SYS -->|Dashboards, Audit Logs, KPIs| ADMIN
```

---

## 2. Overview Diagram — DFD Level 1

The `0` process is decomposed into 8 core processes (1.0–8.0) with the 6 primary
data stores (D1–D6).

```mermaid
flowchart TD
    %% External Entities
    CUST[Customer]
    PROV[Service Provider / Partner]
    PAY[Payment Gateway]
    VISA[External Visa Processor]
    NOTIF[Notification Service]
    ADMIN[System Admin]

    %% Processes
    P1((1.0<br/>Auth & Account<br/>Management))
    P2((2.0<br/>Search & Discovery<br/>Engine))
    P3((3.0<br/>Booking &<br/>Reservation Engine))
    P4((4.0<br/>Payment &<br/>Refund Mgmt))
    P5((5.0<br/>Provider &<br/>Inventory Mgmt))
    P6((6.0<br/>Visa & Travel<br/>Document Service))
    P7((7.0<br/>Reviews &<br/>Rating System))
    P8((8.0<br/>Marketing &<br/>Notifications))

    %% Data Stores
    D1[(D1: User Profiles<br/>& Auth Data)]
    D2[(D2: Inventory<br/>& Listings)]
    D3[(D3: Bookings<br/>& Reservations)]
    D4[(D4: Payment &<br/>Transaction Logs)]
    D5[(D5: Reviews<br/>& Feedback)]
    D6[(D6: Discounts,<br/>Coupons & Flash Sales)]

    %% 1.0 Auth
    CUST -->|Credentials| P1
    PROV -->|Credentials| P1
    P1 <-->|Profile / Session| D1
    P1 -->|Session Token| CUST

    %% 2.0 Search & Discovery
    CUST -->|Filters, Wishlist Toggle| P2
    P2 -->|Read Listings| D2
    P2 -->|Read Active Deals| D6
    P2 -->|Wishlist Persist| D1
    P2 -->|Results, Flash Deals| CUST

    %% 3.0 Booking
    CUST -->|Cart / Checkout Selection| P3
    P3 -->|Validate Promo| D6
    P3 -->|Check Availability| D2
    P3 <-->|Create / Update Booking| D3
    P3 -->|Payment Intent| P4
    P3 -->|Confirmation| CUST

    %% 4.0 Payment
    P4 -->|Charge / Refund| PAY
    PAY -->|Auth / Settlement| P4
    P4 <-->|Txn Records| D4
    P4 -->|Payment Status| P3
    ADMIN -->|Refund Approval| P4

    %% 5.0 Provider & Inventory
    PROV -->|Listings, Pricing, Calendar| P5
    P5 <-->|CRUD Listings| D2
    P5 -->|Booking Alerts, Payouts| PROV
    P5 -->|Read Bookings| D3

    %% 6.0 Visa
    CUST -->|Visa Application + Docs| P6
    P6 <-->|Store Application| D3
    P6 -->|Applicant Data| VISA
    VISA -->|Status Update| P6
    P6 -->|Status Notice| P8

    %% 7.0 Reviews
    CUST -->|Rating + Comment| P7
    P7 -->|Verify Completed Booking| D3
    P7 <-->|Store Review| D5
    P7 -->|Aggregate Rating| D2

    %% 8.0 Marketing & Notifications
    ADMIN -->|Campaigns, Promo Setup| P8
    P8 <-->|Manage Coupons/Deals| D6
    P8 -->|Read Recipients| D1
    P8 -->|Messages| NOTIF
    P3 -->|Booking Event| P8
    P4 -->|Payment Event| P8
    NOTIF -->|Alerts, Newsletters| CUST
```

---

## 3. Data Stores Reference (D1–D6)

| ID | Data Store | Primary Contents | Written by | Read by |
|----|------------|------------------|------------|---------|
| **D1** | User Profiles & Auth Data | Credentials, roles (Customer/Superhost/Admin), sessions, wishlists, newsletter opt-in, loyalty tier | 1.0, 2.0 | 1.0, 2.0, 8.0 |
| **D2** | Inventory & Listings | Stays, tours, transport, visa products, availability calendar, pricing, aggregate ratings | 5.0, 7.0 | 2.0, 3.0, 5.0 |
| **D3** | Bookings & Reservations | Reservation records, status, guest/traveler details, visa applications | 3.0, 6.0 | 3.0, 5.0, 6.0, 7.0 |
| **D4** | Payment & Transaction Logs | Payment intents, charges, refunds, payout ledger, gateway references | 4.0 | 4.0 |
| **D5** | Reviews & Feedback | Ratings, comments, provider responses, moderation flags | 7.0 | 7.0 |
| **D6** | Discounts, Coupons & Flash Sales | Promo codes (WELCOME10, SUMMER25), member discounts, flash-deal windows, usage limits | 8.0 | 2.0, 3.0, 8.0 |

---

## 4. Level 2 — Process 3.0: Booking & Reservation Engine

Step-by-step transformation from checkout selection → promo validation → payment
intent → status update → confirmation emission.

```mermaid
flowchart TD
    CUST[Customer]
    PAY[Payment Gateway]

    %% Sub-processes of 3.0
    P31((3.1<br/>Build Cart &<br/>Validate Selection))
    P32((3.2<br/>Check Availability<br/>& Lock Inventory))
    P33((3.3<br/>Apply & Validate<br/>Promo Code))
    P34((3.4<br/>Calculate Price<br/>& Taxes))
    P35((3.5<br/>Create Payment<br/>Intent))
    P36((3.6<br/>Update Booking<br/>Status))
    P37((3.7<br/>Emit Confirmation<br/>& Voucher))

    %% Data Stores
    D2[(D2: Inventory<br/>& Listings)]
    D3[(D3: Bookings<br/>& Reservations)]
    D6[(D6: Coupons<br/>& Flash Sales)]
    D4[(D4: Payment<br/>Logs)]

    %% To Process 4.0 / 8.0
    P4((4.0<br/>Payment Mgmt))
    P8((8.0<br/>Notifications))

    CUST -->|Selected item, dates, guests| P31
    P31 -->|Line items| P32
    P32 -->|Availability query| D2
    D2 -->|Open slots / rates| P32
    P32 -->|Reserved-hold, draft booking| D3
    P32 -->|Valid cart| P33

    CUST -->|Promo code: WELCOME10 / SUMMER25| P33
    P33 -->|Lookup code + rules| D6
    D6 -->|Discount %, validity, usage cap| P33
    P33 -->|Discount applied / rejected| P34

    P34 -->|Subtotal + tax - discount = total| P35
    P35 -->|Amount, currency, booking ref| P4
    P4 -->|Payment intent id| P35
    P35 -->|Intent client secret| CUST
    CUST -->|Confirm & pay| PAY
    PAY -->|Webhook: succeeded / failed| P4
    P4 -->|Txn record| D4
    P4 -->|Payment result| P36

    P36 -->|Status: PENDING to CONFIRMED| D3
    P36 -->|Decrement / release inventory| D2
    P36 -->|Increment promo usage| D6
    P36 -->|Confirmed booking| P37

    P37 -->|Booking + voucher payload| P8
    P37 -->|E-ticket / voucher| CUST
```

**Key data transformations in 3.0**

| Step | Input | Transformation | Output |
|------|-------|----------------|--------|
| 3.1 | Item, dates, guest count | Structure into line items | Validated cart |
| 3.2 | Cart | Availability check + soft-lock | Draft booking (`PENDING`) in D3 |
| 3.3 | Promo code + cart | Rule/expiry/usage-cap check | Accept or reject discount |
| 3.4 | Subtotal, tax, discount | `total = subtotal + tax - discount` | Final payable amount |
| 3.5 | Amount + booking ref | Create payment intent via 4.0 | Client secret to customer |
| 3.6 | Gateway result | State machine `PENDING → CONFIRMED / FAILED` | Committed booking, inventory & promo updated |
| 3.7 | Confirmed booking | Render voucher + trigger notify | E-ticket + event to 8.0 |

---

## 5. Level 2 — Process 6.0: Visa & Travel Document Assistance

Document intake → status processing → notification flow.

```mermaid
flowchart TD
    CUST[Customer]
    VISA[External Visa Processor]
    ADMIN[System Admin]

    P61((6.1<br/>Visa Application<br/>Intake))
    P62((6.2<br/>Document<br/>Validation))
    P63((6.3<br/>Submit to<br/>External Processor))
    P64((6.4<br/>Track & Update<br/>Status))
    P65((6.5<br/>Notify<br/>Applicant))

    D3[(D3: Bookings /<br/>Visa Applications)]
    D2[(D2: Visa Products<br/>& Requirements)]
    P8((8.0<br/>Notifications))

    CUST -->|Passport, photos, itinerary, form| P61
    P61 -->|Read required doc checklist| D2
    D2 -->|Country / visa-type rules| P61
    P61 -->|New application record| D3
    P61 -->|Uploaded documents| P62

    P62 -->|Completeness & format check| P62
    P62 -->|Rejected: missing docs| P65
    P62 -->|Valid package| P63

    P63 -->|Applicant data + docs| VISA
    P63 -->|Status: SUBMITTED| D3

    VISA -->|Processing / Approved / Rejected| P64
    ADMIN -->|Manual override / note| P64
    P64 -->|Status update| D3
    P64 -->|Status change event| P65

    P65 -->|Message payload + recipient| P8
    P8 -->|Email / SMS status| CUST
```

**Key data transformations in 6.0**

| Step | Input | Transformation | Output |
|------|-------|----------------|--------|
| 6.1 | Uploaded docs + form | Match against country/visa requirements (D2) | Application record (`DRAFT`) in D3 |
| 6.2 | Documents | Completeness & format validation | Valid package **or** rejection notice |
| 6.3 | Valid package | Forward to external processor | `SUBMITTED` status |
| 6.4 | Processor / admin updates | State machine `SUBMITTED → PROCESSING → APPROVED/REJECTED` | Updated D3 + status event |
| 6.5 | Status event | Compose notification | Message to 8.0 → Customer |

---

## 6. Consolidated Data-Flow Mapping Table

| # | Data Flow | Source | Destination | Data Elements |
|---|-----------|--------|-------------|---------------|
| 1 | Registration/Login | Customer | 1.0 | Email, password, profile, OTP |
| 2 | Session token | 1.0 | Customer | JWT/session id, role |
| 3 | Search criteria | Customer | 2.0 | Location, dates, guests, category, price filters |
| 4 | Search results | 2.0 | Customer | Ranked listings, flash deals, ratings |
| 5 | Wishlist toggle | Customer | 2.0 → D1 | User id, listing id |
| 6 | Listing/pricing/calendar | Provider | 5.0 → D2 | Listing details, rates, availability |
| 7 | Checkout selection | Customer | 3.0 | Listing id, dates, guests, add-ons |
| 8 | Promo validation | 3.0 ↔ D6 | — | Code (WELCOME10/SUMMER25), discount %, usage cap |
| 9 | Payment intent | 3.0/4.0 → Payment Gateway | — | Amount, currency, booking ref |
| 10 | Auth/settlement | Payment Gateway | 4.0 → D4 | Txn id, status, amount |
| 11 | Booking confirmation | 3.0 → Customer / 8.0 | — | Booking id, voucher/e-ticket |
| 12 | Refund request | 4.0 (Admin-approved) → Payment Gateway | — | Txn id, refund amount |
| 13 | Visa application | Customer | 6.0 → D3 | Passport, photos, itinerary, form |
| 14 | Visa submission | 6.0 → Visa Processor | — | Applicant data, documents |
| 15 | Visa status | Visa Processor | 6.0 → D3 → 8.0 | Application id, status |
| 16 | Review submission | Customer | 7.0 → D5 | Booking id, rating, comment |
| 17 | Aggregate rating | 7.0 → D2 | — | Listing id, avg score, count |
| 18 | Campaign/promo setup | Admin | 8.0 → D6 | Coupon rules, flash-deal windows |
| 19 | Notification dispatch | 8.0 → Notification Service | — | Recipient, template, payload |
| 20 | Payout statement | 5.0 → Provider | — | Provider id, earnings, period |
| 21 | Delivery receipt | Notification Service | 8.0 | Message id, delivery status |
