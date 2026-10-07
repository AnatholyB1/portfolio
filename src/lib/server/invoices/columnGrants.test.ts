import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Garde : les lectures faites par le client RLS (rôle `authenticated`) ne demandent que des colonnes accordées par
// `grant select (...)`. Une colonne non accordée fait échouer toute la requête en production (permission denied), ce que
// ni les tests unitaires (client simulé) ni les suites RLS ne détectent quand le chargeur n'y est pas exécuté.
// Les lectures service_role (createSupabaseAdminClient) ne sont pas concernées et sont ignorées.
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');

const migrations =
  read('../../../../supabase/migrations/20261004000000_sv_projects_engine.sql') +
  read('../../../../supabase/migrations/20261005000000_sv_documents.sql') +
  read('../../../../supabase/migrations/20261007000000_sv_invoices.sql') +
  read('../../../../supabase/migrations/20261007010000_sv_payments.sql') +
  read('../../../../supabase/migrations/20261009000000_sv_pilotage.sql');

/** Colonnes accordées à `authenticated` : Set de colonnes, `'all'` si toute la table, `undefined` si hors migrations de la phase. */
function grantsFor(table: string): Set<string> | 'all' | undefined {
  const re = new RegExp(
    `grant select\\s*(?:\\(([^)]*)\\))?\\s*on\\s+public\\.${table}\\s+to\\s+([a-z_, ]+);`,
    'gi',
  );
  let found: Set<string> | 'all' | undefined;
  for (const m of migrations.matchAll(re)) {
    if (!/\bauthenticated\b/.test(m[2])) continue;
    found = m[1]
      ? new Set(m[1].split(',').map((c) => c.trim()).filter(Boolean))
      : 'all';
  }
  return found;
}

const splitCols = (s: string) =>
  s
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

// Fichiers dont certaines lectures passent par le client RLS ; les chaînes service_role y sont reconnues et ignorées.
const FILES = [
  './read.ts',
  './adminView.ts',
  './download.ts',
  './context.ts',
  '../stripe/checkout.ts',
  '../stripe/customers.ts',
  '../stripe/refund.ts',
  '../pilotage/load.ts',
  '../../../app/admin/projets/actions.ts',
];

const ADMIN_HINTS = [/createSupabaseAdminClient\(\)\s*$/, /\b(admin|ledgerDb|adminDb)\s*$/];

function rlsSelects(src: string): { table: string; cols: string[] }[] {
  const out: { table: string; cols: string[] }[] = [];
  // Listes de colonnes littérales ou constantes déclarées dans le même fichier (`const COLS = '…'`).
  const re = /\.from\('(sv_[a-z_]+)'\)\s*\.select\((?:'([^']+)'|(\w+))\)/g;
  for (const m of src.matchAll(re)) {
    const before = src.slice(Math.max(0, m.index! - 140), m.index!).replace(/\s+$/, '');
    if (ADMIN_HINTS.some((h) => h.test(before))) continue;
    let cols = m[2];
    if (cols === undefined) {
      const decl = src.match(new RegExp(`const\\s+${m[3]}\\s*=\\s*'([^']+)'`));
      if (!decl) continue;
      cols = decl[1];
    }
    out.push({ table: m[1], cols: splitCols(cols) });
  }
  return out;
}

describe('RLS column grants guard', () => {
  it('parses the expected grants', () => {
    expect(grantsFor('sv_invoice_payment_events')).toEqual(
      new Set(['id', 'invoice_id', 'kind', 'amount_cents', 'method', 'occurred_at']),
    );
    const inv = grantsFor('sv_invoices') as Set<string>;
    expect(inv.has('number')).toBe(true);
    expect(inv.has('snapshot')).toBe(false);
  });

  it('flags a column that is not granted (self-test of the detector)', () => {
    const bad = `await rls.from('sv_invoice_payment_events').select('id, payment_intent_id')`;
    const [s] = rlsSelects(bad);
    const granted = grantsFor(s.table) as Set<string>;
    expect(s.cols.filter((c) => !granted.has(c))).toEqual(['payment_intent_id']);
    // Cas réel de 97bf71e : liste de colonnes portée par une constante.
    const viaConst = `const LEDGER_COLS = 'id, invoice_id, client_id, livemode';\nrls.from('sv_invoice_payment_events').select(LEDGER_COLS).in('invoice_id', ids)`;
    const [c] = rlsSelects(viaConst);
    expect(c.cols.filter((col) => !(grantsFor(c.table) as Set<string>).has(col))).toEqual(['client_id', 'livemode']);
    const ok = `await createSupabaseAdminClient().from('sv_invoice_payment_events').select('id, payment_intent_id')`;
    expect(rlsSelects(ok)).toEqual([]);
  });

  for (const file of FILES) {
    it(`${file} selects only granted columns through the RLS client`, () => {
      for (const { table, cols } of rlsSelects(read(file))) {
        const granted = grantsFor(table);
        if (granted === undefined || granted === 'all') continue;
        for (const col of cols) {
          expect(granted.has(col), `${file}: .from('${table}').select(… ${col} …) is not granted to authenticated`).toBe(true);
        }
      }
    });
  }

  it('the pilotage loader is covered by the guard (not vacuous)', () => {
    expect(rlsSelects(read('../pilotage/load.ts')).length).toBeGreaterThanOrEqual(11);
  });

  it('INVOICE_COLS is a subset of the sv_invoices grant', () => {
    const m = read('./read.ts').match(/export const INVOICE_COLS =\s*'([^']+)'/);
    expect(m).not.toBeNull();
    const granted = grantsFor('sv_invoices') as Set<string>;
    for (const col of splitCols(m![1])) expect(granted.has(col), col).toBe(true);
  });
});
