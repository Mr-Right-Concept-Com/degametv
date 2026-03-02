

# Comprehensive E2E Audit, QA & Fix Plan

## Critical Bugs Found

### 1. HOMEPAGE BROKEN - Subdomain Routing Hijack (P0)
The homepage (`/`) shows "Movie Not Found" instead of the actual homepage. The subdomain routing code in `main.tsx` fires on the Lovable preview domain (`3b6cff5a-cd3d-4328-b5eb-c06e0a4fdce3.lovableproject.com`) because it has 3+ dot-separated parts. It redirects `/` to `/movie/3b6cff5a-cd3d-4328-b5eb-c06e0a4fdce3` which doesn't exist.

**Fix**: Add `lovableproject`, `lovable`, `vercel`, `netlify`, `supabase` to the reserved list AND check that the subdomain doesn't look like a UUID. Also only trigger on production-like domains.

### 2. Auth Page Branding Mismatch (P1)
The Auth page (`/auth`) shows "AGE Media" branding instead of "DeGameTV". The platform is DeGameTV but the login page references the old branding.

**Fix**: Update Auth.tsx to use "DeGameTV" logo and branding.

### 3. Admin Dashboard Shows Only Mock Data (P1)
The admin dashboard (`/admin`) displays hardcoded mock analytics (`$4.84M revenue`, `385K subscribers`, etc.) that are completely fabricated. The Sales Dashboard (`/admin/sales`) correctly uses real data showing `N0` revenue and `0` tickets.

**Fix**: Wire the main admin dashboard to real Supabase data (screening_tickets, screenings counts) instead of mockAnalytics.

### 4. Admin Quick Actions Link to Non-Existent Routes (P1)
The admin dashboard has "Manage Content" linking to `/admin/content/movies` and "Live Events" linking to `/admin/content/live` - neither route exists. These should link to actual module pages.

**Fix**: Update links to `/admin/modules/ott-vod` and `/admin/modules/live-streaming`.

### 5. Seed Data Missing Cast/Crew, Gallery, Ratings (P2)
Screenings in the database have empty `cast_crew: []`, `gallery_images: []`, `star_rating: 0`, and `age_rating: null`. The movie landing page supports these features but they never render because the seed data is empty.

**Fix**: Update the seed-data edge function to include sample cast/crew, gallery images, star ratings, and age ratings for all screenings.

### 6. process-payment Edge Function Reads Body Twice (P1)
The `process-payment` function calls `await req.json()` once for the `method`, then each handler function tries to call `await req.json()` again. In Deno, a request body can only be read once - the second read will fail.

**Fix**: Parse the body once at the top level and pass the parsed data to handler functions.

### 7. validate-watch-code Uses ANON Key Instead of Service Role (P2)
The `validate-watch-code` function uses `SUPABASE_ANON_KEY` to query `screening_tickets`, but the RLS policies require either `super_admin` role or matching `user_id`/`email`. An anonymous call from an edge function won't match either, so ticket lookups may fail for unauthenticated watch flows.

**Fix**: Use `SUPABASE_SERVICE_ROLE_KEY` since this is a server-side validation function.

### 8. No Admin Route Protection (P2)
All admin routes (`/admin/*`) are accessible without authentication or role checks. Any visitor can access the admin dashboard, sales data, and module management.

**Fix**: Add a `ProtectedRoute` wrapper that checks for authentication and admin role before rendering admin pages.

### 9. Navbar "Now Showing" Link Goes to `/` Which is Broken (P1)
The navbar has "Now Showing" linking to `/` which triggers the subdomain redirect bug. Should link to the home page properly.

**Fix**: This is fixed by fixing bug #1.

### 10. Index Page Still Imports Mock Data as Fallback (P2)
`Index.tsx` imports `mockMovies` and `mockCinemaEvents` from mock data and falls back to them when there's no DB data. Since we have real data, the mock fallback creates confusion and inconsistency.

**Fix**: Remove mock data fallback from Index.tsx - show empty states or real data only.

### 11. Missing "Email Settings" in Admin Sidebar Scroll (Minor)
The Email Settings link is present but the sidebar needs scrolling to see it. The sidebar settings section should be fully visible.

### 12. Forgot Password Not Functional (P2)
The "Forgot password?" button on the Auth page is a non-functional `Button variant="link"` that does nothing. No password reset flow exists.

**Fix**: Implement password reset flow with `supabase.auth.resetPasswordForEmail()` and a `/reset-password` page.

### 13. Google/GitHub OAuth Buttons Disabled (Minor)
Social login buttons exist but are disabled. They should either be enabled or removed to avoid confusion.

---

## Implementation Plan (Priority Order)

### Task 1: Fix Subdomain Routing (P0 - Homepage is broken)
Update `src/main.tsx` to properly detect only real movie subdomains on production domains (degametv.net, etc.), excluding Lovable preview domains, UUIDs, and other hosting subdomains.

### Task 2: Fix process-payment Double Body Read (P1)
Refactor `supabase/functions/process-payment/index.ts` to parse `req.json()` once and pass the parsed body object to each payment handler instead of having them re-read the request body.

### Task 3: Fix validate-watch-code Auth Key (P2)
Change `SUPABASE_ANON_KEY` to `SUPABASE_SERVICE_ROLE_KEY` in `supabase/functions/validate-watch-code/index.ts`.

### Task 4: Fix Auth Page Branding (P1)
Update `src/pages/Auth.tsx` to show "DeGameTV" instead of "AGE Media".

### Task 5: Wire Admin Dashboard to Real Data (P1)
Refactor `src/pages/admin/Dashboard.tsx` to fetch real metrics from Supabase (screening count, ticket count, revenue totals) instead of using `mockAnalytics`. Fix Quick Actions links to point to existing routes.

### Task 6: Enrich Seed Data (P2)
Update `supabase/functions/seed-data/index.ts` to include:
- `cast_crew` JSONB with sample Nollywood actor names and character names
- `gallery_images` with sample Unsplash URLs
- `star_rating` (4.0-4.9) and `age_rating` ("PG-13", "18+", etc.)
- Sample promo codes in the `promo_codes` table

### Task 7: Add Admin Route Protection (P2)
Create a `ProtectedAdminRoute` component that checks `useAuth()` for authentication and `useTenant()` for admin roles. Wrap all `/admin/*` routes with this component.

### Task 8: Remove Mock Data Fallbacks (P2)
Clean up `src/pages/Index.tsx` to remove `mockMovies` and `mockCinemaEvents` imports and show only real Supabase data with proper empty states.

### Task 9: Add Forgot Password Flow (P2)
- Add forgot password form component with `resetPasswordForEmail()`
- Create `/reset-password` page with `updateUser({ password })`
- Add route in `App.tsx`

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/main.tsx` | Fix subdomain routing to not trigger on preview/staging domains |
| `src/pages/Auth.tsx` | Update branding from "AGE Media" to "DeGameTV" |
| `src/pages/admin/Dashboard.tsx` | Wire to real Supabase data, fix Quick Action links |
| `src/pages/Index.tsx` | Remove mock data fallback |
| `supabase/functions/process-payment/index.ts` | Fix double body read bug |
| `supabase/functions/validate-watch-code/index.ts` | Use SERVICE_ROLE_KEY |
| `supabase/functions/seed-data/index.ts` | Add cast/crew, gallery, ratings, promo codes |
| `src/App.tsx` | Add ProtectedAdminRoute wrapper, add /reset-password route |

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/auth/ProtectedAdminRoute.tsx` | Admin route guard component |
| `src/pages/ResetPassword.tsx` | Password reset page |

