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

// Exported from branch sv-rls-p14 by sv_export_signature_chain (document 70c38cc4-516e-4d89-9f1e-4bb03d74caef):
// covers actorId null and ip null (sealed), non-null actor/ip, payloads with Postgres jsonb spacing.
const GOLDEN_VECTOR = {
  "events": [
    {
      "ip": null,
      "seq": 1,
      "actorId": "fc6067f9-a0c0-4e57-a907-c55dfd74ebb0",
      "payload": "{}",
      "linkHash": "a62609353a84d65289c221bd40ba548f45e72e7ea81c77228e3ee6725c4fb607",
      "prevHash": "c1f7125d588b73157547d6d747529c7ca29af037d841ae3f64c9d9a641865064",
      "actorKind": "admin",
      "docSha256": "794abaa4f6f06fc519895c22944a0ab43ad02b4fb32bdefa1952ce81613cb47b",
      "eventType": "document_opened",
      "occurredAtUtc": "2026-10-04T09:09:34.839565Z",
      "templateVersion": "v1"
    },
    {
      "ip": "203.0.113.7",
      "seq": 2,
      "actorId": "b8f0775e-39db-4676-b0ef-eee651c56534",
      "payload": "{\"version\":\"v1\"}",
      "linkHash": "53de1251b755e96e74140e7853b7c5bc28dda061ba5501c5487d48d16be28ce5",
      "prevHash": "a62609353a84d65289c221bd40ba548f45e72e7ea81c77228e3ee6725c4fb607",
      "actorKind": "client",
      "docSha256": "794abaa4f6f06fc519895c22944a0ab43ad02b4fb32bdefa1952ce81613cb47b",
      "eventType": "consent_given",
      "occurredAtUtc": "2026-10-04T09:09:34.873983Z",
      "templateVersion": "v1"
    },
    {
      "ip": "203.0.113.7",
      "seq": 3,
      "actorId": "b8f0775e-39db-4676-b0ef-eee651c56534",
      "payload": "{\"codeId\": \"bb388029-6c36-4b53-b445-73d6b2f33dcd\", \"expiresAtUtc\": \"2026-10-04T09:19:34.900138Z\"}",
      "linkHash": "bbc7ff378965fc09ca7f32b8abc507f07b41750bc8c7df65a69b945d6c21c07c",
      "prevHash": "53de1251b755e96e74140e7853b7c5bc28dda061ba5501c5487d48d16be28ce5",
      "actorKind": "client",
      "docSha256": "794abaa4f6f06fc519895c22944a0ab43ad02b4fb32bdefa1952ce81613cb47b",
      "eventType": "code_sent",
      "occurredAtUtc": "2026-10-04T09:09:34.903910Z",
      "templateVersion": "v1"
    },
    {
      "ip": "203.0.113.7",
      "seq": 4,
      "actorId": "b8f0775e-39db-4676-b0ef-eee651c56534",
      "payload": "{\"codeId\": \"bb388029-6c36-4b53-b445-73d6b2f33dcd\", \"signerName\": \"Jeanne Test\", \"signerRole\": \"Gérante\", \"signerEmail\": \"rls-gold-f89f53b9-fe60-43f9-9e43-16f0afbfbc04@example.test\", \"consentVersion\": \"v1\", \"acceptanceSubmissionId\": null}",
      "linkHash": "47c2958deb76eb9ad9a50956d43b8d5a8a254f7de8a0878234932173bc446b03",
      "prevHash": "bbc7ff378965fc09ca7f32b8abc507f07b41750bc8c7df65a69b945d6c21c07c",
      "actorKind": "client",
      "docSha256": "794abaa4f6f06fc519895c22944a0ab43ad02b4fb32bdefa1952ce81613cb47b",
      "eventType": "signed",
      "occurredAtUtc": "2026-10-04T09:09:34.941698Z",
      "templateVersion": "v1"
    },
    {
      "ip": null,
      "seq": 5,
      "actorId": null,
      "payload": "{\"sizeBytes\": 321, \"sealSha256\": \"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd\", \"originalSha256\": \"794abaa4f6f06fc519895c22944a0ab43ad02b4fb32bdefa1952ce81613cb47b\"}",
      "linkHash": "080e0e515f5786f55836ae35814dfc887389caefc1225f7ecf10b5e5a57fa1cb",
      "prevHash": "47c2958deb76eb9ad9a50956d43b8d5a8a254f7de8a0878234932173bc446b03",
      "actorKind": "system",
      "docSha256": "794abaa4f6f06fc519895c22944a0ab43ad02b4fb32bdefa1952ce81613cb47b",
      "eventType": "sealed",
      "occurredAtUtc": "2026-10-04T09:09:34.978824Z",
      "templateVersion": "v1"
    }
  ],
  "document": {
    "id": "70c38cc4-516e-4d89-9f1e-4bb03d74caef",
    "docType": "quote",
    "revision": 1,
    "reference": "TEST-1",
    "sealSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    "originalSha256": "794abaa4f6f06fc519895c22944a0ab43ad02b4fb32bdefa1952ce81613cb47b",
    "templateVersion": "v1"
  },
  "headHash": "080e0e515f5786f55836ae35814dfc887389caefc1225f7ecf10b5e5a57fa1cb",
  "exportedAt": "2026-10-04T09:09:35.021095Z",
  "genesisHash": "c1f7125d588b73157547d6d747529c7ca29af037d841ae3f64c9d9a641865064",
  "formatVersion": 1
};

describe('golden vector from database', () => {
  it('verifies a SQL-generated export (SQL/TS parity)', () => {
    expect(verifyChainExport(GOLDEN_VECTOR)).toEqual({
      ok: true,
      count: 5,
      headHash: '080e0e515f5786f55836ae35814dfc887389caefc1225f7ecf10b5e5a57fa1cb',
    });
  });

  it('breaks when one character of one payload changes', () => {
    const tampered = structuredClone(GOLDEN_VECTOR);
    tampered.events[3].payload = tampered.events[3].payload.replace('Jeanne', 'Jeannf');
    expect(verifyChainExport(tampered)).toEqual({ ok: false, brokenAtSeq: 4, reason: 'link_hash' });
  });

  it('breaks when the sealed link loses its null actor', () => {
    const tampered = structuredClone(GOLDEN_VECTOR);
    (tampered.events[4] as { ip: string | null }).ip = '1.2.3.4';
    expect(verifyChainExport(tampered)).toEqual({ ok: false, brokenAtSeq: 5, reason: 'link_hash' });
  });
});
