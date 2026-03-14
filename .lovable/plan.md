

# Launch Readiness Audit & Comprehensive Fix Plan

## Audit Summary

After deep inspection of every page, dashboard, route, and data flow, here is the complete findings and fix plan.

## Issues Found

### A. Missing Features
1. **No AI Concierge exists** -- The user mentioned an AI Concierge as a USP/data moat. There is zero implementation of any chatbot, AI assistant, or concierge feature anywhere in the codebase.
2. **No page titles (SEO)** -- Zero `document.title` usage across all pages. Every page shows the default "Vite + React" title.
3. **Navbar search is non-functional** -- The search input doesn't filter, navigate, or do anything.

### B. Broken/Unwired UI
4. **Admin Sidebar "Branding" link** -- Now correctly routes to `/admin/settings/branding` (confirmed fixed).
5. **Navbar search on mobile** -- Opens a search input that does nothing on submit or typing.

### C. Data & Backend Gaps
6. **Studio Earnings shows ₦0 always** -- The query chain (submissions → screenings → tickets) works but the `content_id` on `filmmaker_submissions` is always `null` because it's never set when admin approves. The approval flow in `FilmmakerPortal.tsx` only updates `status` -- it doesn't create a `content` record or set `content_id`.
7. **Studio Screenings always empty** -- Same root cause: `content_id` is never populated on approved submissions.

### D. Missing Validation & Polish
8. **No Zod on BuyTicket form** -- The email step has inline validation only, no schema.
9. **No Zod on Contact page** -- Likely inline validation.
10. **Profile save on UserDashboard** -- No validation on display name length.

### E. Minor Issues
11. **Modules.tsx, Tenants.tsx** still exist as files but are not routed -- harmless but dead code.
12. **`data/mockData.ts`** -- Large mock data file still present, only used by dead module pages.

---

## Fix Plan

### Phase 1: AI Concierge (USP Feature)
Create a floating AI chat widget that appears on all public pages. This will be the platform's differentiator.

**Implementation:**
- Create `src/components/ai/AIConcierge.tsx` -- A floating chat bubble (bottom-right) that opens a chat panel
- Create a Supabase Edge Function `ai-concierge` that uses the Lovable AI integration or OpenAI to answer questions about screenings, ticket prices, showtimes, and filmmaker submissions
- The concierge will be context-aware: query `screenings` table to answer "what's showing?", "how much is [movie]?", "when is the next premiere?"
- Add the component to `MainLayout.tsx` so it appears on all public pages
- Store conversation in local state (no persistence needed for MVP)

**Files to create:**
- `src/components/ai/AIConcierge.tsx`
- `supabase/functions/ai-concierge/index.ts`

**Files to modify:**
- `src/components/layout/MainLayout.tsx` (add `<AIConcierge />`)
- `supabase/config.toml` (add function config)

### Phase 2: SEO Page Titles
Add `document.title` to every page using a `useEffect` hook.

**Files to modify (all pages):**
- `Index.tsx` → "DeGameTV — Virtual Cinema Premieres"
- `Cinema.tsx` → "Now Showing — DeGameTV"
- `MovieLanding.tsx` → "{movie.title} — DeGameTV"
- `BuyTicket.tsx` → "Buy Ticket — {movie.title}"
- `WatchMovie.tsx` → "Watch — DeGameTV"
- `Auth.tsx` → "Sign In — DeGameTV"
- `UserDashboard.tsx` → "My Dashboard — DeGameTV"
- `MyTickets.tsx` → "My Tickets — DeGameTV"
- `FilmmakerSubmit.tsx` → "Filmmaker Portal — DeGameTV"
- All admin pages → "Admin: {page} — DeGameTV"
- All studio pages → "Studio: {page} — DeGameTV"
- Static pages (FAQ, Contact, Terms, Privacy, Refund) → "{Page Name} — DeGameTV"
- `NotFound.tsx` → "Page Not Found — DeGameTV"
- `ResetPassword.tsx` → "Reset Password — DeGameTV"

Create a helper: `src/hooks/usePageTitle.ts`

### Phase 3: Wire Navbar Search
Make the search input functional: filter screenings by title, navigate to `/cinema?q=search_term`.

**Files to modify:**
- `src/components/layout/Navbar.tsx` — Add `onSubmit` handler that navigates to `/cinema?q={query}`
- `src/pages/Cinema.tsx` — Read `?q=` param from URL, pre-fill search and filter results

### Phase 4: Fix Studio Data Pipeline (content_id)
When admin approves a filmmaker submission, auto-create a `content` record and set `content_id` on the submission. This unblocks Studio Screenings and Earnings.

**Files to modify:**
- `src/pages/admin/filmmaker/FilmmakerPortal.tsx` — In `updateStatus()`, when status is `approved`:
  1. Create a `content` record from submission data (title, description, poster_url, etc.)
  2. Update `filmmaker_submissions.content_id` with the new content ID
  3. Optionally auto-create a draft `screening` record linked to the content

### Phase 5: Form Validation Polish
Add Zod validation to remaining forms:

- `src/pages/BuyTicket.tsx` — Email validation with Zod schema
- `src/pages/Contact.tsx` — Name/email/message validation
- `src/pages/UserDashboard.tsx` — Display name validation (2-50 chars)

### Phase 6: Cleanup Dead Code
Remove unused files from routes and imports:
- Remove references to `src/pages/admin/Modules.tsx`, `src/pages/admin/Tenants.tsx`
- Clean up `src/data/mockData.ts` if no page imports it

---

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/ai/AIConcierge.tsx` | Floating AI chat widget |
| Create | `supabase/functions/ai-concierge/index.ts` | AI-powered Q&A edge function |
| Create | `src/hooks/usePageTitle.ts` | SEO page title helper |
| Modify | `src/components/layout/MainLayout.tsx` | Add AIConcierge component |
| Modify | `src/components/layout/Navbar.tsx` | Wire search to navigate |
| Modify | `src/pages/Cinema.tsx` | Read search query param |
| Modify | `src/pages/admin/filmmaker/FilmmakerPortal.tsx` | Auto-create content on approve |
| Modify | 20+ page files | Add `usePageTitle()` calls |
| Modify | `src/pages/BuyTicket.tsx` | Zod email validation |
| Modify | `src/pages/Contact.tsx` | Zod form validation |
| Modify | `src/pages/UserDashboard.tsx` | Zod display name validation |
| Modify | `supabase/config.toml` | Add ai-concierge function config |

## Priority Order
1. **Phase 4** (Fix data pipeline) — Unblocks studio dashboard from showing real data
2. **Phase 2** (SEO titles) — Quick win, every page
3. **Phase 3** (Search) — Wire navbar search
4. **Phase 1** (AI Concierge) — The USP feature
5. **Phase 5** (Validation polish) — Launch hardening
6. **Phase 6** (Cleanup) — Optional

