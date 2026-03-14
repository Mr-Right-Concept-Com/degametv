# Admin Redesign & Filmmaker Portal Cleanup Plan

## Problem Summary

The admin panel is cluttered with "Modules" terminology and 17-module JUVUKO architecture abstractions that don't serve the actual app management needs. The sidebar has a "Modules" collapsible section listing 17 abstract modules. The Dashboard shows "Platform Modules" toggles. The Users page uses mock data. The Filmmaker Portal at `/admin/filmmaker` duplicates the public submission form. The user wants a clean, practical admin for managing the real app: screenings, tickets, users, filmmakers, payments, and settings.

## What Changes

### 1. Redesign Admin Sidebar (`AdminSidebar.tsx`)

Remove all "Modules" references. Replace with direct, clear navigation:

**Navigation Structure:**

- **Overview**: Dashboard
- **Content**: Screenings, Promo Codes
- **People**: Users, Filmmakers (submissions review)
- **Revenue**: Sales & Tickets, Payment Gateways
- **Settings**: Branding, Email Settings
- **Links**: Filmmaker Portal (external link to `/filmmaker`)

No collapsible "Modules" section. No module IDs. No badge system for beta/coming-soon.

### 2. Redesign Admin Dashboard (`Dashboard.tsx`)

Remove the "Platform Modules" section with ModuleCard toggles at the bottom. Keep the real metrics (revenue, tickets, screenings). Improve Quick Actions to link to the new direct routes. Add a "Recent Tickets" table showing latest ticket purchases from real data. Add a "Recent Submissions" section showing latest filmmaker submissions.

### 3. Redesign Filmmaker Portal so filmmaker/studio can sign up and start uploading/ premiering their movies etc full portal upload and detail sysyem (`FilmmakerPortal.tsx`)

Remove the "Submit Project" tab — that's the public form at `/filmmaker`. The admin page should be **review-only**: list submissions, view details, approve/reject. Keep the existing submissions table, stats, and review dialog. Remove the duplicated submit form and guidelines tab.

### 4. Wire Users Page to Real Data (`Users.tsx`)

Replace `mockUsers` with real Supabase queries joining `profiles` and `user_roles` tables. Show actual registered users with their roles, emails, and registration dates.

### 5. Create Screenings Management Page (`/admin/screenings`)

A proper admin page to view/manage all screenings from the `screenings` table (not the mock-data ScreeningManagement). Show title, status, date, ticket count, revenue per screening.

### 6. Create Promo Codes Management Page (`/admin/promo-codes`)

Admin page to view, create, and manage promo codes from the `promo_codes` table.

### 7. Update Routes (`App.tsx`)

- Add `/admin/screenings` route
- Add `/admin/promo-codes` route
- Remove `/admin/modules` and all `/admin/modules/*` routes (the individual module admin pages)
- Keep `/admin/filmmaker` for submission review
- Keep `/admin/sales` for the ProducerDashboard
- Keep `/admin/settings/email` and `/admin/settings/payment-gateways`

### 8. Remove Modules Page (`Modules.tsx`)

Delete the modules toggle page entirely — it's not needed for app management.

## Files to Create


| File                             | Purpose                                      |
| -------------------------------- | -------------------------------------------- |
| `src/pages/admin/Screenings.tsx` | Real screening management with Supabase data |
| `src/pages/admin/PromoCodes.tsx` | Promo code management CRUD                   |


## Files to Modify


| File                                            | Changes                                  |
| ----------------------------------------------- | ---------------------------------------- |
| `src/components/admin/AdminSidebar.tsx`         | Remove modules, clean navigation         |
| `src/pages/admin/Dashboard.tsx`                 | Remove module cards, add recent activity |
| `src/pages/admin/filmmaker/FilmmakerPortal.tsx` | Remove submit form tab, review-only      |
| `src/pages/admin/Users.tsx`                     | Wire to real Supabase data               |
| `src/App.tsx`                                   | Update admin routes                      |


## Files to Remove (from routes, not delete)

All `/admin/modules/*` routes removed from App.tsx. The page files can stay but won't be routed.

## Technical Details

### Users Page Real Data Query

```sql
-- Join profiles + user_roles
SELECT p.user_id, p.email, p.full_name, p.avatar_url, p.created_at,
       ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
ORDER BY p.created_at DESC
```

### Screenings Admin Query

```sql
SELECT s.*, 
  (SELECT count(*) FROM screening_tickets st WHERE st.screening_id = s.id) as ticket_count,
  (SELECT coalesce(sum(price), 0) FROM screening_tickets st WHERE st.screening_id = s.id AND st.payment_status = 'completed') as revenue
FROM screenings s
ORDER BY s.created_at DESC
```

### Sidebar Structure (Final)

```text
OVERVIEW
  Dashboard

CONTENT
  Screenings
  Promo Codes

PEOPLE
  Users
  Filmmaker Submissions

REVENUE
  Sales Dashboard
  Payment Gateways

SETTINGS
  Branding
  Email Settings

LINKS
  Filmmaker Portal ↗ (external)
  View Site ↗ (external)
```