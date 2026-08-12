# Otithee AI Travel Assistant — Complete Prototype Implementation

## ROLE

You are a Principal Frontend Architect, Senior AI Product Engineer, Senior UX Engineer, and Travel-Tech Product Designer.

Your task is to integrate a production-quality **AI Travel Assistant prototype** into the existing Otithee application.

This is NOT a request to build a generic chatbot.

The goal is to create a **Otithee AI Travel Concierge + Booking Copilot** that understands the user's travel intent and interacts with Otithee's existing travel products and services.

---

# CRITICAL RULE — ANALYZE BEFORE CODING

Before changing any code, thoroughly inspect the existing Otithee project.

Do NOT immediately start implementing.

First analyze only the parts relevant to this feature:

* Current app architecture
* Existing routes
* Existing layouts
* Existing design system
* Shared components
* Search system
* Hotel module
* Flight module
* Booking module
* Checkout
* User dashboard
* Wishlist
* Reviews
* Transport
* Tours
* Activities
* Visa
* Authentication
* User preferences
* Mock data architecture
* Service/data layer
* State management
* i18n
* Currency handling
* Notification system

Also inspect any existing AI-related code if present.

IMPORTANT:

Do not read the entire repository repeatedly.

Use targeted inspection.

First identify relevant files/directories, then inspect only the files necessary for implementation.

Do not modify unrelated modules.

---

# CURRENT PROJECT MUST REMAIN INTACT

Otithee already contains an existing frontend prototype.

DO NOT:

* Rebuild the project
* Replace the existing design
* Rewrite existing modules unnecessarily
* Introduce a new UI framework
* Duplicate existing components
* Create parallel versions of existing features
* Replace working architecture without a concrete reason

Reuse the existing:

* Components
* Layouts
* Services
* Hooks
* Types
* Utilities
* Design tokens
* Search components
* Booking components
* Toast system
* Modal system
* Form components
* Cards
* Tables
* Dashboard components

Extend the current architecture instead of creating a second architecture.

---

# PRIMARY OBJECTIVE

Build a complete AI Travel Assistant prototype capable of:

1. Understanding natural-language travel requests
2. Searching Otithee's mock travel data
3. Recommending hotels
4. Searching flights
5. Comparing options
6. Building itineraries
7. Optimizing travel budget
8. Creating trip plans
9. Assisting with booking
10. Managing existing trips
11. Answering Otithee travel-related questions

The prototype must feel like a real AI-powered travel platform.

---

# AI MUST NOT INVENT DATA

This is extremely important.

The AI layer must NOT hallucinate:

* Flight prices
* Hotel availability
* Booking status
* Room availability
* Tour availability
* Activity availability
* Visa requirements
* Payment status

The AI should understand intent and call Otithee services/tools.

Architecture:

User
↓
AI Assistant
↓
Intent / Tool Selection
↓
Otithee Service Layer
↓
Mock Data
↓
Structured Result
↓
AI Response
↓
UI Action

The future real API should be replaceable without rewriting the AI UI.

---

# AI TOOL ARCHITECTURE

Create a lightweight tool/function abstraction.

Example:

searchHotels()

searchFlights()

searchTours()

searchActivities()

searchTransport()

searchVisa()

compareHotels()

compareFlights()

getHotelDetails()

getFlightDetails()

getUserBookings()

getTripDetails()

createTripPlan()

calculateTripBudget()

createBookingDraft()

getRecommendations()

The AI layer should call tools instead of directly accessing mock datasets.

Keep the abstraction simple.

Do NOT introduce unnecessary AI infrastructure for the prototype.

---

# MOCK AI ENGINE

For the current prototype, the AI does not require a real LLM API.

Create a deterministic/mock AI engine that demonstrates the complete experience.

It should:

* Parse common travel intents
* Extract basic parameters
* Call appropriate Otithee services
* Return structured responses
* Render interactive UI cards
* Support follow-up questions
* Maintain conversation context during the session

Examples:

User:

"Find cheap flights from Dhaka to Bangkok."

→ searchFlights()

User:

"Show hotels near the airport under $100."

→ searchHotels()

User:

"Compare these three."

→ compareHotels()

User:

"Plan a 5-day Dubai trip under $1,500."

→ createTripPlan() + searchFlights() + searchHotels() + searchActivities()

---

# FUTURE REAL AI READY

Design the AI interface so the mock engine can later be replaced by:

* OpenAI
* Anthropic
* Gemini
* OpenRouter
* Internal LLM API

without changing the assistant UI.

Use a clean interface such as:

AIProvider

MockAIProvider

FutureLLMProvider

Do not implement real API integration unless the project already has one.

---

# AI ASSISTANT ENTRY POINTS

The assistant should be accessible from:

1. Homepage
2. Global navigation
3. Flight search
4. Hotel search
5. Search results
6. Hotel details
7. Flight details
8. Booking flow
9. User dashboard

Use contextual prompts.

Example:

Hotel details:

"Ask Otithee AI about this hotel"

Flight details:

"Ask AI to compare this flight"

Homepage:

"Where do you want to go?"

---

# AI HOME EXPERIENCE

Create a polished AI assistant entry section.

Examples:

"Plan my next trip"

"Find the cheapest flight"

"Find a family hotel"

"Build a 7-day itinerary"

"Compare hotels"

"Help me plan within my budget"

Use suggestion chips.

---

# NATURAL LANGUAGE SEARCH

Support queries such as:

"Hotels in Bali under $150"

"Beach resorts in Cox's Bazar"

"Cheap flights from Dhaka to Dubai"

"Business class Dhaka to London"

"Family-friendly hotels in Bangkok"

"Things to do in Singapore"

"Airport transfer in Dubai"

Convert natural language into structured filters.

Then use existing search/service architecture.

---

# AI FLIGHT ASSISTANT

Integrate with the existing Flight module.

Support:

One Way

Round Trip

Multi City

Economy

Premium Economy

Business

First Class

Passenger counts

Dates

Airports

Stops

Price

Airline

Duration

Flexible dates

The assistant should be able to answer:

"Find the cheapest flight."

"Show direct flights."

"Find business class."

"Compare these flights."

"What's the fastest option?"

Use actual flight mock data.

---

# AI HOTEL ASSISTANT

Support:

Destination

Dates

Guests

Budget

Rating

Amenities

Location

Property type

Breakfast

Family-friendly

Couples

Business travel

Beachfront

Airport proximity

The assistant should recommend based on structured Otithee data.

---

# SMART COMPARISON

User can say:

"Compare these hotels."

The assistant should generate a structured comparison UI.

Compare:

Price

Rating

Location

Distance

Amenities

Breakfast

Cancellation

Reviews

Value

Then provide a short recommendation.

---

# AI TRIP PLANNER

Support prompts such as:

"Plan a 5-day Dubai trip."

"Plan a family trip to Thailand under $2,000."

"Plan a romantic weekend in Bali."

The assistant should produce:

Destination

Flight suggestion

Hotel suggestion

Activities

Transport

Estimated cost

Daily itinerary

---

# AI BUDGET OPTIMIZER

User provides a budget.

Example:

"Plan this trip under $1,000."

Show:

Flight

Hotel

Activities

Transport

Taxes/fees

Estimated total

Remaining budget

If over budget:

Suggest alternatives.

Example:

"Switching to this hotel saves $120."

Do not invent savings.

Calculate from actual mock data.

---

# AI ITINERARY BUILDER

Create structured itinerary UI.

Example:

Day 1

Flight

Airport transfer

Hotel check-in

Dinner

Day 2

Activity

Lunch

Tour

Day 3

etc.

Allow:

Add activity

Remove activity

Move activity

View details

Save trip

Share trip

---

# TRIP MEMORY

For the prototype, maintain session-level context.

Example:

User:

"I want to visit Dubai."

Then:

"Find me a hotel."

The assistant should understand that "hotel" refers to Dubai.

Do not build complicated long-term memory unless existing architecture already supports it.

Keep prototype memory lightweight.

---

# BOOKING ASSISTANT

AI can prepare a booking draft.

Example:

User:

"Book this hotel."

Assistant:

Show:

Property

Dates

Guests

Price

Taxes

Cancellation policy

Then:

[Continue to Booking]

Never finalize payment automatically.

Any financially consequential action must require explicit user confirmation.

---

# EXISTING BOOKING MANAGEMENT

Allow AI to answer:

"Show my bookings."

"What's my next trip?"

"Show my Dubai booking."

"Can I cancel my booking?"

"Show my flight."

Use existing mock booking services.

---

# VISA ASSISTANT

If the existing Otithee Visa module is available:

Allow queries such as:

"Do I need a visa?"

"What documents are required?"

However:

Do NOT present legal/immigration information as guaranteed facts from the mock AI.

Clearly mark prototype/demo data.

Prepare the architecture for future verified external/API sources.

---

# AI REVIEW ASSISTANT

If review functionality exists:

Allow:

"Summarize these reviews."

"Write a review for this hotel."

"Why do people like this hotel?"

Use existing review data.

The AI summary must be generated from actual mock reviews.

---

# CONVERSATION UI

Create a polished conversational interface.

Support:

User messages

AI messages

Loading state

Typing indicator

Error state

Retry

Suggestion chips

Result cards

Hotel cards

Flight cards

Comparison cards

Itinerary cards

Budget cards

Booking summary cards

CTA buttons

Inline actions

Do not make every response plain text.

The assistant should return rich, interactive UI.

---

# CONVERSATION CONTEXT

Maintain structured context:

destination

dates

travelers

budget

trip type

cabin class

hotel preferences

selected items

current trip

Do not store the entire conversation unnecessarily.

Store only useful structured context.

This reduces state complexity and token/data overhead.

---

# TOASTS AND ACTION FEEDBACK

Every action should provide feedback.

Examples:

Trip saved

Hotel added

Flight selected

Preference updated

Booking draft created

Itinerary updated

Copied

Shared

Error

Use the existing toast system.

Do not create another notification system.

---

# LOADING AND ERROR STATES

Every AI operation must support:

Idle

Loading

Success

Empty

Error

Retry

Use realistic simulated delays in the mock service.

Do not add artificial delays everywhere.

Only service/tool operations should simulate network latency.

---

# RESPONSIVE DESIGN

Desktop

Tablet

Mobile

The assistant should work as:

Desktop:
Side panel / floating assistant / dedicated page

Mobile:
Bottom sheet or full-screen experience

Reuse existing responsive patterns.

---

# INTERNATIONAL READY

Otithee is intended for national and international users.

AI architecture must be compatible with:

Multiple languages

Multiple currencies

Timezone differences

International airports

Country selection

Date formats

12/24 hour format

Metric/Imperial units

RTL-ready UI

Do not hardcode Bangladesh-specific assumptions into the architecture.

Bangladesh may be included in demo data, but the product must remain global.

---

# ACCESSIBILITY

Follow existing accessibility standards.

Ensure:

Keyboard navigation

Focus management

ARIA labels

Accessible dialogs

Screen reader-friendly messages

Visible focus states

Proper contrast

Do not sacrifice accessibility for animations.

---

# PERFORMANCE AND TOKEN EFFICIENCY

IMPORTANT:

This is a large existing project.

Avoid unnecessary context and code churn.

Rules:

1. Do not repeatedly inspect the same files.
2. First map relevant files, then inspect only necessary files.
3. Reuse existing components.
4. Do not rewrite working modules.
5. Do not generate large duplicate files.
6. Keep mock datasets modular.
7. Keep AI responses structured.
8. Keep conversation context minimal.
9. Avoid unnecessary dependencies.
10. Do not add libraries if existing project functionality can solve the problem.
11. Do not output long explanations after every implementation step.
12. Prefer concise progress summaries.
13. After each phase, record a compact implementation summary in the project documentation.
14. Continue to the next phase without repeatedly re-analyzing unchanged code.

Optimize for implementation quality AND context efficiency.

---

# IMPLEMENTATION PHASES

First create a concise implementation plan.

Then implement in phases.

## Phase 1 — Architecture Audit

Analyze existing Otithee.

Produce:

AI integration map

Affected routes

Reusable components

Required services

Required types

Required state

Potential conflicts

Do not implement unrelated changes.

---

## Phase 2 — AI Foundation

Create:

AI types

AI provider interface

Mock AI provider

Tool registry

Intent model

Conversation state

Structured AI response model

Keep this lightweight.

---

## Phase 3 — AI Tools

Implement tools for:

Hotel search

Flight search

Tour search

Activity search

Transport search

Booking lookup

Comparison

Trip planning

Budget calculation

Recommendations

Reuse existing services.

---

## Phase 4 — Assistant UI

Implement:

Assistant launcher

Chat interface

Messages

Typing state

Suggestion chips

Rich result cards

Comparison UI

Trip plan UI

Budget UI

Booking draft UI

Responsive behavior

---

## Phase 5 — Product Integration

Integrate with:

Homepage

Hotel

Flight

Search

Booking

Dashboard

Trip pages

Do not create duplicate search or booking systems.

---

## Phase 6 — Contextual AI

Add contextual actions.

Hotel page:

"Ask AI about this hotel"

Flight page:

"Compare this flight"

Search page:

"Help me choose"

Dashboard:

"Plan my next trip"

---

## Phase 7 — Polish

Improve:

UX

Animations

Empty states

Loading states

Error states

Accessibility

Mobile

Typography

Spacing

Visual consistency

---

## Phase 8 — Full Audit

Perform a complete final audit.

Check:

Routes

Links

Buttons

Actions

Services

Types

State

Responsive behavior

Accessibility

Mock data

Error handling

Loading

Toasts

Navigation

AI context

Booking integration

Flight integration

Hotel integration

Dashboard integration

International readiness

Find and fix issues.

---

# DOCUMENTATION

Create/update only necessary documentation.

At minimum:

AI_ARCHITECTURE.md

AI_TOOLS.md

AI_MOCK_PROVIDER.md

AI_TO_REAL_LLM.md

Keep documentation concise and practical.

Document:

Current architecture

Tool list

Data flow

Mock → Real AI migration

Important assumptions

---

# FINAL REQUIREMENT

When complete, Otithee should feel like it has a real AI Travel Concierge.

A user should be able to naturally say:

"I want to go to Dubai for five days with my wife. My budget is $1,500. Find me a good flight, a hotel near downtown, and two activities."

The prototype should:

1. Understand the request
2. Extract relevant information
3. Search Otithee data
4. Recommend flights
5. Recommend hotels
6. Recommend activities
7. Calculate estimated budget
8. Generate itinerary
9. Allow the user to inspect selections
10. Allow the user to continue toward booking

Everything should be powered by the Otithee service layer.

The final architecture must allow:

Mock Data
→ Real API

Mock AI Provider
→ Real LLM Provider

without rewriting the UI.

---

# EXECUTION RULE

Do not stop after planning.

After the initial analysis and plan, implement the complete feature sequentially.

Do not ask for confirmation between phases unless there is a genuinely blocking architectural decision.

After each phase:

* Verify the implementation
* Fix obvious issues
* Record a concise phase summary
* Continue

Do not waste tokens explaining routine implementation details.

At the end provide only a concise summary containing:

* What was implemented
* Important files/modules added or changed
* Any known limitations
* What is required later to connect real AI/API services

Do not claim something works unless you actually verified it.








## Implementation result ##

Done. Cleaned up, verified, and the dev server is stopped.

What was implemented:
A Otithee AI Travel Concierge built as a conversational layer on the existing architecture — no new data, no duplicate search or booking system, no new UI framework.

The engine understands natural-language travel requests, selects tools, and returns structured responses rendered as interactive cards. It handles all 18 conversation flows from the spec, verified end-to-end: NL search, flights (cabin/stops/dates/ranking), hotels, tours, activities, transfers, visas, comparison, trip planning, budget optimisation, itinerary building, trip memory, booking drafts, existing bookings, and review summaries.

The no-hallucination rule is structural, not prompted. The provider's only data-side import is features/ai/tools — it has no import path to constants/listings or lib/mock/*. Every price, policy and status is a field from a tool result, and booking totals use computeBookingPricing, the same function checkout uses, so a draft and the checkout page cannot disagree.

Key files:
Added	
types/ai.ts	Domain types incl. the AIProvider interface
services/ai.ts	Service seam — swap for a fetch to go server-side
features/ai/	Provider, NLU, tools, UI, block renderers, saved trips
app/(marketing)/ai/page.tsx	Dedicated assistant page
AI_ARCHITECTURE.md, AI_TOOLS.md, AI_MOCK_PROVIDER.md, AI_TO_REAL_LLM.md	Docs
Changed (entry points only): marketing layout, site header, mobile drawer, homepage, listing template + results bar, listing detail, flight results, flight detail, search results, checkout, account overview.

One bug fixed outside the AI module: lib/mock/listing-factory.ts:242 drew two independent destinations for transport, so a "Dubai Transfer" was located in Paris. The assistant surfaced it; the site's own transport pages had it too.

Defects found and fixed during verification:
Running the engine headlessly against real prompts caught things a visual pass wouldn't: "Nice" matched "Venice" via substring; a "hotel in Dubai" ask silently relaxed the destination (returning Vienna) instead of the property type; "Bali" never resolved to DPS because the dataset calls it "Denpasar (Bali)", so Bali plans silently had no flight; and a second send while busy left the first message stuck on the typing indicator forever.

Known limitations:
Parsing is pattern-based; unusual phrasing falls through to a clarifying question rather than a guess.
Multi-city is parsed as a trip type but planned as a single leg pair.
Answer quality is bounded by the demo catalog — Dubai has no hotel rows, so the assistant says so and widens to the UAE rather than inventing one.
getUserBookings reads the demo traveller; it is not session-scoped yet.
Visa answers are marked prototype data throughout and are not legal advice.
To connect real services:
Write one class implementing AIProvider, register it in features/ai/provider/index.ts, and set NEXT_PUBLIC_AI_PROVIDER. Move the call server-side by changing the body of askAssistant to a fetch at a Route Handler that holds the key. TOOL_DESCRIPTORS serialises directly into function-calling definitions. Mock data → real API is orthogonal and already prepared: only the services/* bodies change. AI_TO_REAL_LLM.md covers the five rules that keep the no-hallucination guarantee intact once a model is in the loop.