/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const S = vi.hoisted(() => ({
  enqueue: vi.fn(),
  tables: {} as Record<string, any[]>,
  errorOn: null as string | null,
  queries: [] as { table: string; filters: [string, string, any][] }[],
  updates: [] as { values: any; filters: [string, string, any][] }[],
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/mail/outbox', () => ({ enqueueMail: S.enqueue }));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      const filters: [string, string, any][] = [];
      let range: [number, number] | null = null;
      let updateValues: any = null;
      const b: any = {};
      b.select = () => b;
      b.order = () => b;
      b.in = (c: string, v: any) => (filters.push([c, 'in', v]), b);
      b.eq = (c: string, v: any) => (filters.push([c, 'eq', v]), b);
      b.gte = (c: string, v: any) => (filters.push([c, 'gte', v]), b);
      b.update = (v: any) => ((updateValues = v), b);
      b.range = (a: number, z: number) => ((range = [a, z]), b);
      b.then = (res: any, rej: any) => {
        if (updateValues) {
          S.updates.push({ values: updateValues, filters });
          return Promise.resolve({ error: null }).then(res, rej);
        }
        S.queries.push({ table, filters });
        if (S.errorOn === table) return Promise.resolve({ data: null, error: { message: 'x' } }).then(res, rej);
        let rows = (S.tables[table] ?? []).filter((r) =>
          filters.every(([c, op, v]) =>
            op === 'in' ? v.includes(r[c]) : op === 'eq' ? r[c] === v : String(r[c]) >= String(v),
          ),
        );
        if (range) rows = rows.slice(range[0], range[1] + 1);
        return Promise.resolve({ data: rows, error: null }).then(res, rej);
      };
      return b;
    },
  }),
}));

import { planReminders, sweepReminders, type PlanInput, type PlanOpts } from './sweep';

const NOW = new Date('2026-10-20T10:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const OFF: PlanOpts = { reviewEnabled: false, reviewLink: () => null, limit: 100 };

const doc = (over: Record<string, unknown> = {}) => ({
  id: 'd1',
  project_id: 'p1',
  doc_type: 'quote',
  revision: 1,
  replaces_document_id: null,
  issued_at: daysAgo(3),
  ...over,
});
const fact = (over: Record<string, unknown> = {}) => ({
  id: 1,
  project_id: 'p1',
  type: 'quote_accepted',
  target_fact_id: null,
  actor_kind: 'client',
  created_at: daysAgo(1),
  ...over,
});
const base = (over: Partial<PlanInput> = {}): PlanInput => ({
  docs: [doc()],
  facts: [],
  submissions: [],
  holds: [],
  projects: [{ id: 'p1', client_id: 'c1', title: 'Site' }],
  members: [
    { client_id: 'c1', invited_email: 'A@x.fr' },
    { client_id: 'c1', invited_email: 'b@x.fr' },
    { client_id: 'c2', invited_email: 'other@y.fr' },
  ],
  clients: [{ id: 'c1', name: 'Acme' }],
  openReminderRows: [],
  ...over,
});
const plan = (input: PlanInput, opts = OFF) => planReminders(input, NOW, opts);

describe('planReminders documents', () => {
  it('d3 to each member of the project client only', () => {
    const { enqueues } = plan(base());
    expect(enqueues).toHaveLength(2);
    expect(enqueues.map((e) => e.dedupeKey).sort()).toEqual([
      'document_reminder:d1:d3:a@x.fr',
      'document_reminder:d1:d3:b@x.fr',
    ]);
    expect(enqueues[0]).toMatchObject({
      event: 'document_reminder',
      payload: { documentLabel: 'Devis', projectTitle: 'Site', revision: 1, stage: 'd3' },
    });
    expect(enqueues.some((e) => e.recipientEmail === 'other@y.fr')).toBe(false);
  });

  it('d7 only at day 7', () => {
    const { enqueues } = plan(base({ docs: [doc({ issued_at: daysAgo(7) })] }));
    expect(enqueues.every((e) => (e.payload as any).stage === 'd7')).toBe(true);
    expect(enqueues).toHaveLength(2);
  });

  it('day 14 adds one admin reminder', () => {
    const { enqueues } = plan(base({ docs: [doc({ issued_at: daysAgo(14) })] }));
    expect(enqueues.filter((e) => e.event === 'document_reminder')).toHaveLength(2);
    const admin = enqueues.filter((e) => e.event === 'document_reminder_admin');
    expect(admin).toHaveLength(1);
    expect(admin[0].recipientEmail).toBe('contact@sevalys.com');
    expect(admin[0].dedupeKey).toBe('document_reminder_admin:d1:d14');
    expect(admin[0].payload).toEqual({
      documentLabel: 'Devis',
      projectTitle: 'Site',
      clientName: 'Acme',
      issuedOn: '2026-10-06',
      projectId: 'p1',
    });
  });

  it('nothing at day 2 or day 61', () => {
    expect(plan(base({ docs: [doc({ issued_at: daysAgo(2) })] })).enqueues).toEqual([]);
    expect(plan(base({ docs: [doc({ issued_at: daysAgo(61) })] })).enqueues).toEqual([]);
  });

  it('signed document gets nothing; revoked signature resumes', () => {
    expect(plan(base({ facts: [fact()] })).enqueues).toEqual([]);
    const revoked = [fact(), fact({ id: 2, type: 'fact_revoked', target_fact_id: 1 })];
    expect(plan(base({ facts: revoked })).enqueues).toHaveLength(2);
  });

  it('replaced revision is skipped and the stage counts from the new revision', () => {
    const docs = [
      doc({ issued_at: daysAgo(10) }),
      doc({ id: 'd2', revision: 2, replaces_document_id: 'd1', issued_at: daysAgo(1) }),
    ];
    expect(plan(base({ docs })).enqueues).toEqual([]);
    const later = [docs[0], { ...docs[1], issued_at: daysAgo(3) }];
    const { enqueues } = plan(base({ docs: later }));
    expect(enqueues.map((e) => e.dedupeKey)).toEqual([
      'document_reminder:d2:d3:a@x.fr',
      'document_reminder:d2:d3:b@x.fr',
    ]);
  });

  it('refused acceptance and spec documents get nothing', () => {
    const acc = doc({ id: 'a1', doc_type: 'acceptance' });
    expect(plan(base({ docs: [acc], submissions: [{ document_id: 'a1', refused_count: 2 }] })).enqueues).toEqual([]);
    expect(plan(base({ docs: [acc], submissions: [{ document_id: 'a1', refused_count: 0 }] })).enqueues).toHaveLength(2);
    expect(plan(base({ docs: [doc({ doc_type: 'spec' })] })).enqueues).toEqual([]);
  });

  it('suspended project gets nothing and its open rows go stale', () => {
    const open = [{ id: 'o1', event_type: 'document_reminder', dedupe_key: 'document_reminder:d1:d3:a@x.fr', project_id: 'p1', status: 'pending' }];
    const r = plan(base({ holds: [{ id: 1, project_id: 'p1', action: 'suspend', created_at: daysAgo(1) }], openReminderRows: open }));
    expect(r.enqueues).toEqual([]);
    expect(r.staleIds).toEqual(['o1']);
  });

  it('open row of a signed or replaced document goes stale, a due one stays', () => {
    const open = [
      { id: 'o1', event_type: 'document_reminder', dedupe_key: 'document_reminder:d1:d3:a@x.fr', project_id: 'p1', status: 'pending' },
      { id: 'o2', event_type: 'document_reminder_admin', dedupe_key: 'document_reminder_admin:d1:d14', project_id: 'p1', status: 'failed' },
    ];
    expect(plan(base({ facts: [fact()], openReminderRows: open })).staleIds).toEqual(['o1', 'o2']);
    expect(plan(base({ openReminderRows: open })).staleIds).toEqual([]);
  });

  it('limit caps enqueues', () => {
    expect(plan(base(), { ...OFF, limit: 1 }).enqueues).toHaveLength(1);
  });
});

describe('planReminders review requests', () => {
  const signed = (days: number) => [
    fact({ id: 9, type: 'acceptance_signed', created_at: daysAgo(days) }),
  ];
  const on: PlanOpts = { reviewEnabled: true, reviewLink: () => 'https://sevalys.com/avis/test-token', limit: 100 };

  it('d7, d21, and d21 again at day 30', () => {
    for (const [days, stage] of [[7, 'd7'], [21, 'd21'], [30, 'd21']] as const) {
      const { enqueues } = plan(base({ docs: [], facts: signed(days) }), on);
      expect(enqueues).toHaveLength(2);
      expect(enqueues[0]).toMatchObject({
        event: 'review_request',
        payload: { projectTitle: 'Site', reviewUrl: 'https://sevalys.com/avis/test-token', stage },
      });
    }
    expect(plan(base({ docs: [], facts: signed(5) }), on).enqueues).toEqual([]);
  });

  it('nothing and stale when the flag is off or no link', () => {
    const open = [{ id: 'r1', event_type: 'review_request', dedupe_key: 'review_request:p1:d7:a@x.fr', project_id: 'p1', status: 'pending' }];
    const input = base({ docs: [], facts: signed(7), openReminderRows: open });
    for (const o of [{ ...on, reviewEnabled: false }, { ...on, reviewLink: () => null }]) {
      const r = plan(input, o);
      expect(r.enqueues).toEqual([]);
      expect(r.staleIds).toEqual(['r1']);
    }
  });
});

describe('sweepReminders', () => {
  const projectRows = () => ({
    sv_project_documents: [doc()],
    sv_project_facts: [],
    sv_acceptance_submissions: [],
    sv_reminder_holds: [],
    sv_projects: [{ id: 'p1', client_id: 'c1', title: 'Site' }],
    sv_client_members: [{ client_id: 'c1', user_id: 'u1', invited_email: 'a@x.fr' }],
    sv_clients: [{ id: 'c1', name: 'Acme' }],
    sv_mail_outbox: [],
  });
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    S.enqueue.mockReset();
    S.enqueue.mockResolvedValue({ id: 'x', inserted: true });
    S.tables = projectRows();
    S.errorOn = null;
    S.queries = [];
    S.updates = [];
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('counts inserted as queued and the second run as duplicates', async () => {
    S.tables.sv_project_documents = [doc({ issued_at: daysAgo(3) })];
    expect(await sweepReminders({ now: NOW })).toEqual({ queued: 1, duplicates: 0, stale: 0, failed: 0 });
    S.enqueue.mockResolvedValue({ id: null, inserted: false });
    expect(await sweepReminders({ now: NOW })).toEqual({ queued: 0, duplicates: 1, stale: 0, failed: 0 });
  });

  it('marks stale rows skipped only for pending or failed', async () => {
    S.tables.sv_project_facts = [fact()];
    S.tables.sv_mail_outbox = [
      { id: 'o1', event_type: 'document_reminder', dedupe_key: 'document_reminder:d1:d3:a@x.fr', project_id: 'p1', status: 'pending' },
    ];
    const r = await sweepReminders({ now: NOW });
    expect(r.stale).toBe(1);
    expect(S.updates).toHaveLength(1);
    expect(S.updates[0].values).toEqual({ status: 'skipped', last_error: 'no_longer_due' });
    expect(S.updates[0].filters).toContainEqual(['status', 'in', ['pending', 'failed']]);
  });

  it('read error fails closed with a fixed log', async () => {
    S.tables.sv_mail_outbox = [
      { id: 'o1', event_type: 'document_reminder', dedupe_key: 'document_reminder:d9:d3:a@x.fr', project_id: 'p1', status: 'pending' },
    ];
    S.errorOn = 'sv_project_facts';
    const r = await sweepReminders({ now: NOW });
    expect(r).toEqual({ queued: 0, duplicates: 0, stale: 0, failed: 1 });
    expect(S.enqueue).not.toHaveBeenCalled();
    expect(S.updates).toHaveLength(0);
    expect(errSpy).toHaveBeenCalledWith('[reminders/sweep] read_failed');
    expect(JSON.stringify(errSpy.mock.calls)).not.toContain('@');
  });

  it('reads a signing fact beyond the first page (1500 facts)', async () => {
    const many = Array.from({ length: 1500 }, (_, i) =>
      fact({ id: i + 1, type: 'fact_revoked', target_fact_id: 99999, created_at: daysAgo(1) }),
    );
    many[1399] = fact({ id: 1400 });
    S.tables.sv_project_facts = many;
    const r = await sweepReminders({ now: NOW });
    expect(r.queued).toBe(0);
    expect(S.enqueue).not.toHaveBeenCalled();
  });

  it('page guard exceeded fails closed', async () => {
    S.tables.sv_project_facts = Array.from({ length: 20 * 500 + 1 }, (_, i) =>
      fact({ id: i + 1, type: 'fact_revoked', target_fact_id: 99999 }),
    );
    const r = await sweepReminders({ now: NOW });
    expect(r.failed).toBe(1);
    expect(S.enqueue).not.toHaveBeenCalled();
    expect(S.updates).toHaveLength(0);
  });

  it('scopes queries: documents by issued_at window, others by .in() ids', async () => {
    await sweepReminders({ now: NOW });
    const docsQ = S.queries.find((q) => q.table === 'sv_project_documents')!;
    const gte = docsQ.filters.find(([c, op]) => c === 'issued_at' && op === 'gte')!;
    expect(gte[2]).toBe(daysAgo(61));
    const facts = S.queries.filter((q) => q.table === 'sv_project_facts' && q.filters.some(([c]) => c === 'project_id'));
    expect(facts[0].filters).toContainEqual(['project_id', 'in', ['p1']]);
    expect(S.queries.find((q) => q.table === 'sv_acceptance_submissions')!.filters).toContainEqual(['document_id', 'in', ['d1']]);
    expect(S.queries.find((q) => q.table === 'sv_reminder_holds')!.filters).toContainEqual(['project_id', 'in', ['p1']]);
    expect(S.queries.find((q) => q.table === 'sv_client_members')!.filters).toContainEqual(['client_id', 'in', ['c1']]);
    expect(S.queries.some((q) => q.table.includes('lead'))).toBe(false);
  });
});
