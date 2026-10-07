# Phase 17: Admin forecast dashboard - Pattern Map

**Mapped:** 2026-10-07
**Files analyzed:** 22 (new) + 1 modified
**Analogs found:** 22 / 22 (le module d'agrégation pur et le SVG n'ont qu'un analog partiel)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/20261009000000_sv_pilotage.sql` | migration | CRUD (append-only) + RPC | `supabase/migrations/20261007000000_sv_invoices.sql` (tables) + `20261003010000_sv_consent_funnel.sql` (RPC `sv_upsert_acquisition_cost`) + `20261004000000_sv_projects_engine.sql` (void via `fact_revoked`) | exact |
| `src/lib/pilotageMigration.test.ts` | test | transform (lint statique) | `src/lib/paymentsMigration.test.ts` | exact |
| `src/lib/server/pilotage/load.ts` | service | request-response (lectures RLS) | `src/lib/server/invoices/adminView.ts` (helper `read`) + `src/lib/server/documents/read.ts` | exact |
| `src/lib/server/pilotage/load.test.ts` + test de grants | test | transform | `src/lib/server/invoices/columnGrants.test.ts` | exact |
| `src/lib/server/pilotage/periods.ts` | utility | transform | `src/lib/documents/dates.ts` (`parisDateOf`) + `monthRange` dans `src/lib/admin/funnel.ts` | role-match |
| `src/lib/server/pilotage/quotes.ts` | service (pur) | transform | `src/lib/documents/steps.ts` (`chainHeads`) + `effective()` de `adminView.ts` | role-match |
| `src/lib/server/pilotage/billing.ts` | service (pur) | transform | `src/lib/documents/invoiceMath.ts` (`billingSummary`, `amountDueCents`) + `invoiceStatus.ts` | role-match |
| `src/lib/server/pilotage/costs.ts` | service (pur) | transform | `src/lib/admin/funnel.ts` (module pur testable) | partial |
| `src/lib/server/pilotage/forecast.ts` | service (pur) | transform | `src/lib/documents/invoiceMath.ts` | partial |
| `src/lib/server/pilotage/attribution.ts` | service (pur) | transform | `groupFunnelRows` dans `src/lib/admin/funnel.ts` | role-match |
| `src/lib/server/pilotage/adminCosts.ts` | service | CRUD (RPC service_role) | `src/lib/server/rpc.ts` (`callRpc`) ; variante locale `src/lib/server/leads/admin.ts` | exact |
| `src/lib/server/pilotage/*.test.ts` | test | transform | `src/lib/server/invoices/adminView.test.ts`, `src/lib/admin/funnel.test.ts` | role-match |
| `src/app/admin/pilotage/page.tsx` | page (RSC) | request-response | `src/app/admin/entonnoir/page.tsx` | exact |
| `src/app/admin/pilotage/couts/page.tsx` | page (RSC) | request-response + formulaires | `src/app/admin/entonnoir/page.tsx` | role-match |
| `src/app/admin/pilotage/couts/actions.ts` (+ `actions.test.ts`) | controller (server action) | request-response | `src/app/admin/entonnoir/actions.ts` + `actions.test.ts` | exact |
| `src/lib/admin/costSchemas.ts` (zod, hors chiffrage) ou schémas dans `couts/actions.ts` | utility | transform | `costSchema` dans `src/lib/admin/leadSchemas.ts` | exact |
| `src/components/admin/AdminNav.tsx` (modif) | component | n/a | lui-même | exact |
| `src/components/admin/pilotage/PilotageKpis.tsx` | component | transform | `src/components/admin/funnel/FunnelKpis.tsx` | exact |
| `src/components/admin/pilotage/*Table.tsx` | component | transform | `src/components/admin/funnel/FunnelTable.tsx` | role-match |
| `src/components/admin/pilotage/TreasuryChart.tsx` | component | transform (SVG serveur) | aucun | no analog |
| `src/components/admin/pilotage/CostForms.tsx` (use client) | component | request-response | `src/components/admin/funnel/CostEditor.tsx` | exact |
| `src/components/admin/pilotage/StopRecurringPanel.tsx`, `VoidCostPanel.tsx` | component | request-response | `src/components/admin/projects/RevokePanel.tsx` | exact |
| `src/components/admin/pilotage/pilotage.css` | config (CSS) | n/a | `src/components/admin/funnel/funnel.css` | exact |
| `tests/rls/pilotage.rls.test.ts` | test | CRUD | `tests/rls/payments.rls.test.ts` (helpers `makeAdmin`, `svc`, `dbQuery`, ...) | exact |

## Pattern Assignments

### `supabase/migrations/20261009000000_sv_pilotage.sql` (migration, append-only CRUD)

**Analogs:** `20261007000000_sv_invoices.sql` lignes 211-244 (table append-only) ; `20261003010000_sv_consent_funnel.sql` lignes 189-221 (RPC) ; `20261004000000_sv_projects_engine.sql` lignes 70-92 et 500-535 (annulation par ligne cible).

**Table : RLS, revoke puis grant, politique admin, triggers** (invoices.sql 211-244, à adapter : politique `is_admin()` seule, pas de `project_ids()`) :
```sql
alter table public.sv_invoices enable row level security;
revoke all on public.sv_invoices from anon, authenticated, service_role;
grant select (...) on public.sv_invoices to authenticated;
grant select on public.sv_invoices to service_role;

drop policy if exists sv_invoices_read on public.sv_invoices;
create policy sv_invoices_read on public.sv_invoices
  for select to authenticated
  using ((select sv_private.is_admin()));

drop trigger if exists sv_invoices_no_upd_del on public.sv_invoices;
create trigger sv_invoices_no_upd_del
  before update or delete on public.sv_invoices
  for each row execute function sv_private.deny_mutation();

drop trigger if exists sv_invoices_no_truncate on public.sv_invoices;
create trigger sv_invoices_no_truncate
  before truncate on public.sv_invoices
  for each statement execute function sv_private.deny_mutation();
```
Aucun `grant insert` pour `authenticated` ni `service_role` : l'ajout passe par RPC.

**Annulation par ligne cible** (projects_engine.sql 70-85, 512-535 : contrainte `check ((type='fact_revoked') = (target_fact_id is not null))`, FK `on delete restrict`, vérifications de cible dans la RPC) : copier le schéma pour `sv_project_costs.voids_cost_id` (cible existante, même projet, non déjà annulée, pas d'annulation d'annulation) :
```sql
select * into v_target from public.sv_project_facts
where id = p_target_fact_id and project_id = p_project_id and type <> 'fact_revoked';
if not found then raise exception 'sv_invalid_target' using errcode = 'P0001'; end if;
if exists (select 1 from public.sv_project_facts r where r.target_fact_id = v_target.id) then
  raise exception 'sv_fact_already_revoked' using errcode = 'P0001';
end if;
```

**RPC `security definer`** (consent_funnel.sql 189-221) :
```sql
create or replace function public.sv_upsert_acquisition_cost(p_source text, ..., p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if ... then raise exception 'sv_invalid_reason' using errcode = 'P0001'; end if;
  insert into public.sv_acquisition_costs (...) values (...);
end;
$$;
revoke all on function public.sv_upsert_acquisition_cost(text, text, date, integer, uuid) from public, anon, authenticated;
grant execute on function public.sv_upsert_acquisition_cost(text, text, date, integer, uuid) to service_role;
```
Ne PAS imiter le `on conflict ... do update` : le cost de l'entonnoir est un upsert, la phase 17 est en ajout seul (RESEARCH, State of the Art). Codes d'erreur `sv_*` obligatoires (convertis par `callRpc`). Les 3 RPC proposées : `sv_add_recurring_cost` (nouvelle série ou nouvelle version avec `series_id`, arrêt via `stopped`), `sv_add_project_cost` (+ variante void), `sv_add_cash_balance`.

### `src/lib/pilotageMigration.test.ts` (test, lint statique)

**Analog:** `src/lib/paymentsMigration.test.ts` lignes 1-35 : lecture du fichier, `stripComments`, helper `fnBody(name)`, test d'ordre des migrations. Reprendre tel quel avec `NAME = '20261009000000_sv_pilotage.sql'` ; assertions : 3 tables RLS + revoke + triggers `deny_mutation` (UPDATE/DELETE et TRUNCATE), RPC `revoke ... from public, anon, authenticated` + `grant execute ... to service_role` + `set search_path = ''`, aucun `grant insert|update|delete` sur les 3 tables, FK `on delete restrict`. Les règles globales sont aussi imposées par `src/lib/migrationLint.test.ts`.

---

### `src/lib/server/pilotage/load.ts` (service, lectures RLS)

**Analog:** `src/lib/server/invoices/adminView.ts` lignes 1-15, 58-80 et `src/lib/server/documents/read.ts` lignes 1-25.

**Imports + en-tête de précondition** (adminView.ts 1-13) :
```typescript
// PRECONDITION : l'appelant a déjà passé requireAdmin() et fournit le client RLS de l'admin.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
```

**Helper de lecture avec erreur typée, jamais un total partiel** (adminView.ts 62-75) :
```typescript
async function read(run: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<Row[]> {
  let res;
  try { res = await run(); }
  catch { console.error('[invoices/adminView] read failed'); throw new InvoicesLoadError(); }
  if (res.error) { console.error('[invoices/adminView] read failed'); throw new InvoicesLoadError(); }
  return (res.data ?? []) as Row[];
}
```
Créer `PilotageLoadError` sur le patron de `InvoicesLoadError` (read.ts 47-53) / `DocumentsLoadError`. Lecture en parallèle : `Promise.all([...])` (adminView.ts 90-94).

**Colonnes explicites accordées** (read.ts 44-45) : `INVOICE_COLS` est déjà exportée et testée comme sous-ensemble du grant ; elle contient `issued_on, due_date, total_incl_tax_cents, net_to_pay_cents, credits_invoice_id, is_test, kind, number, project_id`. Ajouter `total_excl_tax_cents, vat_total_cents, prepaid_cents, vat_regime, client_id` si besoin HT (tous dans le grant, invoices.sql 213-224). Colonnes du journal de paiements pour `authenticated` : `id, invoice_id, kind, amount_cents, method, occurred_at` seulement (payments.sql 177).

**ATTENTION, divergence avec RESEARCH :** RESEARCH recommande le client RLS pour le journal de paiements ; `adminView.ts` (3-5, 99-115) utilise `createSupabaseAdminClient()` car il lit `payment_intent_id`, `livemode`, `client_id`. Pour le dashboard, les 6 colonnes accordées suffisent (résolution du remboursement par `invoice_id`), donc rester sur le client RLS. Le fichier de grants (`columnGrants.test.ts`) ne couvre que sa liste `FILES` : y ajouter `../pilotage/load.ts`, ou copier le test pour le nouveau dossier.

**Devis actif en lot** : `chainHeads(docs: ChainDoc[])` (steps.ts 34-44) travaille sur une liste `ChainDoc { id, docType, revision, replacesDocumentId, issuedAt }` ; l'appeler projet par projet. `DOCUMENT_COLS` (read.ts 15-16) contient `storage_path`-free colonnes ; pour le dashboard une sélection plus courte `id, project_id, doc_type, revision, reference, replaces_document_id, issued_at` suffit.

---

### `src/lib/server/pilotage/{quotes,billing,costs,forecast,attribution,periods}.ts` (modules purs)

**Analogs:** `src/lib/documents/invoiceMath.ts`, `invoiceStatus.ts`, `steps.ts`, `dates.ts`, `src/lib/admin/funnel.ts`.

**Conventions à copier**
- En-tête de module pur : `// Module pur, sûr côté client. Montants en centimes entiers.` ; aucune horloge (injecter `now`), aucun `Intl` pour les montants (invoiceMath.ts 1-2).
- Garde entier sûr (invoiceMath.ts 46-48) :
```typescript
function requireCents(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("invalid_amount");
}
```
- Facturé : formule existante de `billingSummary` (invoiceMath.ts 155-186) : net à payer moins avoirs ; `amountDueCents(netToPayCents, creditedCents)` = `Math.max(0, net - credited)` (156-158). Réutiliser, ne pas réécrire.
- Statut de facture : `invoiceStatus({ totalInclTaxCents, creditedCents, events })` (invoiceStatus.ts 22-26) renvoie `{ status, paidAt, ... }`; filtrer les impayées de la projection sur `status` hors `paid|credited|refunded` (pattern adminView.ts 219).
- Fait effectif (adminView.ts 77-80), à extraire en fonction partagée plutôt que dupliquer :
```typescript
function effective(facts, type) {
  const revoked = new Set(facts.filter((f) => f.type === 'fact_revoked').map((f) => f.targetFactId));
  return facts.some((f) => f.type === type && !revoked.has(f.id));
}
```
  Pour `quotes.ts` il faut la date : retourner le `occurred_at` du `contract_signed` effectif le plus récent.
- Dates : `parisDateOf(d: Date)` (dates.ts 19-28) pour passer un `occurred_at` en `YYYY-MM-DD` Paris ; mois en chaîne `YYYY-MM`, jamais `getMonth()`. Utiliser `issued_on` (date SQL) pour les factures.
- `formatEuros(cents)` / `toCents(input)` (money.ts 7-13, 43-49) pour tout affichage et saisie. Rappel : `formatEuros` met le signe `-` ASCII ; UI-SPEC exige « − » U+2212 pour les négatifs : wrapper d'affichage local, ne pas modifier `money.ts` (utilisé par les PDF).
- Drill-down : chaque fonction renvoie `{ totalCents, items[] }` et `totalCents = Σ items` (RESEARCH Pattern 8), garantie de concordance D-04.
- Remboursement : par facture, `max(amount_cents)` des lignes `refunded`, jamais la somme (cumulatif). Aucun analog dans le code (voir « No Analog Found »).

---

### `src/lib/server/pilotage/adminCosts.ts` (service, RPC service_role)

**Analog:** `src/lib/server/rpc.ts` (25 lignes, `callRpc`) ; usage de style wrapper dans `src/lib/server/leads/admin.ts` 33-45.

**Core pattern** (rpc.ts 1-25) :
```typescript
import 'server-only';
import { callRpc } from '@/lib/server/rpc';
// callRpc(scope, fn, args) -> { ok: true, data } | { ok: false, code }  (code = 'sv_*' ou 'unknown', aucun PII loggé)
export function addProjectCost(a: {...}) {
  return callRpc('pilotage/costs', 'sv_add_project_cost', {
    p_project_id: a.projectId, p_incurred_on: a.incurredOn, p_category: a.category,
    p_label: a.label, p_amount_cents: a.amountCents, p_vat_cents: a.vatCents ?? null, p_actor: a.actor,
  });
}
```
Préférer `callRpc` (plus court, retourne les mêmes codes) à la copie locale `call()` de `leads/admin.ts`.

---

### `src/app/admin/pilotage/page.tsx` et `couts/page.tsx` (page RSC)

**Analog:** `src/app/admin/entonnoir/page.tsx`.

**Imports / garde / métadonnées** (lignes 1-22) :
```typescript
import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { requireAdmin } from '@/lib/server/auth/dal';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';
import '@/components/admin/funnel/funnel.css';   // réutilisé : .pt-funnel-kpis, .pt-seg, .pt-funnel-controls
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pilotage' };
```
Ajouter `import '@/components/admin/pilotage/pilotage.css'`.

**searchParams en liste blanche** (lignes 24-34, 64-68) :
```typescript
type SearchParams = Record<string, string | string[] | undefined>;
function one(v: string | string[] | undefined): string | undefined { return Array.isArray(v) ? v[0] : v; }
const PAR: Record<string, GroupBy> = { source: 'source', ... };
const parKeyValid = Object.prototype.hasOwnProperty.call(PAR, parKey) ? parKey : 'tout';
```
Appliquer à `periode`, `base`, `tests`, `detail`, `cle`, `page` : défauts `mois`, `ttc`, `0`.

**Garde et gabarit** (lignes 57-64, 100-109) :
```typescript
export default async function AdminFunnelPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { supabase } = await requireAdmin();   // client RLS, jamais service_role
  const sp = await searchParams;
  ...
  <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
  <ShellMain width="admin">
    <div className="pt-admin" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <AdminNav current="pilotage" />
      <section className="pt-card" aria-labelledby="funnel-title">
        <h1 id="funnel-title" className="pt-heading" style={{ marginBottom: 24 }}>
```
**Formulaire GET avec segments** (lignes 111-141) : `<form method="get" className="pt-funnel-controls"><fieldset className="pt-seg"><legend>…</legend><label><input type="radio" name="par" value=… defaultChecked=… />…</label></fieldset> … <button type="submit" className="pt-btn-ghost">Appliquer</button></form>`.
**État vide** (142-149) : `<div className="pt-empty"><h2 className="pt-heading">…</h2><p className="pt-helper">…</p></div>`.

**Différence à implémenter** : l'entonnoir ne gère pas l'échec de lecture (`data ?? []`). Pour le pilotage, attraper `PilotageLoadError` et rendre l'état « Chiffres indisponibles » (UI-SPEC), jamais « 0 € ».
`couts/page.tsx` : même gabarit, `current="pilotage"`, lien `pt-back` « Retour au pilotage ».

---

### `src/app/admin/pilotage/couts/actions.ts` (server action)

**Analog:** `src/app/admin/entonnoir/actions.ts` (38 lignes), test `actions.test.ts` (74 lignes).

**Pattern complet** (actions.ts 1-38) :
```typescript
'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
export type CostActionState = { status: 'idle' | 'success' | 'error'; message?: string };

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}
export async function saveCostAction(_prev: CostActionState, formData: FormData): Promise<CostActionState> {
  const { user } = await requireAdmin();                       // dans CHAQUE action
  const parsed = costSchema.safeParse({ source: str(formData, 'source'), ... });
  if (!parsed.success) return { status: 'error', message: ADMIN_COPY.costInvalid };
  const res = await upsertAcquisitionCost(source, campaign, month, cents, user.id);
  if (!res.ok) return { status: 'error', message: ADMIN_COPY.genericError };
  revalidatePath('/admin/entonnoir');
  return { status: 'success', message: ... };
}
```
Une action par formulaire (`saveBalanceAction`, `addRecurringCostAction`, `addProjectCostAction`, `stopRecurringAction`, `voidProjectCostAction`). Mapper les codes `sv_*` de la RPC vers les messages UI-SPEC (projet inconnu, date absurde, etc.), `revalidatePath('/admin/pilotage')` et `'/admin/pilotage/couts'`.

**Validation zod** (leadSchemas.ts 56-76 `costSchema`) : `z.string().trim().regex(/^\d+([.,]\d{1,2})?$/)` puis `.transform` en centimes avec `ctx.addIssue({ code: 'custom' })` / `z.NEVER`. Préférer `toCents()` de `money.ts` (gère espaces et virgule) plutôt que `Math.round(Number(x)*100)`. Le solde de départ doit accepter un négatif (regex à part).

**Test** (actions.test.ts 1-74) : mocks `vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }))`, mock du wrapper, `vi.mock('next/cache', ...)`, `const { saveCostAction } = await import('./actions')`, helper `form(fields)`, tests : rejet de `requireAdmin` propagé sans appel au wrapper, ordre d'appel (`invocationCallOrder`), montant 0 rejeté, `'12,5'` stocké `1250`, erreur wrapper vers message générique.

---

### `src/components/admin/AdminNav.tsx` (modification)

**Analog:** lui-même, lignes 4-12 :
```typescript
export type AdminNavItem = 'clients' | 'leads' | 'projets' | 'entonnoir' | 'emails';   // + 'pilotage'
const ITEMS = [ ..., { key: 'entonnoir', href: '/admin/entonnoir', label: 'Entonnoir' },
                { key: 'emails', href: '/admin/emails', label: 'E-mails' } ];   // + { key: 'pilotage', href: '/admin/pilotage', label: 'Pilotage' }
```
Ajouter un test de navigation si un test existant énumère les items (vérifier `grep AdminNav` dans les `*.test.ts`).

---

### `src/components/admin/pilotage/PilotageKpis.tsx` (component, tuiles)

**Analog:** `src/components/admin/funnel/FunnelKpis.tsx` (lignes 1-38) : `div.pt-funnel-kpis > div.pt-funnel-kpi > span.pt-funnel-kpi-label + span.pt-funnel-kpi-value`. Étendre : valeur = `<a>` vers `?detail=…#detail` avec `aria-label` « {Libellé} : {montant}. Voir le détail », règle 14px `--ink-dim` sous la valeur. Ne pas copier `new Intl.NumberFormat('fr-FR')` pour les euros : utiliser `formatEuros`. Classes CSS déjà dans `funnel.css` 1-35.

### `src/components/admin/pilotage/*Table.tsx` (tableaux source/projet/détail)

**Analog:** `src/components/admin/funnel/FunnelTable.tsx` (non lu en détail ; le lire avant d'implémenter pour reprendre `.pt-table` / `data-label`). Cellule projet = lien vers `/admin/projets/{id}`.

### `src/components/admin/pilotage/CostForms.tsx` et panneaux (`'use client'`)

**Analog formulaires:** `src/components/admin/funnel/CostEditor.tsx` lignes 1-81 :
```typescript
'use client';
import { useActionState, useRef, useState } from 'react';
import { saveCostAction, type CostActionState } from '@/app/admin/entonnoir/actions';
const INITIAL: CostActionState = { status: 'idle' };
const [state, formAction, pending] = useActionState(saveCostAction, INITIAL);
<form action={formAction} className="pt-lead-panel"> ... <label htmlFor={id} className="pt-lead-label"> ...
<button type="submit" className="pt-btn-primary" disabled={pending}>
<p aria-live="polite" className={state.status === 'error' ? 'pt-error' : 'pt-success'}>{state.message ?? ''}</p>
```
**Analog confirmation destructive en ligne:** `src/components/admin/projects/RevokePanel.tsx` lignes 23-75 : `useActionState(async (prev, fd) => action(prev, fd), INITIAL)`, `useEffect` qui appelle `onClose` sur `success`, champs cachés (`projectId`, `factId`), bouton de confirmation `style={{ color: 'var(--warm)', borderColor: 'var(--warm)' }}`, bouton `pt-btn-text` pour annuler, `aria-live="polite"` autour de l'erreur. Réutiliser pour « Arrêter la charge » (champ « À partir du mois ») et « Annuler ce coût » (sans motif, contrairement à RevokePanel qui exige 10 car.). Note : UI-SPEC demande le focus par défaut sur « Garder » ; RevokePanel ne le fait pas.

### `src/components/admin/pilotage/pilotage.css`

**Analog:** `src/components/admin/funnel/funnel.css` : toutes les règles sous `.pt-admin`, préfixe de classe propre (`pt-pilot-`), valeurs en multiples de 4, `var(--font-mono)`, `var(--pt-border-strong, #6f6b64)`.

### `tests/rls/pilotage.rls.test.ts`

**Analog:** `tests/rls/payments.rls.test.ts` lignes 1-40 : imports depuis `./helpers` (`makeAdmin`, `makeUser`, `makeClient`, `makeProject`, `svc`, `dbQuery`, `cleanup`, `anonClient`, `setClientTest`, `issueTestInvoice`, `applyTestEvent`, `reachContractSigned`...), `beforeAll`/`afterAll` avec `cleanup`. Utiliser le client de test permanent pour la concordance (jamais supprimé). Cas : UPDATE/DELETE/TRUNCATE refusés même `service_role`, `authenticated` non admin ne lit rien, anon refusé, RPC refuse montant <= 0 / projet inconnu / double annulation.

### `src/lib/server/pilotage/load.test.ts` (grants)

**Analog:** `src/lib/server/invoices/columnGrants.test.ts` lignes 8-26 (`grantsFor(table)` parse `grant select (...) on public.<table> to authenticated`), 50-66 (`rlsSelects` repère `.from('sv_x').select('...')` ou constante, ignore `createSupabaseAdminClient()`), 91-101 (boucle sur une liste `FILES`). Concaténer la nouvelle migration `20261009000000_sv_pilotage.sql` à `migrations` (ligne 10-12) pour couvrir les 3 nouvelles tables. Limite : le regex ne reconnaît que `.from('...')\s*.select(` avec littéral ou constante `const X = '...'`, donc pas de `select(\`...${x}\`)`.

## Shared Patterns

### Garde admin (page ET action)
**Source:** `src/lib/server/auth/dal.ts` (`requireAdmin()`), usage `entonnoir/page.tsx` 63 et `entonnoir/actions.ts` 20.
**Apply to:** `pilotage/page.tsx`, `couts/page.tsx`, toutes les actions de `couts/actions.ts`.
```typescript
const { supabase } = await requireAdmin();   // pages : client RLS
const { user } = await requireAdmin();        // actions : user.id passé en p_actor
```

### Écritures service_role confinées
**Source:** `src/lib/server/rpc.ts`
**Apply to:** `adminCosts.ts` uniquement (`import 'server-only'`). Les lectures du dashboard n'importent jamais `createSupabaseAdminClient`.

### Erreur de lecture typée, jamais zéro silencieux
**Source:** `src/lib/server/invoices/read.ts` 47-53 (`InvoicesLoadError`), `adminView.ts` 62-75.
**Apply to:** `load.ts` et les pages (état d'erreur UI-SPEC).

### Montants en centimes entiers, format fr
**Source:** `src/lib/documents/money.ts` (`toCents`, `formatEuros`), `invoiceMath.ts` (`requireCents`).
**Apply to:** tout le code chiffré ; jamais de flottants ni d'`Intl` pour les euros ; `Number()` puis `Number.isSafeInteger` sur les `bigint` PostgREST.

### Zones de prix autorisées
**Source:** `src/lib/priceScope.ts` : seuls `src/lib/server`, `src/components/admin`, `src/app/admin` sont autorisés. Ne pas créer `src/lib/pilotage/` ni mettre de chiffrage dans `src/lib/admin/` (les schémas zod de formulaire sans montants en dur peuvent y vivre comme `leadSchemas.ts`, mais par prudence les placer sous `src/lib/server/pilotage/`).

### Migrations en ajout seul
**Source:** `20261007000000_sv_invoices.sql` 211-244 + `src/lib/migrationLint.test.ts`.
**Apply to:** les 3 tables : RLS + `revoke all` + `grant select` + politique `is_admin()` + deux triggers `deny_mutation` + FK `on delete restrict` + aucun FK vers `auth.users` (`created_by uuid null` sans FK).

### Fuseau et dates
**Source:** `src/lib/documents/dates.ts` `parisDateOf` (19-28).
**Apply to:** `periods.ts`, `quotes.ts`, `billing.ts`, `forecast.ts`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/admin/pilotage/TreasuryChart.tsx` | component | transform | Aucun SVG ni graphique dans le dépôt ; suivre UI-SPEC (viewBox 720x240, `role="img"`, `<title>`/`<desc>`, table équivalente visible) |
| Règle remboursement cumulatif (`max` par facture) dans `billing.ts` | utility | transform | `invoiceStatus` ne calcule pas de montant remboursé ; `refunded` est un simple indicateur de statut (invoiceStatus.ts 31). Écrire + tester avec 2 événements (30 puis 50 => 50) |
| Dépliage mensuel/annuel des coûts récurrents, versions par série | utility | transform | Aucun module de récurrence existant ; suivre le code d'exemple de RESEARCH (`effectiveVersionFor`) |
| Signé à date avec deltas d'avenant | utility | transform | Aucun calcul daté de devis ; `chainHeads` ne donne que la tête actuelle, pas l'état à `t0` : filtrer `issuedAt <= t0` soi-même |
| Projection de trésorerie 6 mois | utility | transform | Aucun équivalent (`billingSummary` n'est ni daté ni mensuel) |

## Metadata

**Analog search scope:** `src/app/admin/`, `src/components/admin/`, `src/lib/server/{invoices,documents,leads}`, `src/lib/documents`, `src/lib/admin`, `supabase/migrations/`, `tests/rls/`
**Files scanned:** ~25 lus ou parcourus par grep
**Pattern extraction date:** 2026-10-07
