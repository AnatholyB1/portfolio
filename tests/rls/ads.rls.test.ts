import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eventIdFor, type JournalEventName } from '@/lib/ads/events';
import {
  anonClient,
  cleanup,
  convertTestLead,
  correctTestLeadSource,
  dbQuery,
  issueTestDocument,
  makeAdmin,
  makeConvertibleLead,
  makeLeadViaRpc,
  makeUser,
  svc,
  uniqueEmail,
  type TestUser,
} from './helpers';

const GOLDEN = 'c2906e05-76be-58a0-b812-a56ec50f0a76';

let adminUser: TestUser;
let plainUser: TestUser;
const createdLeads: string[] = [];

beforeAll(async () => {
  adminUser = await makeUser('adsadmin');
  await makeAdmin(adminUser);
  plainUser = await makeUser('adsplain');
});

afterAll(cleanup);

async function newLead(opts: Parameters<typeof makeLeadViaRpc>[0] = {}) {
  const lead = await makeLeadViaRpc(opts);
  createdLeads.push(lead.lead_id);
  return lead;
}

async function conversions(leadId: string) {
  const { data, error } = await svc()
    .from('sv_conversion_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('occurred_at', { ascending: true })
    .order('id', { ascending: true });
  expect(error).toBeNull();
  return (data ?? []) as any[];
}

async function setStatus(id: string, status: string, lostReason?: string) {
  const r = await svc().rpc('sv_set_lead_status', {
    p_lead_id: id,
    p_status: status,
    p_actor: adminUser.id,
    p_lost_reason: status === 'lost' ? (lostReason ?? 'sans_reponse') : null,
    p_note: null,
  });
  expect(r.error, `status ${status}`).toBeNull();
}

async function leadRow(id: string) {
  const { data, error } = await svc().from('sv_leads').select('*').eq('id', id).single();
  expect(error).toBeNull();
  return data as any;
}

const ms = (v: string | null) => (v ? new Date(v).getTime() : null);
const byName = (rows: any[], name: string) => rows.filter((r) => r.event_name === name);

describe('phase 19 ads (ADS-01, ADS-02)', () => {
  describe('ADS-01 capture flags', () => {
    it('stores the closed-list nonconformity and the raw values, never dropping the lead', async () => {
      const lead = await newLead({
        p_source: {
          source: 'tiktok',
          medium: 'cpc',
          campaign: null,
          kind: 'touch',
          nonconformity: ['source_unknown', 'bogus'],
          raw: { utm_source: 'TikTok', other: 'x' },
        },
      });
      const row = await leadRow(lead.lead_id);
      expect(row.source_nonconformity).toEqual(['source_unknown']);
      expect(row.source_raw).toEqual({ utm_source: 'TikTok' });
    });

    it('gives null flags for a conformant or key-less p_source', async () => {
      const lead = await newLead();
      const row = await leadRow(lead.lead_id);
      expect(row.source_nonconformity).toBeNull();
      expect(row.source_raw).toBeNull();
    });

    it('a returning contact does not change the flags of the existing lead', async () => {
      const email = uniqueEmail('adsreturn');
      const first = await newLead({ p_email: email, p_email_norm: email });
      const back = await makeLeadViaRpc({
        p_email: email,
        p_email_norm: email,
        p_source: { source: 'x', medium: 'cpc', kind: 'touch', nonconformity: ['medium_unknown'], raw: { utm_source: 'X' } },
      });
      expect(back.lead_id).toBe(first.lead_id);
      const row = await leadRow(first.lead_id);
      expect(row.source_nonconformity).toBeNull();
      expect(row.source_raw).toBeNull();
    });

    it('the flags are frozen, only the source correction clears them', async () => {
      const lead = await newLead({
        p_source: {
          source: 'tiktok',
          medium: 'cpc',
          campaign: null,
          kind: 'touch',
          nonconformity: ['source_unknown'],
          raw: { utm_source: 'TikTok' },
        },
      });
      const upd = await svc().from('sv_leads').update({ source_nonconformity: null }).eq('id', lead.lead_id);
      expect(upd.error?.message).toContain('sv_source_frozen');

      const fix = await correctTestLeadSource(lead.lead_id, 'meta', null, 'Correction de test RLS phase 19', adminUser.id);
      expect(fix.error).toBeNull();
      const row = await leadRow(lead.lead_id);
      expect(row.source_nonconformity).toBeNull();
      expect(row.source_raw).toEqual({ utm_source: 'TikTok' });

      const { data: ev } = await svc()
        .from('sv_lead_events')
        .select('detail')
        .eq('lead_id', lead.lead_id)
        .eq('type', 'source_corrected')
        .single();
      expect((ev as any).detail.cleared_nonconformity).toEqual(['source_unknown']);
      expect((ev as any).detail.from.source).toBe('tiktok');
    });

    it('admin reads source_nonconformity from the admin view, a plain user gets no row', async () => {
      const lead = await newLead({
        p_source: { source: 'zzz', medium: 'cpc', kind: 'touch', nonconformity: ['source_unknown'] },
      });
      const a = await adminUser.client
        .from('sv_leads_admin_v')
        .select('id, source_nonconformity')
        .eq('id', lead.lead_id);
      expect(a.error).toBeNull();
      expect(a.data).toHaveLength(1);
      expect((a.data as any)[0].source_nonconformity).toEqual(['source_unknown']);
      const p = await plainUser.client.from('sv_leads_admin_v').select('id').eq('id', lead.lead_id);
      expect(p.data ?? []).toEqual([]);
    });
  });

  describe('ADS-02 ladder and event_id parity', () => {
    it('a new lead has exactly one lead_submitted row matching the TS id', async () => {
      const lead = await newLead();
      const rows = await conversions(lead.lead_id);
      expect(rows).toHaveLength(1);
      const r = rows[0];
      const row = await leadRow(lead.lead_id);
      expect(r.event_name).toBe('lead_submitted');
      expect(r.rank).toBe(1);
      expect(r.event_id).toBe(eventIdFor(lead.lead_id, 'lead_submitted'));
      expect(ms(r.occurred_at)).toBe(ms(row.created_at));
      expect(r.source_source).toBe(row.source_source);
      expect(r.source_medium).toBe(row.source_medium);
      expect(r.source_campaign).toBe(row.source_campaign);
      expect(r.value_cents).toBeNull();
      expect(r.currency).toBeNull();
      for (const k of ['email', 'phone', 'telephone', 'nom']) expect(Object.keys(r)).not.toContain(k);
    });

    it('the SQL function reproduces the golden vector', () => {
      const out = dbQuery(
        "select sv_private.conversion_event_id('00000000-0000-4000-8000-000000000001','lead_submitted') as id;",
      );
      expect(out).toContain(GOLDEN);
      expect(eventIdFor('00000000-0000-4000-8000-000000000001', 'lead_submitted')).toBe(GOLDEN);
    });

    it('a jump new -> signed emits the whole ladder with stage timestamps; replays emit nothing', async () => {
      const lead = await newLead();
      await setStatus(lead.lead_id, 'signed');
      const row = await leadRow(lead.lead_id);
      const rows = await conversions(lead.lead_id);
      const names = rows.map((r) => r.event_name).sort();
      expect(names).toEqual(['deal_signed', 'lead_qualified', 'lead_submitted', 'quote_sent', 'rdv_booked']);
      const ranks: Record<string, number | null> = {
        lead_submitted: 1,
        lead_qualified: 2,
        rdv_booked: 3,
        quote_sent: null,
        deal_signed: 4,
      };
      const stamps: Record<string, string> = {
        lead_submitted: row.created_at,
        lead_qualified: row.qualified_at,
        rdv_booked: row.rdv_at,
        quote_sent: row.quote_sent_at,
        deal_signed: row.signed_at,
      };
      const { data: ev } = await svc()
        .from('sv_lead_events')
        .select('id, type, to_status')
        .eq('lead_id', lead.lead_id)
        .eq('type', 'status_changed');
      const changed = (ev as any[]).filter((e) => e.to_status === 'signed');
      expect(changed).toHaveLength(1);
      for (const r of rows) {
        const n = r.event_name as JournalEventName;
        expect(r.rank, n).toBe(ranks[n]);
        expect(r.event_id, n).toBe(eventIdFor(lead.lead_id, n));
        expect(ms(r.occurred_at), n).toBe(ms(stamps[n]));
        if (n !== 'lead_submitted') expect(Number(r.source_event_id), n).toBe(Number(changed[0].id));
      }

      // Backward move, same status twice, replay: nothing new.
      await setStatus(lead.lead_id, 'new');
      expect(await conversions(lead.lead_id)).toHaveLength(5);
      await setStatus(lead.lead_id, 'signed');
      expect(await conversions(lead.lead_id)).toHaveLength(5);
      await setStatus(lead.lead_id, 'signed');
      expect(await conversions(lead.lead_id)).toHaveLength(5);
    });

    it('step by step gives the same five names', async () => {
      const lead = await newLead();
      for (const s of ['qualified', 'rdv', 'quote_sent', 'signed']) await setStatus(lead.lead_id, s);
      const rows = await conversions(lead.lead_id);
      expect(rows.map((r) => r.event_name).sort()).toEqual([
        'deal_signed',
        'lead_qualified',
        'lead_submitted',
        'quote_sent',
        'rdv_booked',
      ]);
      for (const r of rows) expect(r.event_id).toBe(eventIdFor(lead.lead_id, r.event_name));
    });

    it('click ids come from the stored touch only', async () => {
      const touch = (params: object) => ({ params, landing: '/', referrer: null, at: Date.now() });
      const withClick = await newLead({
        p_first_touch: touch({ utm_source: 'google', utm_medium: 'cpc', gclid: 'AbC' }),
        p_last_touch: touch({ utm_source: 'google', utm_medium: 'cpc', gclid: 'AbC' }),
      });
      expect((await conversions(withClick.lead_id))[0].click_ids).toEqual({ gclid: 'AbC' });
      const without = await newLead();
      expect((await conversions(without.lead_id))[0].click_ids).toBeNull();
    });
  });

  describe('value at Signé (D-11)', () => {
    async function signedAfterConvert(snapshots: object[]) {
      const lead = await makeConvertibleLead('qualified');
      createdLeads.push(lead.lead_id);
      const projectId = await convertTestLead(lead.lead_id, adminUser.id);
      let prev: string | null = null;
      let rev = 1;
      for (const snapshot of snapshots) {
        const d = await issueTestDocument(projectId, { docType: 'quote', replaces: prev, revision: rev, snapshot });
        prev = d.id;
        rev += 1;
      }
      await setStatus(lead.lead_id, 'signed');
      return conversions(lead.lead_id);
    }

    it('carries the chain-head total in EUR and no other row has a value', async () => {
      const rows = await signedAfterConvert([
        { docType: 'quote', totalCents: 123400 },
        { docType: 'quote', totalCents: 150000 },
      ]);
      const deal = byName(rows, 'deal_signed');
      expect(deal).toHaveLength(1);
      expect(Number(deal[0].value_cents)).toBe(150000);
      expect(deal[0].currency).toBe('EUR');
      for (const r of rows.filter((x) => x.event_name !== 'deal_signed')) {
        expect(r.value_cents).toBeNull();
        expect(r.currency).toBeNull();
      }
    });

    it('signed without project or quote has null value and currency', async () => {
      const lead = await newLead();
      await setStatus(lead.lead_id, 'signed');
      const deal = byName(await conversions(lead.lead_id), 'deal_signed');
      expect(deal).toHaveLength(1);
      expect(deal[0].value_cents).toBeNull();
      expect(deal[0].currency).toBeNull();
    });

    it.each([
      ['string total', { docType: 'quote', totalCents: '9' }],
      ['negative total', { docType: 'quote', totalCents: -5 }],
    ])('ignores an invalid quote snapshot (%s)', async (_label, snapshot) => {
      const rows = await signedAfterConvert([snapshot]);
      const deal = byName(rows, 'deal_signed');
      expect(deal).toHaveLength(1);
      expect(deal[0].value_cents).toBeNull();
      expect(deal[0].currency).toBeNull();
    });
  });

  describe('lost', () => {
    it('emits lead_lost without removing anything, with a per-event id', async () => {
      const lead = await newLead();
      await setStatus(lead.lead_id, 'qualified');
      await setStatus(lead.lead_id, 'lost', 'sans_reponse');
      let rows = await conversions(lead.lead_id);
      const lost = byName(rows, 'lead_lost');
      expect(lost).toHaveLength(1);
      expect(lost[0].rank).toBeNull();
      expect(lost[0].event_id).toBe(eventIdFor(lead.lead_id, 'lead_lost', lost[0].source_event_id));
      expect(byName(rows, 'lead_submitted')).toHaveLength(1);
      expect(byName(rows, 'lead_qualified')).toHaveLength(1);

      await setStatus(lead.lead_id, 'qualified');
      await setStatus(lead.lead_id, 'lost', 'autre');
      rows = await conversions(lead.lead_id);
      const lost2 = byName(rows, 'lead_lost');
      expect(lost2).toHaveLength(2);
      expect(new Set(lost2.map((r) => r.event_id)).size).toBe(2);
      expect(byName(rows, 'lead_qualified')).toHaveLength(1);
    });
  });

  describe('isolation and append-only', () => {
    let leadId: string;
    let rowId: number;
    beforeAll(async () => {
      leadId = (await newLead()).lead_id;
      rowId = (await conversions(leadId))[0].id;
    });

    it('anon reads nothing', async () => {
      const r = await anonClient().from('sv_conversion_events').select('*').eq('lead_id', leadId);
      expect(r.data ?? []).toEqual([]);
    });

    it('a plain user reads nothing, an admin reads the rows', async () => {
      const p = await plainUser.client.from('sv_conversion_events').select('*').eq('lead_id', leadId);
      expect(p.data ?? []).toEqual([]);
      const a = await adminUser.client.from('sv_conversion_events').select('*').eq('lead_id', leadId);
      expect(a.error).toBeNull();
      expect((a.data ?? []).length).toBe(1);
    });

    it('service_role cannot insert, update or delete', async () => {
      const ins = await svc()
        .from('sv_conversion_events')
        .insert({
          lead_id: leadId,
          event_name: 'lead_lost',
          event_id: randomUUID(),
          occurred_at: new Date().toISOString(),
          source_source: 'x',
          source_medium: 'y',
        });
      expect(ins.error?.message).toMatch(/permission denied/);
      const upd = await svc().from('sv_conversion_events').update({ currency: 'EUR' }).eq('id', rowId);
      expect(upd.error).not.toBeNull();
      const del = await svc().from('sv_conversion_events').delete().eq('id', rowId);
      expect(del.error).not.toBeNull();
    });

    it('update, delete and truncate raise sv_immutable_table for the owner', () => {
      expect(dbQuery(`update public.sv_conversion_events set currency = null where id = ${rowId};`)).toMatch(
        /sv_immutable_table/,
      );
      expect(dbQuery(`delete from public.sv_conversion_events where id = ${rowId};`)).toMatch(/sv_immutable_table/);
      expect(dbQuery('truncate public.sv_conversion_events;')).toMatch(/sv_immutable_table/);
    });
  });

  describe('parity (Pitfall 3)', () => {
    it('emitted ranks match the non-null stage timestamps for every lead of the suite', async () => {
      expect(createdLeads.length).toBeGreaterThan(5);
      for (const id of createdLeads) {
        const row = await leadRow(id);
        const ranks = new Set(
          (await conversions(id)).filter((r) => r.rank !== null).map((r) => r.rank as number),
        );
        const expected = new Set<number>([1]);
        if (row.qualified_at) expected.add(2);
        if (row.rdv_at) expected.add(3);
        if (row.signed_at) expected.add(4);
        expect([...ranks].sort(), id).toEqual([...expected].sort());
      }
    });
  });
});
