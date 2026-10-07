import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadCostsRegister, loadPilotageRows, PilotageLoadError } from './load';

type Result = { data: unknown; error: unknown };

// Faux client : chaque from(table) dépile les résultats mis en file pour cette table ; la chaîne est thenable.
function fake(queues: Record<string, (Result | (() => never))[]>) {
  const calls: { table: string; ops: string[][] }[] = [];
  const client = {
    from(table: string) {
      const call = { table, ops: [] as string[][] };
      calls.push(call);
      const chain: Record<string, unknown> = {};
      for (const op of ['select', 'eq', 'in', 'order', 'range']) {
        chain[op] = (...args: unknown[]) => {
          call.ops.push([op, ...args.map((a) => JSON.stringify(a))]);
          return chain;
        };
      }
      chain.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) => {
        const q = queues[table] ?? [];
        const next = q.length > 1 ? q.shift()! : q[0];
        try {
          const r = typeof next === 'function' ? next() : (next ?? { data: [], error: null });
          return Promise.resolve(r).then(resolve, reject);
        } catch (e) {
          return Promise.reject(e).then(resolve, reject);
        }
      };
      return chain;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const ok = (data: unknown[]): Result => ({ data, error: null });

const invoice = {
  id: 'i1', project_id: 'p1', client_id: 'c1', kind: 'deposit', number: 'F-1', is_test: false, issued_on: '2026-10-03',
  due_date: '2026-10-17', total_excl_tax_cents: 30000, vat_total_cents: 0, total_incl_tax_cents: 30000, prepaid_cents: 0,
  net_to_pay_cents: '30000', vat_regime: 'franchise', credits_invoice_id: null,
};

describe('loadPilotageRows', () => {
  it('maps snake_case rows to camelCase and numbers, dropping orphan payment events', async () => {
    const { client } = fake({
      sv_invoices: [ok([invoice])],
      sv_invoice_payment_events: [
        ok([
          { id: 1, invoice_id: 'i1', kind: 'paid', amount_cents: 30000, method: 'card', occurred_at: '2026-10-03T10:00:00Z' },
          { id: 2, invoice_id: null, kind: 'paid', amount_cents: 5, method: null, occurred_at: '2026-10-03T10:00:00Z' },
        ]),
      ],
      sv_project_documents: [ok([{ id: 'd1', project_id: 'p1', doc_type: 'quote', revision: 1, reference: 'D-1', replaces_document_id: null, issued_at: '2026-10-01T08:00:00Z' }])],
      sv_document_snapshots: [ok([{ document_id: 'd1', data: { docType: 'quote', totalCents: 100000 } }])],
      sv_project_facts: [ok([{ id: 7, project_id: 'p1', type: 'contract_signed', target_fact_id: null, occurred_at: '2026-10-02T08:00:00Z' }])],
      sv_projects: [ok([{ id: 'p1', client_id: 'c1', lead_id: null, title: 'Site' }])],
      sv_clients: [ok([{ id: 'c1', name: 'ACME', is_test: false }])],
      sv_leads: [ok([{ id: 'l1', source_kind: 'touch', source_source: 'google', source_medium: 'cpc', source_campaign: 'brand' }])],
      sv_recurring_costs: [ok([{ id: 3, series_id: 's1', label: 'Outil', category: 'outils', amount_cents: '200000', frequency: 'monthly', starts_on: '2026-01-01', ends_on: null, stopped: false, created_at: '2026-01-01T00:00:00Z' }])],
      sv_project_costs: [ok([{ id: 4, project_id: 'p1', incurred_on: '2026-10-04', category: 'autre', label: 'X', amount_cents: 5000, vat_cents: null, voids_cost_id: null, created_at: '2026-10-04T00:00:00Z' }])],
      sv_cash_balances: [ok([{ id: 5, as_of: '2026-10-01', amount_cents: 100000, note: null, created_at: '2026-10-01T00:00:00Z' }])],
    });
    const rows = await loadPilotageRows(client);
    expect(rows.invoices[0]).toMatchObject({ id: 'i1', projectId: 'p1', netToPayCents: 30000, vatRegime: 'franchise', isTest: false });
    expect(rows.paymentEvents).toHaveLength(1);
    expect(rows.paymentEvents[0]).toMatchObject({ invoiceId: 'i1', amountCents: 30000, method: 'card' });
    expect(rows.quoteDocs[0].reference).toBe('D-1');
    expect(rows.snapshots[0]).toEqual({ documentId: 'd1', data: { docType: 'quote', totalCents: 100000 } });
    expect(rows.facts[0]).toMatchObject({ id: 7, type: 'contract_signed' });
    expect(rows.leads[0]).toMatchObject({ sourceSource: 'google', sourceCampaign: 'brand' });
    expect(rows.recurringCosts[0].amountCents).toBe(200000);
    expect(rows.cashBalances[0].asOf).toBe('2026-10-01');
  });

  it('raises PilotageLoadError on a query error without logging row data', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fake({ sv_invoices: [{ data: null, error: { message: 'secret row 123' } }] });
    await expect(loadPilotageRows(client)).rejects.toBeInstanceOf(PilotageLoadError);
    await expect(loadPilotageRows(client)).rejects.toThrow('pilotage_load_failed');
    expect(spy.mock.calls.flat().join(' ')).not.toContain('secret');
    spy.mockRestore();
  });

  it('raises PilotageLoadError when a query throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client } = fake({
      sv_cash_balances: [
        () => {
          throw new Error('network');
        },
      ],
    });
    await expect(loadPilotageRows(client)).rejects.toBeInstanceOf(PilotageLoadError);
  });

  it('rejects unsafe integers and unknown enum values', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const unsafe = fake({ sv_invoices: [ok([{ ...invoice, net_to_pay_cents: '9007199254740993' }])] });
    await expect(loadPilotageRows(unsafe.client)).rejects.toBeInstanceOf(PilotageLoadError);
    const badKind = fake({ sv_invoices: [ok([{ ...invoice, kind: 'mystery' }])] });
    await expect(loadPilotageRows(badKind.client)).rejects.toBeInstanceOf(PilotageLoadError);
  });

  it('paginates by 1000 with range()', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({ id: `c${i}`, name: 'n', is_test: false }));
    const { client, calls } = fake({ sv_clients: [ok(full), ok([{ id: 'last', name: 'n', is_test: true }])] });
    const rows = await loadPilotageRows(client);
    expect(rows.clients).toHaveLength(1001);
    const ranges = calls.filter((c) => c.table === 'sv_clients').map((c) => c.ops.find((o) => o[0] === 'range')!.slice(1));
    expect(ranges).toEqual([['0', '999'], ['1000', '1999']]);
  });

  it('raises when more than 20 pages are needed (no silent truncation)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const full = Array.from({ length: 1000 }, (_, i) => ({ id: `c${i}`, name: 'n', is_test: false }));
    const { client } = fake({ sv_clients: [ok(full)] });
    await expect(loadPilotageRows(client)).rejects.toBeInstanceOf(PilotageLoadError);
  });

  it('reads snapshots in chunks of 50 quote document ids and filters facts and documents', async () => {
    const docs = Array.from({ length: 120 }, (_, i) => ({ id: `d${i}`, project_id: 'p', doc_type: 'quote', revision: 1, reference: `D${i}`, replaces_document_id: null, issued_at: '2026-10-01T00:00:00Z' }));
    const { client, calls } = fake({ sv_project_documents: [ok(docs)], sv_document_snapshots: [ok([])] });
    await loadPilotageRows(client);
    const snaps = calls.filter((c) => c.table === 'sv_document_snapshots');
    expect(snaps).toHaveLength(3);
    expect(JSON.parse(snaps[0].ops.find((o) => o[0] === 'in')![2])).toHaveLength(50);
    expect(JSON.parse(snaps[2].ops.find((o) => o[0] === 'in')![2])).toHaveLength(20);
    const facts = calls.find((c) => c.table === 'sv_project_facts')!;
    expect(facts.ops.find((o) => o[0] === 'in')!.slice(1)).toEqual(['"type"', '["contract_signed","fact_revoked"]']);
    const doc = calls.find((c) => c.table === 'sv_project_documents')!;
    expect(doc.ops.find((o) => o[0] === 'eq')!.slice(1)).toEqual(['"doc_type"', '"quote"']);
  });
});

describe('loadCostsRegister', () => {
  it('returns the cost tables and projects with client name and isTest', async () => {
    const { client } = fake({
      sv_projects: [ok([{ id: 'p1', client_id: 'c1', lead_id: null, title: 'Site' }])],
      sv_clients: [ok([{ id: 'c1', name: 'ACME', is_test: true }])],
    });
    const r = await loadCostsRegister(client);
    expect(r.projects).toEqual([{ id: 'p1', title: 'Site', clientName: 'ACME', isTest: true }]);
    expect(r.recurring).toEqual([]);
    expect(r.projectCosts).toEqual([]);
    expect(r.balances).toEqual([]);
  });
});
