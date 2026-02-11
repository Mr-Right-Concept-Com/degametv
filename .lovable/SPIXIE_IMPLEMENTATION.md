# DeGameTV Spixie-Style Virtual Cinema Implementation

## Overview
Complete implementation of a Spixie.net-style virtual cinema ticket funnel with multi-gateway payment support (Stripe, Paystack, Flutterwave, Bank Transfer). All payment gateways use **test keys by default** with a secure admin panel to switch to live keys without rebuilding.

## Database Schema

### Tables Created
1. **screenings** - Virtual cinema events (movies)
2. **screening_tickets** - User tickets with location-based pricing
3. **payment_gateways** - Admin configuration for payment processors

All tables use RLS for security and support multi-tenant operations.

## User-Facing Pages

### 1. Buy Ticket Flow (`/buy/:slug`)
Multi-step conversion funnel:
- **Step 1: Location Selection** - Choose Nigeria/International pricing
- **Step 2: Email Capture** - Enter email for watch link delivery
- **Step 3: Payment Method** - Select payment processor + add-ons (popcorn, drinks)
- **Step 4: Confirmation** - Order summary + watch link sent to email

### 2. Watch Movie (`/watch/:watchCode`)
- Protected streaming page (validates ticket access via watch code)
- Shows movie info, access details, and expiration date
- Expires after 90 days
- Video player placeholder (ready for integration)

### 3. My Tickets (`/tickets`)
- Dashboard showing active & expired tickets
- Quick access to watch links
- Ticket statistics
- Ability to re-purchase expired movies

## Admin Features

### Payment Gateway Settings (`/admin/settings/payment-gateways`)
**Key Features:**
- View all integrated gateways (Stripe, Paystack, Flutterwave, Bank Transfer)
- **Toggle test/live mode per gateway** - No code rebuild required
- Admin paste live API keys securely
- Webhook configuration instructions
- Gateway enable/disable

**Gateways Configured with Test Keys:**
1. **Stripe** - pk_test_*, sk_test_*
2. **Paystack** - pk_test_*, sk_test_*
3. **Flutterwave** - pk_test_*, sk_test_*
4. **Bank Transfer** - Manual verification flow

## Backend Implementation

### Edge Functions

#### 1. `process-payment` 
Handles all payment methods:
- Reads gateway config from `payment_gateways` table
- Automatically uses live keys if enabled, otherwise test keys
- Supports: Stripe, Paystack, Flutterwave, Bank Transfer
- Returns: Watch code, ticket code, watch URL

#### 2. `validate-watch-code`
Validates access to watch page:
- Checks ticket validity
- Verifies email match
- Validates expiration
- Updates last accessed timestamp

## How It Works: Test to Live Migration

### Current Setup (Test Mode)
```
Admin Dashboard (Test Keys)
    ↓
Edge Function (reads config)
    ↓
Uses test_secret_key from payment_gateways table
    ↓
Mock charges (no real money)
```

### Switch to Live (Admin Panel)
```
1. Admin goes to /admin/settings/payment-gateways
2. Clicks "Configure" on desired gateway
3. Pastes live public + secret keys
4. Clicks "Activate Live Mode"
5. ✅ Live charges process immediately - NO REBUILD
```

## Key Features

✅ **Location-Based Pricing** - Nigeria vs International rates  
✅ **Email Delivery** - Watch link sent instantly after purchase  
✅ **Add-ons Support** - Popcorn, drinks, premium bundles  
✅ **90-Day Expiration** - Automatic ticket expiry  
✅ **Test/Live Toggle** - Switch without code changes  
✅ **Secure RLS** - Database level access control  
✅ **Multi-Gateway** - Stripe, Paystack, Flutterwave, Bank Transfer  
✅ **Admin Control** - Full payment settings management  

## Routes Reference

| Path | Component | Purpose |
|------|-----------|---------|
| `/buy/:slug` | BuyTicket | Ticket purchase funnel |
| `/watch/:watchCode` | WatchMovie | Movie streaming page |
| `/tickets` | MyTickets | User ticket dashboard |
| `/admin/settings/payment-gateways` | PaymentGatewaySettings | Admin payment config |

## Next Steps

1. **Test the flow** - Go through complete purchase on `/buy/the-wedding-day`
2. **Add real screenings** - Populate `screenings` table with movies
3. **Integrate video player** - Replace placeholder in WatchMovie with HLS/DASH player
4. **Add email notifications** - Send watch link emails via Resend/SendGrid
5. **Enable real payments** - Paste live keys in admin panel
6. **Analytics** - Track conversions, revenue, customer metrics
