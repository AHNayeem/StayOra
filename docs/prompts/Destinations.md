You are working on the StayOra booking application.

## Objective

Fix the broken destination system and implement a complete, production-ready **Destination Management prototype** without adding a real database or backend.

Current issue:

* `http://localhost:3004/destinations/bali` returns **404**
* Existing destination links are not reliably valid
* There is no proper process/UI to add a new destination
* Destination data, listing pages, detail pages, and navigation are not fully connected

The goal is to make the entire destination flow work as a realistic frontend-only prototype, while keeping the architecture ready for a future backend/API integration.

---

# 1. First Audit the Existing Implementation

Before changing anything:

* Inspect the existing destination-related routes
* Inspect destination components
* Inspect navigation/menu links
* Inspect existing mock/demo data
* Inspect search/filter components that reference destinations
* Inspect booking/listing pages that may link to destinations
* Search the entire project for:

  * `/destinations`
  * `/destinations/`
  * `destination`
  * hardcoded destination slugs
  * invalid destination URLs
* Identify whether a destination domain/model already exists
* Reuse existing architecture where possible

Do NOT recreate functionality that already exists.

Do NOT unnecessarily modify unrelated modules.

---

# 2. Create a Canonical Destination Domain Model

Create or consolidate a single canonical destination model/type.

Example conceptual structure:

```ts
type Destination = {
  id: string
  slug: string
  name: string
  country: string
  region?: string
  description: string
  shortDescription?: string
  image: string
  gallery?: string[]
  status: "draft" | "published" | "archived"
  featured?: boolean

  attractions?: string[]
  activities?: string[]
  highlights?: string[]

  latitude?: number
  longitude?: number

  metadata?: {
    seoTitle?: string
    seoDescription?: string
  }

  createdAt: string
  updatedAt: string
}
```

Adapt this to the project's existing TypeScript/domain conventions instead of blindly copying it.

Important:

* `id` is the internal identifier
* `slug` is the public URL identifier
* slug must be unique
* never use the display name directly as the route identifier
* keep the model API-ready

---

# 3. Create a Single Source of Truth for Destination Data

Create/use a destination repository/store/service layer.

For prototype mode, use mock/in-memory/local state data.

The UI should NOT independently hardcode destination objects in multiple places.

The architecture should conceptually be:

```text
UI
 ↓
Destination Service / Repository
 ↓
Mock Destination Store
```

Later it should be possible to replace:

```text
MockDestinationStore
```

with:

```text
DestinationApiRepository
```

without rewriting the UI.

Provide methods similar to:

```ts
getDestinations()
getDestinationById(id)
getDestinationBySlug(slug)
createDestination(input)
updateDestination(id, input)
deleteDestination(id)
publishDestination(id)
archiveDestination(id)
```

Use the project's existing architecture/style if equivalent abstractions already exist.

---

# 4. Fix `/destinations`

Implement a valid destination index page:

```text
/destinations
```

It should display:

* Destination title/header
* Search
* Country/region filtering if appropriate
* Featured destinations
* Destination cards
* Image
* Destination name
* Country
* Short description
* CTA

Every destination card must link using its canonical slug:

```text
/destinations/{slug}
```

Never generate links manually from arbitrary text.

---

# 5. Fix `/destinations/[slug]`

Implement the dynamic destination detail route:

```text
/destinations/[slug]
```

Therefore this must work:

```text
/destinations/bali
```

and existing valid destination slugs must also work.

The page should load the destination through:

```ts
getDestinationBySlug(slug)
```

Do NOT hardcode:

```ts
if (slug === "bali") ...
```

---

# 6. Destination Detail Page

Build a complete destination detail experience.

Include, where appropriate:

* Hero image
* Destination name
* Country/region
* Description
* Gallery
* Highlights
* Popular attractions
* Activities
* Available stays/listings related to the destination
* Tours/activities related to the destination if those modules already exist
* Related destinations
* Search/book CTA
* Breadcrumbs

The page should feel like a real booking/travel platform rather than a simple placeholder.

Reuse existing StayOra UI components wherever possible.

---

# 7. Handle Invalid Destination Slugs Properly

If:

```text
/destinations/does-not-exist
```

is requested:

* do NOT render a broken page
* do NOT throw an uncontrolled error
* show the project's standard 404/not-found experience
* provide a clear CTA back to `/destinations`

If the framework supports route-level `notFound()` behavior, use the project's established pattern.

---

# 8. Add Destination Management

There must be a complete frontend-only process for creating destinations.

Add the functionality to the appropriate admin/merchant dashboard area based on the existing StayOra RBAC architecture.

Prefer:

```text
/dashboard/destinations
```

or the project's existing admin destination convention.

Do not create a completely separate dashboard architecture if one already exists.

---

# 9. Destination Management List

Create a destination management page containing:

* Destination list/table
* Search
* Status filter
* Country/region filter if useful
* Featured indicator
* Published/Draft/Archived status
* Edit action
* View action
* Delete/archive action
* Create destination CTA

Example flow:

```text
Dashboard
   ↓
Destinations
   ↓
Create Destination
```

---

# 10. Create Destination

Implement:

```text
/dashboard/destinations/new
```

(or the project's equivalent route).

Create a proper form with validation.

Fields should include at minimum:

* Name
* Country
* Region
* Slug
* Short description
* Full description
* Hero image
* Gallery
* Highlights
* Attractions
* Activities
* Featured
* Status
* SEO title
* SEO description

Use the existing form, validation, upload/image-picker, toast, modal and UI patterns wherever available.

---

# 11. Slug Generation

When the admin enters:

```text
Bali
```

the system should suggest:

```text
bali
```

For:

```text
New York City
```

suggest:

```text
new-york-city
```

The slug should:

* be lowercase
* use hyphens
* remove invalid characters
* be URL-safe
* be unique

If the slug already exists, show a validation error or generate a safe alternative.

Do NOT silently overwrite an existing destination.

---

# 12. Create → Publish → View Flow

The complete prototype flow must work:

```text
Admin creates destination
        ↓
Destination saved to mock store
        ↓
Destination appears in dashboard
        ↓
Admin publishes it
        ↓
Destination appears on public /destinations
        ↓
Destination card links to /destinations/{slug}
        ↓
Destination detail page opens correctly
```

Also support:

```text
Draft → Edit → Publish
Published → Edit
Published → Archive
```

Use realistic state transitions.

---

# 13. Edit Destination

Implement:

```text
/dashboard/destinations/[id]/edit
```

The edit page must:

* load the existing destination
* pre-populate the form
* allow modification
* preserve unchanged fields
* update the canonical store
* immediately reflect changes on the public destination page

---

# 14. Delete vs Archive

Do not permanently destroy destination data by default.

Prefer:

```text
Published
Draft
Archived
```

For destructive operations:

* show confirmation
* explain the consequence
* use the project's existing confirmation dialog pattern

Archived destinations should not appear in normal public destination listings.

---

# 15. Fix ALL Existing Destination Links

Search the entire application and fix every invalid destination link.

Examples:

```text
/destinations/bali
/destinations/dubai
/destinations/maldives
```

Every link must resolve through an actual destination in the canonical destination store.

Do not simply create routes for a handful of hardcoded URLs.

If an existing card points to a destination that does not exist in the data store:

* either add the missing mock destination
* or change the card to a valid destination
* do not leave broken links

---

# 16. Connect Destination With Existing Booking Modules

Where existing modules support destinations, connect them properly.

Examples:

```text
Destination
   ↓
Hotels
Apartments
Resorts
Tours
Activities
Transport
```

If the existing listing/booking architecture already has a location/destination relationship, reuse it.

Do not create duplicate location systems.

For prototype purposes, use IDs/slugs so future APIs can return relationships cleanly.

---

# 17. Search / Discovery Integration

If StayOra already has:

* global search
* destination search
* autocomplete
* homepage destination cards
* popular destinations
* featured destinations
* booking search

make sure destination results link to:

```text
/destinations/{slug}
```

and not to arbitrary/hardcoded URLs.

---

# 18. Navigation Validation

Audit:

* Header
* Mega menu
* Footer
* Homepage
* Search results
* Destination cards
* Dashboard
* Breadcrumbs
* Related destinations
* Any promotional destination sections

Every destination URL must be valid.

---

# 19. Empty / Loading / Error States

Implement proper states:

### Loading

Use the project's existing loading/skeleton pattern.

### Empty

If there are no published destinations:

```text
No destinations available yet.
```

with an appropriate CTA.

### Invalid destination

Use the standard 404/not-found experience.

### Form errors

Show field-level validation and form-level errors.

---

# 20. Prototype Persistence

There is NO backend/database requirement right now.

However, avoid fragile component-local mock data.

Use a centralized mock repository/store.

If the application already has a client-side persistence mechanism such as localStorage for prototype data, use it consistently.

The architecture should make it obvious where the future API integration will happen.

Example:

```text
DestinationRepository
       ↓
MockDestinationRepository
       ↓
Future:
ApiDestinationRepository
```

---

# 21. Seed Realistic Demo Destinations

Ensure the prototype contains enough valid destinations to properly test the system.

At minimum include several destinations such as:

* Bali
* Dubai
* Maldives
* Bangkok
* Singapore
* Paris
* Istanbul

Use realistic but concise mock content.

All seeded destinations must have unique:

* id
* slug

and valid images using the project's existing image strategy.

---

# 22. SEO / Metadata

For destination detail pages, generate metadata dynamically from destination data where supported.

Example:

```text
Bali Travel Guide & Stays | StayOra
```

Description should use the destination's SEO description or fallback to its short description.

Do not hardcode Bali-specific metadata.

---

# 23. Type Safety & Architecture

Use TypeScript properly.

Avoid:

```ts
any
```

unless genuinely unavoidable.

Avoid duplicating destination types.

Avoid putting business/domain logic directly into UI components.

Keep:

```text
domain
service/repository
mock data
UI
routing
```

reasonably separated according to the existing StayOra architecture.

---

# 24. Accessibility

Follow the existing accessibility standards.

Ensure:

* semantic headings
* keyboard-accessible controls
* proper form labels
* accessible dialogs
* meaningful image alt text
* accessible links/buttons
* visible validation errors
* proper focus behavior

Target WCAG 2.2 AA.

---

# 25. Do Not Break Existing Work

IMPORTANT:

This is an enhancement/fix, not a rewrite.

Before implementation:

* inspect existing architecture
* identify reusable components
* preserve existing UI/design system
* preserve existing routes
* preserve existing dashboard structure
* preserve existing booking functionality

Only change what is necessary.

---

# 26. Verification

After implementation, test the complete flow.

### Public routes

```text
/destinations
/destinations/bali
/destinations/dubai
/destinations/maldives
```

### Invalid route

```text
/destinations/not-a-real-destination
```

### Admin flow

```text
/dashboard/destinations
/dashboard/destinations/new
/dashboard/destinations/{id}/edit
```

### Functional flow

```text
Create destination
→ Save as draft
→ Edit
→ Publish
→ Open public destination page
→ Verify card/link
→ Edit again
→ Verify public page updates
→ Archive
→ Verify it disappears from public listing
```

### Link audit

Search the project again for:

```text
/destinations/
```

and verify that every generated destination URL maps to a valid destination slug.

---

# 27. Final Quality Check

Run the project's available:

* TypeScript/typecheck
* ESLint
* build
* tests if available

Also manually verify:

* no 404 for valid seeded destinations
* no broken destination cards
* no dead navigation links
* no duplicated destination data sources
* no hardcoded `bali` route logic
* create/edit/publish/archive works
* invalid slugs correctly show 404
* public and dashboard data use the same canonical destination store
* existing StayOra features remain unaffected

At the end, provide a concise implementation summary containing:

1. Files/modules changed
2. New routes
3. Destination architecture
4. Admin workflow
5. Mock persistence approach
6. Validation/testing results
7. Any remaining limitations

Do not stop after fixing the `/destinations/bali` 404. Implement the **complete destination lifecycle and routing system** as a production-ready frontend prototype.
