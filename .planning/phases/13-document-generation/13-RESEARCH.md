# Phase 13: Document generation - Research

**Researched:** 2026-10-03
**Domain:** PDF generation server-side (React-PDF on Next 16 / Turbopack), write-once document storage (Supabase Storage + Postgres), French B2B legal mentions (franchise en base de TVA), derived document statuses, mail outbox extension
**Confidence:** HIGH on stack and integration (spikes executed in this session), MEDIUM on legal wording (secondary sources, accountant review still required)

## Summary

The React-PDF blocker from STATE.md is **resolved by a real spike run in this session** (scratch project outside the repo, Windows 11, Node 26.4): `@react-pdf/renderer@4.9.0` builds and serves a valid PDF from a Node-runtime route handler under `next@16.1.6` (Turbopack production build) with `reactCompiler: true`, React 19.2.3, with and without `serverExternalPackages`, with fonts loaded from local files (WOFF) and from base64 data URIs. `@react-pdf/renderer` is already in Next's built-in external-packages list, so the config entry is a harmless explicit guard. The same templates also render and extract correctly inside Vitest 4.1.11 (JSX in `.tsx`, imported from a `.test.ts`). It was NOT tested on Vercel's Linux runtime itself.

Three spike findings change how the plans must be written: (1) **every render produces different bytes** (CreationDate/ID), so the SHA-256 must be computed on the exact buffer that is uploaded, never on a "regenerated" one, and the preview is never byte-equal to the emitted file; (2) **React-PDF hyphenates by default** (English dictionary) and splits French words at line ends ("indem-/nité"), which would make the legal-mention test flaky; call `Font.registerHyphenationCallback((w) => [w])` once; (3) **`Intl` fr-FR number formatting emits U+202F (narrow no-break space) which extracts as "/"** (`1/234,50`) with the Fontsource Latin subset; format money with a custom function that uses U+00A0 only, and normalise NBSP/whitespace in the test before matching.

Write-once is achieved in layers, none of which relies on a `storage.objects` policy: unique unguessable path, `upsert: false`, an append-only `sv_project_documents` row (`deny_mutation` triggers, hash/size/template version/snapshot frozen at insert), replacement modelled as a chain (`replaces_document_id`, partial unique indexes) so no row is ever updated, and signed URLs generated on demand. The French mention test uses `unpdf` to extract text from a real rendered PDF and checks a explicit list of regexes after whitespace normalisation, plus a non-vacuity test that removes one mention and expects a failure.

**Primary recommendation:** Plan 1 = commit the spike as a permanent harness (dependency install, font data module, hyphenation off, a render+extract Vitest test). Then build a pure `snapshot -> PDF` template registry (`src/lib/documents/`), an append-only `sv_project_documents` + admin-only `sv_document_snapshots` pair issued through one `sv_issue_document` RPC (which also inserts the `document_issued` outbox rows atomically), and derive statuses from facts in a pure function.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Émission et cycle de vie (DOC-01, DOC-02)
- **D-01:** **Geste admin explicite.** Dans la fiche projet, l'admin voit les documents attendus à l'étape courante et clique « Générer ». Aucune génération automatique à l'arrivée d'une étape : un devis ou un contrat ne part jamais sans relecture.
- **D-02:** **Aperçu puis émission.** L'admin saisit les données, voit un aperçu PDF non conservé, puis clique « Émettre » : seul ce PDF est figé (octets en écriture unique, SHA-256, version du modèle, copie JSON des données) et visible du client. Pas d'état « brouillon » stocké.
- **D-03:** **Correction après émission = nouveau document qui remplace l'ancien.** L'ancien est conservé, marqué « remplacé », jamais modifié ni supprimé.
- **D-04:** **Visible à l'émission + e-mail.** Dès « Émettre », le document apparaît dans l'espace client et un e-mail part via le moteur de mails existant (nouvelle règle en code, clé d'unicité par document).
- **D-05:** **Garde par étape, un seul document actif par type et par projet.** Devis et cahier des charges à l'étape 2, contrat à l'étape 3, PV de recette à l'étape 5, facture à l'étape 6. Un nouvel émis remplace l'actif du même type. Pas d'avenants en phase 13. La facture n'est que prévisualisable en phase 13 (voir D-14), la règle d'un actif par type ne s'y applique pas encore.

### Contenu et saisie (DOC-01)
- **D-06:** **Devis : lignes libres par projet.** Formulaire admin dans la fiche projet : lignes (désignation, quantité, prix unitaire HT), taux de TVA, % d'acompte, validité, délai. Aucun catalogue de prix. Totaux calculés côté serveur en centimes entiers.
- **D-07:** **Contrat : modèle fixe versionné dans le code** (clauses non éditables par l'admin), alimenté par les données du projet : parties, offre, montants du devis accepté, acompte, dates. Le texte juridique est à faire relire avant mise en production (blocker existant). La clause de convention de preuve sera ajoutée en phase 14.
- **D-08:** **Cahier des charges : sections structurées saisies par l'admin** (contexte et objectif, périmètre, livrables, hors périmètre, planning, critères d'acceptation), préremplies avec l'objectif d'onboarding (`sv_client_onboarding.project_goal`). Les critères d'acceptation sont réutilisés par le PV de recette.
- **D-09:** **PV de recette : un par projet**, reprend les critères d'acceptation du cahier des charges émis, date de livraison, réserves éventuelles (champ admin) et zone d'acceptation. La validation par étape livrée et la signature relèvent de la phase 14.

### Facture et mentions légales (DOC-04)
- **D-10:** **Phase 13 livre le modèle PDF de facture, sa prévisualisation et le test des mentions, mais n'émet aucune facture réelle.** Numéro légal, émission officielle, immuabilité et avoirs restent en phase 15 (PAY-04). Une facture prévisualisée porte un numéro provisoire clairement non légal (ex. « PROFORMA »/« APERÇU »), jamais stocké comme facture émise.
- **D-11:** **Régime de TVA du vendeur : franchise en base.** Mention « TVA non applicable, art. 293 B du CGI », montants HT = TTC, aucun calcul de TVA. Le modèle ne suppose pas la TVA, mais prévoit un champ de régime dans la configuration vendeur afin qu'un passage futur à la TVA ne demande qu'une nouvelle version de modèle. À confirmer par l'expert-comptable avant mise en production (blocker existant).
- **D-12:** **Identité du vendeur dans une constante versionnée dans le code** (nom, forme juridique, SIRET, adresse, RM/RCS, IBAN, conditions de paiement, régime de TVA). Copiée dans l'instantané de chaque document. Les valeurs réelles sont à demander au propriétaire pendant la planification (non connues du dépôt).
- **D-13:** **Test des mentions sur le texte extrait d'un vrai PDF.** Le test génère un devis et une facture avec des données d'exemple, en extrait le texte, et vérifie une liste explicite de mentions par type (identité et SIRET du vendeur, art. 293 B, pénalités de retard, indemnité forfaitaire de 40 €, validité du devis, date, désignation, montants, identité et SIREN du client…). Il doit échouer si une mention est retirée du modèle. Il couvre les variantes (adresse de facturation identique ou différente). Périmètre : devis et facture (DOC-04), pas contrat/CDC/PV.

### Onglet Documents du client (DOC-03)
- **D-14:** **Statut déduit des faits, aucune colonne de statut stockée.** « À signer », « signé » et « payé » se calculent depuis les faits du projet (`contract_signed`, `quote_accepted`, `deposit_received`, `acceptance_signed`, `balance_received`…) comme la frise. En phase 13, un document à signer affiche « À signer », signé/payé s'allument quand les faits existent (posés à la main par l'admin d'ici là). Les phases 14-15 n'ont rien à migrer. Le statut « remplacé » vient du chaînage de remplacement (D-03), pas d'un fait de signature.
- **D-15:** **Liste + téléchargement par lien signé.** Onglet Documents du portail : liste par projet (type, date d'émission, version, statut), bouton « Télécharger » qui génère à la demande un lien signé de quelques minutes (jamais stocké en base ni envoyé par e-mail), même mécanisme que les fichiers de la phase 12. Les documents remplacés restent listés en retrait. Pas de visualiseur PDF intégré en phase 13 (à reconsidérer en phase 14 pour la lecture avant signature).
- **D-16:** **Vue admin : section Documents dans la fiche projet existante** : documents attendus à l'étape, formulaire de saisie + aperçu + Émettre, liste des documents émis avec version du modèle, empreinte SHA-256 et volet lecture seule de l'instantané de données. L'admin télécharge les mêmes octets que le client. Pas de page transverse `/admin/documents`.

### Hérité des phases précédentes (rappel)
- **D-17:** Portail et admin en français uniquement, `noindex`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table, `service_role` uniquement dans des modules `server-only`, tests RLS sur branche Supabase dédiée (client A vs B, anonyme, utilisateur Gecko), rôles en tables. Prix autorisés dans portail, admin et modèles, jamais sur le public (gardes d'import existantes). Bucket de stockage privé préfixé `sv-` sur le projet Supabase partagé avec Gecko, sans toucher aux politiques `storage.objects` de Gecko. Client de test permanent « Test E2E Sèvalys » à réutiliser pour les vérifications de bout en bout, sans le supprimer. Faits en ajout seul, étape courante calculée (phase 12, D-08/D-09). Fuseau `Europe/Paris`, formats `fr-FR`.

### Claude's Discretion
- Structure exacte des tables et colonnes (document, instantané, versions, remplacement), noms de types, découpage des plans.
- Mécanisme d'écriture unique du stockage (nouveau bucket privé ou chemin dédié, interdiction d'écraser) et chemin non devinable.
- Spike `@react-pdf/renderer` sur Next 16 / Turbopack : `serverExternalPackages`, polices TTF locales embarquées, rendu en runtime Node ; à faire en premier plan (blocker STATE.md).
- Bibliothèque d'extraction de texte PDF pour le test de mentions.
- Mise en page, typographie et libellés des PDF et de l'onglet Documents (sobre, tokens du design system).
- Libellés et gabarit de l'e-mail d'émission (français, sans prix).
- Forme exacte de l'aperçu (route de rendu, durée de vie, absence de stockage).
- Registre des versions de modèle (`v1`, `v2`…) et colonne en base qui enregistre la version utilisée.

### Deferred Ideas (OUT OF SCOPE)
- Visualiseur PDF intégré dans le portail — à reconsidérer en phase 14 (lecture avant signature).
- Plusieurs documents actifs d'un même type (acompte + solde en deux factures, plusieurs PV par étape livrée, avenants) — phases 14-15 ; la validation « de chaque étape livrée » (SIGN-05) y est traitée.
- Page transverse `/admin/documents` (tous clients, filtres type/statut) — quand le volume le justifiera.
- Modèles de contrat par offre (9 textes) — contredit la frise commune ; à reconsidérer après les premiers projets réels.
- Catalogue d'offres avec prix par défaut — non retenu ; lignes libres.
- Extension du test de mentions au contrat, au cahier des charges et au PV — hors DOC-04.
- Clauses particulières par projet dans le contrat — non retenu ; modèle fixe.
- Facture réelle, numérotation sans trou, immuabilité, avoirs, Factur-X — phase 15.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-01 | À l'étape voulue, devis, contrat, cahier des charges, PV de recette et facture sont générés en PDF depuis un modèle versionné et les données du projet | Spike-proven React-PDF stack; template registry `src/lib/documents/templates/<type>/v1`; pure `snapshot -> PDF`; step guard via `deriveProjectState`; integer-cents totals; server action preview (base64) + issue |
| DOC-02 | Un PDF émis ne change plus : octets en écriture unique, SHA-256, version du modèle, copie des données consultable | New private bucket `sv-documents` (`upsert:false`, random path), append-only `sv_project_documents` + admin-only `sv_document_snapshots`, `node:crypto` hash on the uploaded buffer, replacement chain, one `sv_issue_document` RPC |
| DOC-03 | Le client retrouve tous ses documents avec leur statut (à signer, signé, payé) | RLS read of document rows (column-grant without `storage_path`), pure `documentStatus()` from facts + replacement chain, `/espace-client/documents` page, signed-URL download mirroring `createDownloadUrl` |
| DOC-04 | Un test automatisé échoue si une mention légale française obligatoire manque dans le texte extrait d'un devis ou d'une facture | `unpdf` text extraction in Vitest, whitespace/NBSP normalisation, hyphenation disabled, per-type mention lists (`legalMentions.ts`), non-vacuity test, variants for billing address |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

No project-level `./CLAUDE.md` and no `.claude/skills` directory exist in `C:\portfolio`. Directives that apply come from the user's global `~/.claude/CLAUDE.md` and the locked decisions:

- Prefix shell commands with `rtk` (RTK token-saving proxy), including inside `&&` chains. [CITED: ~/.claude/CLAUDE.md]
- Project memory: the permanent prod test fixtures (client "Test E2E Sèvalys", admin contact@sevalys.com) must be kept and reused, never deleted. [CITED: MEMORY.md]
- All D-17 inherited rules (French only, noindex, no GSAP, RLS in same migration, `service_role` only in `server-only` modules, price zones, `sv-` bucket prefix, no touching Gecko `storage.objects` policies, Europe/Paris + fr-FR).
- Existing repo guards that this phase must keep green or extend: `src/lib/migrationLint.test.ts` (Rule 6 `APPEND_ONLY_TABLES` is a hard-coded list), `src/lib/priceScope.test.ts` (templates live in `src/lib/documents`, an allowed price zone), `src/components/portal/project/portalPage.test.ts` (asserts the string `Documents (bientôt)` in `ClientNav.tsx` and "no price token" in portal page and parts), `src/app/privateShells.test.ts`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PDF rendering (preview and issue) | API / Backend (Node server action) | — | React-PDF needs Node; never edge, never browser |
| Totals, deposit, validation of document data | API / Backend | Browser (display only) | D-06: totals server-side in integer cents; the client form only previews |
| Step guard (which document at which step) | API / Backend (TS `deriveProjectState`) | — | Step is never stored (phase 12 D-08); a SQL RPC cannot compute it |
| Immutable storage of PDF bytes | Database / Storage (private bucket) | API / Backend (writer) | `upsert:false`, random path, service_role only |
| Document metadata, hash, snapshot, replacement chain | Database (append-only tables + RPC) | — | Triggers give DB-level immutability; one transaction for rows and mail |
| Document status (à signer, signé, payé, remplacé) | API / Backend read layer (pure fn over facts) | Browser (render) | D-14: derived, never stored |
| Client document list and download | Frontend Server (RSC page, RLS client) | API (signed URL action) | Same pattern as `FilesPanel` / `createDownloadUrl` |
| Issue e-mail | API / Backend (outbox, closed lists) | Database (outbox row inside RPC) | Atomic with the document row; cron drains stragglers |
| Legal-mention test | Test (Vitest, Node) | — | Real render, real extraction |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-pdf/renderer` | 4.9.0 (published 2026-08, npm latest, created 2018, 7.4M downloads/week) | Templates as React components, `renderToBuffer` in Node | Spike-verified on Next 16.1.6 Turbopack + React 19.2.3 + React Compiler; pure JS, no Chromium. peer `react ^16.8 … ^19` [VERIFIED: npm registry + spike run 2026-10-03] |
| `node:crypto` | built-in | `createHash('sha256')`, `randomUUID()` | No dependency; hash computed on the uploaded buffer |
| `@supabase/supabase-js` | ^2.117.2 (already installed) | Storage upload `upsert:false`, `createSignedUrl` | Existing admin client `createSupabaseAdminClient()` |
| `zod` | ^4.6.5 (already installed) | Form schemas for document data | Existing pattern in `src/lib/projects/schemas.ts` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `unpdf` (devDependency) | 1.8.1 (unjs, created 2023, 5.8M downloads/week, no postinstall) | PDF text extraction in Vitest (`getDocumentProxy` + `extractText({mergePages:true})`) | The DOC-04 mention test only. Spike-verified under Vitest 4.1.11 on Windows/Node 26. Its optional peer `@napi-rs/canvas` is NOT needed for text [VERIFIED: spike run] |
| Fontsource Manrope WOFF files (copy, do not depend) | 5.3.0 files, OFL licence | Embedded Latin 400/700 font | Copy `manrope-latin-400-normal.woff` and `-700-` (18 KB each) into a generated base64 TS module. Spike-verified: accents, `œ`, `€` render and extract |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `unpdf` | `pdfjs-dist` 6.3.289 directly | More setup (worker, legacy build) for no benefit; unpdf is a serverless-friendly wrapper |
| `unpdf` | `pdf-parse` 2.4.5 (last release 2025-10) | Older, thinner maintenance; not needed |
| Base64 font module | Read WOFF/TTF with `fs` + `outputFileTracingIncludes` | `fs` variant also works for a route handler (spike: `.nft.json` listed the fonts) but tracing for server-action entry points is unverified; the data-URI variant has no tracing risk |
| WOFF | TTF (STACK.md suggestion) | TTF also fine; WOFF verified, WOFF2 also rendered in the spike. Use whichever file is committed; keep Latin subset only |
| Server action returning base64 preview | Route handler returning `application/pdf` | Route handler streams a real PDF into an iframe; action is simpler to test (existing `actions.test.ts` pattern) and a PDF here is ~5-100 KB |

**Installation:**
```bash
rtk npm install @react-pdf/renderer@4.9.0
rtk npm install -D unpdf@1.8.1
```
`pdf-lib` is NOT needed in phase 13 (only phase 14, optional).

**Version verification:** `npm view @react-pdf/renderer version` = 4.9.0 (modified 2026-08-27), `npm view unpdf version` = 1.8.1 (modified 2026-08-13), `postinstall` empty for both. [VERIFIED: npm registry, 2026-10-03]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @react-pdf/renderer | npm | 8 yrs | 7.4M/wk | github.com/diegomura/react-pdf | [OK] | Approved |
| unpdf | npm | 3 yrs | 5.8M/wk | github.com/unjs/unpdf | [OK] | Approved (dev only) |
| @fontsource/manrope | npm | 5 yrs | 467K/wk | github.com/fontsource/font-files | [OK] | Approved as a one-time font source (files copied, not a runtime dependency) |
| pdfjs-dist | npm | — | — | github.com/mozilla/pdf.js | [OK] | Not recommended (no need) |

`slopcheck scan` (v5.3.0) was run on a scratch `package.json` containing the packages above: 5 of 5 OK. Registry confirmation: `npm view` returned versions and repositories; neither recommended package defines a `postinstall`.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 ADMIN (fiche projet, section Documents)
   |  1. open section -> loadProjectBundle(rls) + loadProjectDocuments(rls)
   |       expected docs = f(currentStep) ; prerequisites (contrat <- devis actif, PV <- CDC actif)
   v
 form (zod) --"Aperçu"--> Server Action previewDocumentAction
   |                         requireAdmin -> getAccessibleProject -> zod -> buildSnapshot(project, client,
   |                         onboarding, SELLER_V1, input, totals in cents) -> renderDocument(snapshot) (Node)
   |                         -> base64 PDF (NOT stored) -> iframe/blob in browser
   v
 "Émettre" --> Server Action issueDocumentAction (documentId uuid = idempotency key from the form)
   |   requireAdmin -> access check -> step guard (deriveProjectState) -> prerequisite check
   |   -> buildSnapshot -> renderToBuffer -> sha256(buffer)
   |   -> storage.upload(path = {projectId}/{documentId}.pdf, upsert:false)   [private bucket sv-documents]
   |   -> RPC sv_issue_document (service_role, ONE transaction):
   |        lock project; check replaces = current head of chain; insert sv_project_documents (revision n)
   |        + sv_document_snapshots + sv_mail_outbox rows (one per member e-mail, dedupe document_issued:{id}:{email})
   |   -> best-effort sendOutboxRow(ids) ; cron /api/cron/mail drains the rest
   v
 Postgres  sv_project_documents (append-only, deny_mutation)   sv_document_snapshots (admin-only read)
   ^                    ^
   | RLS read           | RLS read (admin only)
 CLIENT /espace-client/documents  --> list by project: type, issued_at, revision, status(documentStatus(facts, chain))
   |  "Télécharger" -> Server Action: RLS select id -> service_role createSignedUrl(path, 120 s, {download})
   v
 browser downloads the stored bytes (same bytes for admin and client)

 TEST (vitest): sample snapshot -> renderToBuffer -> unpdf extractText -> normalise -> assert mention list
```

### Recommended Project Structure
```
src/lib/documents/                  # price zone allowed (priceScope: 'src/lib/documents'); pure, no server-only imports
├── types.ts                        # DocType, Snapshot types, DOC_TYPES, labels
├── money.ts                        # cents math, formatEuros (NBSP only, never Intl 202F), deposit rounding
├── seller.ts                       # SELLER_V1 constant (identity, VAT regime, payment terms)  [D-12]
├── registry.ts                     # TEMPLATES[docType][version], CURRENT_TEMPLATE_VERSION
├── status.ts                       # documentStatus(doc, facts, replacedBy) pure                [D-14]
├── steps.ts                        # DOC_STEP_GUARD: quote/spec=2, contract=3, acceptance=5, invoice=6; prerequisites
├── legalMentions.ts                # MENTIONS per doc type + normalizeText() + findMissingMentions()
├── schemas.ts                      # zod inputs per type (quote lines, spec sections, ...)
├── fontData.ts                     # GENERATED base64 data URIs (Manrope 400/700)
├── pdf/
│   ├── setup.ts                    # Font.register + registerHyphenationCallback((w)=>[w]) (import once)
│   ├── primitives.tsx              # Header, Table, Footer, Section styles
│   └── templates/<type>/v1/*.tsx   # quote, contract, spec, acceptance, invoice
src/lib/server/documents/           # server-only
├── render.ts                       # renderDocument(snapshot) -> Buffer (+ sha256)
├── issue.ts                        # upload + RPC + mail send
├── read.ts                         # loadProjectDocuments(rls) / client-wide list (explicit columns)
└── download.ts                     # createDocumentDownloadUrl(rls, id)
src/app/admin/projets/actions.ts    # + previewDocumentAction, issueDocumentAction, adminDocumentDownloadAction
src/app/espace-client/documents/page.tsx   # new tab (RSC), + actions.ts download
src/components/admin/projects/DocumentsPanel.tsx (+ per-type forms) ; src/components/portal/project/DocumentsList.tsx
src/lib/server/mail/documentIssuedEmail.ts
supabase/migrations/2026100x_sv_documents.sql
```
Do not use `src/pdf/…` as in STACK.md: `src/lib/documents` is the folder already whitelisted in `priceScope.ts`.

### Pattern 1: Template = pure function of a frozen snapshot
**What:** `renderDocument({ docType, templateVersion, snapshot })` depends on nothing but its argument (no DB reads, no `new Date()`; the issue date is inside the snapshot). The snapshot JSON (seller constant copy, client identity, project, input data, computed totals, issue date, reference) is what gets stored. Two renders are textually equal though not byte-equal.
**When to use:** all five templates. Guarantees DOC-02 "copie des données consultable" and an audit re-render in phase 14/15.
**Example:**
```tsx
// Source: spike run 2026-10-03 (Next 16.1.6 + Turbopack + React Compiler) ; React-PDF API
// src/lib/documents/pdf/setup.ts
import { Font } from '@react-pdf/renderer';
import { MANROPE_400, MANROPE_700 } from '../fontData'; // 'data:font/woff;base64,...'
let done = false;
export function setupPdf() {
  if (done) return;
  Font.register({ family: 'Manrope', fonts: [
    { src: MANROPE_400, fontWeight: 400 },
    { src: MANROPE_700, fontWeight: 700 },
  ]});
  Font.registerHyphenationCallback((word) => [word]); // no "indem-/nité" breaks (verified)
  done = true;
}

// src/lib/server/documents/render.ts
import 'server-only';
import { createHash } from 'node:crypto';
import { renderToBuffer } from '@react-pdf/renderer';
export async function renderDocument(el: React.ReactElement) {
  const buffer = await renderToBuffer(el); // Node runtime only
  return { buffer, sha256: createHash('sha256').update(buffer).digest('hex') };
}
```

### Pattern 2: Append-only documents with a replacement chain (no UPDATE ever)
**What:** `replaces_document_id uuid null references sv_project_documents(id) on delete restrict`; `revision int` set by the RPC; `create unique index ... (replaces_document_id) where replaces_document_id is not null` (a document is replaced at most once, so the chain is linear and race-safe) and `create unique index ... (project_id, doc_type) where replaces_document_id is null` (exactly one root per type and project). "Active" = not referenced by any `replaces_document_id`. "Remplacé" is derived, satisfying D-03/D-14 without a status column and without `UPDATE`.
**When to use:** the documents table. Same trigger pattern as `sv_project_facts` (`sv_private.deny_mutation()` on row update/delete and on truncate). Add `sv_project_documents` and `sv_document_snapshots` to `APPEND_ONLY_TABLES` in `migrationLint.test.ts` so the lint enforces it.
**Example (shape, not final):**
```sql
create table if not exists public.sv_project_documents (
  id uuid primary key,                       -- generated by the app (random v4), also the idempotency key
  project_id uuid not null references public.sv_projects (id) on delete restrict,
  doc_type text not null check (doc_type in ('quote','contract','spec','acceptance')),  -- 'invoice' joins in phase 15
  revision integer not null check (revision >= 1),
  template_version text not null check (template_version ~ '^v[0-9]+$'),
  reference text not null,
  filename text not null check (char_length(filename) between 1 and 200),
  storage_path text not null unique,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  replaces_document_id uuid null references public.sv_project_documents (id) on delete restrict,
  issued_by uuid null,                       -- no FK to auth.users (phase 12 pitfall 1)
  issued_at timestamptz not null default now()
);
-- grant select (all columns EXCEPT storage_path) to authenticated; select, insert to service_role
```
`sv_document_snapshots(document_id uuid primary key references ... on delete restrict, data jsonb not null, created_at)`: admin-only read policy (`sv_private.is_admin()`), same as `sv_project_fact_notes`. A column grant cannot separate admin from client because both are `authenticated`, hence the second table.

### Pattern 3: One transactional RPC for issue
`sv_issue_document(p_id uuid, p_project_id uuid, p_doc_type text, p_template_version text, p_reference text, p_filename text, p_storage_path text, p_sha256 text, p_size integer, p_snapshot jsonb, p_replaces uuid, p_actor uuid)` in `security definer`, `set search_path = ''`, `revoke ... from public, anon, authenticated`, `grant execute ... to service_role` (migrationLint Rule 2 and the phase-12 "every function service_role only" test). It: `select ... from sv_projects where id = p_project_id for update`; computes the chain head for `(project, type)`; raises `sv_document_replaces_mismatch` unless `p_replaces` equals the head (or both null when no head); computes `revision`; inserts document, snapshot; inserts one outbox row per `sv_client_members.invited_email` with `event_type/template = 'document_issued'`, `dedupe_key = 'document_issued:'||id||':'||email`, payload `{documentLabel, projectTitle, revision}` (no price); returns `{document_id, outbox_ids}`. Error codes start with `sv_` so `callRpc` forwards them. A PK conflict on `p_id` means "already issued" (double click) and maps to an idempotent success message.

### Pattern 4: Derived status (pure)
```ts
// src/lib/documents/status.ts  (mapping; invoice entries inert until phase 15)
// quote    -> 'signed' when effective fact quote_accepted      else 'to_sign'
// contract -> 'signed' when effective fact contract_signed     else 'to_sign'
// acceptance -> 'signed' when effective fact acceptance_signed else 'to_sign'
// spec     -> 'issued' (no signature fact)  [labelled "Émis"]
// invoice  -> 'paid' when balance_received (or deposit_received for the deposit invoice) else 'to_pay'
// any document that is not the chain head -> 'replaced' (wins over every other status)
```
Use `effectiveFacts(facts)` from `src/lib/projects/steps.ts` so revoked facts correctly switch a status back. Facts are project-level, so refuse a replacement when the matching signing fact is effective (see Pitfall 7).

### Pattern 5: Write-once upload
```ts
// Source: Supabase JS reference storage upload (fileOptions: contentType, upsert) [CITED: supabase.com/docs/reference/javascript/storage-from-upload]
const path = `${projectId}/${documentId}.pdf`;           // documentId = crypto.randomUUID() : unguessable
const up = await sb.storage.from('sv-documents').upload(path, buffer, {
  contentType: 'application/pdf', upsert: false, cacheControl: '31536000',
});
// error name 'Duplicate' (HTTP 409) if the object exists -> treat as already issued, never retry with upsert
```
Bucket created in the migration exactly like phase 12: `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('sv-documents','sv-documents', false, 10485760, array['application/pdf']) on conflict (id) do nothing;` and NO policy on `storage.objects` (a static test like the phase-12 one must assert the new migration never mentions `storage.objects`). Whether Storage can truly be made immutable against `service_role` is not offered by Supabase; immutability is application-plus-DB enforced and auditable through the stored hash (optionally an admin "Vérifier l'empreinte" action re-downloads and re-hashes).

### Anti-Patterns to Avoid
- **Regenerating a stored document** to "download" it: bytes differ every render; always serve the stored object.
- **Hashing a different buffer** than the one uploaded, or hashing the preview.
- **Intl.NumberFormat('fr-FR') in templates**: produces U+202F and breaks extraction (`1/234,50`); use `formatEuros()` from `money.ts`.
- **Float arithmetic for money**: integer cents, quantity integer (or integer thousandths), deposit `Math.round` half-up on integers once; balance = total - deposit.
- **A status column or an UPDATE on documents**: breaks D-14 and the lint rule.
- **Calling `Font.register` per request** inside the component: register once at module load (`setupPdf()`).
- **Storing a preview or an "aperçu" invoice**: D-10; preview returns base64 and writes nothing.
- **Reading `storage_path` in client-reachable columns**: exclude it from the `authenticated` column grant; resolve the path only in server-only code.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF layout/rendering | Raw PDF string assembly or HTML-to-PDF via headless browser | `@react-pdf/renderer` `renderToBuffer` | Spike-proven, no Chromium on Vercel |
| PDF text extraction for tests | Regex over raw PDF bytes (streams are compressed) | `unpdf` `extractText` | Real content-stream decoding with ToUnicode maps |
| SHA-256 | Any JS hash lib | `node:crypto` `createHash` | Built in |
| Immutable rows | Application-level "don't update" convention | `sv_private.deny_mutation()` triggers + lint | Already the repo pattern, enforced by `migrationLint.test.ts` |
| Mail dedupe/retry/idempotency | A new sender | Existing outbox: `dedupe_key` unique, `sendOutboxRow`, Resend `idempotencyKey`, cron drain | Extend closed lists only |
| Signed download | Public bucket or stored URLs | `createSignedUrl(path, 120, { download })` after an RLS read | Same as `createDownloadUrl` (phase 12) |
| Step/ status logic | Stored current step or status | `deriveProjectState`, `effectiveFacts` | Phase 12 D-08/D-09 |
| Money formatting | `Intl` fr-FR in PDFs | Small `formatEuros(cents)` with U+00A0 | Avoid U+202F extraction bug (verified) |

**Key insight:** the risky parts are not drawing the PDF, they are the invariants around it: bytes frozen and hashed once, snapshot copied atomically with the row, mentions asserted on real extracted text. Keep the template a pure function and put every invariant in the DB and in tests.

## Common Pitfalls

### Pitfall 1: Non-deterministic bytes
**What goes wrong:** Hash of a re-render does not match the stored hash; a "verify" feature that re-renders always fails.
**Why it happens:** React-PDF writes a creation date and a document ID per render (spike: three renders, three different SHA-256).
**How to avoid:** Hash exactly the buffer passed to `upload`. Verification re-downloads the stored object. Never re-render for download.
**Warning signs:** Any code path that calls `renderToBuffer` outside preview/issue.

### Pitfall 2: Hyphenation corrupts extracted text
**What goes wrong:** "indemnité" extracted as `indem-\nnité`; mention test fails intermittently depending on line width.
**How to avoid:** `Font.registerHyphenationCallback((w) => [w])` in `setupPdf()`; the test also collapses whitespace. [VERIFIED: spike, default breaks words, disabled does not]
**Warning signs:** Mention regexes that pass for short sample data and fail with long client names.

### Pitfall 3: U+202F / U+00A0 in amounts
**What goes wrong:** `1 234,50 €` from `Intl` becomes `1/234,50` in extraction (U+202F) [VERIFIED: spike]. U+00A0 extracted fine as a space.
**How to avoid:** custom formatter; in the test `normalizeText()` replaces `[\u00a0\u202f]` with a space and collapses `\s+`.

### Pitfall 4: Orphan storage object vs. missing row
**What goes wrong:** Upload succeeds, RPC fails: an unreferenced PDF stays in the private bucket. The reverse (row without object) would be worse.
**How to avoid:** upload first, RPC second; on RPC failure return an error (no retry with the same path). The orphan is harmless (private, no row, no client access); document it and optionally list unreferenced objects later. Double click: same `documentId` -> PK conflict -> "déjà émis".

### Pitfall 5: Race on replacement
**What goes wrong:** Two admins issue a replacement at the same time; two heads.
**How to avoid:** `FOR UPDATE` on the project row in the RPC plus the two partial unique indexes; the RPC validates that `p_replaces` is the current head.

### Pitfall 6: Missing prerequisites
**What goes wrong:** Contract issued with no quote; PV with no spec; data absent from the snapshot.
**How to avoid:** Contract reads amounts from the active quote snapshot; PV reads acceptance criteria from the active spec snapshot (D-07/D-09, "reprend littéralement"). The action refuses (French error) when the prerequisite document is missing. Form pre-fills but the server re-reads.

### Pitfall 7: Replacing a document already signed or paid
**What goes wrong:** Admin re-issues a quote after `quote_accepted` exists; the new "à signer"/"signé" status silently inherits the old signature.
**How to avoid (recommendation, see Open Questions):** refuse replacement when the corresponding fact is effective (quote_accepted, contract_signed, acceptance_signed); admin must first revoke the fact with a reason (existing `fact_revoked` flow). This also protects the "never regenerate a signed document" rule from PITFALLS research.

### Pitfall 8: Existing tests that encode "bientôt"
**What goes wrong:** Enabling the Documents tab fails `portalPage.test.ts` (expects `Documents (bientôt)`), and any new portal file with `€` fails the "no price token" test.
**How to avoid:** Update that test deliberately in the same plan; the portal list shows no amounts (D-15 lists type, date, version, status only).

### Pitfall 9: Closed lists in outbox
**What goes wrong:** Adding `document_issued` in TS only: inserts violate the DB check constraints and mails silently fail.
**How to avoid:** Migration alters both `event_type` and `template` checks with the dynamic constraint lookup used in phase 12 for `sv_lead_events`; update `MAIL_EVENTS`, `MailTemplate`, `MAIL_RULES`, `dedupeKey`, `buildMail` switch; add a test parsing the SQL list against `MAIL_EVENTS` (phase 11-09 pattern).

### Pitfall 10: Vercel runtime not exercised
**What goes wrong:** Works locally (Windows) and fails on Vercel Linux (fonts, tracing).
**How to avoid:** Data-URI fonts (no `fs`), explicit `export const runtime = 'nodejs'` where a route is used, and a preview-deploy smoke check (generate and download one document with the permanent test client) as a manual verification step.

## Runtime State Inventory

Not a rename/refactor/migration phase. Greenfield additions, except two touched existing artifacts: `sv_mail_outbox` check constraints (altered in a new migration; no data change) and `ClientNav.tsx` + `portalPage.test.ts` (source edits). Nothing is stored under an old name. None found in stored data, live service config, OS-registered state, secrets, build artifacts. New env vars: none (bucket and RPC are in the migration).

## Mandatory French mentions (DOC-04)

Seller is under franchise en base de TVA (art. 293 B CGI), clients are B2B (professionals). Sources are secondary/official-summary pages; an accountant review remains a STATE.md blocker.

### Invoice (facture): required content
| Mention | Source status |
|---------|---------------|
| Date d'émission, numéro unique séquentiel (phase 15 for the real one; "PROFORMA / APERÇU" in phase 13) | [CITED: entreprendre.service-public.gouv.fr/vosdroits/F31808] |
| Vendeur: nom/dénomination, forme juridique, SIREN/SIRET, adresse du siège, capital si société, RCS/RM (EI: mention "EI" or "entrepreneur individuel" before the name) | [CITED: service-public F31808; entreprendre.service-public.gouv.fr/actualites/A15744 for EI] |
| Acheteur: dénomination, adresse de facturation | [CITED: F31808] |
| Date de la vente ou de la prestation | [CITED: F31808] |
| Désignation, quantité, prix unitaire HT | [CITED: F31808] |
| Total HT/TTC; with franchise: "TVA non applicable, art. 293 B du CGI", HT = TTC | [CITED: F31808] |
| Date d'échéance / conditions de règlement | [CITED: F31808] |
| Escompte: "Escompte pour paiement anticipé : néant" (or conditions) | [CITED: F31808] |
| Taux des pénalités de retard (contractual floor: 3x the legal interest rate; absent stipulation: BCE refinancing rate + 10 points) | [CITED: F31808 (rate must appear); secondary legal summaries for the floor, see A3] |
| Indemnité forfaitaire pour frais de recouvrement: 40 € | [CITED: F31808] |
| N° de bon de commande si émis | [CITED: F31808] (include only if provided) |
| SIREN du client (entreprise), adresse de livraison si différente, nature de l'opération (livraison de biens / prestation de services / mixte), option TVA sur les débits (if applicable) | [CITED: F31808, applicable from 1 Sept 2026 first for large companies/ETI, then SMEs/micro from 1 Sept 2027] |

Recommendation: include the four new mentions now (client SIREN from `sv_clients.siren`, a delivery address line only when it differs from billing, "Nature de l'opération : prestation de services", débits option omitted as seller is in franchise). Cheap, forward compatible with phase 15, and D-13 already lists "SIREN client". The seller's own VAT number is absent in franchise (do not print one).

### Quote (devis)
Mentions commonly required (B2B quotes are not mandatory by law outside regulated sectors but become contractual once accepted): date of the quote and validity period; identity of seller and client with addresses; description, quantities, unit price HT, total HT (and TTC) with the 293 B statement; payment and delivery conditions (dates, deposit); [CITED: service-public search summary 2026, abby/djaboo guides]. Add to the quote the same penalty/40 € wording as the invoice so one block (`LATE_PAYMENT_TEXT`) is shared (D-13 requires them in the test). Confidence MEDIUM.

### E-invoicing status (verified web, 2026-10-03)
- 1 Sept 2026 (already passed): all VAT-registered businesses must be able to receive e-invoices via a plateforme agréée; large companies and ETI must issue e-invoices and e-report. 1 Sept 2027: issuance for PME/TPE/micro. [CITED: economie.gouv.fr news, multiple secondary calendars; legal basis article 91 loi de finances 2024, ordonnance 2021-1190]
- Franchise-en-base businesses are not exempt (they remain "assujettis"): reception from now, issuance and e-reporting from 1 Sept 2027 per the secondary sources. [MEDIUM: secondary sources only; the official economie.gouv.fr pages returned HTTP 403 to the fetch tool; confirm with the accountant]
- Impact on phase 13: none on the PDF content beyond the extra mentions above; Factur-X/PA remain phase 15 (deferred). Flag in phase-15 planning that a PDF-only invoice will stop being sufficient for issuance from 1 Sept 2027.

### Test design (DOC-04)
`src/lib/documents/legalMentions.ts` exports per-type arrays `{ id, label, test: (normalizedText) => boolean }`, built from `SELLER_V1` values (so SIRET, address, RM/RCS must literally appear) plus regexes for the fixed wording. `normalizeText()`: `NFC`, replace `[\u00a0\u202f]` with a space, collapse whitespace, lowercase for wording matches only. The test renders a quote and an invoice for these variants: billing = company address, billing different (delivery-address line appears only then), client with VAT number, client `not_subject`. A non-vacuity test deletes one required sentence from the extracted text (or renders a template variant without it) and expects `findMissingMentions` to report that id. Both must run in well under 30 s (first render about 0.6 s measured).

## Code Examples

### Extract and assert text in Vitest
```ts
// Source: spike run 2026-10-03 (vitest 4.1.11, Windows, Node 26.4) ; unpdf README API
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { extractText, getDocumentProxy } from 'unpdf';

async function pdfText(el: React.ReactElement): Promise<string> {
  const buf = await renderToBuffer(el);
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
export const normalizeText = (t: string) =>
  t.normalize('NFC').replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
```
Note: vitest `include` is `src/**/*.test.ts`; keep test files `.ts` and import `.tsx` templates (JSX resolves under tsconfig `jsx: react-jsx`; verified). Mark long tests with a timeout (`it(..., 20_000)`).

### Closed-list extension of the outbox (migration)
```sql
-- Source: pattern from 20261004000000_sv_projects_engine.sql (sv_lead_events constraint swap)
do $$
declare v_name text;
begin
  for v_name in
    select c.conname from pg_constraint c
    where c.conrelid = 'public.sv_mail_outbox'::regclass and c.contype = 'c'
      and (pg_get_constraintdef(c.oid) ilike '%client_invited%')   -- event_type and template lists
  loop
    execute format('alter table public.sv_mail_outbox drop constraint %I', v_name);
  end loop;
  alter table public.sv_mail_outbox add constraint sv_mail_outbox_event_type_check check (event_type in
    ('client_invited','step_changed','onboarding_completed','document_issued'));
  alter table public.sv_mail_outbox add constraint sv_mail_outbox_template_check check (template in
    ('invite','step_changed','onboarding_completed','document_issued'));
end $$;
```
Caveat: the `template` check does not contain the substring `client_invited` (it contains `invite`); match both constraints with two separate lookups (`%client_invited%` and `%'onboarding_completed'%` AND `%invite%`), or drop the default names `sv_mail_outbox_event_type_check` / `sv_mail_outbox_template_check` with `drop constraint if exists`. Verify on the branch by selecting `conname` before and after.

### Mail rule (TS)
`MAIL_EVENTS` gains `'document_issued'`; `MailTemplate` gains `'document_issued'`; `MAIL_RULES.document_issued = { template: 'document_issued', delayMs: 0, to: 'client' }`; `dedupeKey.documentIssued(documentId, email)`; `buildMail` case builds `documentIssuedEmail({ documentLabel, projectTitle, revision, portalUrl: buildPortalUrl() + '/documents' })`. French copy, no amount, no signed URL (D-04, D-15). Subject varies for replacements ("Nouvelle version : Devis"). The existing `rules.test.ts` asserts `MAIL_RULES` keys equal `MAIL_EVENTS` and all `delayMs` 0: it extends naturally.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@react-pdf/renderer` Next App Router crashes (duplicate React, bundling) | Works on Next 16 Turbopack; renderer in Next's default `serverExternalPackages` list | Next 15/16 | Spike-confirmed; keep explicit entry as guard |
| React-PDF English-only hyphenation default | Disable via `registerHyphenationCallback` | n/a | Needed for French text and extraction tests |
| E-invoicing optional | Reception mandatory 1 Sept 2026, issuance PME 1 Sept 2027 | LF 2024 art. 91, calendar confirmed 2026 | Phase 15 must plan structured invoices; phase 13 adds new mentions |

**Deprecated/outdated:**
- STACK.md's "Phase-1 spike (LOW-MEDIUM)" status: now VERIFIED; its `src/pdf/templates` location is superseded by `src/lib/documents` (price-scope whitelist).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vercel's Linux runtime renders the same as the local Windows spike (data-URI fonts, no `fs`) | Summary, Pitfall 10 | Preview-deploy smoke test would catch it; low risk, no native deps |
| A2 | Supabase Storage returns an error named `Duplicate` (HTTP 409) when `upsert:false` and the object exists; default of `upsert` is false | Pattern 5 | Docs show the `Duplicate` error name but not the default; set `upsert:false` explicitly, add an RLS-branch test that a second upload to the same path fails |
| A3 | Late-payment penalty floor = 3x legal interest rate, default = BCE rate + 10 points (L441-10 Code de commerce); 60 days max payment term | Mentions | Wrong wording on documents; seller picks the stated rate; accountant review |
| A4 | A Postgres migration run by the repo's tooling cannot create triggers/policies on `storage.objects` (owned by `supabase_storage_admin`), so DB-level storage immutability is not offered | Pattern 5 | If possible, a stricter guarantee exists, but it would touch shared Gecko-adjacent objects; not recommended anyway |
| A5 | Franchise-en-base sellers fall under the e-invoicing calendar (issuance 1 Sept 2027) | Mentions | Phase 15 scope only; official pages unreachable (403) |
| A6 | Seller is an EI ("Anatholy Bricon, Sèvalys, Tours") needing the "EI" mention; legal form, SIRET, RM/RCS, IBAN, payment terms and penalty rate are unknown | Mentions, Open Questions | Wrong or missing mentions; must be asked of the owner |
| A7 | Quote mention list (validity, payment/delivery conditions, 293 B) is correct for a B2B quote | Mentions | Minor: quotes in B2B are not legally prescribed beyond contract law |
| A8 | `pdf-lib` is not needed this phase | Standard Stack | None; phase 14 decides |

## Open Questions

1. **Replacement rule after a signing fact exists**
   - What we know: D-03/D-05 say a new document replaces the active one; D-14 derives "signé" from project-level facts.
   - What's unclear: whether replacement is allowed once `quote_accepted`/`contract_signed`/`acceptance_signed` is effective, and whether issuing is allowed only while the guard step is current.
   - Recommendation: first issue only when `currentStep === guardStep`; replacement only while the signing fact is not effective (admin revokes the fact first). Ask the owner during planning.

2. **Seller identity values (D-12)**
   - Needed: legal form (EI?), name as printed, SIRET, address, RM/RCS number or "dispensé d'immatriculation", IBAN/BIC, payment term (days), penalty rate wording, deposit default, bank details policy. Not in the repo. Planner must include a human step to collect them; the constant `SELLER_V1` and the test fixtures depend on them.

3. **Invoice in the type list**
   - Recommendation: keep `'invoice'` out of the DB check list in phase 13 (nothing is issued); phase 15 extends the closed list. The template, preview action and mention test still ship with a `PROFORMA` number.

4. **Accountant and lawyer reviews**
   - STATE.md blocker: accountant review of invoice mentions and TVA before phase 13 completes production use; legal review of the contract text before production. Plan a non-blocking review checkpoint and ship documents behind admin-only issuance until done.

5. **Node version on Vercel**
   - Local Node is 26.4; the Vercel project Node setting was not verified. React-PDF 4.9 and unpdf 1.8.1 are plain JS; confirm in the preview deploy.

6. **RLS test branch**
   - D-17 requires RLS tests on a dedicated Supabase branch; the 11-01 branch was to be deleted in 11-17 and phase 12 created its own. Confirm which branch is live before the `documents.rls.test.ts` plan.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build, tests | yes | 26.4.0 | Vercel Node setting to verify |
| npm | install | yes | bundled | — |
| Vitest | tests | yes | 4.1.11 (repo) | — |
| Next.js | build | yes | 16.1.6 (repo) | — |
| `@react-pdf/renderer`, `unpdf` | render/test | no (not installed yet) | 4.9.0 / 1.8.1 on registry | Plan 1 installs; spike proven in scratch |
| slopcheck | package audit | yes (pip) | 5.3.0 | — |
| Supabase RLS test branch + `.env.test.local` | `npm run test:rls` | not verified (gitignored) | — | Static SQL tests run offline; RLS suite needs the branch (Open Question 6) |
| Resend API key / prod mail | e-mail send | existing | — | Outbox keeps `pending`/`failed` rows; cron retries |
| Vercel preview deploy | final smoke | not verified | — | Local `next build && next start` (done in spike) |

**Missing dependencies with no fallback:** none
**Missing dependencies with fallback:** RLS test branch (static migration tests + manual SQL on the branch)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11, `environment: 'node'` |
| Config file | `vitest.config.ts` (include `src/**/*.test.ts`, aliases `@`, `server-only` stub); RLS: `vitest.rls.config.ts` (`tests/rls/**/*.rls.test.ts`, branch env `SV_TEST_`) |
| Quick run command | `rtk vitest run src/lib/documents` |
| Full suite command | `rtk npm test` (and `rtk npm run test:rls` on the branch) |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOC-01 | Each template renders a valid PDF (`%PDF-` header, extract non-empty) from a snapshot | unit | `rtk vitest run src/lib/documents/render.test.ts` | Wave 0 |
| DOC-01 | Totals/deposit/balance in integer cents, half-up, no TVA | unit | `rtk vitest run src/lib/documents/money.test.ts` | Wave 0 |
| DOC-01 | Step guard + prerequisites (contract needs active quote, PV needs spec) | unit | `rtk vitest run src/lib/documents/steps.test.ts` | Wave 0 |
| DOC-01 | Admin actions: `requireAdmin` first, zod, access check, preview writes nothing | unit (mock) | `rtk vitest run src/app/admin/projets/documents.actions.test.ts` | Wave 0 |
| DOC-02 | Upload uses `upsert:false`, hashes the uploaded buffer, path random, RPC args frozen | unit (mock) | `rtk vitest run src/lib/server/documents/issue.test.ts` | Wave 0 |
| DOC-02 | Migration: append-only triggers on both tables, no `storage.objects`, no cascade/set null, bucket private, RPC service_role only, partial unique indexes | static SQL | `rtk vitest run src/lib/migrationLint.test.ts src/lib/documentsMigration.test.ts` | Wave 0 (extend `APPEND_ONLY_TABLES`) |
| DOC-02 | On the branch: UPDATE/DELETE/TRUNCATE denied; second upload to same path fails; replacement race yields one head; client A cannot read B's rows; anon/Gecko user empty; snapshot admin-only; `storage_path` column not selectable by authenticated | RLS integration | `rtk npm run test:rls -- documents` | Wave 0 (`tests/rls/documents.rls.test.ts`) |
| DOC-03 | `documentStatus` matrix over facts incl. revoked facts and replaced | unit | `rtk vitest run src/lib/documents/status.test.ts` | Wave 0 |
| DOC-03 | Portal Documents page: no price tokens, replaced shown in retrait, download via signed action | unit (source/mocks) | `rtk vitest run src/components/portal/project/documentsPage.test.ts` | Wave 0 (+ update `portalPage.test.ts` nav assertion) |
| DOC-04 | Mentions present in extracted text of a real quote and invoice, all variants | integration (real render) | `rtk vitest run src/lib/documents/legalMentions.test.ts` | Wave 0 |
| DOC-04 | Non-vacuity: removing one mention makes the check fail | unit | same file | Wave 0 |
| MAIL (D-04) | `document_issued` in `MAIL_EVENTS`/rules/constraints, key unique per doc+email, no price in mail | unit + static SQL | `rtk vitest run src/lib/server/mail` | extend `rules.test.ts`, add `documentIssuedEmail.test.ts` |

### Sampling Rate
- **Per task commit:** `rtk vitest run src/lib/documents` plus the touched file's test
- **Per wave merge:** `rtk npm test`
- **Phase gate:** full suite green, RLS suite green on the branch, then `/gsd:verify-work`; manual: issue and download one document with the permanent "Test E2E Sèvalys" client on a preview deploy

### Wave 0 Gaps
- [ ] Install `@react-pdf/renderer@4.9.0` and `unpdf@1.8.1` (dev); `fontData.ts` generation script (`gen:fonts` or one-off)
- [ ] `src/lib/documents/legalMentions.test.ts`, `render.test.ts`, `money.test.ts`, `status.test.ts`, `steps.test.ts`
- [ ] `src/lib/documentsMigration.test.ts` (static) and `tests/rls/documents.rls.test.ts`
- [ ] Update `migrationLint.test.ts` `APPEND_ONLY_TABLES`, `portalPage.test.ts` (Documents tab), `rules.test.ts`
- [ ] `next.config.ts`: add `serverExternalPackages: ['@react-pdf/renderer']` (explicit guard)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (existing OTP/magic link) | unchanged |
| V3 Session Management | no | unchanged (`requireAdmin`/`requireClient`) |
| V4 Access Control | yes | RLS on both tables (client: own projects; snapshot: admin only), `requireAdmin()` before any service_role call, signed URLs only after an RLS read; no `storage.objects` policy |
| V5 Input Validation | yes | zod per document type (lengths, integer cents, quantities, line count cap), server recomputes totals, `documentId` must be uuid |
| V6 Cryptography | yes | `node:crypto` SHA-256, `randomUUID` for paths; never hand-rolled |
| V8 Data Protection | yes | private bucket, no stored URLs, short-lived signed URL (120 s), `Content-Disposition: attachment`, no amounts in e-mails |
| V12 Files | yes | bucket `allowed_mime_types = application/pdf`, 10 MB limit, server-generated filename (never user input) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Client reads another client's document | Information disclosure | RLS `project_id in (select sv_private.project_ids())`; RLS suite A vs B; signed URL only after RLS row read |
| Overwrite or delete of an issued PDF | Tampering | `upsert:false`, random path, row trigger, hash stored, admin hash-verify |
| Tampered row (hash/snapshot edited) | Tampering | `deny_mutation` on update/delete/truncate; `service_role` has select+insert only (no update grant) |
| Guessable path | Information disclosure | v4 UUID in path, private bucket without policies |
| Injection in PDF text (very long strings, control chars) | Tampering/DoS | zod length caps, strip control characters, line cap; React-PDF has no HTML/script execution |
| Admin action called by a non-admin | Elevation of privilege | `requireAdmin()` first in each action, then access check |
| Double submit creates duplicate versions | Repudiation | `documentId` as PK idempotency key |
| PII/amounts in logs or mail | Information disclosure | generic `console.error('[documents/issue] ...')` codes only, as existing modules |

## Sources

### Primary (HIGH confidence)
- Spike runs in this session (scratch project, not committed): `@react-pdf/renderer@4.9.0` + `next@16.1.6` Turbopack production build + `babel-plugin-react-compiler@1.0.0` + `serverExternalPackages` + data-URI WOFF fonts returned HTTP 200 `%PDF-1.3` from `next start`; Vitest 4.1.11 + `unpdf@1.8.1` extraction on Windows/Node 26.4; hyphenation, U+202F and non-determinism findings
- `node_modules/next/dist/lib/server-external-packages.jsonc` (in the spike install): `@react-pdf/renderer` is in the default list
- npm registry (`npm view`, downloads API), slopcheck 5.3.0 scan
- Repo code read: `20261004000000_sv_projects_engine.sql`, `src/lib/server/projects/{facts,files,read,access}.ts`, `src/lib/server/mail/{rules,outbox}.ts`, `src/lib/projects/steps.ts`, `src/lib/priceScope.ts`, `migrationLint.test.ts`, `projectsMigration.test.ts`, `ClientNav.tsx`, `portalPage.test.ts`, admin `[id]/page.tsx` and `actions.ts`, `espace-client/page.tsx`

### Secondary (MEDIUM confidence)
- https://entreprendre.service-public.gouv.fr/vosdroits/F31808 (invoice mentions incl. 293 B, escompte néant, 40 €, new mentions from 1 Sept 2026) via WebFetch summary
- https://entreprendre.service-public.gouv.fr/actualites/A15744 (EI mention) via search result
- https://supabase.com/docs/reference/javascript/storage-from-upload (upload options; `Duplicate` error name)
- Calendar summaries: economie.gouv.fr news results; cegid, indy, b2brouter, kanta pages (e-invoicing 1 Sept 2026 / 2027)

### Tertiary (LOW confidence)
- Penalty-rate floor and 60-day ceiling from law-firm summaries (kohenavocats.fr, encaiz.fr): to confirm with the accountant
- Franchise-en-base e-invoicing applicability: abby.fr, professionnels.sg.fr search summaries (official pages returned 403)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, executed spikes cover Next 16 build, Vitest, Windows; only Vercel Linux untested
- Architecture: HIGH, extends existing phase 10-12 patterns (append-only triggers, RPC, outbox, signed URLs)
- Pitfalls: HIGH for the three spike-verified ones; MEDIUM for storage/race semantics (to be proven by the RLS branch tests)
- Legal mentions: MEDIUM, official page via summary, accountant/lawyer review still pending (STATE.md blockers)

**Research date:** 2026-10-03
**Valid until:** 2026-11-02 (stack stable; legal/e-invoicing calendar re-check before phase 15)
