// Test helper: builds valid exports with an independent, hand-joined hash (not linkHash).
import { createHash } from 'node:crypto';

export const DOC_ID = '00000000-0000-0000-0000-000000000001';

export const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

export type FixtureEvent = {
  seq: number;
  eventType: string;
  actorKind: 'client' | 'admin' | 'system';
  actorId: string | null;
  ip: string | null;
  docSha256: string;
  templateVersion: string;
  occurredAtUtc: string;
  payload: string;
  prevHash: string;
  linkHash: string;
};

export function buildExport(
  partials: Array<Partial<FixtureEvent>> = [{}, {}, {}],
  documentId: string = DOC_ID,
) {
  const genesis = sha('sv-genesis:' + documentId);
  let prev = genesis;
  const events: FixtureEvent[] = partials.map((p, i) => {
    const e = {
      seq: i + 1,
      eventType: 'document_opened',
      actorKind: 'client' as const,
      actorId: null,
      ip: null,
      docSha256: sha('doc'),
      templateVersion: 'v1',
      occurredAtUtc: `2026-01-01T10:00:0${i}.123456Z`,
      payload: `{"n":${i}}`,
      ...p,
      prevHash: prev,
      linkHash: '',
    } as FixtureEvent;
    e.linkHash = sha(
      [
        'v1',
        documentId,
        String(e.seq),
        e.eventType,
        e.actorKind,
        e.actorId ?? '',
        e.ip ?? '',
        e.docSha256,
        e.templateVersion,
        e.occurredAtUtc,
        e.payload,
        e.prevHash,
      ].join('\u001f'),
    );
    prev = e.linkHash;
    return e;
  });
  return {
    formatVersion: 1 as const,
    document: {
      id: documentId,
      reference: 'REF-1',
      docType: 'quote',
      revision: 1,
      templateVersion: 'v1',
      originalSha256: sha('doc'),
      sealSha256: null,
    },
    genesisHash: genesis,
    events,
    headHash: events.length ? events[events.length - 1].linkHash : null,
    exportedAt: '2026-01-02T00:00:00.000000Z',
  };
}
