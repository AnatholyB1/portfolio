import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc }) }));

import { ingestLead, type IngestInput } from './ingest';
import { readAttribution } from './requestAttribution';

const EMAIL = 'Anatholyb+SV-Test@Gmail.com';

function input(over: Partial<IngestInput> = {}): IngestInput {
  return {
    channel: 'contact',
    nom: 'Test',
    email: EMAIL,
    telephone: '06 12 34 56 78',
    payload: { message: 'hi' },
    consentRgpd: true,
    attribution: readAttribution(null),
    ipHash: 'deadbeef',
    ...over,
  };
}

let errSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  rpc.mockReset();
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

const loggedText = () => JSON.stringify(errSpy.mock.calls);

describe('ingestLead', () => {
  it('calls sv_ingest_lead once with normalised keys and returns ids', async () => {
    rpc.mockResolvedValue({ data: { lead_id: 'x', is_return: true }, error: null });
    const i = input();
    const r = await ingestLead(i);
    expect(r).toEqual({ ok: true, leadId: 'x', isReturn: true });
    expect(rpc).toHaveBeenCalledTimes(1);
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe('sv_ingest_lead');
    expect(args).toMatchObject({
      p_channel: 'contact',
      p_email_norm: 'anatholyb+sv-test@gmail.com',
      p_phone_norm: '+33612345678',
      p_source: i.attribution.source,
      p_first_touch: null,
      p_last_touch: null,
      p_consent: null,
      p_ip_hash: 'deadbeef',
    });
  });

  it('passes a consent snapshot', async () => {
    rpc.mockResolvedValue({ data: { lead_id: 'x', is_return: false }, error: null });
    const attribution = {
      ...readAttribution(null),
      consent: { version: 'v', choice: 'accepted' as const, id: 'i', at: 3 },
    };
    await ingestLead(input({ attribution }));
    expect(rpc.mock.calls[0][1].p_consent).toEqual({ choice: 'accepted', version: 'v', id: 'i', at: 3 });
  });

  it('returns ok:false on rpc error without logging PII', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: `bad ${EMAIL}` } });
    expect(await ingestLead(input())).toEqual({ ok: false });
    expect(errSpy).toHaveBeenCalled();
    expect(loggedText().toLowerCase()).not.toContain('anatholyb');
  });

  it('returns ok:false on thrown exception without logging PII', async () => {
    rpc.mockRejectedValue(new Error(`boom ${EMAIL}`));
    expect(await ingestLead(input())).toEqual({ ok: false });
    expect(loggedText().toLowerCase()).not.toContain('anatholyb');
  });
});
