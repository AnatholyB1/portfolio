// Module pur et autonome : seul import d'exécution = node:crypto (chargé tel quel par scripts/verify-trail.mjs).
// Les constantes sont des copies locales, gardées synchronisées par verifyChain.test.ts.
import { createHash } from 'node:crypto';
import type { SignatureActorKind, SignatureEvent } from './events';

export type SignatureChainEvent = {
  seq: number;
  eventType: SignatureEvent;
  actorKind: SignatureActorKind;
  actorId: string | null;
  ip: string | null;
  docSha256: string;
  templateVersion: string;
  occurredAtUtc: string;
  payload: string;
  prevHash: string;
  linkHash: string;
};

export type SignatureChainExport = {
  formatVersion: 1;
  document: {
    id: string;
    reference: string;
    docType: string;
    revision: number;
    templateVersion: string;
    originalSha256: string;
    sealSha256: string | null;
  };
  genesisHash: string;
  events: SignatureChainEvent[];
  headHash: string | null;
  exportedAt: string;
};

export type VerifyResult =
  | { ok: true; count: number; headHash: string | null }
  | { ok: false; brokenAtSeq: number | null; reason: 'format' | 'seq' | 'prev_hash' | 'link_hash' | 'head' };

const FORMAT_VERSION = 'v1';
const SEP = '\u001f';
const EVENTS: readonly string[] = [
  'document_opened',
  'acceptance_response',
  'acceptance_refused',
  'consent_given',
  'code_sent',
  'code_send_failed',
  'code_failed',
  'code_locked',
  'code_expired',
  'signed',
  'sealed',
  'seal_downloaded',
];
const ACTORS: readonly string[] = ['client', 'admin', 'system'];
const HEX64 = /^[0-9a-f]{64}$/;

const sha256Hex = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

export function genesisHash(documentId: string): string {
  return sha256Hex('sv-genesis:' + documentId);
}

export function linkHash(e: Omit<SignatureChainEvent, 'linkHash'> & { documentId: string }): string {
  return sha256Hex(
    [
      FORMAT_VERSION,
      e.documentId,
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
    ].join(SEP),
  );
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string';

function validShape(input: unknown): input is SignatureChainExport {
  if (!isObj(input) || input.formatVersion !== 1) return false;
  const d = input.document;
  if (!isObj(d) || !isStr(d.id) || !isStr(input.genesisHash) || !HEX64.test(input.genesisHash)) return false;
  if (!Array.isArray(input.events)) return false;
  if (input.headHash !== null && !(isStr(input.headHash) && HEX64.test(input.headHash))) return false;
  for (const e of input.events) {
    if (!isObj(e)) return false;
    if (typeof e.seq !== 'number' || !Number.isInteger(e.seq)) return false;
    if (!isStr(e.eventType) || !EVENTS.includes(e.eventType)) return false;
    if (!isStr(e.actorKind) || !ACTORS.includes(e.actorKind)) return false;
    if (!isStrOrNull(e.actorId) || e.actorId === undefined || !isStrOrNull(e.ip) || e.ip === undefined) return false;
    if (!isStr(e.templateVersion) || !isStr(e.occurredAtUtc) || !isStr(e.payload)) return false;
    for (const h of [e.docSha256, e.prevHash, e.linkHash]) if (!isStr(h) || !HEX64.test(h)) return false;
  }
  return true;
}

export function verifyChainExport(input: unknown): VerifyResult {
  if (!validShape(input)) return { ok: false, brokenAtSeq: null, reason: 'format' };
  const docId = input.document.id;
  let prev = genesisHash(docId);
  if (input.genesisHash !== prev) return { ok: false, brokenAtSeq: null, reason: 'format' };
  let expectedSeq = 1;
  for (const e of input.events) {
    if (e.seq !== expectedSeq) return { ok: false, brokenAtSeq: e.seq, reason: 'seq' };
    if (e.prevHash !== prev) return { ok: false, brokenAtSeq: e.seq, reason: 'prev_hash' };
    if (linkHash({ ...e, documentId: docId }) !== e.linkHash) {
      return { ok: false, brokenAtSeq: e.seq, reason: 'link_hash' };
    }
    prev = e.linkHash;
    expectedSeq += 1;
  }
  const head = input.events.length ? prev : null;
  if (input.headHash !== head) return { ok: false, brokenAtSeq: null, reason: 'head' };
  return { ok: true, count: input.events.length, headHash: head };
}
