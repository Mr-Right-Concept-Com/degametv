# DeGameTV — Scheduled Events, Advance Sales, Private Screenings & Fan Support

## Product contract

### 1. Event scheduling and advance sales
Creators can publish a future live show, premiere or screening page well before the event (including months ahead). The page is discoverable and shareable while the event is upcoming. Creators configure a sales opening time, optional closing time, event start/end, timezone, ticket capacity and pricing. Ticket sales can open weeks or months ahead and remain open during the live event until the configured close/event end. A scheduled event is not the same as a live stream being provisioned or active.

### 2. Early-bird access
Creators may configure early-bird pricing, an end timestamp and/or limited early-bird quantity. Early-bird buyers receive a paid ticket entitlement immediately after verified payment. They receive a confirmation email at purchase and an event access notification/link at the configured release time. The access notification must be queued idempotently and sent through the platform's configured email provider. The buyer must also be able to retrieve the ticket from their account; email is a delivery channel, never the sole source of authorization.

### 3. Same-day and in-progress purchase
Sales remain available on event day and while the event is live, provided the creator has not closed sales and capacity remains. Checkout must enforce the same ticket price, currency, territory, capacity and entitlement rules regardless of whether a buyer purchases early or during the event. Late purchasers receive access immediately after provider payment verification.

### 4. Premiere and cinema-style releases
A creator can announce and promote a film before its release date, publish the premiere page, sell advance tickets, and set the exact release/access timestamp. Paid early buyers are granted access at the configured release time. Ticket entitlements are checked server-side against the release window and territory. A release notification is sent automatically, with retries and idempotency. The release must not expose the playback URL before the access time.

### 5. Private screenings and guest lists
Creators can create private or unlisted screenings, invite selected email addresses or registered users, assign guest/press/reviewer/VIP/crew roles, revoke invitations and view acceptance. Invite tokens must be random, stored as hashes, expire, and be single-use or safely re-usable only according to policy. Private events must not appear in public discovery or accept public checkout. Paid private screenings may use the same ticket checkout while enforcing invite eligibility. Guest access is distinct from public ticket entitlement.

### 6. Creator revenue settlement hold
Ticket, tip and gift proceeds are not immediately withdrawable. Each event-linked earning is held until the event has ended and the required delivery evidence is confirmed, then becomes eligible after the configured 24–72 hour hold (default 48 hours). For a film premiere, delivery evidence includes the actual release and playable asset. For a live event, it includes confirmed event end and, where recording is promised, the replay asset becoming ready. Failed promises, cancellation, non-delivery, chargebacks or disputes keep funds blocked or route them through refund/dispute handling. A hold is not a withdrawal; normal payout review, KYC, bank verification and risk controls still apply.

### 7. Creator dashboard and refunds
Creators can see gross sales, paid tickets, live viewers, tips, gifts, refunds, pending holds, eligible balances and payout history, broken down by event and currency. Refunds are initiated from the creator dashboard only within the configured policy and permissions. Refund processing must call the payment provider, remain idempotent, reconcile the provider outcome and revoke/adjust the associated entitlement only after confirmed refund. Platform/admin review can be required for exceptional cases. Failed provider promises must support cancellation notices and refund workflows.

### 8. Tips and live gifting
Viewers can tip or send gifts to creators on supported content pages and during live streams. Gifts may use a platform-managed catalog of gift keys and values; viewers can add an optional message and choose whether to display their name. The UI shows gift/tip events in real time, with moderation controls. Each contribution is a separately verified payment and ledger item; it is not a ticket and never grants playback access. Fees, creator share, currency, refunds, fraud and settlement holds must be explicit. Prevent self-tipping, spam, replay attacks and unverified client-side balance updates.

## Technical acceptance gates
- One event scheduling model across live shows, premieres and private screenings.
- Sales opening/closing windows and event-time sales enforced server-side.
- Early-bird amount/capacity is atomic under concurrency.
- Purchase confirmation and access-release notifications use an idempotent outbox.
- Ticket entitlements are created only after verified provider payment or valid complimentary invite acceptance.
- Email failure never removes a valid entitlement; account ticket access remains authoritative.
- Private events are excluded from public search and protected from IDOR.
- Creator refunds use authenticated tenant-scoped authorization and provider reconciliation.
- Tips/gifts use provider verification, a separate contribution ledger and real-time fan display.
- Event-linked earnings cannot be withdrawn before end + delivery confirmation + configured 24–72 hour hold.
- Payout eligibility is computed server-side; creators cannot alter hold state, release timestamps or delivery evidence.
- Event cancellation/non-delivery supports automatic notification and controlled refund workflows.
- Timezones are stored as IANA identifiers; timestamps are stored in UTC.
- The full journey passes integration, browser and payment-provider sandbox tests before production certification.

## Implementation status
The database foundation now includes event sales windows, early-bird settings, visibility/private flags, event timezone and hold configuration on screenings/live streams; private invite records; tip/gift contribution records; event settlement hold records; and an email notification outbox. This migration does not yet complete Creator Studio UI, public discovery filtering, checkout enforcement, early-bird price/capacity reservation, notification worker/provider delivery, private invite issuance/redemption, contribution checkout/webhooks, creator refund dashboard, or payout integration. Those remain explicit implementation work and must not be represented as production-ready.
