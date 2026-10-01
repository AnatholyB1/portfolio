# Feature Landscape - v2.0 Plateforme Sevalys

**Domain:** Small-agency client portal + lead back office (web and AI agency, Tours, SMB clients, solo/very small team)
**Researched:** 2026-10-01
**Overall confidence:** MEDIUM. Behaviors are common patterns from agency portals (Plutio, Dubsado, HoneyBook, Moxie, Productized-style portals), Stripe, and French and EU rules. No live web verification was done this session, so legal and platform items marked VERIFY need checking in the phase research. The v1.1 version of this file was replaced; its simulator findings are already shipped.

## Existing Assets This Milestone Builds On

| Existing | Used by |
|----------|---------|
| Supabase prospects table (insert-only RLS, spam guard) from /simulateur | Attribution, pipeline, funnel. It must be extended (first/last touch columns plus an immutable `lead_events` table), not replaced |
| Resend (notification and confirmation email) | Mailing sequences, magic-link or OTP emails, signature OTP |
| No-price policy plus vitest guards | Quotes and invoices live behind auth only. Guards must allow price content in the authenticated area and PDF templates, and keep forbidding it on public routes, sitemap, llms.txt and JSON-LD |
| JSON-LD in the global layout, `llms.txt` | Review and AggregateRating markup. It must not add price keys |
| fr/en/th LanguageContext | Portal and emails in FR first. Legal documents FR only (the contract language is FR) |
| `/demo` CRM (bakery) | Unrelated. Do not reuse its tables or API routes (the CRM API is frozen) |
| Next.js plus Supabase single project | Portal at `/espace-client`, admin at `/admin`, both noindex and excluded from the sitemap |

## Table Stakes

Missing any of these makes the platform feel broken or legally weak.

### A. Client portal and auth

| Feature | Expected behavior | Complexity | Notes |
|---------|-------------------|------------|-------|
| Passwordless login | The client enters their email and gets a 6-digit code or a link. The session lasts about 30 days on a trusted device | Low-Med | Use Supabase Auth OTP. Email scanners prefetch magic links and burn them, so prefer a code or a confirm-button landing page. Only invited emails may sign in (no open signup). Rate-limit sends |
| Invitation by admin | Admin creates the client and project, and the client receives an invite email. First login starts onboarding | Low | Client record and auth user are linked by email |
| Row-level isolation | A client sees only their own project, files and documents | Med | Must be enforced by Supabase RLS, with tests. This is the biggest security risk |
| Guided onboarding | A short checklist covers company info (SIRET, address, legal representative, which the contract needs), brand assets and access credentials, goals, and a CGV/RGPD acknowledgement. Progress is saved | Med | Data feeds document generation (contract and quote variables). Do not ask for passwords in plain fields; tell clients to use a password manager or share links |
| Project progress by stages | A fixed template per service (for example Brief, Design, Build, Review, Delivery) with status per stage, a current-stage highlight, and a short admin comment. Stage change triggers an email | Med | Stage templates per offer. 9 services means 9 templates, so start with 2-3 generic ones |
| Files and links | The client downloads deliverables and documents and sees important links (staging, Figma, repos). The client uploads assets (logo, photos) | Med | Private Supabase Storage bucket, signed URLs, size and type limits, virus-scan optional |
| Document list | All quotes, contracts, invoices and PVs for the project, with status (to sign, signed, paid) and PDF download | Low | Single "Documents" tab |
| Action-required inbox | A clear list of what the client must do now (sign, pay, upload, approve). Reminders are sent by email | Low-Med | This is the main retention feature of any portal |
| Showcase-permission request | A dedicated request in the portal asks for authorization to present the project (portfolio, case study, social media, screenshots, logo). It has granular checkboxes, a date, and revocability. The answer is stored in the audit log | Low | Needed under RGPD and image/logo rights. Gate any public case study on it. It also feeds the "Realisations" section |

### B. Documents and signature

| Feature | Expected behavior | Complexity | Notes |
|---------|-------------------|------------|-------|
| PDF from versioned templates | Quote, contract, specification (cahier des charges), PV de recette and invoice are generated from data. Each stores the template version, a generated-at timestamp, and an immutable stored copy | Med-High | Use a code template (React-PDF or HTML-to-PDF). Never regenerate a signed doc; store the file and its SHA-256 |
| French legal mentions | Invoice: sequential gapless number, SIRET, TVA or the VAT-exempt mention (franchise en base) if it applies, payment terms, late penalties, and the 40 EUR recovery fee. Quote: validity period, deposit terms, withdrawal and consumer rules where relevant | Med | VERIFY with an accountant. This is a legal checklist, not a design choice |
| Document lifecycle statuses | draft, sent, viewed, signed or accepted, expired, void | Low | Drives automations and the dashboard |
| Simple e-signature (SES) | The signer receives an email OTP, sees the document, and ticks explicit consent. The system stores the document hash, timestamp, IP, user-agent, signer identity and OTP proof, then produces a sealed PDF with a certificate page or audit trail | Med-High | Valid in France as a simple electronic signature under eIDAS and art. 1367 Code civil, but the burden of proof rests on you. That is acceptable for B2B web service contracts of modest value. Make the audit trail exportable |
| Quote acceptance flow | Quote to signed to triggers the first deposit invoice | Med | Chains A to B to C |

### C. Payments (Stripe)

| Feature | Expected behavior | Complexity | Notes |
|---------|-------------------|------------|-------|
| Deposit per stage | Each stage can carry a payment (for example 30% at signature, 40% mid, 30% on delivery). The client sees "Paid / Due / Upcoming" and pays through Stripe Checkout (card, SEPA) | Med | One payment schedule per project. The invoice PDF is generated on payment |
| Webhook-driven truth | Payment status is set only by verified webhooks (`checkout.session.completed` and the like). It is idempotent, and the client's browser redirect is not trusted | Med | Store the Stripe event IDs and replay safely |
| Receipts and reminders | Automatic email on payment, plus a reminder before and after the due date | Low | Through the mailing engine |
| Payment unlocks next step | A stage stays locked or "waiting for deposit" until the payment arrives | Low-Med | An agency norm that protects cash flow |

### D. Prospect attribution and pipeline

| Feature | Expected behavior | Complexity | Notes |
|---------|-------------------|------------|-------|
| UTM capture first-party | On landing, parse `utm_*`, `gclid`, `fbclid` and referrer, and persist for the session. On the simulator submit, attach the first-touch and last-touch values to the prospect | Med | Server-side attribution (a cookie or sessionStorage value forwarded in the submit) |
| Frozen source | "Source" is computed once at creation and never rewritten. Later touches are added as events | Low-Med | Matches the Notion spec |
| Immutable `lead_events` | Append-only log (created, status_changed, email_sent, appointment, quote_sent, won, lost). No UPDATE or DELETE through RLS | Med | Enforce with RLS and DB triggers. Every funnel stat derives from this log |
| 9-month dedupe | The same email or phone within 9 months attaches to the existing prospect as a new event, instead of creating a duplicate. After 9 months it is a new lead cycle that keeps the history | Med | Define the normalization (lowercase, E.164 phone) before building |
| Pipeline statuses | new, contacted, appointment, quote_sent, won, lost (with a lost reason) | Low | Status changes are events |
| Funnel by source | Counts and conversion rates per source (organic, Google Ads, Meta Ads, direct and so on) across the stages | Med | Pure SQL views over `lead_events` |
| Cost per appointment | Manual input of spend per source and period, divided by appointments per source | Low-Med | Do not auto-import ad spend in v2.0 |
| RGPD retention and consent | Consent logged on the event, a purge or anonymization job, and a deletion-request path | Med | Cookie or consent banner design affects whether UTM persistence needs consent (CNIL). VERIFY |

### E. Mailing automation

| Feature | Expected behavior | Complexity | Notes |
|---------|-------------------|------------|-------|
| Status or stage-triggered emails | Event X sends template Y once. Examples: simulator submitted (acknowledgement), appointment reminder, quote sent, signature reminder, payment received, stage completed, review request | Med | A simple rule table (event type, template, delay) plus a scheduled worker (Vercel cron or Supabase pg_cron). No visual builder |
| Idempotency and logs | One send per trigger per entity. The send is logged as an event, and a failure is retried | Med | Resend webhooks for delivered, bounced, complained |
| Unsubscribe separation | Transactional emails (signature, invoice, auth) are always sent. Prospect nurture sequences carry an unsubscribe link and suppression | Low-Med | Legal requirement for marketing email |

### F. Admin dashboard

| Feature | Expected behavior | Complexity | Notes |
|---------|-------------------|------------|-------|
| Project list and detail | All projects with stage, next action, amounts due, and quick stage advance | Med | Admin-only role. Use a separate `admin` claim, not a client flag |
| Prospect pipeline view | Kanban or table by status, with the event timeline and source badge | Med | |
| Revenue and cash view | Signed amounts (booked), invoiced, paid, and outstanding, plus a monthly forecast from the payment schedules | Med | Forecast = scheduled unpaid instalments by due date |
| Costs and margin | Manual cost entries per project (freelancers, tools, ads) and per month. Margin = paid or booked revenue minus costs | Med | Manual entry is acceptable. No accounting integration |

### G. Reviews

| Feature | Expected behavior | Complexity | Notes |
|---------|-------------------|------------|-------|
| Unique review link | A single-use tokenized link is sent to a delivered client. The client leaves a rating and text, and it is marked "verified client" | Med | Token is bound to a project that is paid and delivered |
| Direct Google Business link | The same email, or the thank-you page, links to the Google review URL (`g.page/r/.../review`) | Low | Ask everyone. Do not filter by rating |
| Publication | Admin moderates (no editing of content, only publish or reject with a reason) and shows reviews on the site | Low-Med | |

## Differentiators

Valued, not expected. Choose the cheap ones.

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Public status page per project (read-only share link) | Client forwards progress to a partner | Low | Defer |
| Per-stage "approve" button with comment (client approval of a stage) | Reduces scope disputes and creates an audit entry | Low-Med | Reuses the signature audit mechanism. Recommended inside the PV de recette |
| Portal reflects live services, such as AI voice agent call stats | Shows value after delivery, and ties to the Sevalys AI positioning | High | Defer to a later milestone |
| Revenue forecast with scenarios (pipeline-weighted: prospects at quote_sent times a win rate) | Real cash planning | Med | Build after the base forecast has real data |
| Source-to-revenue attribution (revenue and margin by acquisition source, not just appointments) | Ties ads to cash, and proves ROI | Med | Cheap once `lead_events` and payments share a prospect-to-client key |
| Meta Conversions API and Google Ads offline conversion upload (server events from won leads) | Better ad optimization | Med-High | Requires a consent-aware design and click IDs stored. VERIFY. The "preparation" in the brief says to design the data, not necessarily send |
| Review rating shown with `Review` and `AggregateRating` schema | Trust and GEO signal | Low | See anti-feature caveat on rich-result eligibility |
| Organic content kit (templates, UTM naming convention doc, post calendar) | Faster acquisition | Low | Documentation and assets, not code |
| Versioned template changelog visible in the admin | Traceability of what a client signed | Low | Falls out of the template versioning |

## Anti-Features

| Anti-Feature | Why avoid | Instead |
|--------------|-----------|---------|
| Passwords, signup form, social login for clients | Support burden and no benefit for a few dozen clients | Email OTP with invite-only access |
| Third-party e-signature SaaS or advanced/qualified signature | Decided out of scope, and cost and complexity are high | Own SES with a strong audit trail. State clearly in the contract that the parties accept electronic signature as proof |
| Showing prices on public pages or in the sitemap, llms.txt, or JSON-LD (Offer price, `priceRange`) | Breaks PRIX-01, and the guards would fail | Prices only in the authenticated area and PDFs, with route-level checks |
| Selective review solicitation (only asking happy clients) or an internal rating gate that routes only 4-5 stars to Google | Violates Google policy and the EU and French rules on fake or filtered reviews (Omnibus directive, DGCCRF) | Send the Google link to every client, and publish moderated reviews with a stated policy |
| Counting on star rich results for self-served reviews of your own business | Google ignores `Review` and `AggregateRating` on a business's own site for LocalBusiness and Organization (self-serving reviews, since 2019). VERIFY | Still mark up for GEO and AI engines, accept no stars in search results, and push reviews on Google Business Profile |
| Custom CMS or WYSIWYG document editor for templates | Large cost for a few templates | Templates in code, edited through pull requests, versioned |
| Full CRM or marketing automation (visual flow builder, lead scoring, A/B in email) | Scope explosion | Rule table of status-to-email. Use a statuses pipeline |
| Real-time chat, in-portal messaging, ticketing | Duplicates email and WhatsApp, with moderation burden | "Reply by email" links and a contact button |
| Time tracking, Gantt, task boards for clients | Agency internal tooling, and not what the client wants | One stage list with comments |
| Full accounting (ledger, VAT returns), bank sync | Out of scope and regulated | Manual cost entries and CSV export for the accountant |
| Cross-site tracking, fingerprinting, third-party pixels without consent | CNIL and RGPD risk | First-party UTM only. Ad pixels loaded only after consent |
| Editing or deleting `lead_events` or rewriting the frozen source | Destroys auditability and trust in the stats | Correction events (append a compensating event) |
| Auto-importing ad spend through platform APIs | API approvals and maintenance | Manual monthly spend entries |
| Subscriptions and recurring billing in the first iteration | Different model (the brief is for deposits per stage) | One-off Checkout per instalment. Add recurring later for maintenance contracts |

## Feature Dependencies

```
Admin role + RLS isolation ──► everything in the portal
Client invite ──► Passwordless login ──► Onboarding ──► (company data) ──► Document templates
Document templates ──► Quote ──► Simple e-signature ──► Payment schedule ──► Stripe Checkout + webhooks
                                         │                                   │
                                         └──► Audit trail                    └──► Stage unlock + Invoice PDF
Stage progress ──► PV de recette (sign) ──► Final payment ──► Review request ──► Verified review ──► Review schema
Showcase-permission ──► (gate) public case studies on the site
Prospect table (existing) ──► first/last touch + lead_events ──► Dedupe ──► Pipeline ──► Funnel by source ──► Cost per appointment
Prospect won ──► Client record (conversion link) ──► Revenue attribution by source
lead_events + stage events ──► Mailing triggers (Resend) ──► Resend webhooks logged back as events
Payments + schedules + costs ──► Admin forecast, margin, cash
```

Key critical path: RLS and roles, then documents and signature, then Stripe. Attribution and mailing can run in parallel to the portal, since they depend only on the existing prospect table.

## MVP Recommendation (ordering for the roadmap)

1. Data foundation: roles, RLS, extended prospects, `lead_events` (immutable), the prospect-to-client link. All other features rely on it.
2. Attribution and pipeline: UTM capture into the existing simulator, dedupe, statuses, funnel and cost per appointment. This is quick value and independent of the portal.
3. Mailing engine (Resend rules, idempotency, logs), because the portal and payments reuse it.
4. Portal core: invite, OTP login, onboarding, stage progress, files and links, action inbox, showcase permission.
5. Documents and e-signature: templates, hash, OTP, audit trail, sealed PDF.
6. Stripe: schedules, Checkout, webhooks, invoices, stage unlock.
7. Admin dashboard: projects, revenue forecast, costs, margin, cash.
8. Reviews: unique link, Google link, moderation, schema. Needs delivered clients, so it comes last.
9. Acquisition prep (UTM convention doc, conversions design, content kit). Docs can be written early, and conversion sends wait for consent design.

Defer: Meta CAPI and Google offline conversion sending, scenario forecasts, public status pages, live service stats in the portal, recurring billing.

## Complexity and Risk Flags for the Roadmap

- Highest risk: RLS isolation, e-signature evidentiary quality, Stripe webhook idempotency, invoice legal mentions. These deserve phase-level research.
- Likely need deeper research: French invoicing rules including the e-invoicing reform timeline (VERIFY dates), CNIL position on first-party UTM storage and ad conversion APIs, and Google self-serving review markup eligibility.
- Standard patterns, little research needed: stage progress UI, file uploads, mailing rules, funnel SQL views.

## Sources

- Training-knowledge synthesis of common agency portal products and Stripe Checkout and webhook practice (MEDIUM). Not freshly verified.
- Project context: `C:\portfolio\.planning\PROJECT.md` (HIGH).
- Items marked VERIFY: eIDAS and art. 1367 Code civil evidentiary weight, French e-invoicing timeline, CNIL guidance on audience measurement and ad pixels, Google review-snippet policy for self-serving reviews, Google review-gating policy (LOW to MEDIUM until checked).
