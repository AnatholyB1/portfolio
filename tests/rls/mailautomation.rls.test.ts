import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addMember,
  anonClient,
  applyResendEvent,
  blockScope,
  cleanup,
  dbQuery,
  issueTestCreditNote,
  issueTestInvoice,
  liftSuppression,
  makeAdmin,
  makeClient,
  makeGeckoAdmin,
  makeProject,
  makeUser,
  reachContractSigned,
  recordUnsubscribe,
  setReminderHold,
  svc,
  uniqueEmail,
  type TestUser,
} from './helpers';

const TABLES = ['sv_mail_suppressions', 'sv_mail_suppression_lifts', 'sv_reminder_holds', 'sv_resend_events'] as const;
const FAR = () => new Date(Date.now() + 30 * 86_400_000).toISOString();

let clientA: { id: string };
let clientB: { id: string };
let memberA: TestUser;
let memberB: TestUser;
let plain: TestUser;
let gecko: TestUser;
let admin: TestUser;
let projectA: string;

const complaintAddr = uniqueEmail('complaint');
const bounceAddr = uniqueEmail('bounce');
const unsubAddr = uniqueEmail('unsub');

async function suppressionId(email: string, cause?: string): Promise<number> {
  let q = svc().from('sv_mail_suppressions').select('id').eq('email_norm', email.toLowerCase().trim());
  if (cause) q = q.eq('cause', cause);
  const { data, error } = await q.order('id', { ascending: false }).limit(1);
  if (error || !data?.length) throw new Error(`suppression not found: ${error?.message}`);
  return Number(data[0].id);
}

async function outboxBy(type: string, key: string) {
  const { data, error } = await svc()
    .from('sv_mail_outbox')
    .select('*')
    .eq('event_type', type)
    .eq('dedupe_key', key);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, any>[];
}

async function alertsFor(suppressionIdValue: number) {
  return outboxBy('mail_suppression_admin', `mail_suppression_admin:${suppressionIdValue}`);
}

beforeAll(async () => {
  memberA = await makeUser('maA');
  memberB = await makeUser('maB');
  plain = await makeUser('maPlain');
  gecko = await makeUser('maGecko');
  await makeGeckoAdmin(gecko);
  admin = await makeUser('maAdmin');
  await makeAdmin(admin);
  clientA = await makeClient('RLS MailAuto A');
  clientB = await makeClient('RLS MailAuto B');
  await addMember(clientA.id, memberA);
  await addMember(clientB.id, memberB);
  projectA = await makeProject(clientA.id);

  // Seed: complaint, permanent bounce, unsubscribe, one lift, one hold.
  const c = await applyResendEvent({ type: 'email.complained', emails: [complaintAddr] });
  if (c.error) throw new Error(c.error.message);
  const b = await applyResendEvent({ type: 'email.bounced', emails: [bounceAddr], bounceType: 'Permanent' });
  if (b.error) throw new Error(b.error.message);
  const u = await recordUnsubscribe(unsubAddr);
  if (u.error) throw new Error(u.error.message);
  const l = await liftSuppression(await suppressionId(unsubAddr, 'unsubscribe'), 'seed lift for RLS', admin.id);
  if (l.error) throw new Error(l.error.message);
  const h = await setReminderHold(projectA, 'suspend', admin.id);
  if (h.error) throw new Error(h.error.message);
});

afterAll(cleanup);

describe('isolation of the four phase-16 tables', () => {
  it('client A, client B, a plain user, a Gecko admin and anon read zero rows', async () => {
    const actors: [string, any][] = [
      ['memberA', memberA.client],
      ['memberB', memberB.client],
      ['plain', plain.client],
      ['gecko', gecko.client],
      ['anon', anonClient()],
    ];
    for (const t of TABLES) {
      for (const [label, c] of actors) {
        const res = await c.from(t).select('*');
        expect((res.data ?? []).length, `${label} on ${t}`).toBe(0);
      }
    }
  });

  it('an sv admin reads suppressions, lifts and holds, but nothing of sv_resend_events', async () => {
    const s = await admin.client.from('sv_mail_suppressions').select('email_norm').in('email_norm', [complaintAddr, bounceAddr, unsubAddr.toLowerCase()]);
    expect(s.data).toHaveLength(3);
    const l = await admin.client.from('sv_mail_suppression_lifts').select('id');
    expect((l.data ?? []).length).toBeGreaterThanOrEqual(1);
    const h = await admin.client.from('sv_reminder_holds').select('id').eq('project_id', projectA);
    expect((h.data ?? []).length).toBeGreaterThanOrEqual(1);
    const e = await admin.client.from('sv_resend_events').select('event_id');
    expect((e.data ?? []).length).toBe(0);
  });
});

describe('append-only journals', () => {
  it.each(TABLES)('service_role cannot update or delete %s through PostgREST', async (t) => {
    const col = t === 'sv_resend_events' ? 'event_id' : 'id';
    const upd = await svc().from(t).update({ [col]: t === 'sv_resend_events' ? 'x' : 1 }).not(col, 'is', null);
    expect(upd.error, `update ${t}`).not.toBeNull();
    const del = await svc().from(t).delete().not(col, 'is', null);
    expect(del.error, `delete ${t}`).not.toBeNull();
  });

  it.each(TABLES)('update, delete and truncate on %s fail for service_role and for the owner', async (t) => {
    const before = await svc().from(t).select('*', { count: 'exact', head: true });
    const tsCol = t === 'sv_resend_events' ? 'received_at' : 'created_at';
    const asService = (stmt: string) => `do $$ begin set local role service_role; ${stmt} end $$;`;
    // service_role holds no write grant: rejected at the privilege layer.
    for (const stmt of [`update public.${t} set ${tsCol} = now();`, `delete from public.${t};`, `truncate public.${t};`]) {
      expect(dbQuery(asService(stmt)), stmt).toMatch(/permission denied for table/);
    }
    // Even the table owner is stopped by the deny_mutation triggers (truncate on a table
    // referenced by a foreign key is refused earlier by Postgres itself).
    expect(dbQuery(`delete from public.${t};`), 'owner delete').toMatch(/sv_immutable_table/);
    expect(dbQuery(`update public.${t} set ${tsCol} = now();`), 'owner update').toMatch(/sv_immutable_table/);
    expect(dbQuery(`truncate public.${t};`), 'owner truncate').toMatch(/sv_immutable_table|foreign key/);
    const after = await svc().from(t).select('*', { count: 'exact', head: true });
    expect(after.count).toBe(before.count);
  });
});

describe('RPC privileges', () => {
  const calls: [string, Record<string, unknown>][] = [
    ['sv_apply_resend_event', { p_event_id: 'x', p_event_type: 'email.complained', p_emails: ['a@b.test'], p_bounce_type: null, p_admin_email: 'a@b.test' }],
    ['sv_record_unsubscribe', { p_email: 'a@b.test', p_source: 'link', p_admin_email: 'a@b.test' }],
    ['sv_lift_suppression', { p_suppression_id: 1, p_reason: 'reason', p_actor_id: randomUUID() }],
    ['sv_set_reminder_hold', { p_project_id: randomUUID(), p_action: 'suspend', p_actor_id: randomUUID() }],
    ['sv_mail_block_scope', { p_email: 'a@b.test' }],
  ];

  it.each(calls)('anon and authenticated cannot execute %s', async (fn, args) => {
    for (const c of [anonClient(), plain.client, admin.client]) {
      const r = await c.rpc(fn, args);
      expect(r.error, fn).not.toBeNull();
      expect(r.error?.message ?? '', fn).toMatch(/permission denied|not authorized|denied/i);
    }
  });

  it('a non-admin actor cannot lift or hold', async () => {
    const sid = await suppressionId(complaintAddr);
    const lift = await liftSuppression(sid, 'not allowed', plain.id);
    expect(lift.error?.message ?? '').toMatch(/sv_not_admin/);
    const hold = await setReminderHold(projectA, 'resume', plain.id);
    expect(hold.error?.message ?? '').toMatch(/sv_not_admin/);
  });
});

describe('outbox closed lists', () => {
  const base = (extra: Record<string, unknown>) => ({
    event_type: 'review_request',
    template: 'review_request',
    recipient_email: uniqueEmail('ob'),
    recipient_kind: 'client',
    dedupe_key: `rls-ma:${randomUUID()}`,
    send_after: FAR(),
    ...extra,
  });

  it('accepts review_request and rejects an unknown event type or template', async () => {
    const ok = await svc().from('sv_mail_outbox').insert(base({}));
    expect(ok.error).toBeNull();
    const badEvent = await svc().from('sv_mail_outbox').insert(base({ event_type: 'not_an_event' }));
    expect(badEvent.error).not.toBeNull();
    const badTpl = await svc().from('sv_mail_outbox').insert(base({ template: 'not_a_template' }));
    expect(badTpl.error).not.toBeNull();
  });
});

describe('idempotent Resend events', () => {
  it('the same event id twice yields one event row and one suppression', async () => {
    const email = uniqueEmail('dup');
    const eventId = `msg_test_${randomUUID().replace(/-/g, '')}`;
    const first = await applyResendEvent({ eventId, type: 'email.complained', emails: [email] });
    expect(first.error).toBeNull();
    expect((first.data as any).outcome).toBe('applied');
    const second = await applyResendEvent({ eventId, type: 'email.complained', emails: [email] });
    expect(second.error).toBeNull();
    expect((second.data as any).outcome).toBe('duplicate');
    const ev = await svc().from('sv_resend_events').select('*').eq('event_id', eventId);
    expect(ev.data).toHaveLength(1);
    const sup = await svc().from('sv_mail_suppressions').select('id').eq('email_norm', email);
    expect(sup.data).toHaveLength(1);
  });

  it.each(['Transient', 'Undetermined'])('a %s bounce is ignored and writes no suppression', async (bounceType) => {
    const email = uniqueEmail('soft');
    const eventId = `msg_test_${randomUUID().replace(/-/g, '')}`;
    const r = await applyResendEvent({ eventId, type: 'email.bounced', emails: [email], bounceType });
    expect(r.error).toBeNull();
    expect((r.data as any).outcome).toBe('ignored');
    const sup = await svc().from('sv_mail_suppressions').select('id').eq('email_norm', email);
    expect(sup.data).toHaveLength(0);
    const ev = await svc().from('sv_resend_events').select('outcome').eq('event_id', eventId);
    expect(ev.data).toEqual([{ outcome: 'ignored' }]);
  });
});

describe('block scopes, lift and unsubscribe', () => {
  it('complaint -> marketing, permanent bounce -> all, lift -> none, second lift -> already_lifted', async () => {
    const c = uniqueEmail('sc-c');
    const b = uniqueEmail('sc-b');
    await applyResendEvent({ type: 'email.complained', emails: [c] });
    await applyResendEvent({ type: 'email.bounced', emails: [b], bounceType: 'Permanent' });
    expect((await blockScope(c)).data).toBe('marketing');
    expect((await blockScope(b)).data).toBe('all');
    expect((await blockScope(uniqueEmail('none'))).data).toBe('none');

    const sid = await suppressionId(b, 'bounce_permanent');
    const lift = await liftSuppression(sid, 'verified address', admin.id);
    expect((lift.data as any).outcome).toBe('lifted');
    expect((await blockScope(b)).data).toBe('none');
    const again = await liftSuppression(sid, 'verified address', admin.id);
    expect((again.data as any).outcome).toBe('already_lifted');
  });

  it('a mixed-case address with spaces normalises to the same row', async () => {
    const raw = uniqueEmail('Case');
    const messy = `  ${raw.toUpperCase()}  `;
    const r = await applyResendEvent({ type: 'email.complained', emails: [messy] });
    expect(r.error).toBeNull();
    const rows = await svc().from('sv_mail_suppressions').select('email_norm').eq('email_norm', raw.toLowerCase());
    expect(rows.data).toHaveLength(1);
    expect((await blockScope(messy)).data).toBe('marketing');
  });

  it('a reason of 2 characters is rejected with sv_invalid_reason', async () => {
    const sid = await suppressionId(complaintAddr);
    const r = await liftSuppression(sid, 'ab', admin.id);
    expect(r.error?.message ?? '').toMatch(/sv_invalid_reason/);
  });

  it('unsubscribing twice returns recorded then already', async () => {
    const email = uniqueEmail('unsub2');
    const first = await recordUnsubscribe(email);
    expect((first.data as any).outcome).toBe('recorded');
    const second = await recordUnsubscribe(email);
    expect((second.data as any).outcome).toBe('already');
    const rows = await svc().from('sv_mail_suppressions').select('id').eq('email_norm', email);
    expect(rows.data).toHaveLength(1);
    expect((await blockScope(email)).data).toBe('marketing');
  });
});

describe('admin alerts', () => {
  it('a permanent bounce on an unknown address queues one masked alert to the admin', async () => {
    const email = uniqueEmail('al-b');
    const r = await applyResendEvent({ type: 'email.bounced', emails: [email], bounceType: 'Permanent' });
    expect((r.data as any).outbox_ids).toHaveLength(1);
    const rows = await alertsFor(await suppressionId(email));
    expect(rows).toHaveLength(1);
    expect(rows[0].event_type).toBe('mail_suppression_admin');
    expect(rows[0].recipient_email).toBe('contact@sevalys.com');
    expect(rows[0].payload.maskedEmail).not.toBe(email);
    expect(String(rows[0].payload.maskedEmail)).toContain('***@');
  });

  it('a complaint on an unknown address queues no alert', async () => {
    const email = uniqueEmail('al-c');
    const r = await applyResendEvent({ type: 'email.complained', emails: [email] });
    expect((r.data as any).outbox_ids).toHaveLength(0);
    expect(await alertsFor(await suppressionId(email))).toHaveLength(0);
  });

  it("a complaint on a client member's address queues an alert with the client name", async () => {
    const r = await applyResendEvent({ type: 'email.complained', emails: [memberA.email] });
    expect(r.error).toBeNull();
    const rows = await alertsFor(await suppressionId(memberA.email, 'complaint'));
    expect(rows).toHaveLength(1);
    expect(rows[0].payload.clientName).toBe('RLS MailAuto A');
  });
});

describe('reminder hold', () => {
  it('suspend skips document reminders only, repeat is unchanged, resume resumes', async () => {
    const proj = await makeProject(clientA.id);
    const docKey = `rls-ma-doc:${randomUUID()}`;
    const payKey = `rls-ma-pay:${randomUUID()}`;
    const mk = (event: string, key: string) => ({
      event_type: event,
      template: event,
      recipient_email: uniqueEmail('hold'),
      recipient_kind: 'client',
      dedupe_key: key,
      client_id: clientA.id,
      project_id: proj,
      send_after: FAR(),
    });
    const ins = await svc().from('sv_mail_outbox').insert([mk('document_reminder', docKey), mk('payment_reminder', payKey)]);
    expect(ins.error).toBeNull();

    const sus = await setReminderHold(proj, 'suspend', admin.id);
    expect((sus.data as any).outcome).toBe('suspended');
    const doc = (await outboxBy('document_reminder', docKey))[0];
    expect(doc.status).toBe('skipped');
    expect(doc.last_error).toBe('reminder_hold');
    const pay = (await outboxBy('payment_reminder', payKey))[0];
    expect(pay.status).toBe('pending');

    const again = await setReminderHold(proj, 'suspend', admin.id);
    expect((again.data as any).outcome).toBe('unchanged');
    const res = await setReminderHold(proj, 'resume', admin.id);
    expect((res.data as any).outcome).toBe('resumed');

    const holds = await svc().from('sv_reminder_holds').select('action').eq('project_id', proj).order('id');
    expect(holds.data).toEqual([{ action: 'suspend' }, { action: 'resume' }]);
  });
});

describe('deposit reminders stop on a full credit note (D-16)', () => {
  it('pending d3, d7 and admin d14 rows become skipped', async () => {
    const proj = await makeProject(clientA.id);
    await reachContractSigned(proj);
    const inv = await issueTestInvoice(proj, { kind: 'deposit' });
    const { data, error } = await svc()
      .from('sv_mail_outbox')
      .select('dedupe_key,status')
      .like('dedupe_key', `%${inv.invoice_id}%`);
    expect(error).toBeNull();
    const rem = (data ?? []).filter((r) => String(r.dedupe_key).startsWith('payment_reminder'));
    expect(rem.length).toBeGreaterThanOrEqual(3);
    expect(rem.every((r) => r.status === 'pending')).toBe(true);
    expect(rem.some((r) => String(r.dedupe_key).startsWith('payment_reminder_admin:'))).toBe(true);

    await issueTestCreditNote(inv.invoice_id, { scope: 'total', amountCents: 50000 });
    const after = await svc()
      .from('sv_mail_outbox')
      .select('dedupe_key,status')
      .like('dedupe_key', `%${inv.invoice_id}%`);
    const remAfter = (after.data ?? []).filter((r) => String(r.dedupe_key).startsWith('payment_reminder'));
    expect(remAfter).toHaveLength(rem.length);
    expect(remAfter.every((r) => r.status === 'skipped')).toBe(true);
  });
});
