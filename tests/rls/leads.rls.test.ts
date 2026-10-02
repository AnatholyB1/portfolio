import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addMember,
  anonClient,
  backdateLead,
  cleanup,
  makeAdmin,
  makeClient,
  makeGeckoAdmin,
  makeLeadViaRpc,
  makeUser,
  svc,
  uniqueEmail,
  type TestUser,
} from './helpers';

const REASON_OK = 'Correction manuelle: UTM mal attribue';

async function getLead(id: string) {
  const { data, error } = await svc().from('sv_leads').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Record<string, any>;
}

async function events(leadId: string) {
  const { data, error } = await svc()
    .from('sv_lead_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, any>[];
}

let adminUser: TestUser;
let plainUser: TestUser;
let memberUser: TestUser;
let geckoUser: TestUser;

beforeAll(async () => {
  adminUser = await makeUser('leadadmin');
  await makeAdmin(adminUser);
  plainUser = await makeUser('leadplain');
  memberUser = await makeUser('leadmember');
  const c = await makeClient('RLS Leads Client');
  await addMember(c.id, memberUser);
  geckoUser = await makeUser('leadgecko');
  await makeGeckoAdmin(geckoUser);
});

afterAll(cleanup);

describe('LEAD-02 source frozen', () => {
  it('source columns cannot be updated after insert (sv_source_frozen)', async () => {
    const lead = await makeLeadViaRpc();
    for (const patch of [
      { source_source: 'x' },
      { source_medium: 'x' },
      { source_campaign: 'x' },
      { source_kind: 'direct' },
      { first_touch: { forged: true } },
      { channel: 'contact' },
    ]) {
      const { error } = await svc().from('sv_leads').update(patch).eq('id', lead.lead_id);
      expect(error?.message, JSON.stringify(patch)).toContain('sv_source_frozen');
    }
    const row = await getLead(lead.lead_id);
    expect(row.source_source).toBe('google');
  });

  it('created_at cannot be modified', async () => {
    const lead = await makeLeadViaRpc();
    const { error } = await svc()
      .from('sv_leads')
      .update({ created_at: new Date(0).toISOString() })
      .eq('id', lead.lead_id);
    expect(error?.message).toContain('sv_source_frozen');
  });

  it('sv_correct_lead_source rejects a short reason', async () => {
    const lead = await makeLeadViaRpc();
    const { error } = await svc().rpc('sv_correct_lead_source', {
      p_lead_id: lead.lead_id,
      p_actor: adminUser.id,
      p_source: 'bing',
      p_medium: 'cpc',
      p_campaign: null,
      p_reason: 'short',
    });
    expect(error?.message).toContain('sv_reason_required');
  });

  it('sv_correct_lead_source with a reason changes source and journals it', async () => {
    const lead = await makeLeadViaRpc();
    const { error } = await svc().rpc('sv_correct_lead_source', {
      p_lead_id: lead.lead_id,
      p_actor: adminUser.id,
      p_source: 'Bing',
      p_medium: 'cpc',
      p_campaign: 'spring',
      p_reason: REASON_OK,
    });
    expect(error).toBeNull();
    const row = await getLead(lead.lead_id);
    expect(row.source_source).toBe('bing');
    expect(row.source_campaign).toBe('spring');

    const evs = (await events(lead.lead_id)).filter((e) => e.type === 'source_corrected');
    expect(evs).toHaveLength(1);
    expect(evs[0].detail.from.source).toBe('google');
    expect(evs[0].detail.to.source).toBe('bing');

    const { data: notes } = await svc().from('sv_lead_notes').select('*').eq('lead_id', lead.lead_id);
    expect(notes).toHaveLength(1);
    expect(notes![0].kind).toBe('correction_note');
    expect(notes![0].event_id).toBe(evs[0].id);

    // the freeze flag must not leak out of the correction transaction
    const { error: after } = await svc().from('sv_leads').update({ source_source: 'x' }).eq('id', lead.lead_id);
    expect(after?.message).toContain('sv_source_frozen');
  });
});

describe('LEAD-03 journal immutable + erase', () => {
  it('sv_lead_events rejects update and delete for service_role', async () => {
    const lead = await makeLeadViaRpc();
    const ev = (await events(lead.lead_id))[0];
    const upd = await svc().from('sv_lead_events').update({ actor: 'hacker' }).eq('id', ev.id);
    expect(upd.error).not.toBeNull();
    const del = await svc().from('sv_lead_events').delete().eq('id', ev.id);
    expect(del.error).not.toBeNull();
    expect((await events(lead.lead_id))[0].actor).toBe('visitor');
  });

  it('authenticated admin and anon cannot update or delete events', async () => {
    const lead = await makeLeadViaRpc();
    const ev = (await events(lead.lead_id))[0];
    for (const c of [adminUser.client, anonClient()]) {
      const upd = await c.from('sv_lead_events').update({ actor: 'hacker' }).eq('id', ev.id).select();
      expect(upd.error !== null || (upd.data ?? []).length === 0).toBe(true);
      const del = await c.from('sv_lead_events').delete().eq('id', ev.id).select();
      expect(del.error !== null || (del.data ?? []).length === 0).toBe(true);
    }
    expect((await events(lead.lead_id))[0].actor).toBe('visitor');
  });

  it('TRUNCATE on sv_lead_events and sv_leads is denied even for the table owner', () => {
    const dbUrl = process.env.SV_TEST_DB_URL;
    expect(dbUrl, 'SV_TEST_DB_URL required for the truncate check').toBeTruthy();
    expect(dbUrl).not.toContain('ubxllsvanurkwkohzxau');
    // Truncate sets that satisfy the FK checks, so Postgres reaches the BEFORE TRUNCATE trigger.
    const sets: Record<string, string> = {
      sv_lead_events: 'public.sv_lead_events, public.sv_lead_notes',
      sv_leads: 'public.sv_leads, public.sv_lead_contacts, public.sv_lead_notes, public.sv_lead_events',
    };
    for (const [table, tableList] of Object.entries(sets)) {
      let out = '';
      let failed = false;
      try {
        out = execFileSync('supabase', ['db', 'query', '--db-url', `"${dbUrl}"`, `"truncate ${tableList}"`], {
          encoding: 'utf8',
          stdio: 'pipe',
          shell: true,
        });
      } catch (e: any) {
        failed = true;
        // never include e.message: it echoes the command line and so the DB URL
        out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
      }
      // The CLI may report the SQL error on stdout with exit 0; either way the error text must show.
      expect(out, `${table}: ${out}`).toContain('sv_immutable_table');
      expect(failed || out.includes('Error') || out.includes('error')).toBe(true);
    }
  });

  it('erase tombstones the lead and scrubs personal data, journal intact', async () => {
    const lead = await makeLeadViaRpc();
    await svc().rpc('sv_correct_lead_source', {
      p_lead_id: lead.lead_id,
      p_actor: adminUser.id,
      p_source: 'bing',
      p_medium: 'cpc',
      p_campaign: null,
      p_reason: REASON_OK,
    });
    const before = (await events(lead.lead_id)).length;

    const { data, error } = await svc().rpc('sv_erase_lead', {
      p_lead_id: lead.lead_id,
      p_actor: adminUser.id,
      p_reason_code: 'demande_personne',
    });
    expect(error).toBeNull();
    expect(data.erased).toBe(true);

    const contacts = await svc().from('sv_lead_contacts').select('id').eq('lead_id', lead.lead_id);
    expect(contacts.data).toHaveLength(0);
    const notes = await svc().from('sv_lead_notes').select('id').eq('lead_id', lead.lead_id);
    expect(notes.data).toHaveLength(0);

    const row = await getLead(lead.lead_id);
    expect(row.erased_at).not.toBeNull();
    expect(row.source_source).toBe('bing');

    const evs = await events(lead.lead_id);
    expect(evs).toHaveLength(before + 1);
    expect(evs[evs.length - 1].type).toBe('erased');

    const again = await svc().rpc('sv_erase_lead', {
      p_lead_id: lead.lead_id,
      p_actor: adminUser.id,
      p_reason_code: 'demande_personne',
    });
    expect(again.data.erased).toBe(false);
    expect(await events(lead.lead_id)).toHaveLength(before + 1);
  });

  it('an erased lead is never matched by dedupe', async () => {
    const email = uniqueEmail('erasedmatch');
    const first = await makeLeadViaRpc({ p_email: email, p_email_norm: email });
    await svc().rpc('sv_erase_lead', { p_lead_id: first.lead_id, p_actor: 'system', p_reason_code: 'doublon' });
    const second = await makeLeadViaRpc({ p_email: email, p_email_norm: email });
    expect(second.lead_id).not.toBe(first.lead_id);
    expect(second.is_return).toBe(false);
  });
});

describe('LEAD-04 dedupe 9 months', () => {
  it('same e-mail (case/space variants) within 9 months returns is_return=true, source unchanged', async () => {
    const base = uniqueEmail('dedupe');
    const first = await makeLeadViaRpc({ p_email: base, p_email_norm: base.toLowerCase() });
    expect(first.is_return).toBe(false);

    const variant = ` ${base.toUpperCase()} `;
    const second = await makeLeadViaRpc({
      p_email: variant,
      p_email_norm: variant.trim().toLowerCase(),
      p_source: { source: 'facebook', medium: 'social', campaign: 'other', kind: 'touch' },
    });
    expect(second.lead_id).toBe(first.lead_id);
    expect(second.is_return).toBe(true);

    const row = await getLead(first.lead_id);
    expect(row.contact_count).toBe(2);
    expect(row.source_source).toBe('google');
    expect(row.unseen_return).toBe(true);

    const { data: contacts } = await svc().from('sv_lead_contacts').select('id').eq('lead_id', first.lead_id);
    expect(contacts).toHaveLength(2);
  });

  it('same phone with a different e-mail attaches to the same lead', async () => {
    const phone = `06${Math.floor(10000000 + Math.random() * 89999999)}`;
    const first = await makeLeadViaRpc({ p_phone: phone, p_phone_norm: phone });
    const second = await makeLeadViaRpc({ p_email: uniqueEmail('otherphone'), p_phone: phone, p_phone_norm: phone });
    expect(second.lead_id).toBe(first.lead_id);
    expect(second.is_return).toBe(true);
  });

  it('same e-mail after 9 months creates a fresh lead linked to the previous one', async () => {
    const email = uniqueEmail('old');
    const first = await makeLeadViaRpc({ p_email: email, p_email_norm: email });
    await backdateLead(first.lead_id, 10);
    const second = await makeLeadViaRpc({ p_email: email, p_email_norm: email });
    expect(second.lead_id).not.toBe(first.lead_id);
    expect(second.is_return).toBe(false);
    expect(second.previous_lead_id).toBe(first.lead_id);
    const evs = await events(second.lead_id);
    expect(evs.map((e) => e.type)).toContain('lead_linked');
    expect(evs.find((e) => e.type === 'lead_linked')!.detail.previous_lead_id).toBe(first.lead_id);
  });

  it('two concurrent ingests of a new e-mail produce a single lead', async () => {
    const email = uniqueEmail('race');
    const [a, b] = await Promise.all([
      makeLeadViaRpc({ p_email: email, p_email_norm: email }),
      makeLeadViaRpc({ p_email: email, p_email_norm: email }),
    ]);
    expect(a.lead_id).toBe(b.lead_id);
    const { data: contacts } = await svc().from('sv_lead_contacts').select('lead_id').eq('email_norm', email);
    expect(new Set((contacts ?? []).map((c) => c.lead_id)).size).toBe(1);
    expect(contacts).toHaveLength(2);
  });
});

describe('LEAD-07 status RPC', () => {
  const call = (leadId: string, status: string, reason: string | null = null, note: string | null = null) =>
    svc().rpc('sv_set_lead_status', {
      p_lead_id: leadId,
      p_status: status,
      p_actor: adminUser.id,
      p_lost_reason: reason,
      p_note: note,
    });

  it('a jump to signed fills every earlier stage timestamp and journals the change', async () => {
    const lead = await makeLeadViaRpc();
    const { data, error } = await call(lead.lead_id, 'signed');
    expect(error).toBeNull();
    expect(data.changed).toBe(true);
    const row = await getLead(lead.lead_id);
    expect(row.status).toBe('signed');
    for (const k of ['qualified_at', 'rdv_at', 'quote_sent_at', 'signed_at']) expect(row[k], k).not.toBeNull();
    const ev = (await events(lead.lead_id)).filter((e) => e.type === 'status_changed');
    expect(ev).toHaveLength(1);
    expect(ev[0].from_status).toBe('new');
    expect(ev[0].to_status).toBe('signed');
  });

  it('lost requires a reason from the closed list', async () => {
    const lead = await makeLeadViaRpc();
    expect((await call(lead.lead_id, 'lost')).error?.message).toContain('sv_lost_reason_required');
    expect((await call(lead.lead_id, 'lost', 'nope')).error?.message).toContain('sv_lost_reason_required');
    const ok = await call(lead.lead_id, 'lost', 'hors_budget', 'trop cher');
    expect(ok.error).toBeNull();
    const row = await getLead(lead.lead_id);
    expect(row.lost_reason).toBe('hors_budget');
    expect(row.lost_at).not.toBeNull();
  });

  it('invalid status is rejected', async () => {
    const lead = await makeLeadViaRpc();
    expect((await call(lead.lead_id, 'bogus')).error?.message).toContain('sv_invalid_status');
  });

  it('same status is a no-op without a new event', async () => {
    const lead = await makeLeadViaRpc();
    await call(lead.lead_id, 'qualified');
    const n = (await events(lead.lead_id)).length;
    const { data, error } = await call(lead.lead_id, 'qualified');
    expect(error).toBeNull();
    expect(data.changed).toBe(false);
    expect(await events(lead.lead_id)).toHaveLength(n);
  });

  it('stage timestamps are write-once and never cleared when moving back', async () => {
    const lead = await makeLeadViaRpc();
    await call(lead.lead_id, 'rdv');
    const mid = await getLead(lead.lead_id);
    await call(lead.lead_id, 'new');
    const back = await getLead(lead.lead_id);
    expect(back.status).toBe('new');
    expect(back.qualified_at).toBe(mid.qualified_at);
    expect(back.rdv_at).toBe(mid.rdv_at);
    await call(lead.lead_id, 'rdv');
    expect((await getLead(lead.lead_id)).rdv_at).toBe(mid.rdv_at);
  });

  it('authenticated users cannot execute the RPCs', async () => {
    const lead = await makeLeadViaRpc();
    const r = await adminUser.client.rpc('sv_set_lead_status', {
      p_lead_id: lead.lead_id,
      p_status: 'qualified',
      p_actor: adminUser.id,
      p_lost_reason: null,
      p_note: null,
    });
    expect(r.error).not.toBeNull();
    expect((await getLead(lead.lead_id)).status).toBe('new');
  });

  it('authenticated and anon cannot execute sv_ingest_lead', async () => {
    const email = uniqueEmail('noexec');
    const args = {
      p_channel: 'simulateur',
      p_nom: 'X',
      p_email: email,
      p_email_norm: email,
      p_phone: null,
      p_phone_norm: null,
      p_payload: {},
      p_consent_rgpd: true,
      p_source: null,
      p_first_touch: null,
      p_last_touch: null,
      p_ip_hash: null,
      p_consent: null,
    };
    for (const c of [plainUser.client, anonClient()]) {
      const r = await c.rpc('sv_ingest_lead', args);
      expect(r.error).not.toBeNull();
    }
    const { data } = await svc().from('sv_lead_contacts').select('id').eq('email_norm', email);
    expect(data).toHaveLength(0);
  });
});

describe('admin read access', () => {
  const tables = ['sv_leads', 'sv_lead_contacts', 'sv_lead_events', 'sv_lead_notes', 'sv_leads_admin_v'];

  it('plain user, client member, Gecko admin and anon read zero lead rows', async () => {
    const lead = await makeLeadViaRpc();
    await call(lead.lead_id);
    const readers: [string, any][] = [
      ['plain', plainUser.client],
      ['member', memberUser.client],
      ['gecko', geckoUser.client],
      ['anon', anonClient()],
    ];
    for (const [label, c] of readers) {
      for (const t of tables) {
        const { data } = await c.from(t).select('*').limit(5);
        expect((data ?? []).length, `${label} on ${t}`).toBe(0);
      }
    }
  });

  it('an sv_admins member reads the leads', async () => {
    const lead = await makeLeadViaRpc();
    const l = await adminUser.client.from('sv_leads').select('id').eq('id', lead.lead_id);
    expect(l.data).toHaveLength(1);
    const v = await adminUser.client.from('sv_leads_admin_v').select('id, contact_email').eq('id', lead.lead_id);
    expect(v.data).toHaveLength(1);
    const c = await adminUser.client.from('sv_lead_contacts').select('id').eq('lead_id', lead.lead_id);
    expect(c.data!.length).toBeGreaterThanOrEqual(1);
    const e = await adminUser.client.from('sv_lead_events').select('id').eq('lead_id', lead.lead_id);
    expect(e.data!.length).toBeGreaterThanOrEqual(1);
  });

  // helper used above (hoisted function-free: defined via const in describe scope)
  async function call(leadId: string) {
    return svc().rpc('sv_set_lead_status', {
      p_lead_id: leadId,
      p_status: 'qualified',
      p_actor: adminUser.id,
      p_lost_reason: null,
      p_note: 'note',
    });
  }
});
