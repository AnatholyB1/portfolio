// PRECONDITION : l'appelant a déjà passé requireAdmin() et fournit le client RLS de l'admin (jamais service_role).
// Les montants calculés ici ne doivent atteindre que la page admin (T-13-65).
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { OFFER_LABELS, type OfferSlug } from '@/lib/projects/offers';
import type { DocType, QuoteLine, QuoteSnapshot, SpecSnapshot } from '@/lib/documents/types';
import {
  chainHeads,
  checkIssuable,
  expectedDocTypes,
  type IssueCheckCode,
} from '@/lib/documents/steps';
import { sortForDisplay, withStatuses } from '@/lib/documents/status';
import type { IssuedDocView } from '@/components/admin/projects/documents/types';
import type { ProjectBundle } from '@/lib/server/projects/read';
import { loadActiveSnapshot, loadProjectDocuments } from './read';

const COPY = PROJECT_COPY.documents.admin;

export type ExpectedDocView = {
  docType: DocType;
  activeRevision: number | null;
  canIssue: boolean;
  blockedReason: string | null;
};

export type QuoteRecap = {
  reference: string;
  revision: number;
  lines: QuoteLine[];
  totalCents: number;
  depositPercent: number;
  depositCents: number;
  balanceCents: number;
  leadTime: string;
};

export type AdminDocumentsView = {
  expected: ExpectedDocView[];
  issued: IssuedDocView[];
  activeQuote: QuoteRecap | null;
  activeSpec: { reference: string; revision: number; acceptanceCriteria: string[] } | null;
  parties: { clientName: string; signatory: string | null; offerLabel: string };
};

const REASONS: Record<IssueCheckCode, string | null> = {
  wrong_step: COPY.wrongStep,
  missing_quote: COPY.needQuote,
  missing_spec: COPY.needSpec,
  signed_no_replace: COPY.signedNoReplace,
  preview_only: null,
};

export async function loadAdminDocumentsView(rls: SupabaseClient, bundle: ProjectBundle): Promise<AdminDocumentsView> {
  const { project, client, facts, state, onboarding } = bundle;
  const docs = await loadProjectDocuments(rls, project.id);
  const heads = chainHeads(docs);
  const args = { facts, startedAt: project.startedAt, docs };

  // Les factures vivent uniquement dans la section Facturation (PAY-04) : plus d'aperçu ici.
  const expected: ExpectedDocView[] = expectedDocTypes(state.currentStep)
    .filter((docType) => docType !== 'invoice')
    .map((docType) => {
      const activeRevision = heads.get(docType)?.revision ?? null;
      const res = checkIssuable({ docType, ...args });
      return {
        docType,
        activeRevision,
        canIssue: res.ok,
        blockedReason: res.ok ? null : REASONS[res.code],
      };
    });

  const issued: IssuedDocView[] = sortForDisplay(withStatuses(docs, facts)).map((d) => ({
    id: d.id,
    docType: d.docType,
    revision: d.revision,
    issuedAt: d.issuedAt,
    status: d.status,
    templateVersion: d.templateVersion,
    sha256: d.sha256,
    sizeBytes: d.sizeBytes,
    replacedBy: d.replacedBy ? { revision: d.replacedBy.revision, issuedAt: d.replacedBy.issuedAt } : null,
  }));

  const [quoteHit, specHit] = await Promise.all([
    loadActiveSnapshot(rls, project.id, 'quote'),
    loadActiveSnapshot(rls, project.id, 'spec'),
  ]);
  const q = quoteHit?.snapshot as QuoteSnapshot | undefined;
  const s = specHit?.snapshot as SpecSnapshot | undefined;

  const nom = (client.company as { nom?: unknown } | null)?.nom;
  const clientName = typeof nom === 'string' && nom.trim() ? nom : client.name || 'Client';
  const signatory =
    onboarding?.signatoryName && onboarding.signatoryRole
      ? `${onboarding.signatoryName}, ${onboarding.signatoryRole}`
      : null;

  return {
    expected,
    issued,
    activeQuote: q
      ? {
          reference: q.reference,
          revision: q.revision,
          lines: q.lines,
          totalCents: q.totalCents,
          depositPercent: q.depositPercent,
          depositCents: q.depositCents,
          balanceCents: q.balanceCents,
          leadTime: q.leadTime,
        }
      : null,
    activeSpec: s ? { reference: s.reference, revision: s.revision, acceptanceCriteria: s.acceptanceCriteria } : null,
    parties: {
      clientName,
      signatory,
      offerLabel: OFFER_LABELS[project.offer as OfferSlug] ?? project.offer,
    },
  };
}
