# DeGameTV Competitor & Primitive Register
**Refreshed:** 2026-11-18 (UTC) · **Cadence:** monthly and event-triggered. Public-source research only; no proprietary assets or code copied.

## Comparison set and source evidence
1. **Eventive** — independent cinema/festival ticketing, virtual cinema, streaming and audience management. Its public site describes integrated ticketing, passes, memberships, audience data, marketing, streaming and reporting. Its virtual offering documents DRM, forensic watermarking, geoblocking, availability windows, ticketing and livestreaming. Sources accessed 2026-11-18: https://eventive.org/ ; https://eventive.org/virtual ; https://help.eventive.org/en/articles/4413531-eventive-virtual-single-film-faq ; https://help.eventive.org/en/articles/4382112-eventive-virtual-hybrid-organizer-faq
2. **Vimeo OTT** — branded OTT subscription/transaction platform. Official pricing currently describes $1/subscriber/month and 10% of one-time purchases on Starter, web-only prerecorded content; Enterprise includes branded apps/API, AVOD/FVOD, live/linear, analytics, DRM and multi-device apps. Source accessed 2026-11-18: https://vimeo.com/ott/pricing ; https://help.vimeo.com/hc/en-us/articles/12426980146065-What-is-Vimeo-OTT
3. **Filmhub** — filmmaker/distributor aggregation and rights-aware distribution. Dashboard includes title submission, asset ingestion, channel insights, performance, statements, schedules, referrals and updates; rights can be managed by territory, license type and time window. Sources accessed 2026-11-18: https://help.filmhub.com/filmhub-dashboard ; https://help.filmhub.com/en/articles/2663826-how-to-manage-your-avails-available-rights ; https://help.filmhub.com/plans
4. **W3C WCAG 2.2** — normative accessibility reference, Recommendation updated 2024-12-12. Source accessed 2026-11-18: https://www.w3.org/TR/wcag/ ; https://www.w3.org/WAI/standards-guidelines/wcag/

## Neutral primitives and DeGameTV status
| Primitive | Reference strength | DeGameTV status | Native implementation / dependency |
|---|---|---|---|
| Unified festival/event/ticket/streaming organizer workspace | Eventive | PARTIAL (screens exist; end-to-end not proven) | unify shared event aggregate and organizer service; permissions and event lifecycle |
| DRM + forensic watermark + geoblocking + availability windows | Eventive | MISSING / PARTIAL rights metadata | origin-verifiable playback provider port, rights engine, secure key delivery, provider contracts |
| Live + VOD + scheduled broadcast + replay lifecycle | Eventive | PARTIAL | shared media lifecycle, recording/transcode, event scheduler and replay entitlement |
| Audience CRM, passes/memberships, targeted communication and analytics | Eventive | PARTIAL | consent-aware audience graph, segmentation, event analytics and message service |
| Multi-device branded OTT, SVOD/TVOD/AVOD/FVOD and APIs | Vimeo OTT | PARTIAL | product-line monetization catalog, entitlement, provider-neutral apps and API |
| Customer ownership, subscriber analytics and support | Vimeo OTT | PARTIAL | first-party customer profile, analytics and support/incident surfaces |
| Creator title ingestion, QC, rights avails, asset validation | Filmhub | PARTIAL | ingestion pipeline, technical QC, metadata schema, territory/type/date rights |
| Channel licensing, distribution status, statements and revenue schedule | Filmhub | MISSING | licensing marketplace, partner adapters, royalty ledger and settlement reconciliation |
| Accessibility, captions, audio description, keyboard and focus behavior | WCAG 2.2 | UNVERIFIED | WCAG 2.2 AA audits and assistive technology/device evidence |

## Category parity snapshot (no fabricated performance values)
- Checkout conversion, playback start latency/success, rebuffering, stream quality, uptime, onboarding completion, ticket redemption, creator earnings, unit costs and support response: **UNVERIFIED** for DeGameTV and not directly comparable from public sources.
- Competitors' feature claims above are source-backed, but their private operational metrics are not inferred.
- DeGameTV is **BEHIND on proven completeness**: payment endpoint returns 503; KYC upload handler does not upload; protected playback origin validation is not demonstrated. This is a capability/evidence comparison, not a market-share ranking.

## What makes references win / gaps / absorption
- Eventive: integrated cinema operations and secure virtual cinema reduce organizer tool fragmentation. Primitive absorption is PARTIAL; native build should use one event/entitlement/ticket domain and shared messaging/analytics.
- Vimeo OTT: packaged monetization, branded apps, subscriber ownership and analytics. PARTIAL; native build should expose product-line pricing/entitlements over one billing ledger.
- Filmhub: distribution workflow, rights avails, QC, statements and partner reach. PARTIAL/MISSING; native build should make rights and asset readiness first-class and later connect licensed distribution partners.
- WCAG: testable, device-independent accessibility criteria. Not proven; implement automated and manual audits with WCAG 2.2 AA as floor.

## Strategic must-have
Rights-aware, secure, creator-first African cinema distribution and live/virtual screening with local payment and settlement. Current status **UNVERIFIED / not yet demonstrated**. Prove with successful real test transactions, secure origin playback, creator settlements, local market conversion and audience reliability before claiming advantage.



## 18 November primitive status update

No competitor capability is marked ABSORBED based solely on the new commits. These changes improve foundations but do not yet deliver the complete reference primitive.

| Primitive | Updated status | Evidence / remaining gap |
|---|---|---|
| Private identity evidence intake | PARTIAL | Private bucket, owner policies and submit function deployed; malware scanning, reviewer workflow and video verification untested |
| Origin-verified playback | MISSING | Endpoint now fails closed; no media origin/provider validates entitlement tokens |
| Payment orchestration and settlement | MISSING | Checkout remains HTTP 503 until provider adapter and credentials exist |
| CI and accessibility quality gate | PARTIAL | Workflow committed; no passing run evidence |
| Rights-aware geo/time entitlement | PARTIAL | Validation foundations exist; no real secure delivery and complete rights workflow |
| Database cost controls | PARTIAL | Duplicate index removed; Neon not benchmarked and cost attribution absent |

Neon reference update: official documentation describes compute scale-to-zero after inactivity, autoscaling bounds and cold-start behavior. These are useful primitives for staging and bursty workloads, but not a measured reason to move production. The migration gate is documented in `docs/operations/neon-postgres-cost-optimization.md`.
