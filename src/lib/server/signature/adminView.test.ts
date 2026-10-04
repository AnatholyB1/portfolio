/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { loadSignatureViews } from './adminView';

const DOC = 'd1';
let tables: Record<string, { data: unknown; error: unknown }>;

function rls(): any {
  return {
    from: (t: string) => {
      const q: any = {
        select: () => q,
        eq: () => q,
        in: () => q,
        order: () => q,
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
          Promise.resolve(tables[t] ?? { data: [], error: null }).then(res, rej),
      };
      return q;
    },
  };
}

const ev = (seq: number, event_type: string, payload: unknown = {}) => ({
  document_id: DOC,
  seq,
  event_type,
  actor_kind: 'client',
  ip: '1.2.3.4',
  payload: JSON.stringify(payload),
  occurred_at_utc: `2026-01-01T00:00:0${seq}.000000Z`,
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  tables = {
    sv_project_documents: { data: [{ id: DOC }], error: null },
    sv_signature_events: {
      data: [
        ev(1, 'document_opened'),
        ev(2, 'acceptance_response', { index: 1, status: 'reserved', note: 'Logo flou' }),
        ev(3, 'acceptance_response', { index: 2, status: 'refused', note: 'Absent' }),
        ev(4, 'acceptance_response', { index: 3, status: 'delivered', note: null }),
        ev(5, 'signed'),
      ],
      error: null,
    },
    sv_document_signatures: {
      data: [
        {
          document_id: DOC,
          signer_name: 'Jeanne',
          signer_role: 'Gérante',
          signer_email: 'j@x.fr',
          signed_at: '2026-01-01T00:00:05Z',
          signed_at_utc: '2026-01-01T00:00:05.000000Z',
          ip: '1.2.3.4',
          consent_version: 'v1',
          signed_link_hash: 'a'.repeat(64),
        },
      ],
      error: null,
    },
    sv_document_seals: { data: [], error: null },
    sv_document_snapshots: {
      data: [{ document_id: DOC, data: { acceptanceCriteria: ['Site en ligne', 'Logo net', 'Mentions'] } }],
      error: null,
    },
  };
});

describe('loadSignatureViews', () => {
  it('builds events, reserves, refusals and pending finalization', async () => {
    const map = await loadSignatureViews(rls(), 'p1');
    const v = map.get(DOC)!;
    expect(v.eventCount).toBe(5);
    expect(v.events[0].label).toBe('Document ouvert');
    const labels = v.events.map((e) => e.label);
    expect(labels).toContain('Réserve signalée');
    expect(labels).toContain('Critère refusé');
    expect(labels).toContain('Critère validé');
    expect(v.reserves).toEqual([{ index: 1, criterion: 'Site en ligne', note: 'Logo flou' }]);
    expect(v.refusal).toEqual({ count: 1, items: [{ index: 2, criterion: 'Logo net', note: 'Absent' }] });
    expect(v.signature?.signerName).toBe('Jeanne');
    expect(v.seal).toBeNull();
    expect(v.pendingFinalization).toBe(true);
  });

  it('is not pending once sealed', async () => {
    tables.sv_document_seals = { data: [{ document_id: DOC, sha256: 'b'.repeat(64), sealed_at: 'x' }], error: null };
    const v = (await loadSignatureViews(rls(), 'p1')).get(DOC)!;
    expect(v.pendingFinalization).toBe(false);
    expect(v.seal?.sha256).toBe('b'.repeat(64));
  });

  it('skips documents without links and tolerates bad payloads', async () => {
    tables.sv_signature_events = { data: [{ ...ev(1, 'document_opened'), payload: '{bad' }], error: null };
    const map = await loadSignatureViews(rls(), 'p1');
    expect(map.size).toBe(1);
    tables.sv_signature_events = { data: [], error: null };
    expect((await loadSignatureViews(rls(), 'p1')).size).toBe(0);
  });

  it('returns an empty map and logs a fixed line on RLS failure', async () => {
    tables.sv_signature_events = { data: null, error: { message: 'secret' } };
    const map = await loadSignatureViews(rls(), 'p1');
    expect(map.size).toBe(0);
    expect(console.error).toHaveBeenCalledWith('[signature/adminView] load failed');
  });
});
