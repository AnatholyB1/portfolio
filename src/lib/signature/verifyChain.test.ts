import { describe, expect, it } from 'vitest';
import { HASH_FORMAT_VERSION, LINK_SEPARATOR } from './canonical';
import { SIGNATURE_EVENTS, type SignatureEvent } from './events';
import { DOC_ID, buildExport, sha } from './chainFixtures';
import { genesisHash, linkHash, verifyChainExport } from './verifyChain';
import { readFileSync } from 'node:fs';

describe('genesisHash / linkHash', () => {
  it('genesisHash matches independent sha256', () => {
    expect(genesisHash(DOC_ID)).toBe(sha('sv-genesis:' + DOC_ID));
  });

  it('linkHash uses empty strings for null actorId and ip', () => {
    const e = buildExport([{}]).events[0];
    const expected = sha(
      ['v1', DOC_ID, '1', e.eventType, 'client', '', '', e.docSha256, e.templateVersion, e.occurredAtUtc, e.payload, e.prevHash].join(
        '\u001f',
      ),
    );
    expect(linkHash({ ...e, eventType: e.eventType as SignatureEvent, documentId: DOC_ID })).toBe(expected);
  });

  it('local constants cannot drift from canonical/events', () => {
    const src = readFileSync(new URL('./verifyChain.ts', import.meta.url), 'utf8');
    expect(src).toContain(`'${HASH_FORMAT_VERSION}'`);
    expect(src).toContain('\\u001f');
    expect(LINK_SEPARATOR).toBe('\u001f');
    for (const ev of SIGNATURE_EVENTS) expect(src).toContain(`'${ev}'`);
  });
});

describe('verifyChainExport', () => {
  it('accepts a valid 3-event export', () => {
    const ex = buildExport();
    expect(verifyChainExport(ex)).toEqual({ ok: true, count: 3, headHash: ex.events[2].linkHash });
  });

  it('accepts hashes with non-null actorId and ip', () => {
    const ex = buildExport([{ actorId: 'u-1', ip: '1.2.3.4', actorKind: 'admin', eventType: 'sealed' }]);
    expect(verifyChainExport(ex).ok).toBe(true);
  });

  it('accepts empty events with null head', () => {
    expect(verifyChainExport(buildExport([]))).toEqual({ ok: true, count: 0, headHash: null });
  });

  it('flags first prevHash not genesis', () => {
    const ex = buildExport();
    ex.events[0].prevHash = sha('x');
    expect(verifyChainExport(ex)).toEqual({ ok: false, brokenAtSeq: 1, reason: 'prev_hash' });
  });

  it('flags altered payload', () => {
    const ex = buildExport();
    ex.events[1].payload = '{"n":99}';
    expect(verifyChainExport(ex)).toEqual({ ok: false, brokenAtSeq: 2, reason: 'link_hash' });
  });

  it('flags altered docSha256 and templateVersion', () => {
    const a = buildExport();
    a.events[0].docSha256 = sha('other');
    expect(verifyChainExport(a)).toEqual({ ok: false, brokenAtSeq: 1, reason: 'link_hash' });
    const b = buildExport();
    b.events[2].templateVersion = 'v2';
    expect(verifyChainExport(b)).toEqual({ ok: false, brokenAtSeq: 3, reason: 'link_hash' });
  });

  it('flags removed event as seq gap', () => {
    const ex = buildExport();
    ex.events.splice(1, 1);
    expect(verifyChainExport(ex)).toEqual({ ok: false, brokenAtSeq: 3, reason: 'seq' });
  });

  it('flags reordered events', () => {
    const ex = buildExport();
    [ex.events[0], ex.events[1]] = [ex.events[1], ex.events[0]];
    const r = verifyChainExport(ex);
    expect(r.ok).toBe(false);
  });

  it('flags altered prevHash mid-chain', () => {
    const ex = buildExport();
    ex.events[2].prevHash = sha('zz');
    expect(verifyChainExport(ex)).toEqual({ ok: false, brokenAtSeq: 3, reason: 'prev_hash' });
  });

  it('flags head mismatch', () => {
    const ex = buildExport();
    ex.headHash = sha('nope');
    expect(verifyChainExport(ex)).toEqual({ ok: false, brokenAtSeq: null, reason: 'head' });
  });

  it('flags malformed input as format', () => {
    const fmt = { ok: false, brokenAtSeq: null, reason: 'format' };
    expect(verifyChainExport(null)).toEqual(fmt);
    expect(verifyChainExport('x')).toEqual(fmt);
    expect(verifyChainExport({})).toEqual(fmt);
    expect(verifyChainExport({ ...buildExport(), formatVersion: 2 })).toEqual(fmt);
    const bad = buildExport();
    bad.events[0].linkHash = 'ZZ';
    expect(verifyChainExport(bad)).toEqual(fmt);
    const unk = buildExport();
    unk.events[0].eventType = 'mystery';
    expect(verifyChainExport(unk)).toEqual(fmt);
    const noField = buildExport() as unknown as { events: Array<Record<string, unknown>> };
    delete noField.events[1].payload;
    expect(verifyChainExport(noField)).toEqual(fmt);
  });
});

describe('golden vector from database', () => {
  it.todo('frozen SQL vector replaces this placeholder (14-12)');
});
