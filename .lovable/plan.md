

# Three-Dashboard Architecture Plan

## Current State
- **Super Admin** (`/admin/*`): Exists with sidebar, real Supabase data, manages screenings/users/submissions
- **User Dashboard** (`/dashboard`): Exists with tickets, watch history, profile settings
- **Filmmaker Portal** (`/filmmaker`): Only a public submission form — no authenticated studio dashboard

## What's Missing
The filmmaker/studio experience is just a single submission form. There's no authenticated studio dashboard where filmmakers can:
- See their submissions and statuses
- Upload new movies with full metadata
- Set up virtual premieres/screenings
- Track their own revenue and ticket sales

## Plan

### 1. Create Studio Dashboard (`/studio`)
A new authenticated dashboard for filmmakers/creators with its own layout and sidebar:

**Pages:**
- `/studio` — Studio overview: submission stats, recent activity, revenue summary
- `/studio/movies` — List of filmmaker's submitted movies with status tracking
- `/studio/submit` — Multi-step movie submission form (move existing form logic here)
- `/studio/screenings` — Filmmaker's own screenings (if approved, they can set premiere dates/pricing)
- `/studio/earnings` — Revenue from their ticket sales

**Layout:** New `StudioLayout` component with a dedicated sidebar (Film icon, dark theme like admin) showing: Dashboard, My Movies, Submit Film, My Screenings, Earnings, and link back to main site.

**Auth:** Protected route — must be logged in. Any authenticated user can access (role `creator` or `viewer` who wants to submit).

### 2. Update `/filmmaker` Public Page
Keep `/filmmaker` as the public landing page but change CTA from inline form to "Sign Up as Filmmaker" / "Go to Studio Dashboard" buttons. The actual submission happens inside `/studio/submit`.

### 3. Super Admin Controls for All Dashboards
The admin already manages filmmaker submissions. Add:
- In admin Users page: ability to assign `creator` role to users
- Admin can view all studio data (already covered by `is_super_admin` RLS policies)

### 4. Route Updates (`App.tsx`)
Add new studio routes:
```
/studio → StudioDashboard (protected)
/studio/movies → StudioMovies (protected)
/studio/submit → StudioSubmit (protected)
/studio/screenings → StudioScreenings (protected)
/studio/earnings → StudioEarnings (protected)
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/studio/StudioLayout.tsx` | Layout with sidebar for studio pages |
| `src/components/studio/StudioSidebar.tsx` | Studio navigation sidebar |
| `src/pages/studio/StudioDashboard.tsx` | Overview: submissions count, earnings, recent activity |
| `src/pages/studio/StudioMovies.tsx` | List filmmaker's submissions with status badges |
| `src/pages/studio/StudioSubmit.tsx` | Full movie upload form (moved from FilmmakerSubmit) |
| `src/pages/studio/StudioScreenings.tsx` | Manage approved movie screenings/premieres |
| `src/pages/studio/StudioEarnings.tsx` | Revenue tracking from ticket sales |
| `src/components/auth/ProtectedRoute.tsx` | Generic auth guard (login required, no role check) |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/studio/*` routes with ProtectedRoute |
| `src/pages/FilmmakerSubmit.tsx` | Convert to landing page with CTA to `/studio/submit` |
| `src/components/layout/Navbar.tsx` | Add "Studio" link for logged-in users |
| `src/pages/admin/Users.tsx` | Add role assignment capability (change user to `creator`) |

### Data Flow
- Studio pages query `filmmaker_submissions` filtered by `submitter_email = user.email`
- Screenings page queries `screenings` where the screening's `content_id` links to an approved submission
- Earnings page queries `screening_tickets` for the filmmaker's screenings
- All protected by existing RLS (creators see their own data, super_admins see all)

### No DB Changes Needed
The existing `filmmaker_submissions`, `screenings`, `screening_tickets`, and `user_roles` tables already support this. The `filmmaker_submissions` table stores `submitter_email` which maps to the logged-in user's email.

