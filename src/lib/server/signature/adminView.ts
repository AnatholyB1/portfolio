// PRECONDITION : l'appelant a déjà passé requireAdmin() et fournit le client RLS de l'admin (jamais service_role).
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CriterionNote, SignatureView } from '@/components/admin/projects/documents/types';
import { SIGNATURE_EVENT_LABELS, type SignatureEvent } from '@/lib/signature/events';

type EventRow = {
  document_id: string;
  seq: number;
  event_type: string;
  actor_kind: string;
  ip: string | null;
  payload: string;
  occurred_at_utc: string;
};

const RESPONSE_LABELS: Record<string, string> = {
  delivered: 'Critère validé',
  reserved: 'Réserve signalée',
  refused: 'Critère refusé',
};

function parsePayload(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string') return {};
  try {
    const v: unknown = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function labelOf(type: string, payload: Record<string, unknown>): string {
  if (type === 'acceptance_response' && typeof payload.status === 'string' && RESPONSE_LABELS[payload.status]) {
    return RESPONSE_LABELS[payload.status];
  }
  return SIGNATURE_EVENT_LABELS[type as SignatureEvent] ?? type;
}

function criteriaOf(data: unknown): string[] {
  const list = (data as { acceptanceCriteria?: unknown } | null)?.acceptanceCriteria;
  return Array.isArray(list) ? list.map((x) => String(x)) : [];
}

export async function loadSignatureViews(rls: SupabaseClient, projectId: string): Promise<Map<string, SignatureView>> {
  const out = new Map<string, SignatureView>();
  try {
    const docs = await rls.from('sv_project_documents').select('id').eq('project_id', projectId);
    if (docs.error) throw new Error('docs');
    const ids = ((docs.data ?? []) as { id: string }[]).map((d) => d.id);
    if (ids.length === 0) return out;

    const [ev, sigs, seals] = await Promise.all([
      rls
        .from('sv_signature_events')
        .select('document_id, seq, event_type, actor_kind, ip, payload, occurred_at_utc')
        .in('document_id', ids)
        .order('seq', { ascending: true }),
      rls
        .from('sv_document_signatures')
        .select(
          'document_id, signer_name, signer_role, signer_email, signed_at, signed_at_utc, ip, consent_version, signed_link_hash',
        )
        .in('document_id', ids),
      rls.from('sv_document_seals').select('document_id, sha256, sealed_at').in('document_id', ids),
    ]);
    if (ev.error || sigs.error || seals.error) throw new Error('read');

    const events = (ev.data ?? []) as EventRow[];
    const byDoc = new Map<string, EventRow[]>();
    for (const e of events) {
      const list = byDoc.get(e.document_id) ?? [];
      list.push(e);
      byDoc.set(e.document_id, list);
    }
    const sigBy = new Map(((sigs.data ?? []) as Record<string, unknown>[]).map((r) => [String(r.document_id), r]));
    const sealBy = new Map(((seals.data ?? []) as Record<string, unknown>[]).map((r) => [String(r.document_id), r]));

    // Texte des critères : instantané figé du document (lecture admin).
    const withResponses = [...byDoc.entries()]
      .filter(([, list]) => list.some((e) => e.event_type === 'acceptance_response'))
      .map(([id]) => id);
    const criteriaBy = new Map<string, string[]>();
    if (withResponses.length > 0) {
      const snaps = await rls.from('sv_document_snapshots').select('document_id, data').in('document_id', withResponses);
      if (snaps.error) throw new Error('snap');
      for (const s of (snaps.data ?? []) as { document_id: string; data: unknown }[]) {
        criteriaBy.set(s.document_id, criteriaOf(s.data));
      }
    }

    for (const [docId, list] of byDoc) {
      const criteria = criteriaBy.get(docId) ?? [];
      const reserves: CriterionNote[] = [];
      const refused: CriterionNote[] = [];
      for (const e of list) {
        if (e.event_type !== 'acceptance_response') continue;
        const p = parsePayload(e.payload);
        const index = Number(p.index);
        const item = {
          index,
          criterion: criteria[index - 1] ?? '',
          note: typeof p.note === 'string' ? p.note : '',
        };
        if (p.status === 'reserved') reserves.push(item);
        else if (p.status === 'refused') refused.push(item);
      }
      const s = sigBy.get(docId);
      const sl = sealBy.get(docId);
      out.set(docId, {
        eventCount: list.length,
        events: list.map((e) => ({
          seq: e.seq,
          label: labelOf(e.event_type, parsePayload(e.payload)),
          actorKind: e.actor_kind,
          ip: e.ip ?? null,
          occurredAtUtc: e.occurred_at_utc,
        })),
        signature: s
          ? {
              signerName: String(s.signer_name),
              signerRole: String(s.signer_role),
              signerEmail: String(s.signer_email),
              signedAt: String(s.signed_at),
              signedAtUtc: String(s.signed_at_utc),
              ip: s.ip == null ? null : String(s.ip),
              consentVersion: String(s.consent_version),
              signedLinkHash: String(s.signed_link_hash),
            }
          : null,
        seal: sl ? { sha256: String(sl.sha256), sealedAt: String(sl.sealed_at) } : null,
        pendingFinalization: Boolean(s) && !sl,
        reserves,
        refusal: refused.length > 0 ? { count: refused.length, items: refused } : null,
      });
    }
    return out;
  } catch {
    console.error('[signature/adminView] load failed');
    return new Map();
  }
}
