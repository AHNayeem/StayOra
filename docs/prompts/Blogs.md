You are working on the StayOra booking application.

## Objective

The customer-facing blog system already exists.

For example:

```text
/blog/10-hidden-beaches-worth-the-trip
```

works on the customer side.

However, there is currently **no proper admin/merchant process to create, edit, publish, unpublish, archive, or manage blog posts**.

Implement a complete frontend-only **Blog Management & Publishing system** while preserving the existing customer-facing blog experience.

IMPORTANT:

* This is still a frontend prototype.
* Do NOT add a real database or backend.
* Use mock/demo data through a centralized repository/store.
* Architecture must be production-ready so the mock repository can later be replaced by a real API without rewriting the UI.
* Do NOT unnecessarily change the existing customer-side blog UI.

---

# 1. Audit Existing Blog Implementation

Before implementing anything, inspect the existing codebase.

Search for:

```text
/blog
/blog/
/blog/[slug]
blog
blogs
Blog
article
articles
```

Identify:

* Existing blog routes
* Blog detail page
* Blog listing page
* Blog cards
* Existing mock blog data
* Blog types/interfaces
* Categories
* Tags
* Search/filter
* Related posts
* Header/footer blog links
* Existing dashboard/admin architecture
* Existing form components
* Existing image upload/image picker
* Existing rich text/editor components
* Existing toast/notification system
* Existing modal/confirmation patterns
* Existing RBAC/role system

Reuse existing architecture and components wherever possible.

Do NOT create duplicate blog systems.

---

# 2. Establish a Canonical Blog Post Model

Create or consolidate a single canonical blog domain model.

Adapt it to the project's existing TypeScript conventions.

Conceptually:

```ts
type BlogPost = {
  id: string
  slug: string

  title: string
  excerpt?: string
  content: string

  coverImage: string
  gallery?: string[]

  authorId?: string
  authorName?: string
  authorAvatar?: string

  categoryId?: string
  categoryName?: string

  tags?: string[]

  status: "draft" | "published" | "archived"

  featured?: boolean

  publishedAt?: string

  seo?: {
    title?: string
    description?: string
    keywords?: string[]
  }

  createdAt: string
  updatedAt: string
}
```

Do not blindly copy this structure if the project already has an equivalent model.

The important requirement is to have **one source of truth**.

---

# 3. Create a Blog Repository / Service Layer

Do not keep blog data scattered across components.

Use a structure similar to:

```text
UI
 ↓
Blog Service / Repository
 ↓
Mock Blog Repository
```

The repository should expose operations such as:

```ts
getPosts()
getPublishedPosts()
getPostById(id)
getPostBySlug(slug)
createPost(input)
updatePost(id, input)
deletePost(id)
publishPost(id)
unpublishPost(id)
archivePost(id)
restorePost(id)
```

If categories/tags are separate entities, expose appropriate methods for them too.

The future architecture should allow:

```text
MockBlogRepository
```

to later become:

```text
ApiBlogRepository
```

without changing customer-facing components.

---

# 4. Preserve Existing Customer Blog Routes

Do NOT break the existing routes.

These should continue working:

```text
/blog
/blog/10-hidden-beaches-worth-the-trip
```

The existing customer blog page should load blog posts from the canonical repository instead of relying on disconnected hardcoded data.

---

# 5. Blog Listing Page

Ensure:

```text
/blog
```

works correctly.

It should display published posts only.

Each blog card should include where appropriate:

* Cover image
* Title
* Excerpt
* Category
* Author
* Published date
* Read time if the existing UI supports it
* CTA

Every card must use:

```text
/blog/{slug}
```

based on the canonical post slug.

Never construct blog URLs from arbitrary display text at render time.

---

# 6. Blog Detail Page

Ensure:

```text
/blog/[slug]
```

loads dynamically using:

```ts
getPostBySlug(slug)
```

Do NOT implement special cases such as:

```ts
if (slug === "10-hidden-beaches-worth-the-trip")
```

The existing post should continue working through the repository.

---

# 7. Invalid Blog Slug

For:

```text
/blog/not-a-real-post
```

show the application's standard 404/not-found experience.

Do not show a blank page.

Do not throw an uncontrolled runtime error.

Provide a useful CTA back to:

```text
/blog
```

---

# 8. Add Blog Management to Dashboard

Add the blog management section to the existing dashboard/admin architecture.

Prefer the project's established route convention, such as:

```text
/dashboard/blog
```

or:

```text
/dashboard/blogs
```

Do NOT create a second dashboard architecture.

Follow the existing StayOra RBAC/menu structure.

Only roles that should manage content should see the management controls.

---

# 9. Blog Management List

Create a complete blog management page.

It should support:

* Post list/table
* Search
* Status filter
* Category filter
* Author filter if relevant
* Featured filter if useful
* Sort by newest/oldest
* Create post CTA
* Edit
* Preview/View
* Publish
* Unpublish
* Archive
* Restore
* Delete where appropriate

Display useful information such as:

* Title
* Status
* Category
* Author
* Published date
* Updated date
* Featured state

Use the project's existing table/list components.

---

# 10. Create Blog Post

Implement:

```text
/dashboard/blog/new
```

or the project's equivalent.

Create a complete blog authoring form.

Minimum fields:

### Basic information

* Title
* Slug
* Excerpt
* Cover image
* Content

### Organization

* Category
* Tags
* Author
* Featured

### Publishing

* Status
* Publish date/time

### SEO

* SEO title
* SEO description
* SEO keywords

Use the project's existing form system and validation.

---

# 11. Blog Content Editor

The content field must support realistic blog authoring.

If the project already has a rich text editor, reuse it.

Otherwise implement a suitable prototype editor using the project's existing dependencies/design system.

Support common content such as:

* Headings
* Paragraphs
* Bold
* Italic
* Links
* Ordered lists
* Unordered lists
* Blockquotes
* Images where supported
* Text alignment if already supported

The generated content must render correctly on the customer-side blog detail page.

Avoid storing arbitrary unsafe HTML without sanitization.

Prefer a structured content representation if the project architecture already supports one.

---

# 12. Slug Generation

When entering:

```text
10 Hidden Beaches Worth the Trip
```

automatically suggest:

```text
10-hidden-beaches-worth-the-trip
```

Slug requirements:

* lowercase
* URL-safe
* hyphen separated
* no unnecessary special characters
* unique

The admin must be able to manually edit the slug.

If the slug already exists:

* show a validation error
* or generate a safe unique alternative

Never silently overwrite another post.

---

# 13. Create → Draft → Publish Workflow

The complete workflow must work:

```text
Create Post
    ↓
Save Draft
    ↓
Edit
    ↓
Preview
    ↓
Publish
    ↓
Visible on /blog
    ↓
Accessible at /blog/{slug}
```

Support:

```text
Draft
Published
Archived
```

If appropriate, also support:

```text
Published → Unpublished → Draft
Published → Archived → Restore
```

Public `/blog` must only display posts whose status is `published`.

---

# 14. Edit Blog Post

Implement:

```text
/dashboard/blog/[id]/edit
```

The edit page must:

* Load the existing post
* Populate all fields
* Preserve existing content
* Allow editing
* Validate changes
* Save updates
* Update `updatedAt`
* Reflect changes on the public blog page

Do not create duplicate posts when editing.

---

# 15. Preview

Implement a preview experience before publishing.

For example:

```text
/dashboard/blog/[id]/preview
```

or a modal/drawer if that matches the existing application architecture.

Preview should approximate the actual customer-facing blog detail page.

The preview should allow the admin to verify:

* Title
* Cover image
* Content
* Category
* Author
* Tags
* Formatting
* SEO-related preview information if already supported

Do not require the post to be published just to preview it.

---

# 16. Categories

If categories already exist, reuse them.

If not, create a lightweight category management system.

Example categories:

* Travel
* Destinations
* Hotels
* Tourism
* Travel Tips
* Experiences
* Food & Culture

Category model should have:

```ts
id
name
slug
description?
status?
```

Category URLs should use stable slugs if customer-side category pages exist.

Do not duplicate category data inside every UI component.

---

# 17. Tags

Allow admins to add/remove tags.

Example:

```text
Bali
Beach
Travel
Indonesia
Vacation
```

Normalize tags appropriately.

If the application already has a tag system, reuse it.

---

# 18. Featured Posts

Support:

```text
featured: true | false
```

The dashboard should allow admins to mark/unmark a post as featured.

If the customer-side blog/homepage already has featured blog sections, connect them to this state.

Do not create a second hardcoded featured-post list.

---

# 19. Author Handling

If the existing StayOra authentication/user model already exists:

* use the authenticated admin/author where appropriate
* store author identity in the post model
* display author information on the customer page

Do not create a completely separate user system.

For prototype mode, use the existing mock/current-user data if necessary.

---

# 20. Image Handling

Use the project's existing image/upload architecture if available.

For prototype mode:

* allow selecting/using a mock image
* maintain a clean image URL/reference
* show image preview
* validate required cover image
* provide useful alt text

Do not build a real storage backend.

The data structure should be ready for future:

```text
S3 / Cloudinary / Upload API / CDN
```

integration.

---

# 21. SEO

Generate dynamic metadata for:

```text
/blog/[slug]
```

Use:

```text
seo.title
seo.description
```

with sensible fallbacks to:

```text
title
excerpt
```

Do not hardcode metadata for the existing Bali/beach article.

Each blog post should generate its own metadata dynamically.

---

# 22. Customer-Side Related Posts

If related posts already exist, connect them to the canonical blog repository.

Recommended logic:

```text
same category
+
matching tags
+
exclude current post
+
published only
```

Do not hardcode related posts.

---

# 23. Search

If the customer blog already has search functionality, make sure it searches the canonical published posts.

Dashboard search should search at minimum:

* Title
* Slug
* Category
* Tags
* Author

Use client-side filtering for the prototype.

Keep the service interface ready for server-side search later.

---

# 24. Pagination / Load More

If the existing customer blog UI already supports pagination/load more, connect it to the repository.

If it does not, do not unnecessarily redesign the customer-facing page.

The repository should still expose a structure that can later support:

```ts
page
limit
sort
filters
```

for API integration.

---

# 25. Delete / Archive Safety

Prefer archive/unpublish over immediate permanent deletion.

For destructive actions:

* show confirmation
* clearly state the consequence
* use existing confirmation UI
* prevent accidental deletion

Archived posts must not appear in the normal public blog listing.

---

# 26. Prototype Persistence

No backend/database is required.

Use the project's existing prototype persistence mechanism if one exists.

Possible approach:

```text
BlogRepository
      ↓
MockBlogRepository
      ↓
localStorage / centralized mock store
```

Do NOT keep the created post only inside a React component's local state if that would cause the post to disappear after navigation.

The following should work during the prototype:

```text
Create
→ Navigate away
→ Return to dashboard
→ Post still exists
```

and:

```text
Create + Publish
→ Open /blog
→ Post appears
→ Open /blog/{slug}
→ Post loads
```

---

# 27. Seed Existing Blog Post

The existing customer-side article:

```text
10 Hidden Beaches Worth the Trip
```

must be represented inside the canonical blog repository.

Its slug must remain:

```text
10-hidden-beaches-worth-the-trip
```

unless the existing application has a deliberate canonical slug that should be preserved.

Do not break existing URLs.

Seed several additional realistic blog posts so the management UI can be properly tested.

---

# 28. Navigation Integration

Audit and fix:

* Header
* Footer
* Homepage blog section
* Blog cards
* Related posts
* Search results
* Dashboard sidebar
* Breadcrumbs

Every blog link must resolve to a valid post.

Search the project for:

```text
/blog/
```

and verify generated links.

Do not leave hardcoded links to nonexistent posts.

---

# 29. RBAC / Permissions

Use the existing StayOra role/permission architecture.

Blog management actions should respect appropriate permissions.

At minimum distinguish between:

```text
View
Create
Edit
Publish
Archive
Delete
```

Do not invent an entirely new RBAC system if the project already has one.

For prototype purposes, mock permissions are acceptable, but the architecture must be ready for backend authorization.

---

# 30. Accessibility

Follow WCAG 2.2 AA.

Ensure:

* proper form labels
* keyboard-accessible editor controls
* accessible dialogs
* accessible tables
* visible validation errors
* meaningful image alt text
* semantic headings
* keyboard navigation
* focus management

---

# 31. Do Not Break Existing Work

This is an enhancement, not a rewrite.

Do NOT:

* redesign the existing customer blog unnecessarily
* replace existing UI components without reason
* rewrite the entire dashboard
* remove existing blog content
* break `/blog`
* break existing blog detail URLs
* introduce a real backend/database

Reuse existing StayOra architecture and design system.

---

# 32. Final Verification

Run:

* TypeScript/typecheck
* ESLint
* build
* existing tests if available

Then manually verify this complete flow:

```text
Dashboard
  ↓
Blog
  ↓
Create Post
  ↓
Enter title/content/image/category/tags
  ↓
Generate slug
  ↓
Save Draft
  ↓
Edit
  ↓
Preview
  ↓
Publish
  ↓
/blog
  ↓
Open /blog/{slug}
  ↓
Verify content
  ↓
Edit post
  ↓
Verify public page updates
  ↓
Unpublish/Archive
  ↓
Verify it disappears from public listing
```

Also verify:

```text
/blog/10-hidden-beaches-worth-the-trip
```

still works.

Verify:

```text
/blog/non-existent-post
```

shows the proper 404/not-found experience.

---

# 33. Final Audit

After implementation, search the codebase again for:

```text
/blog/
```

and identify every hardcoded blog URL.

Ensure every URL corresponds to an actual seeded post or dynamically generated canonical slug.

Also verify there is:

* one BlogPost type
* one canonical blog repository/store
* no duplicate mock blog datasets
* no special-case slug logic
* no broken blog links
* no customer-side regression
* no dashboard regression

At the end, provide a concise report containing:

1. Files/modules changed
2. New dashboard routes
3. Public routes affected
4. Blog domain/repository architecture
5. Create/edit/publish workflow
6. Category/tag implementation
7. Mock persistence strategy
8. RBAC integration
9. Validation/testing results
10. Any remaining limitations

Do not stop after adding a "Create Blog" button.

Implement the **complete Blog Content Management & Publishing lifecycle** as a production-ready frontend prototype.
