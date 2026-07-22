# StayOra → Booking Platform — UI Analysis & Implementation Roadmap

> Reference: https://triprex-app.egenslab.com/ (Egens Lab "StayOra" travel/booking theme)
> Target build: **Next.js (App Router) · TypeScript (strict) · Tailwind CSS · Framer Motion · Lucide React · React Hook Form · clsx · tailwind-merge**. Package manager: **bun**.
> Goal: recreate the design *language* (layout, spacing, motion, component system) — not clone HTML — and generalize it into a reusable booking platform for **Hotels, Apartments, Resorts, Shared Rooms, Convention Hall, Transport** (plus the reference's Tours / Activities / Visa).

This document is **analysis + planning only**. No app code is written until the roadmap at the end is approved.

---

## PHASE 01 — Overall Design System

The reference uses a warm, high-contrast travel aesthetic: near-black ink on white, a **fresh green** primary action color and an **amber/gold** accent for prices, ratings, and highlights. Imagery is full-bleed and dominant; UI chrome is light.

### Color palette (design tokens)

| Token | Value | Role |
|---|---|---|
| `--color-primary` | `#63ab45` | Primary brand / CTA green (buttons, active states, links-on-hover) |
| `--color-primary-600` | `#559537` | Primary hover/pressed (derived) |
| `--color-accent` | `#fbb03b` | Amber/gold — prices, star ratings, badges, highlights |
| `--color-ink` | `#100c08` | Primary text (near-black) |
| `--color-body` | `#787878` / `#888888` | Secondary/body/muted text |
| `--color-white` | `#ffffff` | Surface + inverse text on imagery |
| `--color-surface` | `#ffffff` | Card / base surface |
| `--color-surface-muted` | `#f5f6f7` | Section alt background (derived) |
| `--color-dark` | `#100c08` / `#000000` | Footer / dark sections |
| `--color-border` | `#e7e7e7` | Hairline borders/dividers (derived) |
| `--color-success` | `#63ab45` | "Free cancellation", available (reuses green) |
| `--color-rating` | `#fbb03b` | Star fill |

> Extraction note: base extraction (DESIGN.md) reports `font.family=Rubik`, ink `#100c08`, green `#63ab45`, amber `#fbb03b`. Hover/tint/border steps above are derived and will be finalized against live screenshots during Phase 1 of implementation.

### Shadow system
- `shadow-card`: soft, low-spread ambient shadow on cards (`0 10px 30px rgba(16,12,8,.08)`), intensifies on hover.
- `shadow-dropdown`/`shadow-menu`: slightly tighter, for mega-menu & dropdowns.
- Minimal hard shadows; depth communicated via image + shadow, not borders.

### Radius system
| Token | Value | Usage |
|---|---|---|
| `radius-xs` | `5px` | inputs, small chips |
| `radius-sm` | `10px` | cards, images |
| `radius-md` | `30px` | pills / medium containers |
| `radius-lg` | `50px` | buttons, search bar (fully rounded pill), badges |

### Glass / overlay / gradient / opacity
- **Hero overlays:** dark linear gradient (bottom-up) over slide images for text legibility (`rgba(0,0,0,.35→.0)`).
- **Card image overlays:** subtle gradient on hover; category/flag badges sit on a translucent chip.
- **Glass:** light frosted panels used for the search bar over the hero (semi-opaque white, blur).
- **Opacity:** hover dimming on images (~`.9`), disabled controls ~`.5`.
- **Gradients:** primarily image-legibility overlays + occasional promo-banner gradient (green→amber territory) for "Get 10% Off" banners.

---

## PHASE 02 — Typography

- **Family:** `Rubik`, sans-serif (Google Font) — single family across headings and body.
- **Weights in use:** 400 (body), 500 (labels/nav), 600 (subheads), 700 (headings/prices).
- Headings are tight and bold; body is relaxed and muted (`--color-body`).

### Type scale (implementation target — normalized to a fluid rem scale)
| Token | Size (desktop) | Weight | Line-height | Usage |
|---|---|---|---|---|
| `display` | 48–64px (clamp) | 700 | 1.1 | Hero headline |
| `h1` | 40px | 700 | 1.15 | Page title banner |
| `h2` | 32px | 700 | 1.2 | Section titles |
| `h3` | 24px | 600 | 1.3 | Card titles / block heads |
| `h4` | 20px | 600 | 1.35 | Sub-block titles |
| `body-lg` | 18px | 400 | 1.6 | Lead paragraphs |
| `body` | 16px | 400 | 1.6 | Default paragraph |
| `body-sm` | 14px | 400 | 1.5 | Meta, captions, card meta |
| `label` | 13–14px | 500 | 1.4 | Nav, form labels, badges |
| `overline` | 12px | 500 | 1.4 | Eyebrow/section kicker (UPPERCASE, letter-spacing) |

- **Button typography:** 14–16px, weight 500–600, no/normal letter-spacing.
- **Letter spacing:** near-0 for headings; small positive tracking on overlines/eyebrows and uppercase badges.
- **Responsive:** headings scale down ~20–30% on mobile via `clamp()`; base stays 16px.

> Note: DESIGN.md extraction lists very small raw px sizes (base 12px). Those reflect scraped computed values of dense chrome; the scale above is the normalized, accessible design scale we will implement (min body 16px for WCAG).

---

## PHASE 03 — Spacing System

- **Container max-width:** ~`1200–1320px` centered, with `~15px` horizontal gutters (Bootstrap-container heritage → we implement as a Tailwind `container` utility, `max-w-[1320px]`, `px-4 md:px-6`).
- **Section vertical rhythm:** large — ~`80–120px` top/bottom on desktop (`py-20`/`py-24`/`py-28`), compressing to ~`48–64px` on mobile.
- **Grid gap:** ~`24–30px` between cards (`gap-6`/`gap-7`).
- **Card padding:** ~`16–24px` internal (`p-4`→`p-6`).
- **Button padding:** pill buttons ~`12–16px` vertical, `24–32px` horizontal.
- **Input padding:** ~`12–14px` vertical, `16px` horizontal, inside pill/rounded fields.

### Spacing scale (base extraction → normalized 4px system)
`space-1=4 · space-2=8 · space-3=12 · space-4=16 · space-5=20 · space-6=24 · space-7=32 · space-8=40 · space-9=48 · space-10=64 · space-11=80 · space-12=120`

| Token | Value |
|---|---|
| `container.max` | `1320px` |
| `container.gutter` | `16px` (`px-4`), `24px` md+ |
| `section.gap` | `96px` desktop / `56px` mobile |
| `grid.gap` | `24–30px` |
| `card.padding` | `16–24px` |
| `radius` | 5 / 10 / 30 / 50 |

---

## PHASE 04 — Layout System

- **Topbar (utility bar):** language selector (English/Arabic/Bangla), auth (Register/Login) trigger; thin bar above main nav.
- **Header / Navbar:** logo left; primary nav center; auth + language right. Items: Home, Tours, Destinations, About Us, **Pages ▾ (mega-menu)**, Blog, Contact Us.
- **Mega menu ("Pages"):** columns linking All Hotels, Activities, Transport, All Visa, FAQs, Terms & Conditions — this is the expansion point for the new booking verticals (Hotels, Apartments, Resorts, Shared Rooms, Convention Hall, Transport).
- **Sticky navigation:** header becomes sticky/condensed on scroll (background solidifies, shadow appears).
- **Sections:** full-width bands, centered `container` inner; alternating white / muted backgrounds; each opens with a centered **section header** (eyebrow + title + optional subtitle).
- **Cards:** rounded-`10px`, white surface, image-top, soft shadow, hover lift.
- **Grid system:** 12-col mental model; card grids are `1 → 2 → 3` (and `→4` for compact cards) responsive columns.
- **Flex layout:** used for nav, card meta rows, search-bar fields, footer bottom.
- **Sidebar:** present on listing pages (left filter sidebar) and details pages (right sticky booking widget). Body is a 2-column layout: `content grid + sidebar`.
- **Footer:** multi-column (logo/CTA, quick links, contact phone, email, address+map, about copy, payment partners) + bottom bar (copyright, social icons, legal links).

---

## PHASE 05 — Component Inventory

**Layout / chrome**
- Topbar, Header/Navbar, MegaMenu, MobileMenu (drawer), StickyHeader, Footer, LanguageSwitcher, AuthModal (login/register, email + Google).

**Hero**
- HeroSlider (3 slides, rating badge), HeroSearch (tabbed multi-vertical search).

**Search / forms**
- SearchTabs (Tours/Hotels/Activities/Visa/Transport → extend to Apartments/Resorts/Shared Rooms/Convention Hall), DateRangePicker (check-in/out), GuestSelector (stepper), LocationSelect, PriceRangeSlider, SortDropdown, Newsletter form, ContactForm, ReviewForm (star select + textarea), BookingInquiryWidget (name/email/phone/message + live price calculator).

**Cards** (unified `Card` primitive + variants)
- TourCard, HotelCard, ApartmentCard, ResortCard, RoomCard (shared room), TransportCard, ConventionHallCard, DestinationCard, ActivityCard, VisaCard, BlogCard, PackageCard, OfferCard/DealCard, TestimonialCard, FeatureCard (why-choose), StatCard (fun facts).

**Content / data display**
- SectionHeader (eyebrow+title+subtitle), Breadcrumb, Pagination, Tabs, Accordion (FAQ/itinerary), Gallery (featured + thumbnails + video/lightbox), Itinerary (day list), IncludedExcludedList, AmenitiesList, PolicyList, MapEmbed, RatingStars, ReviewList/ReviewCard, PriceTag (discount + strikethrough + tax note), StatsCounter (animated).

**UI primitives**
- Button (primary/secondary/ghost/outline, pill), Badge, Tag/Chip, Input, Textarea, Select/Dropdown, Checkbox, RadioGroup, Stepper (qty), Slider (price), Avatar, Modal, Drawer, Skeleton/Loader, Tooltip.

---

## PHASE 06 — Animation Audit

- **Hero slider:** auto-rotating slides with cross-fade + subtle Ken-Burns/zoom on the background image; slide content fades/slides up.
- **Scroll reveal:** sections and cards fade + translate-up on enter (staggered per grid item).
- **Card hover:** lift (`translateY(-6px)`) + shadow deepen; **image zoom** (`scale(1.05)`) inside `overflow-hidden` mask; CTA/title color shift to primary green.
- **Buttons:** background/color transition ~200ms; pill fill or arrow-slide on hover.
- **Navbar:** sticky condense transition (bg + shadow + height) on scroll.
- **Mega-menu / dropdown:** fade + slight translate/scale in (~150–200ms).
- **Search tabs:** active-tab underline/pill transition; panel cross-fade on tab switch.
- **Accordion (FAQ/itinerary):** height auto expand/collapse.
- **Stats:** count-up animation when in view.
- **Gallery:** thumbnail → featured swap, lightbox zoom.
- **Page transitions:** light fade on route change (Framer Motion, kept subtle).
- **Loading:** skeletons for card grids; button spinner on submit.

Motion tokens: `duration.fast=150ms`, `duration.base=200–300ms`, `duration.slow=500ms`; easing `ease-out` for entrances, `ease-in-out` for hovers. Respect `prefers-reduced-motion`.

---

## PHASE 07 — Responsive Audit

- **Breakpoints (Tailwind):** `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Reference behaves as a max-`1320` container with desktop-first content that reflows.
- **Desktop (≥1280):** full nav, 3–4 col card grids, 2-col listing (sidebar+grid), hero search as horizontal bar.
- **Laptop (1024–1279):** 3-col grids, container narrows; nav intact.
- **Tablet (768–1023):** 2-col grids, filter sidebar collapses above grid or into a drawer/toggle; hero search wraps to 2 rows; nav → condensed.
- **Mobile (<768):** 1-col stacked cards; hamburger → **MobileMenu drawer** (accordion sub-items for mega-menu); hero search fields stack vertically; section padding reduces; type scales down via clamp; footer columns stack.
- **Navbar changes:** primary nav hidden < lg, replaced by hamburger; language/auth move into drawer.
- **Cards:** fixed aspect-ratio images; meta rows wrap; price/CTA stack on narrow widths.

---

## PHASE 08 — Pages

Confirmed reference routes (real slug scheme observed):

| Page | Reference route | Notes |
|---|---|---|
| Home | `/` | 20 sections (see Phase 09) |
| Tour listing | `/tours` | sidebar filters + grid + "Most Popular" + pagination |
| Tour details | `/tour/{slug}` | gallery, itinerary, map, FAQ, booking inquiry widget, reviews |
| Hotel listing | `/all-hotels` | lighter sidebar (search + price), grid, pagination |
| Hotel details | `/hotel/{slug}` | overview, gallery+video, amenities, booking widget, policies, map, reviews |
| Destinations | `/destinations` | 5 destination cards, no filter |
| Activities | `/activities` | sort bar + sidebar + card grid + pagination |
| Transport | `/transport` | distance/route cards, available-modes, sidebar, pagination |
| Visa | `/all-visa` | 4 visa cards + repeating carousel |
| Blog listing | `/blogs` | card list + sidebar (search/categories/recent) + pagination |
| Blog details | `/blog/{slug}` | hero image+title, meta, body, tags, share, comments+form, sidebar |
| About | `/about-us` | mission, stats, why-choose, tour packages, latest articles |
| Contact | `/contact-us` | contact info block + contact form |
| FAQ | `/faqs` | 10-item accordion + stats |
| Terms | `/terms-and-conditions` (to confirm) | static legal content |
| Auth | modal (login/register) | email + Google OAuth; not a standalone page |

**Booking-platform expansion pages (new, using the same design language):**
- Apartment listing/details, Resort listing/details, Shared Room listing/details, Convention Hall listing/details — all reuse the listing (sidebar + card grid + pagination) and details (gallery + booking widget + amenities/policies + reviews) blueprints from Tours/Hotels.
- Account area (implied by auth): Profile, Wishlist, My Bookings, Checkout/Booking confirmation, 404.

**Booking model note:** the reference details pages use an **inquiry-style** widget (Name/Email/Phone/Message → "Book Now"/"Submit") with a *live client-side price calculator* (dates + quantity + extra services), not instant checkout. We replicate this pattern and keep a Checkout page as an extension point.

---

## PHASE 09 — Section Breakdown

**Home (`/`)** — Hero Slider → Multi-vertical Search Tabs → About → Featured Destinations → Promo Banner (10% off) → Featured Tours → Featured Hotels → Activities → Transport routes → Why Choose Us (6 features) → Tour Packages → Activities detail tabs (video) → Phenomenal Deals (4 offers) → Latest Blog (4) → Testimonials (filterable by platform) → Visa services (3) → Fun Facts (4 stats) → Newsletter → Footer.

**Listing pages (Tours / Hotels / Activities / Transport / + new verticals)** — Title banner + breadcrumb → results/sort bar → [left filter sidebar (search, price slider, category/destination checkboxes) | card grid] → optional "Most Popular" sidebar → pagination → newsletter → footer.

**Details pages (Tour / Hotel / + new verticals)** — breadcrumb → gallery (featured + thumbnails + video/lightbox) → title/price/meta block → content blocks (facilities, styles, included/excluded, itinerary/description, amenities, policies) → location map → [sticky booking-inquiry widget with live price calc] → reviews (list + write-review form) → newsletter → footer.

**Destinations** — banner → destination card grid.
**Visa** — banner → visa card grid + repeating carousel.
**Blog listing** — banner → [post cards | sidebar: search, categories w/ counts, recent posts] → pagination.
**Blog details** — banner/hero image+title → meta → article body (headings/paras/lists) → tags → social share → comments + comment form → sidebar.
**About** — mission/vision → stats → why-choose (6) → exclusive tour packages (4) → latest articles (4).
**Contact** — contact info block → contact form.
**FAQ** — accordion (10) → stats.

Every page shares: Topbar → Header/Nav → (page content) → Newsletter → Footer.

---

## PHASE 10 — Reusable Design Patterns

1. **SectionHeader** — eyebrow/overline + bold title + optional muted subtitle, centered (or left on listings). Used by nearly every band.
2. **Card shell** — rounded-`10`, white surface, `overflow-hidden` image mask (zoom on hover), soft shadow → lift on hover, meta row(s), CTA. One primitive; variants differ by data slots. Covers Tour/Hotel/Apartment/Resort/Room/Transport/Hall/Destination/Activity/Visa/Blog/Offer.
3. **PriceTag** — accent-amber current price + strikethrough original + "TAXES INCL / per person|night" note. Shared across all bookable cards + details.
4. **Button system** — pill (radius-50): primary (green fill), secondary/outline, ghost; optional leading/trailing Lucide icon; hover fill/arrow-slide.
5. **Badge/Chip** — duration ("3 DAYS / 2 Night"), discount ("20% off"), category, country-flag, "Breakfast included", "Free cancellation". Translucent-on-image or solid variants.
6. **Filter sidebar** — search input + price range slider (+Apply) + checkbox groups with counts. Config-driven (facets array) → reused across every listing vertical.
7. **Results/Sort bar** — "Showing N result" + sort `<Select>` (Default / Price ↑ / Price ↓).
8. **Booking-inquiry widget** — date pickers + qty steppers + extra-services + live price summary + name/email/phone/message form. Config-driven per vertical.
9. **Gallery** — featured image + thumbnail strip + optional video → lightbox. Shared by all details pages.
10. **Accordion** — FAQ, itinerary, mobile mega-menu, policy lists.
11. **RatingStars + ReviewCard + ReviewForm** — amber stars, avatar, platform badge; write-review star-select + textarea.
12. **StatsCounter** — animated count-up quad ("3.5K+ …"). Used on Home/About/FAQ.
13. **Breadcrumb + PageBanner** — every inner page opens with title banner + `Home > X`.
14. **Newsletter + Footer** — global bottom of every page.
15. **Image overlay** — gradient for legibility + hover dim/zoom, consistent everywhere.

---

# IMPLEMENTATION ROADMAP

Built strictly phase-by-phase; each phase stops for review and ships production-quality, typed, reusable code. Every phase delivers the 9 deliverables (what/folders/components/files created/modified/decisions/remaining/self-review/improvements).

**Phase 1 — Foundation.** `bun create` Next.js (App Router, TS strict) + Tailwind; install framer-motion, lucide-react, react-hook-form, clsx, tailwind-merge. Folder architecture (app, components/{layout,shared,ui,sections}, features, hooks, lib, constants, types, services, styles). `theme.ts` + Tailwind config (colors, spacing, radius, shadow, typography, breakpoints, motion tokens). Rubik font via `next/font`. `cn()` util (clsx+twMerge). Container primitive + globals. **Stop.**

**Phase 2 — Navigation & chrome.** Topbar, Header/Navbar, MegaMenu (Pages → all verticals), MobileMenu drawer, sticky-on-scroll behavior, LanguageSwitcher, AuthModal shell, dark-mode token prep. **Stop.**

**Phase 3 — Hero.** HeroSlider (Framer Motion cross-fade + Ken-Burns), rating badge, HeroSearch tabbed multi-vertical search (Tours/Hotels/Apartments/Resorts/Shared Rooms/Convention Hall/Transport/Activities/Visa), field primitives (LocationSelect, DateRangePicker, GuestSelector). **Stop.**

**Phase 4 — UI primitives & shared.** Button, Badge, Tag, Input, Textarea, Select, Checkbox, RadioGroup, Stepper, PriceRangeSlider, Avatar, RatingStars, Modal, Drawer, Skeleton, Tooltip, SectionHeader, Breadcrumb, PageBanner, Pagination, Tabs, Accordion, PriceTag. Config-driven + typed + a11y. **Stop.**

**Phase 5 — Card system.** Unified Card primitive + variants (Tour, Hotel, Apartment, Resort, Room, Transport, ConventionHall, Destination, Activity, Visa, Blog, Offer, Testimonial, Feature, Stat). Hover/zoom motion. Mock data + types in `constants/` + `types/`. **Stop.**

**Phase 6 — Home page.** Compose all 20 sections from sections/ + cards + primitives; scroll-reveal animations; StatsCounter; testimonials filter; newsletter. **Stop.**

**Phase 7 — Listing template.** Generic listing layout (filter sidebar + results/sort bar + card grid + "Most Popular" + pagination), config-driven per vertical; wire Tours, Hotels, Activities, Transport, Visa, Destinations, + Apartments/Resorts/Shared Rooms/Convention Hall. **Stop.**

**Phase 8 — Details template.** Generic details layout (gallery+lightbox, meta/price block, content blocks, map, sticky booking-inquiry widget w/ live price calc, reviews); wire Tour & Hotel + new verticals. **Stop.**

**Phase 9 — Content & auth pages.** About, Contact (form), FAQ, Blog listing + details (comments), Terms; Auth modal (login/register + Google) → and/or account pages (Profile, Wishlist, My Bookings), Checkout, 404. **Stop.**

**Phase 10 — Polish.** Page transitions, reduced-motion, SEO metadata/OG/Twitter/schema, accessibility pass, performance (next/image, dynamic imports, lazy), responsive QA across all breakpoints, final self-review. **Stop.**

---

## Open questions for confirmation before Phase 1
1. **Scope of first pass:** full 10-phase build, or Home + one listing + one details end-to-end first as a vertical slice?
2. **Design fidelity vs. generalization:** prioritize pixel-closeness to StayOra, or lean into the generalized booking platform (Apartments/Resorts/Shared Rooms/Convention Hall) from the start?
3. **Tailwind version:** v4 (CSS-first `@theme`) or v3 (`tailwind.config.ts`)? (Affects theme token wiring.)
4. **Data:** static mock/JSON constants for now (recommended), or scaffold a services layer expecting a real API?
5. **i18n & dark mode:** build the structure now (language switcher + dark tokens are in the reference), or defer wiring to Phase 10?
