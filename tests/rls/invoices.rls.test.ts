import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addMember,
  anonClient,
  cleanup,
  dbQuery,
  issueTestCreditNote,
  issueTestInvoice,
  makeAdmin,
  makeClient,
  makeGeckoAdmin,
  makeProject,
  makeUser,
  reachAcceptanceSigned,
  reachContractSigned,
  setClientTest,
  svc,
  type TestUser,
} from './helpers';

const SHA = 'b'.repeat(64);
const DAY_MS = 86_400_000;

let clientA: { id: string };
let clientB: { id: string };
let clientT: { id: string };
let clientC: { id: string };
let memberA: TestUser;
let memberB: TestUser;
let memberC1: TestUser;
let memberC2: TestUser;
let plain: TestUser;
let gecko: TestUser;
let admin: TestUser;
let projectTest: string;

interface Set {
  projectId: string;
  deposit: Awaited<ReturnType<typeof issueTestInvoice>>;
  final: Awaited<ReturnType<typeof issueTestInvoice>>;
  pdfPath: string;
}
let setA: Set;
let setB: Set;

// ---------------------------------------------------------------------------
// Local helpers (helpers.ts belongs to 15-08)
// ---------------------------------------------------------------------------

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

function asObj(v: unknown): Record<string, any> {
  return typeof v === 'string' ? JSON.parse(v) : (v as Record<string, any>);
}

function parisYear(): number {
  return Number(dbRows(`select extract(year from now() at time zone 'Europe/Paris')::int as y`)[0].y);
}

function counter(series: string, year: number): number {
  const rows = dbRows(
    `select coalesce((select last_seq from public.sv_invoice_counters where series = '${series}' and year = ${year}), 0) as n`,
  );
  return Number(rows[0].n);
}

const seqOf = (number: string) => Number(number.split('-')[2]);

/** SQL expression calling sv_private.issue_invoice_at with a minimal valid header (no double quotes: dbQuery shell safe). */
function sqlIssue(o: { id: string; key: string; projectId: string; kind: string; now: string; total?: number }): string {
  const total = o.total ?? 50000;
  const period = o.kind === 'period' ? ",'service_period_start','2026-10-01','service_period_end','2026-10-31'" : '';
  return (
    `sv_private.issue_invoice_at('${o.id}'::uuid,'${o.key}','${o.projectId}'::uuid,'${o.kind}',` +
    `jsonb_build_object('seller_legal_name','Anatholy Bricon','seller_siret','90098846000011',` +
    `'seller_address_line','71 rue de Grand Cour','seller_postal_code','37550','seller_city','Saint-Avertin',` +
    `'buyer_name','RLS Client','buyer_siret','12345678900012','vat_regime','franchise','payment_terms_days',30,` +
    `'total_excl_tax_cents',${total},'template_version','v1','snapshot',jsonb_build_object('test',true)${period}),` +
    `jsonb_build_array(jsonb_build_object('designation','Test','quantity_milli',1000,'unit_code','C62',` +
    `'unit_price_cents',${total},'line_total_cents',${total})),'[]'::jsonb,'contact@sevalys.com',${o.now})`
  );
}

function issueAt(projectId: string, kind: string, now: string): Record<string, any> {
  const id = randomUUID();
  const rows = dbRows(`select ${sqlIssue({ id, key: `rls-at-${id}`, projectId, kind, now })} as r`);
  return asObj(rows[0].r);
}

async function signedProject(clientId: string): Promise<string> {
  const p = await makeProject(clientId);
  await reachContractSigned(p);
  return p;
}

async function acceptedProject(clientId: string): Promise<string> {
  const p = await makeProject(clientId);
  await reachAcceptanceSigned(p);
  return p;
}

function lineOf(total: number) {
  return { designation: 'Prestation', quantity_milli: 1000, unit_code: 'C62', unit_price_cents: total, line_total_cents: total };
}

async function makeSet(clientId: string): Promise<Set> {
  const projectId = await acceptedProject(clientId);
  const deposit = await issueTestInvoice(projectId, { kind: 'deposit' });
  const final = await issueTestInvoice(projectId, {
    kind: 'final',
    lines: [lineOf(150000)],
    deductions: [
      { label: 'Acompte', ref_invoice_id: deposit.invoice_id, ref_number: deposit.number, ref_date: deposit.issued_on, amount_cents: 50000 },
    ],
  });
  const pdfPath = `${projectId}/invoices/${final.invoice_id}.pdf`;
  const att = await svc().rpc('sv_attach_invoice_pdf', {
    p_invoice_id: final.invoice_id,
    p_storage_path: pdfPath,
    p_sha256: SHA,
    p_size: 1234,
    p_template_version: 'v1',
  });
  if (att.error) throw new Error(`sv_attach_invoice_pdf failed: ${att.error.message}`);
  return { projectId, deposit, final, pdfPath };
}

beforeAll(async () => {
  clientA = await makeClient('RLS Inv A');
  clientB = await makeClient('RLS Inv B');
  clientT = await makeClient('RLS Inv Test');
  clientC = await makeClient('RLS Inv Credit');
  await setClientTest(clientT.id, true);
  memberA = await makeUser('inva');
  memberB = await makeUser('invb');
  memberC1 = await makeUser('invc1');
  memberC2 = await makeUser('invc2');
  plain = await makeUser('invplain');
  gecko = await makeUser('invgecko');
  admin = await makeUser('invadmin');
  await addMember(clientA.id, memberA);
  await addMember(clientB.id, memberB);
  await addMember(clientC.id, memberC1);
  await addMember(clientC.id, memberC2);
  await makeGeckoAdmin(gecko);
  await makeAdmin(admin);
  projectTest = await signedProject(clientT.id);
  setA = await makeSet(clientA.id);
  setB = await makeSet(clientB.id);
}, 240_000);

afterAll(async () => {
  // Issuing queues due payment_requested mails: mark them skipped so this suite never
  // starves sv_claim_due_mail (limit 50) in mailoutbox.rls.test.ts on the shared branch.
  const ids = [clientA, clientB, clientT, clientC].filter(Boolean).map((c) => c.id);
  if (ids.length > 0) {
    await svc().from('sv_mail_outbox').update({ status: 'skipped' }).in('client_id', ids).eq('status', 'pending');
  }
  await cleanup();
});

// ---------------------------------------------------------------------------
// Task 1: numbering, series, rollover, idempotency, immutability
// ---------------------------------------------------------------------------

describe('gapless numbering (D-11)', () => {
  it('8 parallel issues yield exactly previous+1..previous+8 with no duplicate', async () => {
    const year = parisYear();
    const projects: string[] = [];
    for (let i = 0; i < 8; i++) projects.push(await signedProject(clientA.id));
    const before = counter('FA', year);
    const results = await Promise.all(
      projects.map((p) => issueTestInvoice(p, { kind: 'period' })),
    );
    const seqs = results.map((r) => seqOf(r.number)).sort((a, b) => a - b);
    expect(new Set(seqs).size).toBe(8);
    expect(seqs).toEqual(Array.from({ length: 8 }, (_, i) => before + 1 + i));
    for (const r of results) expect(r.number).toMatch(/^FA-\d{4}-\d{4}$/);
    expect(counter('FA', year)).toBe(before + 8);
  }, 240_000);

  it('a transaction that fails after allocating a number rolls the counter back', async () => {
    const year = parisYear();
    const p = await signedProject(clientA.id);
    const before = counter('FA', year);
    const id = randomUUID();
    // The DO block allocates a number then raises: the whole transaction is a rollback.
    const out = dbQuery(
      `do $$ declare r jsonb; begin r := ${sqlIssue({ id, key: `rls-rb-${id}`, projectId: p, kind: 'period', now: 'now()' })}; ` +
        `raise exception using message = 'ALLOCATED ' || jsonb_extract_path_text(r, 'number'); end $$`,
    );
    const m = /ALLOCATED (FA-\d{4}-\d{4})/.exec(out);
    expect(m, out).not.toBeNull();
    expect(counter('FA', year)).toBe(before);
    const next = await issueTestInvoice(p, { kind: 'period' });
    expect(next.number).toBe(m![1]);
    expect(seqOf(next.number)).toBe(before + 1);
  }, 120_000);

  it('year and issue date follow Europe/Paris', () => {
    const late = issueAt(projectTest, 'period', `'2026-12-31 23:30:00+00'::timestamptz`);
    expect(String(late.number)).toMatch(/^TFA-2027-\d{4}$/);
    expect(String(late.issued_on)).toBe('2027-01-01');
    const early = issueAt(projectTest, 'period', `'2026-12-31 22:30:00+00'::timestamptz`);
    expect(String(early.number)).toMatch(/^TFA-2026-\d{4}$/);
    expect(String(early.issued_on)).toBe('2026-12-31');
  }, 120_000);
});

describe('independent series (D-01)', () => {
  it('test client uses TFA/TAV and never consumes FA/AV numbers', async () => {
    const year = parisYear();
    const faBefore = counter('FA', year);
    const avBefore = counter('AV', year);
    const tfaBefore = counter('TFA', year);
    const tavBefore = counter('TAV', year);

    const inv = await issueTestInvoice(projectTest, { kind: 'deposit' });
    expect(inv.number).toMatch(new RegExp(`^TFA-${year}-`));
    const cn = await issueTestCreditNote(inv.invoice_id, { scope: 'total', amountCents: 50000 });
    expect(cn.number).toMatch(new RegExp(`^TAV-${year}-`));

    expect(counter('FA', year)).toBe(faBefore);
    expect(counter('AV', year)).toBe(avBefore);
    expect(counter('TFA', year)).toBe(tfaBefore + 1);
    expect(counter('TAV', year)).toBe(tavBefore + 1);

    // credit note on a real (FA) invoice takes the AV series
    const real = await issueTestCreditNote(setA.deposit.invoice_id, { scope: 'partial', amountCents: 1000 });
    expect(real.number).toMatch(new RegExp(`^AV-${year}-`));
    expect(counter('AV', year)).toBe(avBefore + 1);
  }, 120_000);

  it('the test flag is locked once the client has invoices', async () => {
    await expect(setClientTest(clientT.id, false)).rejects.toThrow(/sv_client_test_flag_locked/);
    await expect(setClientTest(clientA.id, true)).rejects.toThrow(/sv_client_test_flag_locked/);
  });
});

describe('idempotency and business guards', () => {
  it('same key returns the same number, a different id under the same key returns the first', async () => {
    const p = await signedProject(clientA.id);
    const id = randomUUID();
    const key = `rls-idem-${id}`;
    const first = await issueTestInvoice(p, { kind: 'period', id, issueKey: key });
    expect(first.already).toBe(false);
    const again = await issueTestInvoice(p, { kind: 'period', id, issueKey: key });
    expect(again.already).toBe(true);
    expect(again.number).toBe(first.number);
    const other = await issueTestInvoice(p, { kind: 'period', issueKey: key });
    expect(other.already).toBe(true);
    expect(other.number).toBe(first.number);
    expect(other.invoice_id).toBe(first.invoice_id);
  }, 120_000);

  it('rejects line and total mismatches', async () => {
    const p = await signedProject(clientA.id);
    await expect(
      issueTestInvoice(p, { kind: 'period', lines: [{ ...lineOf(50000), line_total_cents: 49999 }] }),
    ).rejects.toThrow(/sv_invoice_line_mismatch/);
    await expect(
      issueTestInvoice(p, { kind: 'period', header: { total_excl_tax_cents: 60000 } }),
    ).rejects.toThrow(/sv_invoice_total_mismatch/);
  }, 120_000);

  it('enforces contract / acceptance prerequisites and one deposit per project', async () => {
    const bare = await makeProject(clientA.id);
    await expect(issueTestInvoice(bare, { kind: 'deposit' })).rejects.toThrow(/sv_invoice_contract_not_signed/);

    const contractOnly = await signedProject(clientA.id);
    await expect(issueTestInvoice(contractOnly, { kind: 'final' })).rejects.toThrow(/sv_invoice_acceptance_not_signed/);

    await issueTestInvoice(contractOnly, { kind: 'deposit' });
    await expect(issueTestInvoice(contractOnly, { kind: 'deposit' })).rejects.toThrow(/sv_invoice_kind_exists/);
  }, 120_000);

  it('refuses a final invoice with nothing to pay and leaves the counter untouched', async () => {
    const year = parisYear();
    const p = await acceptedProject(clientA.id);
    const dep = await issueTestInvoice(p, { kind: 'deposit' });
    const before = counter('FA', year);
    await expect(
      issueTestInvoice(p, {
        kind: 'final',
        lines: [lineOf(50000)],
        deductions: [
          { label: 'Acompte', ref_invoice_id: dep.invoice_id, ref_number: dep.number, ref_date: dep.issued_on, amount_cents: 50000 },
        ],
      }),
    ).rejects.toThrow(/sv_invoice_nothing_to_pay/);
    expect(counter('FA', year)).toBe(before);
  }, 120_000);
});

describe('immutability (D-13)', () => {
  const tables = {
    sv_invoices: ['template_version', 'id'],
    sv_invoice_lines: ['designation', 'invoice_id'],
    sv_invoice_deductions: ['label', 'invoice_id'],
    sv_invoice_pdfs: ['sha256', 'invoice_id'],
  } as const;

  it('service_role cannot update or delete any ledger table', async () => {
    for (const [t, [col, key]] of Object.entries(tables)) {
      const target = key === 'id' ? setA.deposit.invoice_id : setA.final.invoice_id;
      const up = await svc().from(t).update({ [col]: 'x' }).eq(key, target);
      expect(up.error, `update ${t}`).not.toBeNull();
      expect(up.error!.message, `update ${t}`).toMatch(/sv_immutable_table|permission denied/);
      const del = await svc().from(t).delete().eq(key, target);
      expect(del.error, `delete ${t}`).not.toBeNull();
      expect(del.error!.message, `delete ${t}`).toMatch(/sv_immutable_table|permission denied/);
    }
  });

  it('the triggers refuse update, delete and truncate even for the table owner', () => {
    const upd = dbQuery(`update public.sv_invoices set reason = 'tamper' where id = '${setA.deposit.invoice_id}'`);
    expect(upd).toMatch(/sv_immutable_table/);
    const del = dbQuery(`delete from public.sv_invoice_lines where invoice_id = '${setA.deposit.invoice_id}'`);
    expect(del).toMatch(/sv_immutable_table/);
    const delDed = dbQuery(`delete from public.sv_invoice_deductions where invoice_id = '${setA.final.invoice_id}'`);
    expect(delDed).toMatch(/sv_immutable_table/);
    const delPdf = dbQuery(`delete from public.sv_invoice_pdfs where invoice_id = '${setA.final.invoice_id}'`);
    expect(delPdf).toMatch(/sv_immutable_table/);
    const tr = dbQuery(`truncate public.sv_invoices cascade`);
    expect(tr).toMatch(/sv_immutable_table|cannot truncate/);
    const left = dbRows(`select count(*)::int as n from public.sv_invoices where id = '${setA.deposit.invoice_id}'`);
    expect(Number(left[0].n)).toBe(1);
  });

  it('service_role cannot insert an invoice directly', async () => {
    const r = await svc().from('sv_invoices').insert({
      id: randomUUID(),
      issue_key: `rls-direct-${randomUUID()}`,
      project_id: setA.projectId,
      client_id: clientA.id,
      kind: 'period',
      series: 'FA',
      year: 2026,
      seq: 9999,
      number: 'FA-2026-9999',
    });
    expect(r.error).not.toBeNull();
    expect(r.error!.message).toMatch(/permission denied/);
  });

  it('a counter decrement and a counter delete are refused', () => {
    const year = parisYear();
    const dec = dbQuery(`update public.sv_invoice_counters set last_seq = last_seq - 1 where series = 'FA' and year = ${year}`);
    expect(dec).toMatch(/sv_counter_violation/);
    const del = dbQuery(`delete from public.sv_invoice_counters where series = 'FA' and year = ${year}`);
    expect(del).toMatch(/sv_counter_violation/);
    expect(counter('FA', year)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Task 2: credit notes, outbox, isolation, retention, PAY-05 shape
// ---------------------------------------------------------------------------

async function outboxRows(like: string) {
  const r = await svc()
    .from('sv_mail_outbox')
    .select('dedupe_key, status, send_after, event_type, recipient_email')
    .like('dedupe_key', like);
  if (r.error) throw new Error(`outbox read failed: ${r.error.message}`);
  return r.data ?? [];
}

async function issuedAt(invoiceId: string): Promise<number> {
  const r = await svc().from('sv_invoices').select('issued_at').eq('id', invoiceId).single();
  if (r.error || !r.data) throw new Error(`issued_at read failed: ${r.error?.message}`);
  return new Date(r.data.issued_at as string).getTime();
}

describe('credit notes (D-14, D-17)', () => {
  it('enforces reason, cumulative cap, no credit of a credit note and skips reminders on full credit', async () => {
    const p = await signedProject(clientC.id);
    const dep = await issueTestInvoice(p, { kind: 'deposit', lines: [lineOf(360000)] });

    await expect(issueTestCreditNote(dep.invoice_id, { scope: 'partial', amountCents: 1000, reason: 'ab' })).rejects.toThrow(
      /sv_credit_reason_invalid/,
    );

    const part = await issueTestCreditNote(dep.invoice_id, { scope: 'partial', amountCents: 100000 });
    expect(part.fully_credited).toBe(false);
    await expect(issueTestCreditNote(dep.invoice_id, { scope: 'partial', amountCents: 300000 })).rejects.toThrow(
      /sv_credit_exceeds_invoice/,
    );

    await expect(issueTestCreditNote(part.credit_note_id, { scope: 'partial', amountCents: 1000 })).rejects.toThrow(
      /sv_cannot_credit_credit_note/,
    );

    // reminders are still pending before the full credit
    const pendingBefore = (await outboxRows(`payment_reminder:${dep.invoice_id}:%`)).filter((r) => r.status === 'pending');
    expect(pendingBefore.length).toBe(4);

    const rest = await issueTestCreditNote(dep.invoice_id, { scope: 'total', amountCents: 260000 });
    expect(rest.fully_credited).toBe(true);

    const reminders = await outboxRows(`payment_reminder:${dep.invoice_id}:%`);
    expect(reminders.length).toBe(4);
    for (const r of reminders) expect(r.status).toBe('skipped');
    const adminRows = await outboxRows(`payment_reminder_admin:${dep.invoice_id}:%`);
    expect(adminRows.length).toBe(1);
    expect(adminRows[0].status).toBe('skipped');
  }, 180_000);

  it('a deposit invoice that is not credited keeps its reminders pending (+3, +7, +14 days)', async () => {
    const p = await signedProject(clientC.id);
    const dep = await issueTestInvoice(p, { kind: 'deposit' });
    const base = await issuedAt(dep.invoice_id);

    const reminders = await outboxRows(`payment_reminder:${dep.invoice_id}:%`);
    // the implementation enqueues two client reminders (d3, d7) per member
    expect(reminders.length).toBe(4);
    for (const r of reminders) expect(r.status).toBe('pending');
    for (const stage of ['d3', 'd7']) {
      const rows = reminders.filter((r) => r.dedupe_key.includes(`:${stage}:`));
      expect(rows.length).toBe(2);
      const days = stage === 'd3' ? 3 : 7;
      for (const r of rows) expect(Math.abs(new Date(r.send_after as string).getTime() - (base + days * DAY_MS))).toBeLessThan(5000);
    }
    const adminRows = await outboxRows(`payment_reminder_admin:${dep.invoice_id}:%`);
    expect(adminRows.length).toBe(1);
    expect(adminRows[0].status).toBe('pending');
    expect(Math.abs(new Date(adminRows[0].send_after as string).getTime() - (base + 14 * DAY_MS))).toBeLessThan(5000);
  }, 120_000);
});

describe('outbox on issue', () => {
  it('inserts one payment_requested per member and nothing on re-issue', async () => {
    const p = await signedProject(clientC.id);
    const id = randomUUID();
    const key = `rls-ob-${id}`;
    const first = await issueTestInvoice(p, { kind: 'deposit', id, issueKey: key });
    const rows = await outboxRows(`payment_requested:${id}:%`);
    expect(rows.length).toBe(2);
    const expected = [memberC1.email, memberC2.email].map((e) => `payment_requested:${id}:${e.toLowerCase()}`).sort();
    expect(rows.map((r) => r.dedupe_key).sort()).toEqual(expected);
    expect(first.outbox_ids.length).toBe(2);

    const again = await issueTestInvoice(p, { kind: 'deposit', id, issueKey: key });
    expect(again.already).toBe(true);
    expect(again.outbox_ids.length).toBe(0);
    expect((await outboxRows(`payment_requested:${id}:%`)).length).toBe(2);
  }, 120_000);
});

describe('RLS isolation (D-18)', () => {
  it('members read only their own invoices, lines, deductions and pdfs', async () => {
    const ids = (rows: { id: string }[] | null) => (rows ?? []).map((r) => r.id);

    const a = await memberA.client.from('sv_invoices').select('id, number');
    expect(a.error).toBeNull();
    expect(ids(a.data as any)).toContain(setA.deposit.invoice_id);
    expect(ids(a.data as any)).toContain(setA.final.invoice_id);
    expect(ids(a.data as any)).not.toContain(setB.deposit.invoice_id);
    expect(ids(a.data as any)).not.toContain(setB.final.invoice_id);

    const b = await memberB.client.from('sv_invoices').select('id, number');
    expect(ids(b.data as any)).toContain(setB.final.invoice_id);
    expect(ids(b.data as any)).not.toContain(setA.final.invoice_id);

    const linesA = await memberA.client.from('sv_invoice_lines').select('invoice_id');
    const lineInv = (linesA.data ?? []).map((r) => r.invoice_id);
    expect(lineInv).toContain(setA.final.invoice_id);
    expect(lineInv).not.toContain(setB.final.invoice_id);

    const dedA = await memberA.client.from('sv_invoice_deductions').select('invoice_id');
    const dedInv = (dedA.data ?? []).map((r) => r.invoice_id);
    expect(dedInv).toContain(setA.final.invoice_id);
    expect(dedInv).not.toContain(setB.final.invoice_id);

    const pdfA = await memberA.client.from('sv_invoice_pdfs').select('invoice_id');
    const pdfInv = (pdfA.data ?? []).map((r) => r.invoice_id);
    expect(pdfInv).toContain(setA.final.invoice_id);
    expect(pdfInv).not.toContain(setB.final.invoice_id);

    const pdfB = await memberB.client.from('sv_invoice_pdfs').select('invoice_id');
    const pdfBInv = (pdfB.data ?? []).map((r) => r.invoice_id);
    expect(pdfBInv).toContain(setB.final.invoice_id);
    expect(pdfBInv).not.toContain(setA.final.invoice_id);
  });

  it('anonymous, plain and Gecko users read nothing', async () => {
    for (const [label, c] of [
      ['anon', anonClient()],
      ['plain', plain.client],
      ['gecko', gecko.client],
    ] as const) {
      for (const [table, col] of [
        ['sv_invoices', 'id'],
        ['sv_invoice_lines', 'invoice_id'],
        ['sv_invoice_deductions', 'invoice_id'],
        ['sv_invoice_pdfs', 'invoice_id'],
      ] as const) {
        const r = await c.from(table).select(col);
        expect(r.error !== null || (r.data ?? []).length === 0, `${label} ${table}`).toBe(true);
      }
    }
  });

  it('admin reads both clients', async () => {
    const r = await admin.client.from('sv_invoices').select('id');
    expect(r.error).toBeNull();
    const ids = (r.data ?? []).map((x) => x.id);
    expect(ids).toContain(setA.final.invoice_id);
    expect(ids).toContain(setB.final.invoice_id);
  });

  it('hides snapshot, created_by, storage_path and the counters from clients', async () => {
    for (const col of ['snapshot', 'created_by']) {
      const r = await memberA.client.from('sv_invoices').select(col);
      expect(r.error, col).not.toBeNull();
    }
    const pdf = await memberA.client.from('sv_invoice_pdfs').select('storage_path');
    expect(pdf.error).not.toBeNull();
    const cnt = await memberA.client.from('sv_invoice_counters').select('last_seq');
    expect(cnt.error !== null || (cnt.data ?? []).length === 0).toBe(true);
    expect(cnt.error).not.toBeNull();
  });
});

describe('retention (Pitfall 14)', () => {
  it('deleting a client that has invoices fails', async () => {
    const r = await svc().from('sv_clients').delete().eq('id', clientA.id);
    expect(r.error).not.toBeNull();
    expect(r.error!.message).toMatch(/violates foreign key|sv_immutable_table/);
    const still = await svc().from('sv_clients').select('id').eq('id', clientA.id);
    expect((still.data ?? []).length).toBe(1);
  });
});

describe('PAY-05 invoice shape', () => {
  it('a final invoice carries the structured seller, buyer, VAT and prepaid data', async () => {
    const r = await svc().from('sv_invoices').select('*').eq('id', setA.final.invoice_id).single();
    expect(r.error).toBeNull();
    const row = r.data as Record<string, any>;
    expect(row.seller_siret).toBeTruthy();
    expect(row.seller_iban).toBeTruthy();
    expect(row.buyer_name).toBeTruthy();
    expect(row.vat_exemption_code).toBe('VATEX-FR-FRANCHISE');
    expect(Number(row.en16931_type_code)).toBe(380);

    const ded = await svc().from('sv_invoice_deductions').select('amount_cents').eq('invoice_id', setA.final.invoice_id);
    const sum = (ded.data ?? []).reduce((s, d) => s + Number(d.amount_cents), 0);
    expect(sum).toBe(50000);
    expect(Number(row.prepaid_cents)).toBe(sum);
    expect(Number(row.net_to_pay_cents)).toBe(Number(row.total_incl_tax_cents) - Number(row.prepaid_cents));
    expect(Number(row.net_to_pay_cents)).toBe(100000);
  });

  it('a deposit invoice has type code 386', async () => {
    const r = await svc().from('sv_invoices').select('en16931_type_code, kind').eq('id', setA.deposit.invoice_id).single();
    expect(r.error).toBeNull();
    expect(Number((r.data as any).en16931_type_code)).toBe(386);
    expect((r.data as any).kind).toBe('deposit');
  });
});
