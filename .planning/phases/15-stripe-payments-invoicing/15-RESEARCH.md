# Phase 15: Stripe payments & invoicing - Research

**Researched:** 2026-10-04
**Domain:** Stripe Checkout (card + EU bank transfer) webhooks, gapless legal invoice numbering in Postgres, credit notes, Factur-X-ready structured invoice data (Next.js 16 + Supabase + Resend + Vercel)
**Confidence:** MEDIUM-HIGH (Stripe API/SDK/pricing verified against official docs on 2026-10-04; French legal points depend on secondary sources and need the accountant review already listed as a STATE.md blocker)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Stripe : mode et moyens de paiement (PAY-01, PAY-02)**
- **D-01:** **Mode test partout sauf production réelle.** Previews, tests et client de test permanent « Test E2E Sèvalys » utilisent les clés de test ; les clés live ne servent qu'en production pour de vrais clients. Garde-fou d'assertion du mode de clé au démarrage (patron de l'assertion Supabase de la phase 10). Aucun paiement live sur le client de test.
- **D-02:** **Moyens de paiement : carte + virement Stripe** (IBAN virtuel par client, rapprochement automatique, frais indicatifs ~0,8 % plafonnés à 5 €, 1 à 3 jours). Pas de prélèvement SEPA (contestable 8 semaines). Les tarifs sont à reconfirmer sur la page de prix Stripe pendant la recherche.
- **D-03:** **Pas de virement hors Stripe.** Tout paiement passe par Checkout ; l'IBAN de la constante vendeur n'apparaît que sur la facture. PAY-02 est strict : « payé » ne vient que du webhook vérifié (corps brut, signature) et idempotent (table d'événements Stripe, clé d'unicité sur l'identifiant d'événement).
- **D-04:** **Paiement en attente (virement) = statut « paiement en cours ».** Rien ne se débloque tant que Stripe n'a pas confirmé par webhook final ; le client et l'admin voient l'attente. Les écarts de montant du virement (trop ou trop peu) sont à traiter par l'admin : le planificateur prévoit une vue admin minimale pour les cas non rapprochés.
- **D-05:** **Montants calculés côté serveur uniquement**, en centimes entiers, à partir du devis émis (pourcentage d'acompte) et des factures émises ; le client ne transmet jamais de montant.

**Échéancier : acompte, factures de période, solde (PAY-01, PAY-03)**
- **D-06:** **Acompte + factures de période en TJM + facture finale.** Le propriétaire chiffre en TJM : après l'acompte, facturation mensuelle ou par sprint de deux semaines selon le projet. Pas de calendrier d'échéances prédéfini au devis.
- **D-07:** **Acompte :** le bouton « Payer l'acompte » apparaît dès le contrat signé (fait `contract_signed` posé par la phase 14). La demande d'acompte (facture d'acompte numérotée + e-mail via le moteur de mails) part automatiquement à ce fait. Le montant est le pourcentage d'acompte du devis émis appliqué au total.
- **D-08:** **Factures de période émises par l'admin, à la demande :** lignes libres (jours × TJM, période couverte), totaux calculés côté serveur, aperçu puis « Émettre » comme en phase 13 ; le client la paie via Checkout. Marche pour un rythme mensuel ou par sprint. Elles ne posent aucun fait d'étape (seuls l'acompte et le solde final font avancer la frise).
- **D-09:** **Facture finale automatique après le PV de recette signé** (`acceptance_signed`) : solde du reliquat en **déduisant l'acompte**, avec une ligne de déduction explicite ; bouton « Payer le solde ». Le paiement pose `balance_received`.
- **D-10:** **Déblocage :** le paiement confirmé de l'acompte pose `deposit_received` (auteur = webhook, motif = référence de la facture), ce qui fait passer à l'étape 4 (Production). Le solde pose `balance_received`. Les gestes admin manuels existants restent possibles en correction journalisée (phase 12 D-09), l'UI signale qu'un paiement Stripe existe.

**Facture légale (PAY-04, PAY-05)**
- **D-11:** **Numérotation `FA-AAAA-0001`**, séquence unique remise à zéro chaque année, sans trou. **Avoirs en séquence propre `AV-AAAA-0001`.** Attribution atomique en base (fonction SQL avec verrou), jamais côté application seule ; test de non-trou et de concurrence.
- **D-12:** **Facture d'acompte émise à la demande d'acompte, avant paiement.** Le numéro est attribué à l'émission ; le statut « payé » vient du webhook. Une facture jamais payée se corrige par avoir, pas par suppression.
- **D-13:** **Immuabilité :** une facture émise ne se modifie ni ne se supprime (triggers refusant UPDATE/DELETE y compris pour `service_role`, patron des phases 11-14) ; octets PDF en écriture unique avec SHA-256, comme les documents de la phase 13. Réutiliser le modèle PDF de facture et le test des mentions (DOC-04), qui passent de l'aperçu à l'émission réelle.
- **D-14:** **Correction par avoir** admin (total ou partiel, motif obligatoire), émis comme document numéroté lié à la facture d'origine. Une case optionnelle déclenche aussi le remboursement Stripe, confirmé par webhook ; sans la case, l'app n'appelle pas l'API de remboursement.
- **D-15:** **Données de facture structurées** (PAY-05) : tables d'en-tête et de lignes en centimes (vendeur, acheteur, régime de TVA, mentions, références de commande/devis, période, déduction d'acompte) suffisantes pour produire plus tard un Factur-X ; aucun Factur-X émis en phase 15 (PAY-07). Le régime reste la franchise en base art. 293 B (phase 13 D-11), HT = TTC, avec champ de régime conservé pour une évolution.

**Reçu, relances, déblocage (PAY-03)**
- **D-16:** **Reçu = e-mail Sèvalys + facture acquittée dans le portail** via le moteur de mails existant (règle en code, clé d'unicité par facture et événement). La facture passe « payée » par déduction du fait/paiement, sans nouveau PDF ni reçu Stripe natif en double.
- **D-17:** **Relances d'acompte impayé : J+3 puis J+7, alerte admin à J+14**, via `send_after` et le cron quotidien existant (aucune fréquence plus fine que quotidienne tant que le plan Vercel n'est pas confirmé). La phase 16 (MAIL-03) reprend et généralise l'automatisation ; ne pas dupliquer son périmètre.

**Hérité des phases précédentes (rappel)**
- **D-18:** Portail et admin en français uniquement, `noindex`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée (client A vs B, anonyme, utilisateur Gecko), rôles en tables. Prix autorisés dans portail, admin et modèles, jamais sur le public (gardes `priceScope`). Statuts de document déduits des faits (phase 13 D-14). Client de test permanent « Test E2E Sèvalys » réutilisé, sans le supprimer. Fuseau `Europe/Paris`, formats `fr-FR`. Un document signé est gelé ; ne jamais régénérer un PDF émis.

### Claude's Discretion
- Structure exacte des tables (factures, lignes, paiements, événements Stripe, séquences), noms des types et des événements de mail, découpage des plans.
- Détail du Checkout (session par facture, expiration, URL de retour, métadonnées pour le rapprochement), gestion des événements Stripe utiles (session complétée, paiement asynchrone réussi/échoué, remboursement).
- Atomicité entre émission, PDF stocké, session Checkout et fait posé ; reprise après échec partiel.
- Libellés français du portail (onglet Paiements activé), de l'admin, des e-mails.
- Vue admin minimale pour paiements en attente ou non rapprochés.
- Bibliothèque Stripe et version d'API, mise en place du webhook et du secret.

### Deferred Ideas (OUT OF SCOPE)
- Facturation récurrente automatique (maintenance, périodes TJM générées seules) — PAY-06
- Connexion à une plateforme agréée et émission Factur-X — PAY-07
- Prélèvement SEPA — écarté (contestable 8 semaines)
- Calendrier d'échéances prédéfini au devis — écarté (mal adapté au TJM)
- Virement hors Stripe avec fait admin — écarté (PAY-02 strict)
- Relances généralisées, rebonds, désinscription — phase 16
- Dashboard CA facturé/encaissé — phase 17
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAY-01 | Client pays deposit/balance per step via Stripe Checkout, server-computed amounts | Checkout Session config (hosted_page, `allowed_payment_method_types`, `price_data` from DB `net_to_pay_cents`), Customer per client, one open session per invoice, expiry, return URL that never marks paid |
| PAY-02 | "Paid" only from verified (raw body) idempotent webhook | `request.text()` + `stripe.webhooks.constructEvent`, `sv_stripe_events` PK on event id, single-transaction apply RPC, processed_at semantics, replay via `stripe events resend`, async bank-transfer events |
| PAY-03 | Receipt, unpaid-deposit reminders, payment unblocks next step | `sv_post_project_fact('deposit_received')` inside the apply RPC, outbox rows with `send_after` (J+3/J+7/J+14), reminder cancellation on payment, mail closed-list extension |
| PAY-04 | Gapless numbering, immutable once issued, corrected by credit note | Counter-table upsert lock function (per series/year, Paris time), deny_mutation triggers, credit-note model (positive amounts, type 381, own `AV` series, cumulative cap), PDF write-once table |
| PAY-05 | Structured invoice data ready for Factur-X / approved platform | Header/lines/deductions/references schema mapped to EN 16931 business terms (BT/BG), VATEX-FR-FRANCHISE, type codes 380/386/381, integer-milli quantities |
</phase_requirements>

## Summary

The phase is three problems stacked on the existing platform. (1) A Stripe integration whose only source of truth is a verified webhook: Checkout hosted page, Customer per client (mandatory for bank transfer), `card` + `customer_balance` (EU bank transfer, France IBAN), asynchronous settlement for transfers. (2) A legal invoice ledger: gapless `FA-YYYY-NNNN` / `AV-YYYY-NNNN` numbers from a counter table updated inside the same transaction as the invoice insert, append-only tables, write-once PDF. (3) The glue: posting `deposit_received` / `balance_received` facts from the webhook transaction, extending the closed mail lists, scheduling reminders, and giving admin a minimal view of anomalies.

The existing code carries over well: `sv_post_project_fact` is already idempotent and callable from SQL (as `sv_seal_document` does), the outbox already has `dedupe_key` + `send_after` + a `skipped` status, `deny_mutation` triggers, the invoice PDF template and mention checklist exist as preview-only, and `/api/*` is already excluded from the proxy matcher (the webhook needs no proxy change). Three structural facts the planner must respect: the invoice cannot live in `sv_project_documents` (its one-root-per-(project, doc_type) unique index forbids several invoices per project), a Postgres `SEQUENCE` cannot give gapless numbers, and the PDF needs the number so issue must be two-phase (number + structured rows in one transaction, PDF rendered and attached afterwards, write-once).

Key corrections to CONTEXT.md found during research: Stripe bank-transfer fee is currently **0.5 % capped at 5 € per successful charge** (not ~0.8 %), plus 0.50 € per refund, with 1000 free virtual accounts; the Stripe Node SDK is **`stripe@23.0.0`** with pinned API version **`2026-09-30.endive`**; the French franchise mention is changing (see Pitfall 11); and D-01 as worded ("production uses live keys, test client uses test keys") needs a per-client mode decision (Open Question 1) because the permanent test client lives in the production database.

**Primary recommendation:** Add `stripe@23.0.0` pinned to API `2026-09-30.endive`; one new migration `20261007000000_sv_payments_invoicing.sql` (counters, invoices/lines/deductions/references/pdfs, payment-event ledger, stripe events, stripe customers, mail list extension, three RPCs: `sv_issue_invoice`, `sv_issue_credit_note`, `sv_apply_stripe_event`); a Node-runtime `POST /api/stripe/webhook` that verifies then delegates everything to one atomic RPC; never trust the success redirect.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Amount computation (deposit %, period totals, final reliquat, deductions) | API / Backend (server-only TS, pure module in `src/lib/documents`) | Database (CHECK constraints re-verify sums) | D-05: client never sends amounts; DB re-checks arithmetic |
| Invoice number allocation | Database (SQL function + counter row lock) | — | D-11: must be atomic with the insert; app-side counters race |
| Invoice immutability | Database (deny_mutation triggers, no UPDATE grant) | — | Must hold even for service_role |
| PDF render + SHA-256 + storage | API / Backend (React-PDF, existing `renderDocument`) | Storage (private `sv-documents` bucket) | Existing phase-13 chain; write-once row in DB |
| Checkout Session creation | API / Backend (server action) | Stripe | Amount read from DB invoice; idempotency key per invoice |
| Webhook verification | API / Backend (Node route handler, raw body) | — | Signature needs the exact bytes |
| "Paid" state transition + fact + receipt + reminder cancel | Database (one SECURITY DEFINER RPC) | API (calls RPC, then `afterFactPosted`) | One transaction = idempotent and crash-safe |
| Payment status display | Frontend Server (portal/admin server components) | Database (derived from ledger) | Status is derived, never stored (phase 12/13 pattern) |
| Reminders (J+3/J+7/J+14) | Database (`send_after` outbox rows) | API (daily cron `processDueMail`) | D-17: existing daily cron |
| Missing-invoice/PDF sweep | API (daily cron) | Database | Self-healing for partial failures |
| Admin anomaly view | Frontend Server (admin) | Database (ledger kinds `anomaly`, `partially_funded`) | D-04 |
| Factur-X XML/PDF-A3 | — (deferred, PAY-07) | — | Only the data model is built now |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | 23.0.0 (published 2026-09-30/10-01; `engines.node >=20`) | Checkout Sessions, webhooks verification, refunds, customers | Official Stripe Node SDK [VERIFIED: npm registry, stripe/stripe-node repo; slopcheck OK]. Default pinned API version in the package is `2026-09-30.endive` [VERIFIED: node_modules/stripe/cjs/apiVersion.js after local install in scratchpad] |
| `@supabase/supabase-js` | ^2.117.2 (already installed) | RPC calls via `callRpc` | Existing pattern |
| `resend` | ^6.28.1 (already installed) | Mails via outbox | Existing pattern |
| `@react-pdf/renderer` | ^4.9.0 (already installed) | Invoice and credit-note PDF | Existing phase-13 chain |
| `zod` | ^4.6.5 (already installed) | Input schemas for period-invoice form | Existing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Stripe CLI | 1.43.6 (installed locally) | `stripe listen`, `stripe trigger`, `stripe events resend`, `stripe test_helpers customers fund_cash_balance` | Local dev, replay acceptance test, bank-transfer simulation [VERIFIED: `stripe --version`] |
| `unpdf` | ^1.8.1 (already dev dep) | Text extraction for mention test | Existing DOC-04 test, extend to numbered invoice and credit note |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Own invoice tables | Stripe Invoicing | Rejected by STACK.md/PITFALLS.md (two numbering series, legal invoice must be ours); locked by D-13/D-15 |
| `@stripe/stripe-js` / Elements | — | Not needed for hosted Checkout (redirect to `session.url`) |
| Postgres `SEQUENCE` | Counter table with upsert lock | Sequences are non-transactional and leave gaps on rollback; counter table is the only gapless approach |
| Stripe `automatic_payment_methods`/dashboard dynamic methods | `allowed_payment_method_types: ['card','customer_balance']` | The allowed-list is a documented filter on the dynamic set [CITED: docs.stripe.com/api/checkout/sessions/create], so only the two decided methods are offered |

**Installation:**
```bash
npm install stripe@23.0.0 --save-exact
```

**Version verification:** `npm view stripe version` returned `23.0.0` (modified 2026-10-01); dist-tags `latest: 23.0.0`; no `postinstall` script. Do not use `@stripe/stripe-js`. Local install in the scratchpad confirmed `ApiVersion = '2026-09-30.endive'`.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| stripe | npm | 10+ yrs (major 23 since 2026-09-30) | very high (official SDK) | github.com/stripe/stripe-node | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none (no `postinstall` script: `npm view stripe scripts.postinstall` empty)

## Architecture Patterns

### System Architecture Diagram

```
                      ┌──────────────── ISSUANCE (admin / system) ────────────────┐
 contract sealed ──┐  │                                                           │
 (finalizeSignature)├─►│ ensureDepositInvoice(project)   admin "Émettre" (period)  │
 PV sealed ────────┤  │ ensureFinalInvoice(project)     admin "Avoir"             │
 daily cron sweep ─┘  └───────────────┬───────────────────────────────────────────┘
                                      ▼
            TS: compute amounts (pure, cents) ─► RPC sv_issue_invoice / sv_issue_credit_note
                                      │   (ONE tx: project row lock, issue_key idempotency, counter upsert
                                      │    lock -> number, header+lines+deductions+references insert,
                                      │    outbox "payment_requested" + reminders J+3/J+7/J+14 send_after)
                                      ▼
            TS: render PDF from stored rows ─► storage upload (upsert:false) ─► RPC sv_attach_invoice_pdf
                                      │        (write-once row sv_invoice_pdfs; cron retries if missing)
                                      ▼
  Portal "Paiements" ── "Payer" ──► server action: read invoice net_to_pay from DB ─► Stripe Customer
        (RLS read)                    (get/create per client+mode) ─► checkout.sessions.create(
                                      idempotencyKey, metadata{invoice_id}, expires_at<=24h) ─► redirect to session.url
                                                              │
        success_url (portal page) ◄── customer returns ◄──────┘   NEVER sets "paid": shows "confirmation en cours"
                                                              
 Stripe ── POST /api/stripe/webhook (public, Node runtime, outside proxy matcher)
        raw body (await request.text()) ─► constructEvent(secret test|live) ─► 400 on failure
        ─► event.livemode must match verifying secret ─► RPC sv_apply_stripe_event(event fields)
              ONE tx: insert sv_stripe_events (PK event id; if already processed_at -> return stored result)
                      lock invoice row ─► validate amount/currency/livemode vs invoice
                      ─► append sv_invoice_payment_events (processing | paid | failed | expired | partially_funded | refunded | anomaly)
                      ─► if paid & kind deposit/final: sv_post_project_fact('deposit_received'|'balance_received', 'system', reason=invoice number)
                      ─► enqueue receipt mail (dedupe key per invoice) ─► mark pending reminders 'skipped' ─► processed_at
        ─► after RPC: afterFactPosted(project, factId) (step_changed mail, dedupe by factId) ─► 200
        any error ─► 500 (Stripe retries; event row not marked processed)
```

### Recommended Project Structure
```
src/lib/server/stripe/
  client.ts          # server-only: getStripe(mode), assertStripeKeyMode(), pinned apiVersion
  webhook.ts         # verifyStripeEvent(raw, sig) -> {event, mode}; event -> RPC args mapper (pure, testable)
  checkout.ts        # createCheckoutForInvoice(invoiceId) (reads amount from DB)
  refund.ts          # requestRefundForCreditNote(creditNoteId) (idempotencyKey)
  customers.ts       # getOrCreateStripeCustomer(clientId, mode)
src/lib/server/invoices/
  issue.ts           # issueInvoice(), issueCreditNote(), attachPdf(), sweepMissing()
  read.ts            # loadInvoices(rls, projectId), payment status derivation inputs
  amounts.ts?        # (pure part goes to src/lib/documents/invoiceMath.ts)
src/lib/documents/
  invoiceMath.ts     # pure: deposit/final/credit math, milli-quantity rounding, deduction handling
  invoiceStatus.ts   # pure: to_pay | processing | paid | overdue | credited | partially_credited | failed
  facturx.ts         # pure: invoice rows -> EN 16931 term map (documents the mapping; tested, NOT emitted)
  pdf/templates/invoice/v2/  credit-note/v1/   # numbered invoice, acquittée mention, avoir
src/app/api/stripe/webhook/route.ts
src/app/api/cron/mail/route.ts   # extend: after processDueMail, run invoice sweeps
supabase/migrations/20261007000000_sv_payments_invoicing.sql
tests/rls/invoices.rls.test.ts  payments.rls.test.ts
```

### Pattern 1: Gapless counter with row lock in the issuing transaction
**What:** One row per `(series, year)`; `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` takes the row lock until commit, so concurrent issuers serialize and a rollback also rolls the counter back (no gap).
**When to use:** `sv_issue_invoice` and `sv_issue_credit_note` only, in the same function body as the invoice INSERT.
```sql
-- Source: standard Postgres gapless-counter pattern (PostgreSQL docs on INSERT ON CONFLICT row locking) [ASSUMED pattern, semantics are core Postgres]
create table public.sv_invoice_counters (
  series text not null check (series in ('FA','AV','TFA','TAV')),
  year   integer not null check (year between 2026 and 2100),
  last_seq integer not null check (last_seq >= 0),
  primary key (series, year)
);
alter table public.sv_invoice_counters enable row level security;
revoke all on public.sv_invoice_counters from anon, authenticated, service_role;  -- only the definer function writes

create or replace function sv_private.next_invoice_seq(p_series text, p_year integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v integer;
begin
  insert into public.sv_invoice_counters (series, year, last_seq) values (p_series, p_year, 1)
  on conflict (series, year) do update set last_seq = public.sv_invoice_counters.last_seq + 1
  returning last_seq into v;
  return v;
end $$;
-- year MUST be derived inside SQL: extract(year from (now() at time zone 'Europe/Paris'))::int
-- number text = series || '-' || year || '-' || lpad(seq::text, 4, '0'); unique(series, year, seq) on sv_invoices
```
Add a trigger on the counter table refusing DELETE/TRUNCATE and any UPDATE that is not `last_seq = old.last_seq + 1`.

### Pattern 2: Two-phase issue (number first, PDF second, both write-once)
**What:** `sv_issue_invoice` stores the numbered, immutable structured invoice (and outbox rows). TS then renders the PDF from the stored rows, uploads with `upsert:false`, and inserts a row in append-only `sv_invoice_pdfs(invoice_id pk, storage_path, sha256, size_bytes, template_version)`. If render or upload fails, the invoice (and its number) already exist, nothing is lost, and the daily sweep retries (render is deterministic from stored data; storage path is deterministic `{project}/invoices/{invoice_id}.pdf`).
**Why not render first:** the PDF must contain the number, which exists only after the lock; holding a DB transaction open across a React-PDF render is impossible through the supabase-js REST RPC.
**Rule to keep D-13 intact:** once a `sv_invoice_pdfs` row exists, never render again (verify SHA on download as `verifyDocumentHash` does today).

### Pattern 3: Webhook = verify, then one atomic RPC
```ts
// Source: Stripe webhooks docs + SDK 23.0.0 (constructEvent sync in Node; constructEventAsync is for edge/WebCrypto) [CITED: docs.stripe.com/webhooks; VERIFIED: node_modules/stripe/esm/Webhooks.js]
// src/app/api/stripe/webhook/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('missing signature', { status: 400 });
  const raw = await request.text();                    // exact bytes; never request.json()
  const verified = verifyStripeEvent(raw, signature);  // tries test secret and live secret; returns {event, mode} or null
  if (!verified) return new Response('invalid signature', { status: 400 });
  if (verified.event.livemode !== (verified.mode === 'live')) return new Response('mode mismatch', { status: 400 });

  const args = toApplyArgs(verified.event);            // pure mapper; returns null for ignored types
  if (!args) return new Response('ignored', { status: 200 });
  const res = await callRpc<ApplyResult>('stripe/webhook', 'sv_apply_stripe_event', args);
  if (!res.ok) return new Response('retry', { status: 500 });   // Stripe retries; event not marked processed
  if (res.data.fact_id) await afterFactPosted(res.data.project_id, Number(res.data.fact_id)); // dedupe by factId
  return new Response('ok', { status: 200 });
}
```
Respond fast: with a `success_url` and a `checkout.session.completed` endpoint, Checkout waits up to 10 s for the endpoint before redirecting [CITED: docs.stripe.com/checkout/fulfillment].

### Pattern 4: Idempotent event table with `processed_at`
Do NOT "insert event id, then process" in two steps (a crash between leaves an event that is recorded but unprocessed and every retry is skipped). Do it inside the RPC:
```sql
-- sv_stripe_events(event_id text primary key, type text, livemode bool, object_id text, invoice_id uuid null,
--                  received_at timestamptz default now(), processed_at timestamptz null, outcome text null)
-- inside sv_apply_stripe_event:
insert into public.sv_stripe_events (event_id, type, livemode, object_id) values (...)
on conflict (event_id) do nothing;
select processed_at, outcome into ... from public.sv_stripe_events where event_id = p_event_id for update;
if v_processed_at is not null then return <stored result: fact_id, project_id>; end if;   -- replay: no side effect
-- ... ledger insert, fact, mail, reminders ...
update public.sv_stripe_events set processed_at = now(), outcome = ... where event_id = p_event_id;
```
`sv_stripe_events` is the one allowed UPDATE (processed_at/outcome null → set once; a trigger enforces "only null→value"); everything else is append-only. Store only ids, type, amounts: no customer email or card data (RGPD minimisation).

### Pattern 5: Checkout Session per invoice (hosted page, card + EU bank transfer)
```ts
// Source: docs.stripe.com/payments/bank-transfers/accept-a-payment (UE tab) + api/checkout/sessions/create [CITED]
const session = await stripe.checkout.sessions.create(
  {
    mode: 'payment',
    customer: stripeCustomerId,                       // REQUIRED for bank transfer
    allowed_payment_method_types: ['card', 'customer_balance'],
    payment_method_options: {
      customer_balance: {
        funding_type: 'bank_transfer',
        bank_transfer: { type: 'eu_bank_transfer', eu_bank_transfer: { country: 'FR' } },
      },
    },
    line_items: [{
      quantity: 1,
      price_data: { currency: 'eur', unit_amount: invoice.netToPayCents, product_data: { name: `Facture ${invoice.number}` } },
    }],
    client_reference_id: invoice.id,
    metadata: { invoice_id: invoice.id, project_id: invoice.projectId, invoice_number: invoice.number },
    payment_intent_data: { metadata: { invoice_id: invoice.id, project_id: invoice.projectId }, description: `Facture ${invoice.number}` },
    locale: 'fr',
    expires_at: Math.floor(Date.now() / 1000) + 24 * 3600 - 60,   // allowed 30 min to 24 h
    success_url: `${siteUrl}/espace-client/paiements?facture=${invoice.id}&retour=succes`,
    cancel_url:  `${siteUrl}/espace-client/paiements?facture=${invoice.id}&retour=annule`,
  },
  { idempotencyKey: `checkout:${invoice.id}:${attemptBucket}` },
);
```
Notes: `ui_mode` defaults to `hosted_page` in the pinned API version; `payment_intent_data.metadata` is required so `charge.refunded` / `payment_intent.*` events can be mapped back to the invoice. `unit_amount` is read from the DB invoice row, never from the request.

### Pattern 6: Credit note model
- Row in `sv_invoices` with `kind='credit_note'`, `series='AV'`, `credits_invoice_id` NOT NULL, mandatory `reason` (10-500 chars), **positive** amounts and `en16931_type_code = 381` (EN 16931 credit notes carry positive amounts with type 381) [CITED: plateforme-agree.org / getfacturx.com via search; MEDIUM].
- Inside `sv_issue_credit_note`: lock origin invoice row `FOR UPDATE` (allowed: row locks do not fire UPDATE triggers) and the project row; refuse if `sum(existing credit notes) + new > origin.total_incl_tax_cents`; refuse crediting a credit note.
- If origin is unpaid: after the RPC, TS calls `stripe.checkout.sessions.expire(sessionId)` for open sessions and, for a `processing` bank transfer, `paymentIntents.cancel` (admin confirmation) so a late payment cannot land on a credited invoice. A payment arriving on a fully credited invoice becomes an `anomaly` ledger row (never an unlock).
- If origin is paid and the "rembourser via Stripe" box is checked: after the credit note exists, call `stripe.refunds.create({ payment_intent, amount }, { idempotencyKey: 'refund:' + creditNoteId })`; the ledger records `refund_requested`; `charge.refunded` records `refunded` (D-14). Bank-transfer refunds need the customer's bank details collected by Stripe by e-mail, state `requires_action` for up to 45 days, then `failed` (event `refund.failed`) [CITED: docs.stripe.com/payments/customer-balance/refunding]. Admin UI must show "remboursement en attente du client".
- A deposit fact already posted stays; the UI hint tells the admin to use the existing correction gesture (revoke) if the step must reopen. Do not auto-revoke facts.

### Pattern 7: Structured invoice schema (Factur-X ready, PAY-05)
Header `sv_invoices` (append-only; client-generated `id`, `issue_key` unique for idempotent issuing):
`project_id, client_id, kind ('deposit'|'period'|'final'|'credit_note'), series, year, seq, number (unique, generated format check), en16931_type_code (380 | 386 deposit | 381 credit note), issued_on (date, Paris, computed in SQL), due_date, currency 'EUR', service_period_start/end (BG-14), seller_* (legal name, SIREN/SIRET with scheme, address, country 'FR', iban, bic, email), buyer_* (name, SIREN, SIRET, address, country, vat number), vat_regime ('franchise'|'standard'), vat_category 'E', vat_exemption_code 'VATEX-FR-FRANCHISE', vat_exemption_text (the printed mention), payment_terms_text, late_penalty_text, recovery_indemnity_text, total_excl_tax_cents, vat_total_cents (0), total_incl_tax_cents, prepaid_cents, net_to_pay_cents, quote_document_id (FK), order_reference (BT-13 = quote reference), contract_reference, credits_invoice_id, reason, is_test, template_version, snapshot jsonb (frozen copy used for the PDF), created_by`.
Lines `sv_invoice_lines(invoice_id, position, designation, quantity_milli, unit_code, unit_price_cents, line_total_cents, vat_category 'E', vat_rate_bp 0)`; deductions `sv_invoice_deductions(invoice_id, ref_invoice_id, ref_number, ref_date, amount_cents)` (maps to BT-113 prepaid + BG-3 preceding invoice references); `sv_invoice_pdfs`.
CHECKs: `total_incl = total_excl + vat_total`, `net_to_pay = total_incl - prepaid`; the RPC additionally verifies `sum(lines) = total_excl` and `sum(deductions) = prepaid`.
EN 16931 mapping (documented in `facturx.ts`, unit-tested, not emitted): BT-1 number, BT-2 issue date, BT-3 type code, BT-5 EUR, BT-9 due date, BT-13 order ref, BG-3 preceding invoices, BG-4 seller / BG-7 buyer, BG-14 period, BG-16 payment means (30 or 58 + IBAN), BG-23 VAT breakdown category `E` with BT-121 `VATEX-FR-FRANCHISE` and BT-120 text, BT-113 prepaid amount, BT-115 amount due [CITED: facturevalide.fr / synapx.fr / getfacturx.com search results; MEDIUM, confirm against the Factur-X profile when PAY-07 starts].

### Anti-Patterns to Avoid
- **Marking paid on `success_url`**: forbidden by PAY-02; the return page only reads DB state and says "confirmation en cours".
- **`req.json()` in the webhook**: re-serialization breaks the signature.
- **Postgres `SEQUENCE` / `max(seq)+1` for numbers**: gaps on rollback / race.
- **Insert event then process in two statements**: lost events after a crash (Pattern 4).
- **A second Checkout Session for an invoice that has a bank transfer in progress**: creates a second PaymentIntent and double-payment risk. Refuse while the ledger shows `processing`.
- **Putting invoices into `sv_project_documents`**: the `(project_id, doc_type)` single-root index and replace-chain model contradict multiple invoices per project.
- **Test invoices in the legal series**: see Pitfall 8.
- **Floating-point amounts** and **`Intl` for money** (existing rule in `money.ts`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature check | HMAC/timestamp code | `stripe.webhooks.constructEvent` | Handles scheme `v1`, timestamp tolerance (default 300 s), multiple signatures; v23 changed `verifyHeader` defaults |
| Bank-transfer reconciliation | Matching incoming transfers to invoices | Stripe automatic reconciliation (reference code, exact amount) + `payment_intent.partially_funded` | Stripe matches by reference/amount; we only handle the exceptions |
| Virtual IBAN generation | Own IBAN handling | `customer_balance` + `eu_bank_transfer` (country FR) | Stripe generates the per-customer virtual account |
| Idempotent Stripe writes | Retry/dedupe logic | `idempotencyKey` request option on create calls | Native |
| Gapless numbering | Sequence/`max()+1`/app counter | Counter-row upsert in the issuing transaction (Pattern 1) | Only approach with rollback safety |
| PDF rendering/hash | New renderer | Existing `renderDocument`, `buildSealedPdf` patterns, SHA-256 verify | Phase-13 chain proven on Vercel Linux |
| E-mail dedupe/retry | New mail sender | Existing outbox (`dedupe_key`, `send_after`, `sv_claim_due_mail`) | Idempotent, retried by cron |
| Fact idempotency | Own "already deposited" check | `sv_post_project_fact` (returns `changed:false` when a non-revoked fact exists) | Already tested |
| Factur-X XML | Hand-built CII XML now | Out of scope (PAY-07); build only the data mapping | Deferred; a library/PA decision belongs to PAY-07 |

**Key insight:** every hard property here (gapless, exactly-once, immutable) is guaranteed by a database transaction, not by application code ordering. Push the invariants into RPCs and keep TypeScript as orchestration.

## Runtime State Inventory

Not a rename/refactor/migration phase. Omitted. (One adjacent point: the existing `InvoiceSnapshot`/`PROFORMA` preview contract is superseded; previews are not persisted, so no stored data migration.)

## Common Pitfalls

### Pitfall 1: Webhook secret vs mode confusion (test/live mixing)
**What goes wrong:** Preview deployment or the permanent test client hits live; or a live event verified with the test secret.
**Why:** Stripe test and live webhook endpoints have different signing secrets; Vercel env scopes get mixed.
**How to avoid:** `assertStripeKeyMode()` at first use: `sk_test_`/`rk_test_` allowed everywhere; `sk_live_`/`rk_live_` allowed only when `process.env.VERCEL_ENV === 'production'`; refuse any other prefix; refuse publishable keys. `verifyStripeEvent` tries each configured secret and checks `event.livemode` equals the secret's mode. The Stripe Customer row stores `livemode`; a Checkout for an invoice uses the mode of the client (Open Question 1).
**Warning signs:** `livemode:true` events in logs from non-production; 400s after key rotation.

### Pitfall 2: Treating `checkout.session.completed` as "paid"
**What goes wrong:** For bank transfer the session completes with `payment_status: 'unpaid'`; unlocking there violates PAY-02/D-04.
**How to avoid:** Map events: `checkout.session.completed` with `payment_status='paid'` (card) -> `paid`; with `unpaid` -> `processing` (bank transfer). `checkout.session.async_payment_succeeded` -> `paid`; `checkout.session.async_payment_failed` -> `failed`; `checkout.session.expired` -> `expired`; `payment_intent.partially_funded` -> `partially_funded` (admin alert, not paid); `charge.refunded` -> `refunded`; `refund.failed` -> alert; `customer_cash_balance_transaction.created` (type `funded`) -> `anomaly` candidate for unreconciled funds. Anything else: 200 and ignore (do not store) [CITED: docs.stripe.com/payments/bank-transfers/accept-a-payment, /checkout/fulfillment].

### Pitfall 3: Amount mismatch trusted
**What goes wrong:** Event amount differs from the invoice (manual dashboard payment, wrong currency, partial funding).
**How to avoid:** In the RPC compare `amount_total` / `amount_received` and `currency='eur'` to `invoice.net_to_pay_cents`, and `metadata.invoice_id` to an existing invoice. On mismatch append an `anomaly` ledger row and DO NOT post the fact or send the receipt.

### Pitfall 4: Over/under-paid transfers and reconciliation ambiguity
**What goes wrong:** Under-payment partially funds the PaymentIntent (invoices are not partially settled); over-payment leaves cash balance; with two open PaymentIntents for the same customer Stripe may apply funds to the wrong one (reference match first, then exact amount, then oldest first) [CITED: docs.stripe.com/payments/customer-balance/reconciliation].
**How to avoid:** One open payment per project at a time (refuse a new session while another invoice of the same client has `processing`); admin anomaly view lists `partially_funded` and unreconciled cash balances; unreconciled funds auto-return after 75 days (transferred to the Stripe balance after 90) so surface them early. Wrong beneficiary name can delay transfers: the Stripe account legal name must match what clients type [CITED: docs.stripe.com/payments/bank-transfers].

### Pitfall 5: Stripe-native receipts duplicating D-16
**What goes wrong:** Stripe e-mails its own receipt (live mode) next to ours.
**How to avoid:** Do not set `receipt_email`; keep Dashboard "send receipts for successful payments" disabled (manual setup step in the plan checklist). Bank-transfer instruction e-mails from Stripe are useful: leave enabled [CITED: docs.stripe.com bank transfer page, optional].

### Pitfall 6: Open Checkout Session after credit note or after payment
**How to avoid:** Credit note on unpaid invoice expires open sessions; webhook handler is the only place that changes state; cron sweep expires sessions older than 24 h (Stripe expires them itself; event `checkout.session.expired` just records).

### Pitfall 7: Partial failure between steps
**What goes wrong:** Invoice exists without PDF; PDF exists without email; fact posted without `step_changed` mail.
**How to avoid:** Each step is independently idempotent and has a sweep: (a) invoices without `sv_invoice_pdfs` row -> render+attach (daily cron + admin button); (b) contract sealed without deposit invoice -> `ensureDepositInvoice` (idempotent via `issue_key = 'deposit:' || project_id`); (c) acceptance sealed without final invoice -> same with `'final:' || project_id`; (d) webhook retry re-calls `afterFactPosted` with the stored `fact_id`; `dedupe_key = step_changed:{factId}:{email}` makes it exactly-once. Payment mails are enqueued inside the apply RPC, so they cannot be lost.

### Pitfall 8: Test client consuming the legal numbering series
**What goes wrong:** The permanent test client "Test E2E Sèvalys" lives in the production DB; its invoices would take real `FA-2026-000N` numbers, leaving fictitious invoices inside the legal sequence (and gaps if later removed, which immutability forbids).
**How to avoid:** Flag test clients (`sv_clients.is_test`, or a `sv_test_clients` table) and issue their invoices in a separate series `TFA` / `TAV` (`TFA-2026-0001`), with `is_test=true`, a visible "FACTURE DE TEST, sans valeur comptable" band in the PDF and the dashboard/export (phase 17) excluding them. The unique index and gapless test cover all four series. [ASSUMED design, needs owner/accountant confirmation, Open Question 1].

### Pitfall 9: Reminders sent after payment
**How to avoid:** The deposit-request RPC inserts three outbox rows (`send_after` now+3d, +7d client; +14d admin) with `dedupe_key payment_reminder:{invoice_id}:d3|d7` and `payment_reminder_admin:{invoice_id}:d14`. The apply RPC sets matching `pending` rows to `status='skipped'` when the invoice is paid or credited; additionally `buildMail`'s caller re-checks invoice state before sending (defensive). Also skip reminders while the ledger shows `processing` (client already transferred). Restrict to `kind='deposit'` (D-17); phase 16 generalizes.

### Pitfall 10: Closed-list drift in the mail outbox
**What goes wrong:** Adding a template in TS without SQL (CHECK) or vice versa; existing constraints are named `sv_mail_outbox_event_type_check` and `..._template_check` (set in the signature migration).
**How to avoid:** New migration `drop constraint if exists <both names>` then re-add with the full previous list + new values (`payment_requested`, `payment_received`, `payment_processing`, `payment_reminder`, `payment_reminder_admin`, `credit_note_issued`, `payment_anomaly_admin`). Update `MAIL_EVENTS`, `MailTemplate`, `MAIL_RULES`, `dedupeKey`, `buildMail` switch, add builder modules, extend `rules.test.ts`; follow the `*Migration.test.ts` parity tests (add `paymentsMigration.test.ts`). The older document-type test `docTypesSql.test.ts` reads the 13 migration file and must stay untouched.

### Pitfall 11: Legal wording moving under the franchise mention (flag for accountant)
**What goes wrong:** The printed mention `TVA non applicable, art. 293 B du CGI` (asserted by `VAT_FRANCHISE_MENTION` and the mention test) is being replaced by an article of the CIBS. Sources disagree on date and article number: one says Sept 2026 and `L. 223-3`, another says an ordinance of 2026-07-27 postponed the change to 2027-01-01 with `art. L. 233-3 du CIBS` and an admitted CGI reference until 2028-06-30. [CITED: lamicrobyflo.fr, conforme2026.fr, wize-expert.fr via search; LOW-MEDIUM, conflicting]
**How to avoid:** Store the exemption text on each invoice row (`vat_exemption_text`) and version it through the seller identity / template version so 2026 invoices keep 293 B and a later template version (v3) can switch without touching issued invoices. Do NOT hardcode a change now; list as accountant blocker (already in STATE.md).

### Pitfall 12: Quantities in days are fractional
TJM billing uses half days. Existing `QuoteLine.quantity` is a safe integer and `lineTotalCents` rejects non-integers. Use `quantity_milli` (thousandths, integer) on invoice lines with `line_total_cents = floor((quantity_milli * unit_price_cents + 500) / 1000)` (half-up, single rounding, in a pure tested function, mirrored by a CHECK/RPC verification). Deposit and final-invoice lines copying quote lines keep quantity*1000.

### Pitfall 13: Year boundary and time zone
Number year and `issued_on` must come from `now() at time zone 'Europe/Paris'` inside the RPC (not from the app, not UTC). An invoice issued at 00:30 Paris on 1 January belongs to the new year's series. Test it with a clock-injectable function parameter used only by tests (`p_now timestamptz default now()` on a `sv_private` inner function; public RPC passes `now()`).

### Pitfall 14: Retention vs erasure
French invoices must be kept 10 years; all invoice tables use `on delete restrict` FKs and no cascade. The phase-11 purge/erasure routines must be checked so they never target invoice or payment tables (planner: add a test that deleting a client with invoices fails with a restrict error).

### Pitfall 15: Vercel deployment protection blocks Stripe
A Preview with Vercel Authentication returns 401 to Stripe. Register the live/test production webhook endpoint on the production domain only; for previews use `stripe listen --forward-to` locally, or the Vercel protection-bypass query parameter if a Preview endpoint is ever needed [ASSUMED, verify in Vercel docs at implementation].

## Code Examples

### Pure deposit/final math (cents, integers)
```ts
// src/lib/documents/invoiceMath.ts (pure, no server-only)
export const mulMilli = (qtyMilli: number, unitCents: number): number => {
  const t = qtyMilli * unitCents;
  if (!Number.isSafeInteger(qtyMilli) || !Number.isSafeInteger(unitCents) || !Number.isSafeInteger(t)) throw new Error('invalid_amount');
  return Math.floor((t + 500) / 1000);       // half-up, one rounding
};
export function depositFromQuote(q: { totalCents: number; depositCents: number }) { return q.depositCents; } // reuse quoteTotals result frozen in the quote snapshot
export function finalInvoice(quoteTotalCents: number, prior: { cents: number }[]) {
  const prepaid = prior.reduce((s, p) => s + p.cents, 0);
  const net = quoteTotalCents - prepaid;
  if (net < 0) throw new Error('over_invoiced');
  return { totalCents: quoteTotalCents, prepaidCents: prepaid, netToPayCents: net };
}
```

### Stripe client with mode assertion (pattern of `assertSupabaseKeyMode`)
```ts
// src/lib/server/stripe/client.ts
import 'server-only';
import Stripe from 'stripe';
export const STRIPE_API_VERSION = '2026-09-30.endive' as const;
export type StripeMode = 'test' | 'live';
export function assertStripeKey(key: string | undefined, env = process.env): StripeMode {
  if (!key) throw new Error('[stripe/env] variable manquante : STRIPE_SECRET_KEY_*');
  if (/^(sk|rk)_test_/.test(key)) return 'test';
  if (/^(sk|rk)_live_/.test(key)) {
    if (env.VERCEL_ENV !== 'production') throw new Error('[stripe/env] clé live refusée hors production');
    return 'live';
  }
  throw new Error('[stripe/env] format de clé inconnu (clé publiable ou autre refusée)');
}
export function getStripe(mode: StripeMode): Stripe {
  const key = mode === 'live' ? process.env.STRIPE_SECRET_KEY_LIVE : process.env.STRIPE_SECRET_KEY_TEST;
  if (assertStripeKey(key) !== mode) throw new Error('[stripe/env] mode de clé incohérent');
  return new Stripe(key!, { apiVersion: STRIPE_API_VERSION, maxNetworkRetries: 2 });
}
```
(Env names are a recommendation; if the owner chooses the single-key model of Open Question 1 option A, collapse to `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.)

### Apply RPC outline (what the single transaction does)
```sql
create or replace function public.sv_apply_stripe_event(
  p_event_id text, p_type text, p_livemode boolean, p_object_id text,
  p_invoice_id uuid, p_payment_intent text, p_amount_cents integer, p_currency text,
  p_payment_status text, p_charge_refunded_cents integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
-- 1 insert event on conflict do nothing; select ... for update; if processed_at is not null -> return stored
-- 2 select invoice ... for update (unknown invoice -> record event, outcome 'unknown_invoice', processed)
-- 3 derive ledger kind from p_type + p_payment_status (Pitfall 2 mapping); amount/currency/livemode checks (Pitfall 3)
-- 4 insert sv_invoice_payment_events (stripe_event_id unique)
-- 5 if kind='paid' and not already paid and invoice.kind in ('deposit','final') and not credited:
--      v_fact := public.sv_post_project_fact(project, case kind when 'deposit' then 'deposit_received' else 'balance_received' end,
--                                            'system', null, null, 'Paiement Stripe ' || invoice.number)
--      enqueue payment_received per member email (dedupe 'payment_received:'||invoice_id||':'||email)
--      update sv_mail_outbox set status='skipped' where dedupe_key like 'payment_reminder%:'||invoice_id||'%' and status='pending'
-- 6 anomaly/partially_funded -> enqueue payment_anomaly_admin (dedupe by event id)
-- 7 mark processed; return jsonb(project_id, fact_id, changed)
$$;
```
`sv_post_project_fact` rejects reasons shorter than 10 chars only for revocations; a non-revocation reason is optional (<=500). The reason text is stored in admin-only `sv_project_fact_notes` (D-10 "motif = référence de la facture").

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stripe SDK ≤22, API ≤2026-08 | `stripe@23.0.0`, API `2026-09-30.endive`; Node 18 dropped; `verifyHeader` now defaults to tolerance; `constructEventWithoutVerification` top-level export removed | 2026-09-30 | Pin the version; use `stripe.webhooks.constructEvent` (instance) |
| Bank transfer fee 0.8 % (CONTEXT) | 0.5 % per successful charge, cap 5 €, +0.50 € per refund, 1000 free virtual accounts then 2 € each [CITED: stripe.com/en-fr/pricing/local-payment-methods] | current | Update owner expectations; cards 1.5 % + 0.25 € (standard EEA) |
| `payment_method_types` static list | `allowed_payment_method_types` filter over dynamic payment methods (Dashboard-enabled) | current API | Enable "Virements bancaires" in the Dashboard payment-method settings |
| Customers v1 only | Accounts v2 customer-configured accounts exist (preview for non-Connect) | 2026 | Use Customers v1 (`customer`); Accounts v2 not needed |
| E-invoicing | Reception obligation for all VAT-registered French businesses since 2026-09-01; issuance for SME/micro from 2027-09-01 [CITED: pennylane.com, cegid.com, kolecto.fr via search; MEDIUM] | 2026 | Data model now, Factur-X/PA in PAY-07 before 2027-09-01 |
| Franchise mention 293 B CGI | CIBS reference coming (2027-01-01 per ordinance cited by secondary sources) | 2027 | Template versioning (Pitfall 11) |

**Deprecated/outdated:** `@stripe/stripe-js` and Elements for this scope; Stripe Invoicing as legal invoice; SEPA Direct Debit (excluded by D-02).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Counter-row `INSERT ... ON CONFLICT DO UPDATE` holds the row lock until transaction end, giving gapless numbers under concurrency and rollback | Pattern 1 | Duplicate/gapped numbers; mitigated by the mandatory concurrency and rollback tests on the Supabase branch |
| A2 | Webhook endpoint payload version follows the API version selected when the endpoint is created, so it must be created with `2026-09-30.endive` | Pattern 3 | Handler sees a different payload shape; verify when registering the endpoint |
| A3 | A bank-transfer PaymentIntent left unfunded stays open until funded or canceled (no short auto-expiry) | Pitfall 4/6 | Stale "processing" invoices; verify in test mode and handle `async_payment_failed` |
| A4 | EN 16931 credit notes use positive amounts with type 381; prepayment invoice type 386; final invoice 380 with BT-113 and BG-3 | Pattern 6/7 | Re-mapping needed at PAY-07 (data stays valid) |
| A5 | Test-client invoices should use separate series `TFA`/`TAV` | Pitfall 8 | If owner wants test invoices in real series, numbering audit becomes meaningless |
| A6 | Vercel Preview protection blocks Stripe webhooks; bypass query parameter exists | Pitfall 15 | Preview webhooks fail; low impact (use CLI locally) |
| A7 | French franchise mention transition dates (2027-01-01, CGI admitted to 2028-06-30) | Pitfall 11 | Wrong printed mention after 2027; accountant must confirm |
| A8 | Stripe Dashboard receipt e-mails can be left disabled and do not apply to bank transfers by default | Pitfall 5 | Duplicate receipts to the client |
| A9 | Hobby daily cron is sufficient and acceptable (commercial-use right unresolved in STATE.md) | Summary/Env | Plan limitation could force Pro; reminders still daily |

## Open Questions

1. **Test vs live per client (D-01 literal reading).**
   - Known: production DB hosts the permanent test client; D-01 forbids live payment on it and wants test keys everywhere but real production customers.
   - Unclear: one `STRIPE_SECRET_KEY` per environment cannot serve both a real client and the test client in the production environment.
   - Recommendation: Option B: keep both key pairs in the production environment (`STRIPE_SECRET_KEY_TEST/LIVE`, `STRIPE_WEBHOOK_SECRET_TEST/LIVE`), choose the mode per client via a flag (`is_test` true => test keys and `TFA/TAV` series), live keys only when `VERCEL_ENV=production` and the client is not flagged. Option A (simpler): production runs test keys until first real customer, then flips; the E2E client then stops being payable. Needs owner pick; plan Option B unless told otherwise.
2. **Final invoice basis with TJM period invoices (D-06/D-08/D-09).**
   - Known: final = "solde du reliquat en déduisant l'acompte".
   - Unclear: are previously issued period invoices also deducted from the quote total? Without it the client is billed twice.
   - Recommendation: final invoice shows the quote lines (or "reliquat"), with deductions for the deposit invoice AND every non-credited period invoice (each a row in `sv_invoice_deductions` with number/date). Confirm with owner; the schema supports both.
3. **Stripe account readiness (France, EI "Anatholy Bricon").** Activated account, Dashboard "Virements bancaires" enabled, branding, legal name exactly as clients should type, receipts disabled, webhook endpoints (test + live) created with the pinned API version. Cannot verify from here; plan a checklist task and `checkpoint:human-action`.
4. **Accountant review** (STATE.md blocker): mention list, franchise wording, `PROFORMA` removal, deposit invoice wording ("facture d'acompte", type 386), credit-note mentions, whether test series is acceptable.
5. **Vercel plan** (Hobby vs Pro): daily cron is assumed; Hobby cron precision is hourly-window; commercial-use terms unresolved (STATE.md).
6. **Unlock for period invoices.** D-08 says period invoices post no fact; confirm they must never block the step engine (planner: no).
7. **Admin cancel of a pending bank transfer.** Recommend an admin action calling `paymentIntents.cancel` with ledger entry; not in CONTEXT, include only if the anomaly view needs it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build/tests | ✓ | v26.4.0 (`stripe` needs >=20) | — |
| npm | install | ✓ | via nvm | — |
| Stripe CLI | local webhook forward, replay, bank-transfer simulation | ✓ | 1.43.6 | Dashboard test events |
| slopcheck | package audit | ✓ | installed via pip | — |
| Supabase branch + `SV_TEST_*` env | RLS/concurrency tests | not probed (env in `.env.test.local`) | — | Existing suite pattern |
| Stripe account (test + live), Dashboard bank transfers enabled | Checkout | unknown | — | Blocks live only; test keys needed first (human action) |
| Vercel env vars (`STRIPE_*`, `CRON_SECRET`) | deploy | unknown | — | Set before deploy |
| Resend | mails | ✓ (existing) | ^6.28.1 | — |
| Context7 / ctx7 CLI | docs | ✗ (ctx7 not installed) | — | Official docs via WebFetch (used) |

**Missing dependencies with no fallback:** a Stripe account with keys and webhook secrets (human action, Open Question 3).
**Missing dependencies with fallback:** Context7 (official docs fetched instead).

## Validation Architecture

> `.planning/config.json` has no `nyquist_validation: false`, so this section is enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.11 (unit, `src/**/*.test.ts`) + Vitest RLS suite (`tests/rls/*.rls.test.ts`) on a dedicated Supabase branch |
| Config file | `vitest.config.ts` (alias `server-only` stub); `vitest.rls.config.ts` |
| Quick run command | `npx vitest run src/lib/server/stripe src/lib/documents src/lib/server/invoices` |
| Full suite command | `npm test` (unit) and `npm run test:rls` (needs `SV_TEST_*`, local only) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-01 | Amount from DB only; request body carries no amount; session params (customer, allowed methods, metadata, expiry, FR IBAN) | unit (mock Stripe) | `npx vitest run src/lib/server/stripe/checkout.test.ts` | ❌ Wave 0 |
| PAY-01 | Refuses second session when `processing`; refuses credited/paid invoice | unit | same | ❌ Wave 0 |
| PAY-02 | Bad/missing signature -> 400; tampered body -> 400; livemode mismatch -> 400 | unit (`stripe.webhooks.generateTestHeaderString`) | `npx vitest run src/lib/server/stripe/webhook.test.ts` | ❌ Wave 0 |
| PAY-02 | Event type/status -> ledger kind mapping table (completed paid vs unpaid, async succeeded/failed, expired, partially_funded, refunded) | unit (pure mapper) | same | ❌ Wave 0 |
| PAY-02 | Replay the same event id twice -> one ledger row, one fact, one receipt; crash-before-processed_at retry processes once | RLS/integration (RPC) | `npx vitest run -c vitest.rls.config.ts tests/rls/payments.rls.test.ts` | ❌ Wave 0 |
| PAY-02 | Amount/currency/unknown-invoice mismatch -> `anomaly`, no fact, no unlock | RLS/integration | same | ❌ Wave 0 |
| PAY-03 | Paid deposit posts `deposit_received` (actor system, note = invoice number) and step becomes 4; paid final posts `balance_received`; period invoice posts nothing | RLS/integration + unit (`deriveProjectState`) | same | ❌ Wave 0 |
| PAY-03 | Receipt outbox row deduped; reminders J+3/J+7/J+14 created with `send_after`; skipped on payment/credit/processing | RLS/integration | same | ❌ Wave 0 |
| PAY-03 | Mail closed-list parity SQL vs TS (events + templates) | unit (file parse) | `npx vitest run src/lib/paymentsMigration.test.ts src/lib/server/mail/rules.test.ts` | ❌ Wave 0 |
| PAY-04 | Gapless: N parallel `sv_issue_invoice` -> numbers exactly 1..N, no duplicate; forced failure after allocation -> next issue reuses number | RLS/integration | `npx vitest run -c vitest.rls.config.ts tests/rls/invoices.rls.test.ts` | ❌ Wave 0 |
| PAY-04 | Year rollover at Paris midnight; separate `AV` and `T*` series; format `FA-2026-0001` | RLS/integration (clock-injectable inner fn) | same | ❌ Wave 0 |
| PAY-04 | UPDATE/DELETE/TRUNCATE on invoices, lines, deductions, pdfs, counters decrement all rejected even for service_role | RLS/integration | same | ❌ Wave 0 |
| PAY-04 | Credit note: cap on cumulative amount, reason required, origin lock, cannot credit a credit note, expire-session hook | RLS/integration + unit | same | ❌ Wave 0 |
| PAY-04 | RLS: client A cannot read client B invoices/payments; anonymous and Gecko user denied; `sv_stripe_events` has no authenticated grant | RLS | same | ❌ Wave 0 |
| PAY-04 | Rendered invoice and credit-note PDF contain all mentions (DOC-04 extension: number, date, deductions, "Acquittée", reference to origin invoice) | unit (unpdf text) | `npx vitest run src/lib/documents/legalMentions.test.ts src/lib/documents/render.test.ts` | ✅ extend |
| PAY-05 | Pure `facturx.ts` mapping produces the expected EN 16931 term set (BT-1, BT-3 380/386/381, BT-113, BT-115, VATEX) from fixtures; sums consistent | unit | `npx vitest run src/lib/documents/facturx.test.ts` | ❌ Wave 0 |
| PAY-05 | Arithmetic: milli-quantity rounding half-up, deposit + final + deductions never negative/over-invoiced | unit | `npx vitest run src/lib/documents/invoiceMath.test.ts` | ❌ Wave 0 |
| D-01 | Key-mode guard: live key refused outside `VERCEL_ENV=production`; publishable key refused | unit | `npx vitest run src/lib/server/stripe/client.test.ts` | ❌ Wave 0 |
| priceScope | `src/lib/server/stripe` and new portal/admin paths stay inside allowed zones; no public import | unit | `npx vitest run src/lib/priceScope.test.ts` | ✅ existing |
| E2E (manual, test mode) | Card paid, bank transfer via `stripe test_helpers customers fund_cash_balance`, `stripe events resend <id>` replay | manual with justification: needs Stripe test account | `stripe listen --forward-to localhost:3000/api/stripe/webhook` | n/a |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched dirs>` (< 30 s)
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` green + `npm run test:rls` green on the branch + manual E2E checklist (card, transfer, replay, credit note) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/server/stripe/{client,webhook,checkout}.test.ts` (Stripe mocked; signature tests use SDK test header helper)
- [ ] `src/lib/documents/{invoiceMath,invoiceStatus,facturx}.test.ts`
- [ ] `src/lib/paymentsMigration.test.ts` (parity with new migration file, pattern of `signatureMigration.test.ts`)
- [ ] `tests/rls/invoices.rls.test.ts`, `tests/rls/payments.rls.test.ts` (+ helpers for issuing test invoices, parallel RPC)
- [ ] Framework install: only `npm install stripe@23.0.0 --save-exact`

## Security Domain

> `security_enforcement` not disabled in config; included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (no new login); webhook auth is signature-based | Stripe signature |
| V3 Session Management | no | existing Supabase session |
| V4 Access Control | yes | RLS on every new table (admin or project member), RPCs `revoke ... from public, anon, authenticated; grant to service_role`, server actions call `requireAdmin()`/`requireClient()` + RLS read before service_role use |
| V5 Input Validation | yes | zod for period-invoice form and credit-note reason; webhook fields parsed by a strict mapper; amounts never read from request |
| V6 Cryptography | yes | `stripe.webhooks.constructEvent` (never custom HMAC); SHA-256 of PDFs via `node:crypto` (existing); secrets only in env |
| V7 Error handling/logging | yes | log codes only (existing pattern), never emails/IBAN/payloads; webhook returns generic bodies |
| V10/V13 API | yes | webhook route public but signature-gated; excluded from proxy by existing matcher; no CORS |

### Known Threat Patterns for this stack

| Pattern | STRIPE/Category | Standard Mitigation |
|---------|-----------------|---------------------|
| Forged webhook | Spoofing | Raw-body signature verification, tolerance, secret per mode, `livemode` consistency |
| Replay / duplicate delivery | Tampering/Repudiation | `sv_stripe_events` PK + `processed_at`, single-transaction RPC, ledger unique `stripe_event_id` |
| Amount tampering from client | Tampering | Amount read from immutable DB invoice; Stripe metadata only for lookup; compare event amount to invoice |
| IDOR on pay/download actions | Elevation | Server action loads invoice through the caller's RLS client first |
| Invoice mutation / number reuse | Tampering | deny_mutation triggers incl. service_role, no UPDATE/DELETE grants, unique `(series, year, seq)`, counter monotonic trigger |
| Live key in preview | Information disclosure/Financial | `assertStripeKey` environment guard, separate env scoping |
| Secret/PII leakage | Information disclosure | No Stripe payload dump in DB or logs; admin-only reads for Stripe ids; client-readable ledger columns limited by column GRANT |
| Refund abuse | Elevation | Refund only from admin action tied to an issued credit note, idempotency key, never from client |
| SSRF/open redirect on return URLs | Tampering | `success_url`/`cancel_url` built from `getSiteUrl()` + fixed paths with the invoice id validated as uuid |

## Project Constraints (from CLAUDE.md)

No project-level `CLAUDE.md` exists in `C:\portfolio` (global `~/.claude/CLAUDE.md` only requires prefixing shell commands with `rtk`, irrelevant to deliverables). No `.claude/skills/` directory. Inherited constraints live in CONTEXT D-18 (French-only noindex private UI, RLS in the same migration, `service_role` only in `server-only` modules, RLS tests on branch, `priceScope` guards, Paris time, never regenerate an issued PDF) and the permanent-fixture memory (reuse "Test E2E Sèvalys", never delete it).

## Sources

### Primary (HIGH confidence)
- docs.stripe.com/payments/bank-transfers/accept-a-payment (Checkout bank transfer: Customer required, `eu_bank_transfer` country FR, events, EUR, payment mode only)
- docs.stripe.com/payments/bank-transfers (supported countries incl. FR, FR IBAN localisation, 75/90-day unreconciled funds, recall, beneficiary name warning)
- docs.stripe.com/payments/customer-balance/reconciliation (automatic matching order, manual mode, partial funding)
- docs.stripe.com/payments/customer-balance/refunding (refund flow, 45 days, `refund.failed`, 180-day limit)
- docs.stripe.com/checkout/fulfillment (webhooks mandatory for async methods, 10 s redirect wait, idempotent fulfillment)
- docs.stripe.com/api/checkout/sessions/create (`allowed_payment_method_types`, `expires_at` 30 min-24 h, `ui_mode` default `hosted_page`, `client_reference_id`, `metadata`, `locale: fr`)
- stripe.com/en-fr/pricing/local-payment-methods (bank transfer 0.5 %, cap 5 €, +0.50 € per refund, 1000 free VBANs); stripe.com/fr/pricing (cards 1.5 % + 0.25 €)
- npm registry + local install of `stripe@23.0.0` (`ApiVersion = 2026-09-30.endive`, `constructEvent`/`constructEventAsync`, CHANGELOG 23.0.0)
- Codebase: `supabase/migrations/20261004-20261006*`, `src/lib/server/{documents,mail,projects,signature}`, `src/lib/documents/*`, `src/proxy.ts`, `src/lib/privateRoutes.ts`, `vercel.json`

### Secondary (MEDIUM confidence)
- Calendar e-facturation 2026-2027 (pennylane.com, cegid.com, kolecto.fr, compta-online.com via WebSearch)
- EN 16931 / Factur-X term mapping, type codes 380/381/386, BT-113, BG-3, VATEX-FR-FRANCHISE (facturevalide.fr, getfacturx.com, plateforme-agree.org, synapx.fr, microcitron.fr via WebSearch)
- Mandatory mentions micro-entrepreneur 2026 (legalstart.fr, portail-autoentrepreneur.fr via WebSearch)

### Tertiary (LOW confidence)
- Franchise mention change to CIBS (lamicrobyflo.fr, conforme2026.fr, wize-expert.fr, refactia.com, gesticompta.com): sources conflict on date and article number; accountant must confirm
- Vercel Preview protection vs Stripe webhooks (training knowledge)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, SDK version, API version, fees, bank-transfer config checked against official docs and the installed package.
- Architecture: MEDIUM-HIGH, patterns are standard Postgres/Stripe and mirror existing repo conventions; gapless and replay guarantees must be proven by the planned concurrency/replay tests.
- Pitfalls: MEDIUM, Stripe-specific ones are documented; legal wording (CIBS), unfunded-PaymentIntent lifetime and Vercel preview behavior are flagged.

**Research date:** 2026-10-04
**Valid until:** 2026-11-03 for Stripe/SDK facts (fast-moving major released 2026-09-30); legal e-invoicing points re-check before PAY-07.
