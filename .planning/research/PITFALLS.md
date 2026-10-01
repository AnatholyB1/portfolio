# Domain Pitfalls

**Domain:** Client platform (portal, in-house e-signature, PDFs, Stripe, UTM attribution, mailing, verified reviews, ad conversions) added to an existing French agency site (Next.js 16, Supabase, Resend, Vercel)
**Researched:** 2026-10-01
**Overall confidence:** MEDIUM. Based on training knowledge of RGPD/CNIL, eIDAS (Reg. 910/2014), Stripe, Supabase and Vercel docs. Not re-verified against live sources in this session. Items marked [VERIFY] must be checked before the relevant phase is planned. Nothing here is legal advice. Have the CGV, contract, and privacy policy reviewed by a professional.

Existing assets that interact with these pitfalls: insert-only RLS on the prospects table, honeypot spam guard, Resend notification, a `/demo` CRM using Supabase Realtime, 332 vitest policy guards (no-price), i18n fr/en/th via LanguageContext, and a site-wide "no price" policy.

---

## Critical Pitfalls

### 1. Stripe webhook handled non-idempotently, or trusting the redirect
**What goes wrong:** The "paid" status is set from the `success_url` redirect, or the webhook handler inserts payments or sends emails and invoices on every delivery. Stripe retries and delivers out of order, so you get duplicate invoices, double emails, or a step marked unpaid after being paid.
**Why it happens:** The happy path works in test mode. Next.js body parsing breaks signature verification.
**Consequences:** Accounting errors, duplicate invoice numbers (a legal problem, see #8), clients charged or notified twice.
**Prevention:**
- Make the webhook the only source of truth for payment state.
- Verify the signature with the raw body (`await req.text()`, never `req.json()`) and the webhook secret.
- Create a `stripe_events` table with `event_id` as PRIMARY KEY. Insert first, and on conflict return 200 and do nothing.
- Make state transitions monotonic and keyed on `payment_intent` / `checkout_session` id. Never rely on event order.
- Return 2xx fast and do the heavy work (PDF, email) in a queue or a follow-up step.
- Put `step_id` / `project_id` in Stripe `metadata`. Use Stripe idempotency keys on every create call.
- Handle `checkout.session.completed`, `async_payment_succeeded` / `failed` (SEPA is asynchronous), `charge.refunded` and `charge.dispute.created`.
**Detection:** Duplicate rows in payments, a "paid" step with no matching `stripe_events` row, 400 signature errors in the Vercel logs.
**Phase:** Stripe payments phase. The `stripe_events` table and the test with replayed events (Stripe CLI `stripe events resend`) must be acceptance criteria.

### 2. Supabase RLS role leaks (client sees another client's data, or anon sees the admin tables)
**What goes wrong:** The v1.1 pattern is "insert-only RLS for anon". v2.0 adds authenticated clients, and policies are written as `using (true)` or only check `auth.role() = 'authenticated'`. Any logged-in client can then read every project, quote and invoice. Other variants: `service_role` key used in client or route code that is reachable without an auth check; views bypass RLS (they run as owner unless `security_invoker = true`); storage buckets left public; admin identified by an editable `user_metadata` claim (user-editable) rather than `app_metadata` or a roles table; Realtime on `/demo` tables broadcasting new tables.
**Consequences:** Cross-client data leak of contracts, quotes and invoices. This is an RGPD breach (notification to CNIL within 72 h).
**Prevention:**
- Enable RLS on every new table in the same migration that creates it.
- Ownership model: `projects.client_id`, with policies `client_id = (select auth.uid())`. Wrapping in `select` also helps performance.
- Admin role from `app_metadata` or a `profiles.role` table that clients cannot write. Never `user_metadata`.
- Views get `with (security_invoker = true)`.
- `service_role` only in server-only modules (`import 'server-only'`), never exposed via `NEXT_PUBLIC_`.
- Write a vitest or pgTAP guard that runs as client A and asserts zero rows from client B's data, and as anon asserts zero reads on everything. This matches the repo's existing "policy as test" culture.
- Run the Supabase security advisor in CI.
- Immutable tables (`lead_events`, audit trail) get no UPDATE or DELETE policy at all, plus a trigger that raises on update or delete.
**Detection:** The advisor warns "RLS disabled" or "policy always true". A client JWT can `select *` on another client's rows.
**Phase:** Foundation / auth phase (before any feature table). Re-audit at each phase that adds tables.

### 3. File access: public buckets or long-lived signed URLs for contracts and invoices
**What goes wrong:** PDFs and client files are stored in a public bucket, or signed URLs with long expiry are emailed or stored in the database and then forwarded. Storage paths are guessable (`/contracts/{projectId}.pdf`).
**Prevention:**
- Private buckets only. Add storage RLS policies keyed on a path prefix `{client_id}/...`.
- Generate signed URLs on demand, server side, after an authz check, with a short TTL (60-300 s). Never persist them.
- Emails link to the portal page (behind login), not to the file.
- Use random object ids. Validate upload MIME type and size, and sanitise filenames (client uploads can carry malware or HTML/SVG XSS). Serve with `Content-Disposition: attachment` where possible.
**Detection:** A bucket flagged public in the dashboard. An unauthenticated GET on a stored URL returns 200.
**Phase:** Portal files phase, and PDF storage in the documents phase.

### 4. In-house "simple" e-signature with weak evidentiary value
**What goes wrong:** The team assumes "OTP + hash + IP = legally solid". Under eIDAS (art. 25) a simple electronic signature cannot be denied legal effect solely because it is electronic, but the burden of proof is on the party relying on it, so the audit trail quality is what counts. Typical failures:
- The signed document is not frozen. The PDF is regenerated from a template later and the hash no longer matches. This is the most common bug, because templates are versioned in code.
- No signer identity link. The OTP goes to an email that was never verified as belonging to the signer, or the OTP is reusable, never expires, or has no attempt limit.
- The timestamp is the app server clock (a DB `now()` that can be edited), not an independent source. No RFC 3161 TSA.
- Audit log in a mutable table, editable by `service_role` or admin.
- No explicit consent step ("I have read and I sign, this is a contract subject to payment"), and no display of the exact document version being signed.
- No sealed final copy sent to both parties.
- Scope: for ordinary B2B services contracts, simple signature is generally accepted (freedom of proof between merchants, Code civil art. 1366-1367). It is a poor fit for anything requiring advanced or qualified signatures, or consumer contracts with specific mentions. [VERIFY with a lawyer]
**Prevention:**
- Store the exact rendered PDF bytes, with a SHA-256 stored at signature time, in a write-once storage object. Never re-render a signed document. Record `template_id` + `template_version` + a data snapshot (JSON) alongside.
- The OTP is single use, 6+ digits, valid 10 min or less, max 3-5 attempts, rate limited, stored hashed, with a fresh code per signing session.
- Audit trail: append-only (trigger blocks update and delete), including events `document_viewed`, `otp_sent`, `otp_verified`, `consent_checked`, `signed`, with timestamp, IP, user agent, document hash and signer email.
- Consider a free or cheap RFC 3161 timestamp authority for the hash, as independent time evidence. Optionally chain hashes between audit rows.
- Deliver a signed PDF with a visible "certificate of signature" page. Email a copy to both parties and retain.
- Put proportionality language in the CGV / contract: the parties agree that the electronic signature with OTP is accepted as proof (convention de preuve). This is the single most valuable clause for a simple signature.
- Retain for the contract life plus the limitation period (5 years commercial, art. L110-4 Code de commerce), subject to RGPD minimisation.
- Don't market it as "qualified" or "advanced". Say "signature électronique simple".
**Detection:** The signed doc's stored hash does not equal the recomputed hash of the stored file. A signature record without a consent event. Audit rows that can be updated.
**Phase:** E-signature phase (depends on PDF phase). Needs a legal review checkpoint.

### 5. RGPD / CNIL: ad conversion tracking and UTM attribution without valid consent
**What goes wrong:** Meta Pixel, Google Ads tag or GA fire before consent, or the cookie banner makes "Refuser" harder than "Accepter". The CNIL requires refusing to be as easy as accepting (one click, same level), no pre-ticked boxes, no consent wall via scroll or continued browsing, and consent proof. The CNIL has fined Google, Facebook, Apple, Criteo and many smaller sites over this.
Also:
- "First-party UTM" still stores a cookie or localStorage identifier on the device. Reading or writing it is covered by ePrivacy art. 82 of the Loi Informatique et Libertés unless strictly necessary. Statistical audience measurement is exempt only under narrow CNIL conditions, and attribution to ad campaigns is generally not exempt. [VERIFY]
- Server-side events (Meta CAPI, Google enhanced conversions) send hashed email and phone to the platform. This needs consent and a legal basis, a privacy policy mention, and processor/transfer disclosure (US transfers: check Data Privacy Framework status of the vendor).
- Consent is not propagated to the server. The browser consents, but the CAPI call fires for everyone.
- Retention: cookie lifetime max 13 months, data max 25 months (CNIL guidance). Your "dedup 9 months" window and the `lead_events` immutable journal conflict with deletion rights unless you can anonymise or pseudonymise.
- Immutable `lead_events` vs droit à l'effacement (art. 17): immutability of the journal must be about integrity, not preventing erasure. Design for tombstoning or anonymising identifying columns while keeping aggregate stats.
**Prevention:**
- Strictly necessary only before consent: capture UTM params server-side on form submit from the landing URL (the visitor typed or clicked it), store them with the lead under the existing RGPD-consented simulator form. Persist a first-touch cookie only after consent.
- A CMP or a custom banner with equal-weight Accept / Refuse / Customise buttons, consent log (timestamp, version, choices), re-prompt at 6 months, easy withdrawal link in the footer. i18n fr/en/th.
- Load ad tags only after consent (Next.js `<Script>` gated by the consent state; GTM Consent Mode v2 if GTM is used). Meta CAPI / Google enhanced conversions send only if the lead's stored consent flag is true.
- Update the privacy policy: purposes, legal basis, recipients, retention per table, rights, DPO absence statement, and a record of processing activities (registre, art. 30).
- Retention job (pg_cron or a scheduled route): purge or anonymise non-converted prospects after the CNIL prospecting guideline (3 years from last contact), tracking identifiers at 13 months.
- Signed DPAs with Supabase, Vercel, Resend, Stripe, Meta and Google (processor roles). For client projects where you hold the client's end-customers' data, you may be the processor and need a DPA clause in the contract.
**Detection:** Network tab shows `fbevents.js` or `googleads` requests before clicking Accept. The "Refuser" button needs two clicks. No consent log.
**Phase:** UTM attribution phase for the data model and retention design; the consent banner MUST ship before or with the ad conversions phase (do not defer).

### 6. DGCCRF / Omnibus: "verified reviews" that are not compliant
**What goes wrong:** Since the Omnibus directive (transposed in France by ordonnance 2021-1734, in force 28 May 2022; Code de la consommation art. L111-7-2 and decree 2022-... on reviews) any professional publishing consumer reviews must disclose: whether and how it checks that reviews come from consumers who actually used or bought the service, how reviews are processed (moderation criteria, ranking), whether a payment or benefit was given in exchange, and the publication date plus date of the experience. Fake reviews and deceptive practices fall under unfair commercial practices (L121-1 and following, fines up to 300 000 EUR / 10% of turnover for natural persons or companies, with higher levels in some cases). [VERIFY precise text]
Specific traps:
- Sending the review link only to happy clients (gating), or filtering out negative reviews. Moderation may be only on legality (insult, off topic, personal data), never on sentiment. Rejected reviews should be retained and the reason recorded; the client can request the reason.
- No information page ("Comment sont collectés nos avis"). Mandatory disclosure, accessible from the review display.
- Incentive (discount, gift) for reviews without disclosure. Better not to offer one.
- Reviews are B2B (PME clients). The Omnibus consumer-review rule technically targets consumers, but DGCCRF and the unfair-practice rules for professionals (L121-1 applies to B2C; B2B deceptive advertising falls under L121-1 in B2B contexts via "pratiques trompeuses", and Code pénal) still make fake or curated testimonials risky. Treat the rules as binding anyway. [VERIFY]
- Self-written or edited testimonials, or `AggregateRating` markup computed from curated reviews. Google's structured data policy forbids self-serving `Review` markup for a LocalBusiness / Organization reviewing itself (reviews about the entity itself are ignored or trigger a manual action). `AggregateRating` on the Organization's own site is not eligible for rich results, and misuse can cause a manual action.
- Showing an average without the number of reviews and period; showing only 5-star reviews.
**Prevention:**
- Unique single-use token per delivered project, sent to every client (100% of closed projects, not a selection). One review per token, with the project's date recorded as "date de l'expérience".
- Publish all reviews that pass legality moderation. Keep a moderation log. Allow the reviewed business to reply, not to delete.
- Page "Politique des avis" in fr/en/th stating verification method, moderation, no incentives, retention. Link it next to every displayed review.
- Mark `Review` JSON-LD only on individual service/project pages about the reviewed item where eligible, and verify with Google's Rich Results Test. Do not rely on `AggregateRating` for the agency itself for SEO. Keep the existing rule "no price keys" tests and add a guard that schema reviews match DB-published reviews.
- Display the author name only with consent; handle RGPD (pseudonym option) and withdrawal.
**Detection:** The share of published reviews is much lower than the share of clients invited. Any manual deletion of reviews in the database or admin UI without a reason code.
**Phase:** Reviews phase. Policy page and moderation rules must be defined before the first review link is sent.

### 7. Google Business Profile: gating and incentives
**What goes wrong:** The review flow asks "satisfied?" and routes only happy clients to the Google link (review gating), or rewards Google reviews. Google's Maps user-contributed content policy prohibits selective solicitation (gating) and incentivised reviews, and violations lead to review removal or profile suspension. Also: Google reviews can't be imported into your own site's structured data (policy on third-party reviews markup), and the unique link should not be shown only to "good" scores.
**Prevention:** Send the same Google review link to all clients in the "direct channel" regardless of rating, via the standard `g.page/r/.../review` link. Keep the internal verified review and the Google link as two independent options shown together, not conditional on a score. No discounts or gifts. Do not use a "rate 1-5, then redirect" interstitial.
**Detection:** Any conditional on rating in the review-routing code. Review flow screens that differ by score.
**Phase:** Reviews phase. Add a vitest guard that the Google link is rendered for all ratings.

### 8. French invoice legal mentions and sequential numbering errors (and the e-invoicing reform)
**What goes wrong:** PDFs generated "as invoices" miss mandatory mentions or break numbering.
- Mandatory (CGI art. 242 nonies A, Code de commerce L441-9): date of issue, unique sequential number without gaps, seller and buyer identity (name, address, SIREN/SIRET, RCS city, legal form and capital, TVA number), buyer's SIREN for B2B (becoming mandatory with the reform), delivery address if different, description of service, date of the service or delivery, unit price HT, quantity, rate and amount of TVA (or the exemption mention, e.g. "TVA non applicable, art. 293 B du CGI" for micro-entrepreneur franchise), total HT/TTC, payment due date, late-payment penalty rate, fixed 40 EUR recovery indemnity for B2B, discount conditions. Also the new mention "catégorie d'opération" (service / goods / mixed) and the option for TVA on debits; the buyer's delivery address for goods.
- Sequential numbering with gaps or a number generated in application code (race condition): use a DB sequence or a locked counter table, one per series and year if the series is reset, and never delete or edit an issued invoice; correct with an `avoir` (credit note).
- Stripe's `invoice` object and your own PDF invoice both exist, with two numbering series.
- Draft or "acompte" invoices: a deposit payment requires an acompte invoice, then a final invoice that deducts it. Quote (devis) numbering is separate from invoices.
- e-invoicing reform (facture électronique + e-reporting): after a postponement, the schedule as of my knowledge is: from 1 Sept 2026 all companies must be able to RECEIVE e-invoices and large/intermediate-size companies must ISSUE; from 1 Sept 2027 SMEs and micro-enterprises must issue. Issuance must go via a certified "plateforme agréée" (PA, formerly PDP) in Factur-X / UBL / CII format, not by plain PDF emails. [VERIFY dates and current status; today is 2026-10-01 so the reception obligation is already in force]
  - Consequence for you: a plain PDF invoice generated by Vercel may not be legally an e-invoice from Sept 2027 (or earlier if you cross a size threshold). Also, B2B clients who are large companies may already require reception through their PA.
  - Plan: model invoices as structured data (lines, TVA, SIREN) so Factur-X (PDF/A-3 with embedded XML) can be added, and plan to connect a PA (or use Stripe Invoicing / an accounting tool with PA status) rather than building a PA. Do not build the PA integration in v2.0, but do not make it impossible.
- No price on public pages remains true. Quotes and invoices live only behind authentication. Add the guard that pricing code is not reachable from public routes or the sitemap, and the existing "no price keys" tests must exclude the portal routes explicitly (allowlist with a reason), or they will fail or, worse, be loosened globally.
- Retention: invoices 10 years (Code de commerce L123-22); the RGPD erasure right does not override legal retention. Document this in the privacy policy and have the purge job skip accounting records.
**Prevention:** Use a template-level mention checklist as a test (render the invoice PDF, extract text, assert mentions). DB-level `UNIQUE (series, number)` + immutable once `issued` (trigger). Credit-note flow. Decide early whether Stripe Invoicing or a custom PDF is the legal invoice, and keep only one.
**Detection:** A gap in the number series. An issued invoice row that changed after `issued_at`.
**Phase:** Documents phase (data model), Stripe phase (acompte invoicing). Needs an accountant review.

### 9. Vercel serverless PDF generation limits
**What goes wrong:** Puppeteer / headless Chromium PDF generation in a serverless function hits the bundle size limit (250 MB unzipped), cold starts, memory, and the function timeout (Hobby 10-60 s depending on config, Pro up to 300 s, higher with Fluid compute; limits change, [VERIFY current numbers]). Missing fonts (Space Grotesk, Manrope) produce a fallback font, French accents break, PDFs differ between local and production, and image or font fetches fail. Request body limit is 4.5 MB, so uploads of client files through a Route Handler fail for large files.
**Prevention:**
- Prefer a pure-JS PDF library over a headless browser: `@react-pdf/renderer` (React components as templates, versioned in code, works in Node runtime) or `pdf-lib` / `pdfmake`. Embed fonts from local files (`public/` or `fs`) and register them explicitly. This also suits Factur-X later (PDF/A-3 needs care with react-pdf, so check; pdf-lib is more flexible for attachments). [VERIFY]
- Set `export const runtime = 'nodejs'` and `maxDuration` explicitly. Generate asynchronously: create a job row, return fast, write the PDF to Supabase Storage, notify via the portal.
- Do not generate on the hot path of a Stripe webhook. Only enqueue.
- Direct-to-storage uploads (Supabase signed upload URLs) for client files, not through the route.
- Snapshot test of PDF text (extract and assert key fields), and a CI render of every template version.
**Detection:** 504 or `FUNCTION_INVOCATION_TIMEOUT` in logs, "bundle size exceeds" at build, differing glyphs in production PDFs.
**Phase:** Documents phase. Spike early (first plan of that phase) with the fonts and a 3-page contract.

### 10. Email deliverability and CNIL rules on marketing emails
**What goes wrong:**
- Sending from `sevalys.com` via Resend without SPF, DKIM, DMARC aligned. Gmail and Yahoo bulk-sender rules (2024) require authentication, a one-click unsubscribe header for marketing, and spam rate under 0.3%. New domains hitting spam is common.
- Transactional and marketing mixed on the same stream or subdomain. A marketing complaint spike damages OTP and invoice emails (an e-signature OTP landing in spam breaks the signing flow).
- "Mailing automatique déclenché par statut" treated as transactional when it is promotional. In B2B, CNIL rules (art. L34-5 CPCE) allow prospecting by email without prior consent to professional addresses if the message relates to the recipient's professional activity, the person was informed at collection and can object easily. For sole traders (EI, micro-entrepreneurs), the CNIL treats them like consumers in some cases (opt-in needed for personal-type addresses). [VERIFY] Cold emailing the prospect list from the simulator needs the consent captured there to cover it; check the existing consent wording.
- No unsubscribe link or `List-Unsubscribe` + `List-Unsubscribe-Post` headers. Unsubscribe ignored by the automation (no suppression list), so retries or status changes re-send.
- Automation loops: a status change fires an email, which fires another trigger. No dedupe key, so a status flapping sends multiple emails. Webhook or cron retries duplicate sends.
- Review requests and "demande d'accord pour présenter le projet" are service communications; marketing offers in the same mail make them promotional.
**Prevention:**
- Dedicated sending subdomains: `mail.sevalys.com` (transactional) and `news.sevalys.com` (marketing), with SPF, DKIM (Resend gives the records), DMARC starting at `p=none` with `rua` reports, then `quarantine`. Check with mail-tester and Google Postmaster Tools.
- An `email_outbox` table with a unique `(template, entity_id, trigger_status)` key for idempotency, a suppression list checked before every marketing send, Resend webhooks for bounce and complaint to update it. Separate `category` (transactional vs marketing) per template; marketing requires a lawful basis flag on the contact.
- Keep marketing sequences short and few at the start. Always include the sender identity (RCS, address), unsubscribe link, and honor within days.
- Do not send OTP codes through the marketing stream; test OTP delivery time.
**Detection:** DMARC reports with failing alignment; spam folder placement; bounce rate above 2%; duplicate emails per entity in `email_outbox`.
**Phase:** Mailing phase, but DNS (SPF/DKIM/DMARC) must be set up in the foundation phase because the OTP and portal magic links depend on it.

---

## Moderate Pitfalls

### Magic-link (passwordless) auth traps
**What goes wrong:** Email link scanners (Outlook Safe Links, corporate security gateways) consume the one-time link before the user clicks, giving "link expired". Open redirect through the `next` or `redirectTo` parameter. Link reused or valid too long. Account enumeration. Supabase `signInWithOtp` with `shouldCreateUser: true` lets anyone self-register as a "client".
**Prevention:** `shouldCreateUser: false`; create client users only from admin or a post-sale flow. Prefer an OTP code (typed) for corporate mailboxes, or an interstitial confirm page (button click) before token consumption. Allowlist redirect URLs in Supabase auth settings. Rate limit; short TTL; generic response messages. SSR session via `@supabase/ssr` and a middleware refresh; do not trust `getSession()` on the server, use `getUser()`.
**Phase:** Foundation / auth phase.

### Stripe checkout details
**What goes wrong:** Amounts computed on the client; floating-point amounts (use integer cents); TVA/tax not set (Stripe Tax or manual HT/TTC consistency with your invoice); currency mismatch; deposits per step not linked to the contract; test and live keys or webhook secrets mixed across Vercel environments (Preview deployments hitting live); refunds not reflected in your own state; SCA/3DS and SEPA async states not shown to the client; PCI scope broken by handling card data yourself (always Checkout or Elements).
**Prevention:** Server computes amount from the signed quote; the payment is only creatable for a step whose contract is signed. Separate env vars per environment, with a startup assertion that the key mode matches `VERCEL_ENV`. Show "paiement en cours" for async methods. Statement descriptor set.
**Phase:** Stripe phase.

### First-touch / last-touch attribution defects
**What goes wrong:** UTM captured on the first page but overwritten by internal navigation, or lost when the visitor goes landing, then `/simulateur` (client-side navigation drops the query string); first-touch stored in a cookie that is cleared; "source figée" overwritten by an upsert; dedupe by email alone merges two different people or fails on case or whitespace; the 9-month dedupe window logic uses created_at rather than last event; bot and preview traffic (Vercel previews, link unfurlers) pollutes `lead_events`; internal and admin traffic counted. Referrer-only sources (organic, direct, Google Business) not distinguished from "unknown". Inconsistent UTM naming (`Facebook` vs `facebook`, `fb`) destroys funnel stats.
**Prevention:** Normalise UTM values (lowercase, trimmed, allowlist map) on write, with a convention document (a v2.0 deliverable). Capture on the first server-rendered request or in a tiny client script, store the first touch immutably (write-once column: `INSERT ... ON CONFLICT DO NOTHING`) and last touch separately. Normalise emails (lowercase, trim) and hash for dedupe. Add an `is_bot` filter and reuse the existing honeypot and spam guard. Pass attribution through the simulator hand-off explicitly (hidden fields). Test with a scripted journey.
**Phase:** UTM attribution phase.

### Ad conversion tracking quality (Meta / Google)
**What goes wrong:** Browser pixel and CAPI both fire with different or missing `event_id`, so conversions are double counted; no `gclid` / `fbclid` stored, so offline conversion upload is impossible; conversions defined on "form view" rather than on a qualified lead; sending hashed PII with wrong normalisation (low match quality); campaigns launched before the conversion events are verified.
**Prevention:** Shared `event_id` for deduplication across browser and server; store `gclid`, `fbclid`, `_fbp/_fbc` with the lead (consent-gated); define the conversion ladder (lead submitted, qualified, signed, paid) and send later stages as offline conversions. Verify in Meta Events Manager test events and Google Tag Assistant before spending.
**Phase:** Ad conversion phase (after consent banner and attribution).

### Admin forecast dashboard garbage-in
**What goes wrong:** The "prévisionnel" (CA, coûts, marge, trésorerie) mixes quoted, signed, invoiced and paid amounts under one "CA" label; HT versus TTC confusion; no cost model so margin is fiction; heavy aggregate queries in the browser over RLS-protected tables; Realtime subscriptions on large tables.
**Prevention:** Define status-based revenue buckets (pipeline, signed, invoiced, collected) and compute in SQL views or functions with `security_invoker`. Store amounts in integer cents with explicit HT/TTC. Keep the dashboard admin-only and read-only. Treat the forecast as a later phase, after the data exists.
**Phase:** Admin dashboard phase.

### Template versioning drift
**What goes wrong:** Templates in code are edited and old projects regenerate with new wording or clauses; the contract the client signed cannot be reproduced; i18n of legal documents (fr only is the legally safe base; en/th translations are not binding unless stated).
**Prevention:** Immutable `template_version` string tied to a git-tagged template; store the rendered output at generation; keep old template versions in the repo, only add new ones; legal documents in French as the authoritative version, with a stated clause.
**Phase:** Documents phase.

### Existing-codebase regressions
**What goes wrong:** New auth middleware catches `/demo`, `/services`, `/api/crm/*` and breaks public pages or the VAPI webhooks (CRM API must not change); the matcher forces sessions on the public site and kills static caching and Core Web Vitals; Supabase auth cookies on every request; i18n LanguageContext not covering the portal (hardcoded French leaks, as already happened in Phase 8); vitest "no price" guards fail or get weakened; Next 16 caching of authenticated pages (cache a client's page for another); Vercel Preview deployments share production Supabase.
**Prevention:** Scope middleware matcher to `/espace-client/*` and `/admin/*` only; mark authenticated routes `dynamic = 'force-dynamic'` and `Cache-Control: private, no-store`; do not touch `/api/crm/*` or `/demo/feuillette`; add i18n keys for the portal or explicitly decide the portal is French-only; separate Supabase project or branch for preview and test; extend the policy guards instead of loosening them. Keep GSAP and cursor components out of the portal.
**Phase:** Foundation phase; re-checked per phase.

### Role split and client data (processor roles)
**What goes wrong:** Agency stores clients' own customer data (e.g. restaurant reservations from projects you build) in the same system, or uses client-provided files and personal data without a DPA. Admin staff access to all client data without logging.
**Prevention:** Contract includes the RGPD art. 28 clauses when you act as processor; keep project deliverable data out of the portal DB where possible; admin actions on client data logged.
**Phase:** Documents phase (contract template) and foundation.

---

## Minor Pitfalls

### Timezone and locale in documents
**What goes wrong:** Dates rendered in UTC in French contracts; `Intl` differences server vs local; amounts formatted `1,000.00` instead of `1 000,00 €`.
**Prevention:** Fix `Europe/Paris` and `fr-FR` in PDF templates; test with snapshots.

### OTP SMS or email cost and abuse
**What goes wrong:** OTP endpoint used to spam third parties via Resend; costs and domain reputation harm.
**Prevention:** Rate limit per email and per IP (existing honeypot is not enough), only send to the email tied to the document, CAPTCHA only if abused.

### Review link leakage
**What goes wrong:** Review token in a URL logged by analytics or shared; token never expires.
**Prevention:** Token hashed in DB, single use, expiry (e.g. 60 days), `Referrer-Policy: no-referrer` on the page, `noindex`.

### Stale copy and promises
**What goes wrong:** The hero pill "Disponible en mai 2026" and the contact "juin 2026" are already stale (carried over). Adding legal pages (CGV, politique avis, cookies) without linking in the footer and sitemap policy.
**Prevention:** Fix copy in the first phase; add legal pages to the footer; mark portal routes `noindex` and out of the sitemap, with a guard.

### Mentions légales and CGV not updated
**What goes wrong:** New processors (Stripe, Meta, Google, Resend), cookies, signature convention de preuve, médiateur de la consommation (mandatory for B2C only; clarify B2B only offering) not reflected.
**Prevention:** One checklist task in the foundation phase and one before launch.

---

## Phase-Specific Warnings

| Phase topic | Likely pitfall | Mitigation |
|-------------|---------------|------------|
| Foundation: auth, roles, RLS | Cross-client leak, admin by user_metadata, middleware over-matching, magic-link scanners (#2, auth) | RLS-in-same-migration rule, two-client isolation tests, matcher scoped to portal, `shouldCreateUser:false`, SPF/DKIM/DMARC set up now |
| Consent and tracking (before ads) | Tags before consent, asymmetric refuse button, no consent log (#5) | Ship consent banner first; gate scripts and CAPI on stored consent; privacy policy and registre update |
| UTM attribution and leads | Overwritten first-touch, dedupe errors, erasure vs immutable log, normalisation (#5, attribution) | Write-once first-touch, normalised UTM allowlist, tombstoning design, retention job |
| Portal files | Public buckets, long signed URLs, upload size limits (#3, #9) | Private buckets plus storage RLS, short TTL on demand, direct upload |
| PDF documents | Chromium on Vercel, fonts, template drift, missing legal mentions, numbering gaps (#8, #9) | Pure-JS PDF lib, early spike, versioned immutable templates, mention-checklist test, DB sequence |
| E-signature | Regenerated PDF breaks hash, weak OTP, mutable audit log, no convention de preuve (#4) | Freeze bytes, hashed single-use OTP, append-only log with triggers, TSA option, contract clause, legal review |
| Stripe payments | Non-idempotent webhook, redirect trusted, env mixing (#1) | `stripe_events` PK, raw-body signature, monotonic state, per-env keys, replay test |
| Invoicing | Two number series, edit after issue, e-invoicing 2027 readiness (#8) | Structured invoice data, immutability trigger, credit notes, plan PA / Factur-X, accountant review |
| Mailing automation | Loops, duplicates, marketing on transactional stream, no suppression (#10) | Outbox with idempotency key, separate subdomains, suppression list, `List-Unsubscribe` |
| Verified reviews | Gating, selective moderation, missing disclosure, self-serving schema (#6, #7) | Invite all, legality-only moderation with log, policy page, Google link unconditional, schema guard |
| Admin dashboard | Mixed revenue definitions, HT/TTC confusion | SQL views with explicit buckets, integer cents, build after data exists |
| Ad conversions | Double counting, no gclid/fbclid, consent bypass (#5, ads) | Shared `event_id`, store click ids with consent, verify before spend |

## Research Flags for Roadmap

- E-signature phase: needs deeper research and a legal review (convention de preuve, TSA, retention). HIGH priority.
- Invoicing and e-invoicing: needs verification of the current reform calendar and PA options before the documents phase. HIGH priority.
- Consent/tracking: verify current CNIL cookie guidance and Meta/Google consent mode requirements. MEDIUM priority.
- Reviews: verify current Code de la consommation text on online reviews and B2B applicability. MEDIUM priority.
- Vercel PDF: spike, then confirm current function limits. LOW priority (standard patterns once the library is chosen).
- Stripe webhooks, RLS isolation tests, magic-link auth: standard patterns, unlikely to need dedicated research.

## Sources

Not fetched live in this session (no web tools used). Basis, confidence MEDIUM unless noted:
- Regulation (EU) 910/2014 eIDAS, art. 25 (HIGH on the principle, MEDIUM on practice)
- CNIL: guidelines on cookies and trackers (Sept 2020, refined 2022-2023), retention 13/25 months, recommendation on commercial prospecting (MEDIUM)
- Directive (EU) 2019/2161 Omnibus; Code de la consommation L111-7-2, L121-1 and following; DGCCRF guidance on online reviews (MEDIUM)
- Google Maps user-contributed content policy (gating, incentives); Google structured data policy on self-serving reviews (MEDIUM)
- CGI art. 242 nonies A, Code de commerce L441-9 and L123-22; the e-invoicing reform calendar (dates MEDIUM-LOW, VERIFY)
- Stripe docs: webhooks, idempotent requests, signature verification (HIGH)
- Supabase docs: RLS, security_invoker views, storage access control, auth `signInWithOtp` (HIGH)
- Vercel docs: function limits, bundle size and body size limits (MEDIUM, limits change)
- Gmail and Yahoo bulk sender requirements 2024, Resend domain authentication (MEDIUM)
