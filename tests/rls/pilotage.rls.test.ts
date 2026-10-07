import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildPilotageView } from '@/lib/server/pilotage/dashboard';
import { loadPilotageRows } from '@/lib/server/pilotage/load';
import { parsePilotageParams } from '@/lib/server/pilotage/params';
import { parisToday, periodRange } from '@/lib/server/pilotage/periods';
import {
  addCashBalanceRpc,
  addProjectCostRpc,
  addRecurringCostRpc,
  anonClient,
  applyTestEvent,
  cleanup,
  convertTestLead,
  correctTestLeadSource,
  dbQuery,
  issueTestCreditNote,
  issueTestDocument,
  issueTestInvoice,
  makeAdmin,
  makeClient,
  makeConvertibleLead,
  makeProject,
  makeUser,
  reachAcceptanceSigned,
  reachContractSigned,
  recordTestSession,
  setClientTest,
  stopRecurringCostRpc,
  svc,
  voidProjectCostRpc,
  type TestUser,
} from './helpers';

const TABLES = ['sv_recurring_costs', 'sv_project_costs', 'sv_cash_balances'] as const;

/** Parse the JSON printed by `supabase db query` (a banner line may surround it). */
function dbRows(sql: string): Array<Record<string, any>> {
  const out = dbQuery(sql);
  const start = out.indexOf('{');
  const end = out.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error(`dbQuery failed: ${out}`);
  const parsed = JSON.parse(out.slice(start, end + 1));
  if (!parsed.rows) throw new Error(`dbQuery failed: ${out}`);
  return parsed.rows;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function daysFromToday(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}
/** First/15th day of the current UTC month (the DB compares with current_date in UTC). */
function monthDay(day: number): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Task 1: append-only, isolation, RPC validation
// ---------------------------------------------------------------------------
describe('phase 17 pilotage: append-only and isolation', { timeout: 180_000 }, () => {
  let admin: TestUser;
  let outsider: TestUser;
  let projectId: string;
  let ids: { project: number; recurring: number; balance: number; series: string };

  beforeAll(async () => {
    admin = await makeUser('pilot-admin');
    await makeAdmin(admin);
    outsider = await makeUser('pilot-outsider');
    const client = await makeClient(`Pilotage ${randomUUID()}`);
    projectId = await makeProject(client.id);

    const p = await addProjectCostRpc({ projectId, incurredOn: daysFromToday(0), amountCents: 1250 });
    const r = await addRecurringCostRpc({ amountCents: 900, startsOn: daysFromToday(0) });
    const b = await addCashBalanceRpc(daysFromToday(0), -50000);
    expect(p.error).toBeNull();
    expect(r.error).toBeNull();
    expect(b.error).toBeNull();
    ids = {
      project: Number(p.data.cost_id),
      recurring: Number(r.data.cost_id),
      balance: Number(b.data.balance_id),
      series: r.data.series_id,
    };
  });

  afterAll(async () => {
    await cleanup();
  });

  it('valid RPC calls return identifiers (negative cash balance allowed)', () => {
    expect(ids.project).toBeGreaterThan(0);
    expect(ids.recurring).toBeGreaterThan(0);
    expect(ids.balance).toBeGreaterThan(0);
    expect(typeof ids.series).toBe('string');
  });

  it('update, delete and truncate are refused on the three tables', async () => {
    const rowId: Record<string, number> = {
      sv_recurring_costs: ids.recurring,
      sv_project_costs: ids.project,
      sv_cash_balances: ids.balance,
    };
    for (const t of TABLES) {
      const upd = await svc().from(t).update({ amount_cents: 1 }).eq('id', rowId[t]);
      expect(upd.error, `update ${t}`).not.toBeNull();
      const del = await svc().from(t).delete().eq('id', rowId[t]);
      expect(del.error, `delete ${t}`).not.toBeNull();
    }
    for (const t of TABLES) {
      const out = dbQuery(`truncate public.${t}`);
      expect(out, `truncate ${t}`).toMatch(/sv_immutable_table|cannot truncate|permission/i);
    }
    const left = dbRows(`select count(*)::int as n from public.sv_cash_balances where id = ${ids.balance}`);
    expect(Number(left[0].n)).toBe(1);
  });

  it('direct insert is refused for service_role and for an admin', async () => {
    const payloads: Record<string, Record<string, unknown>> = {
      sv_recurring_costs: {
        series_id: randomUUID(),
        label: 'x',
        category: 'outils',
        amount_cents: 100,
        frequency: 'monthly',
        starts_on: daysFromToday(0),
        stopped: false,
      },
      sv_project_costs: {
        project_id: projectId,
        incurred_on: daysFromToday(0),
        category: 'outils',
        label: 'x',
        amount_cents: 100,
        vat_cents: 0,
      },
      sv_cash_balances: { as_of: daysFromToday(0), amount_cents: 100 },
    };
    for (const t of TABLES) {
      const a = await svc().from(t).insert(payloads[t]);
      expect(a.error, `service_role insert ${t}`).not.toBeNull();
      const b = await admin.client.from(t).insert(payloads[t]);
      expect(b.error, `admin insert ${t}`).not.toBeNull();
    }
  });

  it('a non-admin and anon read nothing; the admin reads its rows', async () => {
    for (const t of TABLES) {
      const o = await outsider.client.from(t).select('id');
      expect(o.error, `outsider ${t}`).toBeNull();
      expect(o.data).toEqual([]);
      const an = await anonClient().from(t).select('id');
      expect(an.error !== null || (an.data ?? []).length === 0, `anon ${t}`).toBe(true);
      const ad = await admin.client.from(t).select('id');
      expect(ad.error, `admin ${t}`).toBeNull();
      expect((ad.data ?? []).length).toBeGreaterThan(0);
    }
  });

  it('a non-admin and anon cannot execute the five RPCs', async () => {
    const calls: [string, Record<string, unknown>][] = [
      ['sv_add_project_cost', { p_project_id: projectId, p_incurred_on: daysFromToday(0), p_category: 'outils', p_label: 'x', p_amount_cents: 100, p_vat_cents: 0, p_actor: null }],
      ['sv_void_project_cost', { p_cost_id: ids.project, p_actor: null }],
      ['sv_add_recurring_cost', { p_series_id: null, p_label: 'x', p_category: 'outils', p_amount_cents: 100, p_frequency: 'monthly', p_starts_on: daysFromToday(0), p_ends_on: null, p_actor: null }],
      ['sv_stop_recurring_cost', { p_series_id: ids.series, p_from: daysFromToday(0), p_actor: null }],
      ['sv_add_cash_balance', { p_as_of: daysFromToday(0), p_amount_cents: 1, p_note: null, p_actor: null }],
    ];
    for (const [fn, args] of calls) {
      const o = await outsider.client.rpc(fn, args);
      expect(o.error, `outsider ${fn}`).not.toBeNull();
      expect(o.error!.message).toMatch(/permission denied/i);
      const a = await anonClient().rpc(fn, args);
      expect(a.error, `anon ${fn}`).not.toBeNull();
      expect(a.error!.message).toMatch(/permission denied/i);
      const ad = await admin.client.rpc(fn, args);
      expect(ad.error, `admin ${fn}`).not.toBeNull();
    }
  });

  it('RPC validation codes', async () => {
    const t = daysFromToday(0);
    expect((await addProjectCostRpc({ projectId, incurredOn: t, amountCents: 0 })).error?.message).toMatch(/^sv_cost_amount_invalid/);
    expect((await addProjectCostRpc({ projectId: randomUUID(), incurredOn: t, amountCents: 100 })).error?.message).toMatch(/^sv_project_not_found/);
    expect((await addProjectCostRpc({ projectId, incurredOn: '1990-01-01', amountCents: 100 })).error?.message).toMatch(/^sv_cost_date_invalid/);
    expect((await addProjectCostRpc({ projectId, incurredOn: t, amountCents: 100, category: 'tjm' })).error?.message).toMatch(/^sv_cost_category_invalid/);
    expect((await addRecurringCostRpc({ amountCents: 100, startsOn: t, endsOn: daysFromToday(-1) })).error?.message).toMatch(/^sv_cost_end_before_start/);
    expect((await addRecurringCostRpc({ amountCents: 100, startsOn: t, category: 'tjm' })).error?.message).toMatch(/^sv_cost_category_invalid/);

    const c = await addProjectCostRpc({ projectId, incurredOn: t, amountCents: 700 });
    expect(c.error).toBeNull();
    const v1 = await voidProjectCostRpc(c.data.cost_id);
    expect(v1.error).toBeNull();
    expect((await voidProjectCostRpc(c.data.cost_id)).error?.message).toMatch(/^sv_cost_already_voided/);
    expect((await voidProjectCostRpc(v1.data.cost_id)).error?.message).toMatch(/^sv_cost_not_found/);

    const r = await addRecurringCostRpc({ amountCents: 300, startsOn: monthDay(1) });
    expect(r.error).toBeNull();
    expect((await stopRecurringCostRpc(r.data.series_id, monthDay(1))).error).toBeNull();
    expect((await stopRecurringCostRpc(r.data.series_id, monthDay(1))).error?.message).toMatch(/^sv_series_already_stopped/);
    expect((await stopRecurringCostRpc(randomUUID(), t)).error?.message).toMatch(/^sv_series_not_found/);

    expect((await addCashBalanceRpc(t, 100, 'x'.repeat(201))).error?.message).toMatch(/^sv_balance_note_invalid/);
  });

  it('a second version of a series keeps the same series_id and both rows stay readable', async () => {
    const first = await addRecurringCostRpc({ amountCents: 1000, startsOn: daysFromToday(0) });
    expect(first.error).toBeNull();
    const second = await addRecurringCostRpc({ seriesId: first.data.series_id, amountCents: 1500, startsOn: daysFromToday(0) });
    expect(second.error).toBeNull();
    expect(second.data.series_id).toBe(first.data.series_id);
    expect(second.data.cost_id).not.toBe(first.data.cost_id);
    const rows = await admin.client.from('sv_recurring_costs').select('id').eq('series_id', first.data.series_id);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(2);
  });

  it('arrêt dans le mois de début', async () => {
    const r = await addRecurringCostRpc({ amountCents: 4200, startsOn: monthDay(15) });
    expect(r.error).toBeNull();
    const stop = await stopRecurringCostRpc(r.data.series_id, monthDay(1));
    expect(stop.error).toBeNull();
    const again = await stopRecurringCostRpc(r.data.series_id, monthDay(1));
    expect(again.error?.message).toMatch(/^sv_series_already_stopped/);
  });
});

// ---------------------------------------------------------------------------
// Task 2: concordance through the real loader (admin RLS client)
// ---------------------------------------------------------------------------
describe('phase 17 pilotage: concordance (D-04)', { timeout: 600_000 }, () => {
  let admin: TestUser;
  const rand = randomUUID().replace(/-/g, '').slice(0, 10);
  const SRC = `pilot-src-${rand}`;
  const FIXED = `pilot-fixed-${rand}`;
  let leadId: string;
  let tfaInvoiceId: string;
  let tfaNumber: string;

  const now = () => new Date();
  async function views() {
    const rows = await loadPilotageRows(admin.client);
    const at = now();
    const all = buildPilotageView(rows, parsePilotageParams({ periode: 'annee', tests: '1' }), at);
    const real = buildPilotageView(rows, parsePilotageParams({ periode: 'annee' }), at);
    return { rows, all, real, range: periodRange('annee', parisToday(at)) };
  }

  function invoicedRaw(range: { from: string; to: string }, real: boolean): number {
    const extra = real
      ? ` and not is_test and project_id in (select p.id from public.sv_projects p join public.sv_clients c on c.id = p.client_id where not c.is_test)`
      : '';
    const r = dbRows(
      `select coalesce(sum(case when kind <> 'credit_note' then net_to_pay_cents else -total_incl_tax_cents end), 0)::bigint as v from public.sv_invoices where issued_on between '${range.from}' and '${range.to}'${extra}`,
    );
    return Number(r[0].v);
  }

  function collectedRaw(range: { from: string; to: string }, real: boolean): number {
    const f = range.from;
    const t = range.to;
    const filter = real ? ' and not i.is_test and not c.is_test' : '';
    const r = dbRows(
      `with inv as (select i.id from public.sv_invoices i join public.sv_projects p on p.id = i.project_id join public.sv_clients c on c.id = p.client_id where i.kind <> 'credit_note'${filter}), ev as (select e.invoice_id, e.kind, e.amount_cents, (e.occurred_at at time zone 'Europe/Paris')::date as d from public.sv_invoice_payment_events e where e.invoice_id in (select id from inv)), per as (select invoice_id,  coalesce(sum(amount_cents) filter (where kind = 'paid'), 0) as paid_all,  coalesce(sum(amount_cents) filter (where kind = 'paid' and d between '${f}' and '${t}'), 0) as paid_in,  coalesce(max(amount_cents) filter (where kind = 'refunded' and d <= '${t}'), 0) as ref_to,  coalesce(max(amount_cents) filter (where kind = 'refunded' and d < '${f}'), 0) as ref_before from ev group by invoice_id) select coalesce(sum(paid_in - (least(ref_to, paid_all) - least(ref_before, paid_all))), 0)::bigint as v from per`,
    );
    return Number(r[0].v);
  }

  const tile = (v: { tiles: { key: string; cents: number }[] }, key: string) => v.tiles.find((x) => x.key === key)!.cents;

  async function allFactureNumbers(view: ReturnType<typeof buildPilotageView>, rows: Awaited<ReturnType<typeof loadPilotageRows>>) {
    const numbers: string[] = [];
    const at = now();
    for (let page = 1; page <= view.detail!.pageCount; page++) {
      const v = buildPilotageView(rows, parsePilotageParams({ periode: 'annee', tests: view.params.tests ? '1' : '0', detail: 'facture', page: String(page) }), at);
      for (const r of v.detail!.rows) if (r.type === 'facture') numbers.push(r.number);
    }
    return numbers;
  }

  beforeAll(async () => {
    admin = await makeUser('pilot-conc-admin');
    await makeAdmin(admin);

    // Real project from a lead with a known source.
    const lead = await makeConvertibleLead('qualified', {
      p_source: { source: SRC, medium: 'cpc', campaign: 'c1', kind: 'touch' },
    });
    leadId = lead.lead_id;
    const projectId = await convertTestLead(leadId, admin.id);
    await issueTestDocument(projectId, {
      docType: 'quote',
      snapshot: { schemaVersion: 1, docType: 'quote', reference: 'TEST-1', revision: 1, totalCents: 100000, depositCents: 50000, balanceCents: 50000 },
    });
    await reachAcceptanceSigned(projectId);

    const dep = await issueTestInvoice(projectId, { kind: 'deposit' });
    const depSession = await recordTestSession(dep.invoice_id);
    const intent = `pi_test_${randomUUID().replace(/-/g, '')}`;
    await applyTestEvent({
      type: 'checkout.session.completed',
      kind: 'paid',
      invoiceId: dep.invoice_id,
      checkoutSessionId: depSession.sessionId,
      paymentIntentId: intent,
      amountCents: 50000,
      method: 'card',
    });
    await issueTestInvoice(projectId, {
      kind: 'final',
      lines: [{ designation: 'Solde', quantity_milli: 1000, unit_code: 'C62', unit_price_cents: 100000, line_total_cents: 100000 }],
      deductions: [{ label: 'Acompte', ref_invoice_id: dep.invoice_id, ref_number: dep.number, ref_date: dep.issued_on, amount_cents: 50000 }],
    });
    await issueTestCreditNote(dep.invoice_id, { scope: 'partial', amountCents: 10000, reason: 'Avoir partiel de test' });
    await applyTestEvent({ type: 'charge.refunded', kind: 'refunded', paymentIntentId: intent, amountCents: 1000, refundId: `re_test_${randomUUID().replace(/-/g, '')}` });
    await applyTestEvent({ type: 'charge.refunded', kind: 'refunded', paymentIntentId: intent, amountCents: 3000, refundId: `re_test_${randomUUID().replace(/-/g, '')}` });

    // Test client with its own paid TFA invoice.
    const tClient = await makeClient(`Pilotage test ${rand}`);
    await setClientTest(tClient.id, true);
    const tProject = await makeProject(tClient.id);
    await issueTestDocument(tProject, {
      docType: 'quote',
      snapshot: { schemaVersion: 1, docType: 'quote', reference: 'TEST-1', revision: 1, totalCents: 70000, depositCents: 35000, balanceCents: 35000 },
    });
    await reachContractSigned(tProject);
    const tInv = await issueTestInvoice(tProject, { kind: 'deposit' });
    tfaInvoiceId = tInv.invoice_id;
    tfaNumber = tInv.number;
    const tSession = await recordTestSession(tInv.invoice_id);
    await applyTestEvent({
      type: 'checkout.session.completed',
      kind: 'paid',
      invoiceId: tInv.invoice_id,
      checkoutSessionId: tSession.sessionId,
      amountCents: 50000,
      method: 'card',
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  it('concordance facturé', async () => {
    const { all, real, range } = await views();
    expect(tile(all, 'facture')).toBe(invoicedRaw(range, false));
    expect(tile(real, 'facture')).toBe(invoicedRaw(range, true));
    expect(tile(all, 'facture')).not.toBe(tile(real, 'facture'));
  });

  it('concordance encaissé', async () => {
    const { all, real, range } = await views();
    expect(tile(all, 'encaisse')).toBe(collectedRaw(range, false));
    expect(tile(real, 'encaisse')).toBe(collectedRaw(range, true));
    expect(tile(all, 'encaisse')).not.toBe(tile(real, 'encaisse'));
  });

  it('séries de test', async () => {
    expect(tfaNumber).toMatch(/^TFA/);
    const { rows } = await views();
    const at = now();
    const allDetail = buildPilotageView(rows, parsePilotageParams({ periode: 'annee', tests: '1', detail: 'facture' }), at);
    const realDetail = buildPilotageView(rows, parsePilotageParams({ periode: 'annee', detail: 'facture' }), at);
    expect(rows.invoices.some((i) => i.id === tfaInvoiceId)).toBe(true);
    expect(await allFactureNumbers(allDetail, rows)).toContain(tfaNumber);
    expect(await allFactureNumbers(realDetail, rows)).not.toContain(tfaNumber);
  });

  it('correction de source', async () => {
    const before = await views();
    const row = before.all.sources.rows.find((r) => r.source === SRC && r.campaign === 'c1');
    expect(row?.signedCents).toBe(100000);
    expect(before.all.sources.totalCents).toBe(tile(before.all, 'signe'));

    const fix = await correctTestLeadSource(leadId, FIXED, null, 'Correction de test phase 17', admin.id);
    expect(fix.error).toBeNull();

    const after = await views();
    expect(after.all.sources.rows.find((r) => r.source === SRC)).toBeUndefined();
    const moved = after.all.sources.rows.find((r) => r.source === FIXED && r.campaign === null);
    expect(moved?.signedCents).toBe(100000);
    expect(after.all.sources.totalCents).toBe(tile(after.all, 'signe'));
  });
});
