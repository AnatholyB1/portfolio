import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Moon } from 'lucide-react';
import AdminNav from '@/components/admin/AdminNav';
import FactJournal from '@/components/admin/projects/FactJournal';
import PostFactForm from '@/components/admin/projects/PostFactForm';
import PanelUnavailable from '@/components/admin/projects/PanelUnavailable';
import ReminderHoldCard from '@/components/admin/projects/ReminderHoldCard';
import ReissueReviewLinkCard from '@/components/admin/reviews/ReissueReviewLinkCard';
import {
  ConsentCard,
  InfoCard,
  LinksCard,
  OnboardingSummaryCard,
} from '@/components/admin/projects/ProjectSideCards';
import BillingPanel from '@/components/admin/projects/billing/BillingPanel';
import DocumentsPanel from '@/components/admin/projects/documents/DocumentsPanel';
import FilesPanel from '@/components/portal/project/FilesPanel';
import Timeline from '@/components/portal/project/Timeline';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import {
  adminConfirmUploadAction,
  adminDownloadAction,
  adminDocumentDownloadAction,
  adminRequestUploadAction,
  adminResumeFinalizationAction,
  adminSealedDownloadAction,
  exportSignatureTrailAction,
  verifySignatureChainAction,
  issueDocumentAction,
  loadSnapshotAction,
  previewDocumentAction,
  verifyDocumentHashAction,
  adminInvoiceDownloadAction,
  issueCreditNoteAction,
  issuePeriodInvoiceAction,
  loadInvoiceDataAction,
  previewCreditNoteAction,
  previewPeriodInvoiceAction,
  verifyInvoiceHashAction,
} from '@/app/admin/projets/actions';
import { countFr } from '@/lib/documents/numberFormat';
import { classifyProject } from '@/lib/projects/blocking';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { ALLOWED_FILE_TYPES, type FileKind } from '@/lib/projects/fileRules';
import { OFFER_LABELS, type OfferSlug } from '@/lib/projects/offers';
import { STEPS, resolveWaiting } from '@/lib/projects/steps';
import { requireAdmin } from '@/lib/server/auth/dal';
import { loadAdminDocumentsView } from '@/lib/server/documents/adminView';
import { loadAdminBillingView } from '@/lib/server/invoices/adminView';
import { loadSignatureViews } from '@/lib/server/signature/adminView';
import { loadReminderHold } from '@/lib/server/reminders/holds';
import { loadReviewLinkStatus } from '@/lib/server/reviews/linksAdmin';
import { SIGNING_FACT } from '@/lib/documents/steps';
import { loadPendingClientWork, loadProjectBundle } from '@/lib/server/projects/read';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';
import '@/components/admin/projects/projects.css';
import '@/components/admin/shared/inline.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Fiche projet' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Une lecture qui échoue ne fait pas tomber la fiche : le panneau concerné passe à « indisponible »
// (même principe que « Chiffres indisponibles » du pilotage) et les autres restent utilisables.
async function settle<T>(label: string, task: () => Promise<T>): Promise<T | null> {
  try {
    return await task();
  } catch (e) {
    console.error(`[admin/projets] lecture ${label} échouée`, e);
    return null;
  }
}

function kindOf(filename: string): FileKind {
  const dot = filename.lastIndexOf('.');
  const ext = dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
  return ALLOWED_FILE_TYPES.find((t) => t.ext === ext)?.kind ?? 'text';
}

export default async function AdminProjectSheetPage({ params }: { params: Promise<{ id: string }> }) {
  // Lecture via le client RLS (politique admin), jamais service_role (D-22).
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const now = new Date();
  const reloadHref = `/admin/projets/${id}`;
  let bundle: Awaited<ReturnType<typeof loadProjectBundle>> = null;
  let bundleFailed = false;
  try {
    bundle = await loadProjectBundle(supabase, id, now);
  } catch (e) {
    console.error('[admin/projets] lecture fiche échouée', e);
    bundleFailed = true;
  }
  if (bundleFailed) return <SheetUnavailable reloadHref={reloadHref} />;
  if (!bundle) notFound();
  const sheet = bundle;

  const [docsView, billingView, signatureMap, reminderHold, reviewLink] = await Promise.all([
    settle('documents', () => loadAdminDocumentsView(supabase, sheet)),
    settle('facturation', () => loadAdminBillingView(supabase, sheet, now)),
    settle('signatures', () => loadSignatureViews(supabase, id)),
    settle('relances', () => loadReminderHold(supabase, id)),
    settle("lien d'avis", () => loadReviewLinkStatus(supabase, id)),
  ]);
  // Sans les signatures, l'état « signé » des documents serait faux : le panneau Documents est alors indisponible.
  const documentsReady = docsView !== null && signatureMap !== null;
  const signatures = signatureMap ? Object.fromEntries(signatureMap) : {};
  const signedFacts = docsView
    ? [
        ...new Set(
          docsView.issued.flatMap((d) => {
            const fact = signatures[d.id]?.signature ? SIGNING_FACT[d.docType] : undefined;
            return fact ? [fact] : [];
          }),
        ),
      ]
    : [];

  const { project, client, facts, notes, onboarding, files, links, consents, lastActivityAt } = bundle;
  // Qui attend vraiment (F-D1) : garde la valeur statique si les documents ou factures sont illisibles.
  const pending = await loadPendingClientWork(supabase, [project.id], new Map([[project.id, facts]]));
  const pendingWork = pending?.get(project.id);
  const state = pendingWork ? resolveWaiting(bundle.state, pendingWork) : bundle.state;
  const { isDormant, daysWaiting } = classifyProject(state, lastActivityAt, now);
  const nom = (client.company as { nom?: unknown } | null)?.nom;
  const name = typeof nom === 'string' && nom.trim() ? nom : client.name || 'Client';
  const offer = OFFER_LABELS[project.offer as OfferSlug] ?? project.offer;
  const step = state.currentStep ? STEPS.find((s) => s.index === state.currentStep) : undefined;

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin pt-stack">
          <AdminNav current="projets" />
          <Link href="/admin/projets" className="pt-back">
            ‹ Projets
          </Link>
          <header>
            <div className="pt-proj-header">
              <h1 className="pt-heading">{name}</h1>
              <span className="pt-proj-badges">
                {state.done ? (
                  <span className="pt-lead-badge">{PROJECT_COPY.blocage.done}</span>
                ) : state.waitingOn === 'client' ? (
                  <span className="pt-lead-badge">{PROJECT_COPY.blocage.client}</span>
                ) : (
                  <span className="pt-lead-badge">
                    {PROJECT_COPY.blocage.admin}
                    <span className="pt-lead-dot" aria-hidden="true" />
                  </span>
                )}
                {isDormant ? (
                  <span className="pt-lead-badge">
                    <Moon size={14} aria-hidden="true" />
                    Dormant
                  </span>
                ) : null}
              </span>
            </div>
            <p className="pt-helper">
              {project.title} · {offer}
            </p>
          </header>
          <div className="pt-lead-grid">
            <div className="pt-lead-main">
              <section className="pt-card" aria-labelledby="proj-steps-title">
                <h2 id="proj-steps-title" className="pt-heading">
                  Étape et faits
                </h2>
                <Timeline state={state} variant="admin" />
                <dl className="pt-summary">
                  <dt>Étape en cours</dt>
                  <dd>{state.done || !step ? PROJECT_COPY.blocage.done : `${step.index}/6 ${step.name}`}</dd>
                  <dt>{PROJECT_COPY.whoWaits.label}</dt>
                  <dd>{state.done ? PROJECT_COPY.blocage.done : state.waitingOn === 'client' ? 'Client' : 'Sèvalys'}</dd>
                  <dt>Depuis</dt>
                  <dd>{countFr(daysWaiting, 'jour')}</dd>
                  <dt>Action attendue</dt>
                  <dd>{state.expectedAction}</dd>
                </dl>
                <PostFactForm projectId={project.id} facts={facts} signedFacts={signedFacts} />
                <FactJournal projectId={project.id} facts={facts} notes={notes} />
              </section>
              <FilesPanel
                projectId={project.id}
                viewer="admin"
                files={files.map((f) => ({
                  id: f.id,
                  filename: f.filename,
                  sizeBytes: f.sizeBytes,
                  createdAt: f.createdAt,
                  uploadedByKind: f.uploadedByKind,
                  kind: kindOf(f.filename),
                }))}
                requestUpload={adminRequestUploadAction}
                confirmUpload={adminConfirmUploadAction}
                getDownloadUrl={adminDownloadAction}
              />
              {documentsReady ? (
                <DocumentsPanel
                  projectId={project.id}
                  view={docsView}
                  signatures={signatures}
                  projectGoal={onboarding?.projectGoal ?? null}
                  actions={{
                    preview: previewDocumentAction,
                    issue: issueDocumentAction,
                    download: adminDocumentDownloadAction,
                    verify: verifyDocumentHashAction,
                    loadSnapshot: loadSnapshotAction,
                    exportTrail: exportSignatureTrailAction,
                    verifyChain: verifySignatureChainAction,
                    downloadSealed: adminSealedDownloadAction,
                    resumeFinalization: adminResumeFinalizationAction,
                  }}
                />
              ) : (
                <PanelUnavailable
                  id="proj-docs-unavailable"
                  title="Documents"
                  unavailable="Documents indisponibles"
                  reloadHref={reloadHref}
                />
              )}
              {billingView ? (
                <BillingPanel
                  projectId={project.id}
                  view={billingView}
                  actions={{
                    previewPeriod: previewPeriodInvoiceAction,
                    issuePeriod: issuePeriodInvoiceAction,
                    previewCredit: previewCreditNoteAction,
                    issueCredit: issueCreditNoteAction,
                    download: adminInvoiceDownloadAction,
                    verifyHash: verifyInvoiceHashAction,
                    loadData: loadInvoiceDataAction,
                  }}
                />
              ) : (
                <PanelUnavailable
                  id="proj-billing-unavailable"
                  title="Facturation"
                  unavailable="Facturation indisponible"
                  reloadHref={reloadHref}
                />
              )}
            </div>
            <div className="pt-lead-side">
              <InfoCard
                client={client}
                project={project}
                onboarding={onboarding}
                lastActivityAt={lastActivityAt}
                now={now}
              />
              <OnboardingSummaryCard onboarding={onboarding} />
              <ConsentCard consents={consents} />
              <ReminderHoldCard projectId={project.id} hold={reminderHold} />
              {reviewLink ? (
                <ReissueReviewLinkCard
                  projectId={project.id}
                  status={reviewLink.status}
                  reviewFiled={reviewLink.reviewFiled}
                />
              ) : (
                <PanelUnavailable
                  id="proj-review-unavailable"
                  title="Lien d'avis"
                  unavailable="Lien d'avis indisponible"
                  reloadHref={reloadHref}
                />
              )}
              <LinksCard projectId={project.id} links={links} />
            </div>
          </div>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}

function SheetUnavailable({ reloadHref }: { reloadHref: string }) {
  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin pt-stack">
          <AdminNav current="projets" />
          <Link href="/admin/projets" className="pt-back">
            ‹ Projets
          </Link>
          <PanelUnavailable
            id="proj-sheet-unavailable"
            title="Fiche projet"
            unavailable="Fiche projet indisponible"
            reloadHref={reloadHref}
          />
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
