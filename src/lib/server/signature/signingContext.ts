// Contexte de la page de signature (D-02, D-04, D-14). Une seule lecture alimente tous les états de l'écran.
// PRECONDITION : l'appelant a exécuté requireClient(). Lecture RLS d'abord ; service_role uniquement
// pour des lectures bornées au document/projet déjà autorisé (instantané admin-only, membres, codes, piste).
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { checkSignable, maskEmail, signerMatches, type SignableCheck } from '@/lib/signature/signable';
import type { AcceptanceAnswer } from '@/lib/signature/acceptance';
import { CONSENT_VERSION } from '@/lib/signature/consentText';
import { replacedByMap } from '@/lib/documents/steps';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { loadProjectDocuments, type DocumentRow } from '@/lib/server/documents/read';
import { loadProjectBundle } from '@/lib/server/projects/read';

const COOLDOWN_S = 60;
const MAX_SENDS_PER_HOUR = 5;
const HOUR_MS = 3_600_000;

export type SignatureState = 'open' | 'pending_finalization' | 'signed';

export type SigningContext =
  | { status: 'not_found' }
  | {
      status: 'ready';
      document: DocumentRow;
      signable: SignableCheck;
      replacedBy: { id: string; revision: number } | null;
      signer: { matches: boolean; name: string | null; role: string | null; maskedEmail: string };
      /** Critères du PV (lus dans l'instantané, service_role après contrôle RLS) ; null hors PV. */
      criteria: string[] | null;
      latestSubmission: { answers: AcceptanceAnswer[]; refused: boolean } | null;
      state: SignatureState;
      signature: { signedAt: string; signedAtUtc: string; signerUserId: string } | null;
      seal: { sha256: string; sealedAt: string } | null;
      consentRecorded: boolean;
      code: { cooldownS: number; sendsLeft: number; activeCodeExpiresAt: string | null };
    };

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function safe<T>(fn: () => PromiseLike<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    console.error('[signature/signingContext] read failed');
    return null;
  }
}

export async function loadSigningContext(a: {
  rls: SupabaseClient;
  userId: string;
  email: string;
  documentId: string;
  now?: Date;
}): Promise<SigningContext> {
  const now = a.now ?? new Date();

  // 1. Autorisation : le document doit être visible par le client RLS.
  const head = await safe(() =>
    a.rls.from('sv_project_documents').select('project_id').eq('id', a.documentId).maybeSingle(),
  );
  if (!head || head.error || !head.data) return { status: 'not_found' };
  const projectId = String((head.data as Row).project_id);

  const [docs, bundle] = await Promise.all([
    safe(() => loadProjectDocuments(a.rls, projectId)),
    safe(() => loadProjectBundle(a.rls, projectId, now)),
  ]);
  const document = docs?.find((d) => d.id === a.documentId);
  if (!docs || !document || !bundle) return { status: 'not_found' };

  // 2. Signature et scellé (lecture RLS).
  const sigRes = await safe(() =>
    a.rls
      .from('sv_document_signatures')
      .select('signer_user_id, signed_at, signed_at_utc')
      .eq('document_id', a.documentId)
      .maybeSingle(),
  );
  const sigRow = (sigRes && !sigRes.error ? sigRes.data : null) as Row | null;
  const signature = sigRow
    ? {
        signedAt: String(sigRow.signed_at),
        signedAtUtc: String(sigRow.signed_at_utc),
        signerUserId: String(sigRow.signer_user_id),
      }
    : null;

  let seal: { sha256: string; sealedAt: string } | null = null;
  if (signature) {
    const sealRes = await safe(() =>
      a.rls.from('sv_document_seals').select('sha256, sealed_at').eq('document_id', a.documentId).maybeSingle(),
    );
    const s = (sealRes && !sealRes.error ? sealRes.data : null) as Row | null;
    if (s) seal = { sha256: String(s.sha256), sealedAt: String(s.sealed_at) };
  }
  const state: SignatureState = !signature ? 'open' : seal ? 'signed' : 'pending_finalization';

  // 3. Signabilité (règles pures 14-03) sur les faits courants.
  const signable = checkSignable({
    doc: document,
    docs,
    facts: bundle.facts,
    startedAt: bundle.project.startedAt,
    hasSignature: signature !== null,
  });
  const repl = replacedByMap(docs).get(document.id);
  const replacedBy = repl ? { id: repl.id, revision: repl.revision } : null;

  // 4. Lectures service_role bornées au document / client autorisés.
  const admin = createSupabaseAdminClient();
  const member = await safe(() =>
    admin
      .from('sv_client_members')
      .select('user_id')
      .eq('client_id', bundle.project.clientId)
      .eq('user_id', a.userId)
      .maybeSingle(),
  );
  const isMember = !!member && !member.error && !!member.data;
  const signer = {
    matches: signerMatches({
      isMember,
      signatoryName: bundle.onboarding?.signatoryName ?? null,
      signatoryRole: bundle.onboarding?.signatoryRole ?? null,
    }),
    name: bundle.onboarding?.signatoryName?.trim() || null,
    role: bundle.onboarding?.signatoryRole?.trim() || null,
    maskedEmail: maskEmail(a.email),
  };

  let criteria: string[] | null = null;
  let latestSubmission: { answers: AcceptanceAnswer[]; refused: boolean } | null = null;
  if (document.docType === 'acceptance') {
    const snap = await safe(() =>
      admin.from('sv_document_snapshots').select('data').eq('document_id', a.documentId).maybeSingle(),
    );
    const list = (snap?.data as Row | null)?.data?.acceptanceCriteria;
    criteria = Array.isArray(list) ? list.map(String) : [];

    const sub = await safe(() =>
      a.rls
        .from('sv_acceptance_submissions')
        .select('id, refused_count')
        .eq('document_id', a.documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    const subRow = (sub && !sub.error ? sub.data : null) as Row | null;
    if (subRow) {
      const resp = await safe(() =>
        a.rls
          .from('sv_acceptance_responses')
          .select('criterion_index, status, note')
          .eq('submission_id', String(subRow.id))
          .order('criterion_index', { ascending: true }),
      );
      const answers = ((resp && !resp.error ? resp.data : []) as Row[] | null) ?? [];
      latestSubmission = {
        answers: answers.map((r) => ({
          index: Number(r.criterion_index),
          status: r.status,
          note: r.note ?? null,
        })),
        refused: Number(subRow.refused_count) > 0,
      };
    }
  }

  // 5. Consentement déjà journalisé pour cette version (renvoi sans second consentement).
  const ev = await safe(() =>
    admin
      .from('sv_signature_events')
      .select('payload')
      .eq('document_id', a.documentId)
      .eq('event_type', 'consent_given')
      .eq('actor_id', a.userId),
  );
  let consentRecorded = false;
  for (const r of ((ev && !ev.error ? ev.data : []) as Row[] | null) ?? []) {
    try {
      if ((JSON.parse(String(r.payload)) as Row).version === CONSENT_VERSION) consentRecorded = true;
    } catch {
      /* payload illisible : ignoré */
    }
  }

  // 6. Compteurs de code (cosmétiques : SQL fait foi).
  const since = new Date(now.getTime() - HOUR_MS).toISOString();
  const codesRes = await safe(() =>
    admin
      .from('sv_signature_codes')
      .select('created_at, expires_at, consumed_at, invalidated_at')
      .eq('document_id', a.documentId)
      .gte('created_at', since)
      .order('created_at', { ascending: false }),
  );
  const codes = ((codesRes && !codesRes.error ? codesRes.data : []) as Row[] | null) ?? [];
  const last = codes[0];
  const cooldownS = last
    ? Math.min(COOLDOWN_S, Math.max(0, Math.ceil(COOLDOWN_S - (now.getTime() - Date.parse(String(last.created_at))) / 1000)))
    : 0;
  const active = codes.find(
    (c) => !c.consumed_at && !c.invalidated_at && Date.parse(String(c.expires_at)) > now.getTime(),
  );

  return {
    status: 'ready',
    document,
    signable,
    replacedBy,
    signer,
    criteria,
    latestSubmission,
    state,
    signature,
    seal,
    consentRecorded,
    code: {
      cooldownS,
      sendsLeft: Math.max(0, MAX_SENDS_PER_HOUR - codes.length),
      activeCodeExpiresAt: active ? String(active.expires_at) : null,
    },
  };
}
