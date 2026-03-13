

# Launch Readiness Audit & Fix Plan

## Issues Found Across All Three Dashboards

### Critical Issues

1. **Admin Sidebar broken link**: Branding links to `/admin/modules/white-label` which is no longer routed in `App.tsx` (removed during module cleanup). The route was removed but the sidebar still references it.

2. **ProtectedAdminRoute has NO role check**: It only checks `if (!user)` — any logged-in user can access `/admin/*`. Must verify `is_super_admin` or `platform_admin` role via the `has_role` DB function or `user_roles` table.

3. **PaymentGatewaySettings uses local state only**: Gateway configs (Stripe, Paystack, Flutterwave) are hardcoded in React state. Save/toggle actions don't persist to the `payment_gateways` Supabase table. Keys entered are lost on refresh.

4. **WhiteLabel page uses local state only**: Branding settings (colors, name, logo, domain) don't persist to `tenants` or `platform_settings` table. Save button is non-functional.

5. **Admin/Studio sidebars not responsive**: Both use `fixed w-64` with `pl-64` content. On mobile (user is viewing at 320px), entire dashboard is off-screen/clipped.

6. **Promo Codes page is read-only**: No create/edit/delete functionality. The "Plus" button exists in the import but is not rendered.

7. **Screenings admin page is read-only**: No CRUD operations. Cannot create, edit, publish, or delete screenings.

### Medium Issues

8. **Studio Submit form has no Zod validation**: Uses inline `if (!form.submitter_name)` checks. No schema validation, no proper error display per field.

9. **User_roles upsert uses wrong conflict**: `onConflict: 'user_id'` but the unique constraint is `(user_id, role)`. If a user has multiple roles, this fails.

10. **`filmmaker_submissions` RLS missing SELECT for creators**: Filmmakers can INSERT but cannot SELECT their own submissions. The Studio pages (`StudioMovies`, `StudioDashboard`) query by `submitter_email` but no RLS policy allows authenticated users to read their own rows.

11. **EmailSettings**: Fetches/saves to `platform_settings` table correctly, but the "Send Test" button invokes a function that may not handle the dynamic config.

12. **Search on Navbar is non-functional**: The search input doesn't filter or navigate anywhere.

### Minor Issues

13. **UserDashboard not protected**: Accessible at `/dashboard` without `ProtectedRoute` wrapper in `App.tsx`.
14. **MyTickets not protected**: Same issue — `/tickets` has no auth guard.
15. **Missing `<title>` / meta tags**: No page-level SEO metadata.

---

## Fix Plan (Prioritized for Launch)

### Phase 1: Security & Auth (Critical)

**1. Fix ProtectedAdminRoute** — Add real role verification using `user_roles` table query to check for `super_admin` or `platform_admin` role before granting admin access.

**2. Fix filmmaker_submissions RLS** — Add SELECT policy: `submitter_email = auth.jwt()->>'email'` so creators can view their own submissions in Studio pages.

**3. Protect /dashboard and /tickets routes** — Wrap with `ProtectedRoute` in `App.tsx`.

### Phase 2: Fix Broken Links & Navigation

**4. Fix Admin Sidebar branding link** — Change `/admin/modules/white-label` to `/admin/settings/branding` and add proper route in `App.tsx`.

**5. Make Admin & Studio sidebars responsive** — Add mobile hamburger menu with sheet/drawer overlay for screens < 768px. Hide fixed sidebar on mobile, show toggle button.

### Phase 3: Wire CRUD Operations

**6. Add Promo Code CRUD** — Create dialog for adding new promo codes with Zod-validated form (code, discount_type, discount_value, max_uses, valid_until). Add toggle active/inactive and delete actions.

**7. Add Screening CRUD** — Create/edit dialog for screenings (title, slug, description, poster_url, screening_date, pricing, status). Add publish/unpublish and delete actions.

**8. Wire PaymentGatewaySettings to Supabase** — Load from and save to `payment_gateways` table. Persist enable/disable, test/live mode, and API keys.

**9. Wire WhiteLabel to Supabase** — Save branding config to `platform_settings` or `tenants` table. Load on mount.

### Phase 4: Form Validation & Polish

**10. Add Zod validation to StudioSubmit** — Schema for submitter_name, project_title, email, duration, release_year with proper error messages per field.

**11. Fix user_roles upsert** — Query existing role first, then update or insert. Handle the unique constraint properly.

**12. Remove non-functional search** — Either implement search (filter screenings by title across pages) or remove the input to avoid confusion.

### Phase 5: SEO & Meta

**13. Add document titles** — Use `useEffect` to set `document.title` on each page for proper browser tab labeling.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/auth/ProtectedAdminRoute.tsx` | Add role verification query |
| `src/components/admin/AdminSidebar.tsx` | Fix branding link, add mobile responsiveness |
| `src/components/admin/AdminLayout.tsx` | Mobile sidebar toggle |
| `src/components/studio/StudioSidebar.tsx` | Mobile responsiveness |
| `src/components/studio/StudioLayout.tsx` | Mobile sidebar toggle |
| `src/pages/admin/PromoCodes.tsx` | Add create/edit/delete CRUD with Zod forms |
| `src/pages/admin/Screenings.tsx` | Add create/edit/delete CRUD with Zod forms |
| `src/pages/admin/PaymentGatewaySettings.tsx` | Wire to Supabase `payment_gateways` table |
| `src/pages/admin/settings/WhiteLabel.tsx` | Wire to Supabase `platform_settings` table |
| `src/pages/admin/Users.tsx` | Fix role upsert logic |
| `src/pages/studio/StudioSubmit.tsx` | Zod validation schema |
| `src/App.tsx` | Fix routes: protect /dashboard, /tickets; add /admin/settings/branding |

## DB Migration Needed

- Add RLS policy on `filmmaker_submissions` for authenticated users to SELECT their own rows by email.

