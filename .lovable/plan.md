

# Spixie vs DeGameTV: Gap Analysis and Implementation Plan

## What Spixie Has That DeGameTV is Missing

Based on analyzing Spixie's movie subdomain pages (e.g., adanne.spixie.net), the Spixie.co platform page, and comparing with our current codebase, here are the **critical gaps**:

### 1. Dedicated Movie Landing Page (Subdomain Experience)
**Spixie has**: Each movie gets its own cinematic landing page at `movie.spixie.net` with:
- Full-screen banner hero with poster overlay
- Movie metadata (length, genre, premiere date, rating with stars, age rating badge)
- Synopsis section
- Cast and Crew carousel with photos and character names
- Image Gallery carousel
- Trailer video modal (inline "Watch Trailer" button)
- Comments/reviews section
- "Purchase Tickets" and "Watch Now" CTAs

**DeGameTV has**: Only a basic `BuyTicket.tsx` purchase funnel and a mock-data `CinemaEvent.tsx` page. No dedicated movie landing page with all Spixie features.

### 2. Star Ratings and Age Rating
**Spixie has**: 5-star visual rating with review count (e.g., 4.5 stars, 103 reviews), PG-13 badge
**DeGameTV has**: None on buy/screening pages

### 3. Cast and Crew Section
**Spixie has**: Horizontal carousel of cast members with character name and actor name
**DeGameTV has**: CinemaEvent has a basic "starring" list from mock data but no photos or character mapping. BuyTicket and the screening DB schema have no cast/crew support.

### 4. Image Gallery
**Spixie has**: Horizontal carousel of movie stills/behind-the-scenes photos
**DeGameTV has**: Nothing

### 5. Trailer Video Modal
**Spixie has**: "Watch Trailer" button that opens an embedded video player
**DeGameTV has**: The screenings table has `trailer_url` but it's never displayed in a player

### 6. Comments/Reviews Section
**Spixie has**: Community comments powered by Cusdis with nickname, email, captcha
**DeGameTV has**: Nothing

### 7. "Notify Me" for Upcoming Movies
**Spixie has**: For movies not yet released, a "Notify Me" email subscription form
**DeGameTV has**: Nothing -- no email collection for upcoming screenings

### 8. Promo Codes / Discounts
**Spixie.co mentions**: Promotions and promo codes as a feature
**DeGameTV has**: No promo code system

### 9. Refund Policy
**Spixie.co mentions**: Configurable refund policies
**DeGameTV has**: Footer links to "#" for refund policy -- no actual page or system

### 10. Geo-blocking Controls
**Spixie.co mentions**: Geo-restriction tools
**DeGameTV has**: Location-based pricing but no ability to block specific regions

### 11. Cinema Page Uses Mock Data
**DeGameTV**: `Cinema.tsx` still uses `mockCinemaEvents` instead of real Supabase data

---

## Implementation Plan

### Task 1: Build the Dedicated Movie Landing Page (`/movie/:slug`)
Create a cinematic, Spixie-style landing page that serves as both the subdomain destination and the movie detail page.

**Features:**
- Full-width banner hero with gradient overlay, poster image sidebar
- Movie metadata bar: length, genre, premiere date, star rating, age rating badge
- Synopsis section
- Cast and Crew horizontal carousel (photos, character name, actor name)
- Image Gallery carousel (movie stills)
- Embedded Trailer modal (uses `trailer_url` from screenings)
- "Purchase Tickets" CTA linking to `/buy/:slug`
- "Watch Now" CTA (for ticket holders)
- Comments section (simple DB-backed, nickname + comment)
- "Notify Me" email capture for upcoming/not-yet-released screenings
- Subdomain redirect updated: `movie.degametv.net` now goes to `/movie/:slug` instead of `/buy/:slug`

### Task 2: Database Schema Updates
Add new tables and columns via migration:

- Add columns to `screenings`: `cast_crew` (jsonb array), `gallery_images` (text array), `age_rating` (text), `star_rating` (numeric), `review_count` (integer)
- Create `screening_comments` table: id, screening_id, nickname, email, comment, created_at (with RLS allowing public insert and public read)
- Create `screening_notifications` table: id, screening_id, email, created_at (with RLS allowing public insert)
- Create `promo_codes` table: id, tenant_id, code, discount_type (percentage/fixed), discount_value, max_uses, current_uses, valid_from, valid_until, screening_id (nullable for global), created_at

### Task 3: Promo Code Support in Purchase Flow
- Add promo code input field on the payment step of `BuyTicket.tsx`
- Validate promo code via edge function
- Apply discount to total before payment
- Create `validate-promo-code` edge function

### Task 4: Fix Cinema Page to Use Real Data
- Update `Cinema.tsx` to fetch from Supabase `screenings` table instead of mock data
- Link cinema cards to `/movie/:slug` (the new landing page) instead of `/cinema/:id`

### Task 5: Notify Me + Email Reminder System
- "Notify Me" button on movie landing page for upcoming screenings
- Store email in `screening_notifications` table
- Admin can see notification subscribers count in screening management

### Task 6: Static Pages (Refund Policy, Terms, Privacy, FAQ, Contact)
- Create actual content pages for the footer links that currently point to "#"
- `/refund-policy`, `/terms`, `/privacy`, `/faq`, `/contact`

### Task 7: Update Subdomain Routing
- Change `main.tsx` redirect from `/buy/:slug` to `/movie/:slug` so subdomain visitors see the full movie experience first, with CTA to purchase

---

## Technical Details

### Movie Landing Page Component Structure
```text
MovieLandingPage
  +-- HeroBanner (full-width bg image + poster + metadata)
  +-- SynopsisSection (text + rating stars + age badge)
  +-- CastCrewCarousel (horizontal scroll, photos)
  +-- GalleryCarousel (horizontal scroll, stills)
  +-- TrailerModal (dialog with VideoPlayer)
  +-- CommentsSection (list + form)
  +-- NotifyMeSection (email input, shown when status != 'published' or before screening_date)
  +-- StickyBuyCTA (fixed bottom bar on mobile)
```

### New DB Migration SQL (key parts)
- ALTER screenings ADD cast_crew, gallery_images, age_rating, star_rating, review_count
- CREATE TABLE screening_comments with public read/insert RLS
- CREATE TABLE screening_notifications with public insert RLS
- CREATE TABLE promo_codes with admin-only management RLS

### Edge Functions
- `validate-promo-code`: Validates code, checks expiry/max uses, returns discount
- Update `process-payment` to accept and apply promo codes
- Update `seed-data` to include cast/crew, gallery, and sample promo codes

### Route Changes
- Add `/movie/:slug` route for MovieLandingPage
- Keep `/buy/:slug` for the purchase funnel
- Update subdomain redirect to `/movie/:slug`
- Add static page routes

### Files to Create
- `src/pages/MovieLanding.tsx` (the main Spixie-style page)
- `src/pages/RefundPolicy.tsx`, `Terms.tsx`, `Privacy.tsx`, `FAQ.tsx`, `Contact.tsx`
- `supabase/functions/validate-promo-code/index.ts`

### Files to Modify
- `src/App.tsx` (new routes)
- `src/main.tsx` (subdomain redirect target)
- `src/pages/BuyTicket.tsx` (promo code field)
- `src/pages/Cinema.tsx` (real data)
- `src/components/layout/Footer.tsx` (real links)
- `supabase/functions/process-payment/index.ts` (promo support)
- `supabase/functions/seed-data/index.ts` (richer seed data)

