// PRECONDITION : requireAdmin() et l'accès au projet ont été vérifiés par l'appelant (13-17).
// Relit tout côté serveur (projet, faits, questionnaire, documents, instantané prérequis) : rien du formulaire n'est cru (D-01, D-05, D-07, D-09).
// Aucune écriture : ni stockage, ni RPC, ni client service_role.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { parisDateOf } from '@/lib/documents/dates';
import type { DocumentInput } from '@/lib/documents/schemas';
import { SELLER_V1 } from '@/lib/documents/seller';
import { buildSnapshot } from '@/lib/documents/snapshot';
import { checkIssuable, checkPreviewable, DOC_PREREQUISITE, type IssueCheckCode } from '@/lib/documents/steps';
import type { DocumentSnapshot, QuoteSnapshot, SpecSnapshot } from '@/lib/documents/types';
import { loadProjectBundle } from '@/lib/server/projects/read';
import { DocumentsLoadError, loadActiveSnapshot, loadProjectDocuments } from './read';

export type PrepareResult =
  | { ok: true; snapshot: DocumentSnapshot; replaces: string | null }
  | { ok: false; code: 'not_found' | 'load_failed' | IssueCheckCode };

export async function prepareDocument(
  rls: SupabaseClient,
  input: DocumentInput,
  mode: 'preview' | 'issue',
  now: Date,
): Promise<PrepareResult> {
  const bundle = await loadProjectBundle(rls, input.projectId, now);
  if (!bundle) return { ok: false, code: 'not_found' };

  // Une lecture en échec n'est jamais traitée comme « aucun document » (WR-06).
  let docs;
  try {
    docs = await loadProjectDocuments(rls, input.projectId);
  } catch (e) {
    if (e instanceof DocumentsLoadError) return { ok: false, code: 'load_failed' };
    throw e;
  }
  const args = { docType: input.docType, facts: bundle.facts, startedAt: bundle.project.startedAt, docs };
  const check = mode === 'issue' ? checkIssuable(args) : checkPreviewable(args);
  if (!check.ok) return { ok: false, code: check.code };

  const prereq: { quote?: QuoteSnapshot; spec?: SpecSnapshot } = {};
  const need = DOC_PREREQUISITE[input.docType];
  try {
    if (need === 'quote') {
      const q = await loadActiveSnapshot(rls, input.projectId, 'quote');
      if (!q) return { ok: false, code: 'missing_quote' };
      prereq.quote = q.snapshot as QuoteSnapshot;
    } else if (need === 'spec') {
      const s = await loadActiveSnapshot(rls, input.projectId, 'spec');
      if (!s) return { ok: false, code: 'missing_spec' };
      prereq.spec = s.snapshot as SpecSnapshot;
    }
  } catch (e) {
    if (e instanceof DocumentsLoadError) return { ok: false, code: 'load_failed' };
    throw e;
  }

  const snapshot = buildSnapshot(
    input,
    {
      project: bundle.project,
      client: bundle.client,
      onboarding: bundle.onboarding,
      seller: SELLER_V1,
      issuedOn: parisDateOf(now),
      revision: check.revision,
    },
    prereq,
  );
  return { ok: true, snapshot, replaces: check.replaces?.id ?? null };
}
