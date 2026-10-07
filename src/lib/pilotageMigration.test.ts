import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const NAME = '20261009000000_sv_pilotage.sql';
const FILE = new URL(`../../supabase/migrations/${NAME}`, import.meta.url);

const raw = readFileSync(FILE, 'utf8');

function stripComments(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

const sql = stripComments(raw);

function quoted(list: string): string[] {
  return [...list.matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/** Body of one function, from its create statement to the next create function or end of file. */
function fnBody(name: string): string {
  const starts = [...sql.matchAll(/create\s+or\s+replace\s+function\s+([\w.]+)\s*\(/gi)];
  const i = starts.findIndex((m) => m[1] === name);
  expect(i).toBeGreaterThanOrEqual(0);
  const from = starts[i].index ?? 0;
  const to = i + 1 < starts.length ? (starts[i + 1].index ?? sql.length) : sql.length;
  return sql.slice(from, to);
}

const TABLES = ['sv_recurring_costs', 'sv_project_costs', 'sv_cash_balances'];
const CATEGORIES = ['sous_traitance', 'outils', 'hebergement', 'publicite', 'licences', 'autre'];
const FUNCTIONS = [
  'sv_add_recurring_cost',
  'sv_stop_recurring_cost',
  'sv_add_project_cost',
  'sv_void_project_cost',
  'sv_add_cash_balance',
];
const CODES: Record<string, string[]> = {
  sv_add_project_cost: [
    'sv_cost_amount_invalid',
    'sv_cost_label_invalid',
    'sv_cost_category_invalid',
    'sv_cost_date_invalid',
    'sv_project_not_found',
    'sv_cost_vat_invalid',
  ],
  sv_void_project_cost: ['sv_cost_not_found', 'sv_cost_already_voided'],
  sv_add_recurring_cost: ['sv_cost_frequency_invalid', 'sv_cost_end_before_start', 'sv_series_not_found'],
  sv_stop_recurring_cost: ['sv_series_not_found', 'sv_series_already_stopped'],
  sv_add_cash_balance: ['sv_balance_amount_invalid', 'sv_balance_note_invalid'],
};

describe('phase 17 pilotage migration static checks', () => {
  it('sorts last among migrations', () => {
    const files = readdirSync(new URL('../../supabase/migrations/', import.meta.url))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    expect(files[files.length - 1]).toBe(NAME);
  });

  for (const t of TABLES) {
    describe(t, () => {
      it('enables RLS and revokes all privileges', () => {
        expect(sql).toMatch(new RegExp(`alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`, 'i'));
        expect(sql).toMatch(
          new RegExp(`revoke\\s+all\\s+on\\s+public\\.${t}\\s+from\\s+anon\\s*,\\s*authenticated\\s*,\\s*service_role`, 'i'),
        );
      });

      it('grants select to authenticated with an admin-only select policy', () => {
        expect(sql).toMatch(new RegExp(`grant\\s+select\\s+on\\s+public\\.${t}\\s+to\\s+authenticated`, 'i'));
        expect(sql).toMatch(
          new RegExp(
            `create\\s+policy\\s+\\w+\\s+on\\s+public\\.${t}\\s+for\\s+select\\s+to\\s+authenticated\\s+using\\s*\\(\\s*\\(\\s*select\\s+sv_private\\.is_admin\\(\\)\\s*\\)\\s*\\)`,
            'i',
          ),
        );
      });

      it('carries both deny_mutation triggers', () => {
        expect(sql).toMatch(
          new RegExp(`before\\s+update\\s+or\\s+delete\\s+on\\s+public\\.${t}\\b[^;]*execute\\s+function\\s+sv_private\\.deny_mutation`, 'i'),
        );
        expect(sql).toMatch(
          new RegExp(`before\\s+truncate\\s+on\\s+public\\.${t}\\b[^;]*execute\\s+function\\s+sv_private\\.deny_mutation`, 'i'),
        );
      });

      it('has no write grant to any role', () => {
        const grants = [...sql.matchAll(new RegExp(`grant\\s+([^;]*?)\\s+on\\s+public\\.${t}\\b[^;]*;`, 'gi'))];
        for (const g of grants) {
          expect(g[1]).not.toMatch(/\b(insert|update|delete|all|truncate)\b/i);
        }
      });
    });
  }

  it('lists exactly the six categories in both cost tables', () => {
    const checks = [...sql.matchAll(/category\s+in\s*\(([^)]*)\)/gi)].map((m) => quoted(m[1]).sort());
    expect(checks.length).toBeGreaterThanOrEqual(2);
    for (const c of checks) expect(c).toEqual([...CATEGORIES].sort());
  });

  it('lists exactly monthly and yearly frequencies', () => {
    const m = sql.match(/frequency\s+in\s*\(([^)]*)\)/i);
    expect(m).not.toBeNull();
    expect(quoted(m?.[1] ?? '').sort()).toEqual(['monthly', 'yearly']);
  });

  it('uses on delete restrict and no auth.users reference', () => {
    expect(sql).toMatch(/project_id\s+uuid\s+not\s+null\s+references\s+public\.sv_projects\s*\(id\)\s+on\s+delete\s+restrict/i);
    expect(sql).toMatch(/voids_cost_id\s+bigint\s+null\s+references\s+public\.sv_project_costs\s*\(id\)\s+on\s+delete\s+restrict/i);
    expect(sql).not.toMatch(/references\s+auth\.users/i);
  });

  it('has a unique partial index on voids_cost_id', () => {
    expect(sql).toMatch(
      /create\s+unique\s+index\s+(?:if\s+not\s+exists\s+)?\w+\s+on\s+public\.sv_project_costs\s*\(\s*voids_cost_id\s*\)\s+where\s+voids_cost_id\s+is\s+not\s+null/i,
    );
  });

  it('creates no view and no materialized view', () => {
    expect(sql).not.toMatch(/create\s+(or\s+replace\s+)?(materialized\s+)?view/i);
  });

  it('has no internal day-rate column', () => {
    expect(sql).not.toMatch(/day_rate|daily_rate|tjm/i);
  });

  for (const fn of FUNCTIONS) {
    describe(`public.${fn}`, () => {
      it('is security definer, empty search_path, service_role only', () => {
        const body = fnBody(`public.${fn}`);
        expect(body).toMatch(/security\s+definer/i);
        expect(body).toMatch(/set\s+search_path\s*=\s*''/i);
        expect(sql).toMatch(
          new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^)]*\\)\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, 'i'),
        );
        expect(sql).toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${fn}\\s*\\([^)]*\\)\\s+to\\s+service_role`, 'i'));
      });

      it('raises its error codes', () => {
        const body = fnBody(`public.${fn}`);
        for (const code of CODES[fn]) expect(body).toContain(`'${code}'`);
      });
    });
  }

  it('orders stop-series versions by month then id', () => {
    const body = fnBody('public.sv_stop_recurring_cost');
    expect(body).toMatch(/order\s+by\s+date_trunc\s*\(\s*'month'\s*,\s*starts_on\s*\)\s+desc\s*,\s*id\s+desc/i);
    expect(body).not.toMatch(/order\s+by\s+starts_on\s+desc\s*,\s*id\s+desc/i);
  });

  it('inserts project costs through the definer RPC', () => {
    expect(fnBody('public.sv_add_project_cost')).toMatch(/insert\s+into\s+public\.sv_project_costs/i);
  });
});
