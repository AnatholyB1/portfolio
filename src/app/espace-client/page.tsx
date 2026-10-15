import Link from 'next/link';
import NoAccess from '@/components/portal/NoAccess';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import ClientNav from '@/components/portal/project/ClientNav';
import ConsentCard from '@/components/portal/project/ConsentCard';
import FilesPanel from '@/components/portal/project/FilesPanel';
import OnboardingCard from '@/components/portal/project/OnboardingCard';
import PortalLinks from '@/components/portal/project/PortalLinks';
import ProjectSelector from '@/components/portal/project/ProjectSelector';
import Timeline from '@/components/portal/project/Timeline';
import WhoWaits from '@/components/portal/project/WhoWaits';
import '@/components/portal/client.css';
import '@/components/portal/project/project.css';
import { confirmUploadAction, downloadAction, requestUploadAction } from '@/app/espace-client/actions';
import { formatDateFr } from '@/lib/admin/format';
import type { CompanySnapshot } from '@/lib/admin/inviteSchema';
import { buildClientActions } from '@/lib/projects/clientActions';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { ALLOWED_FILE_TYPES, type FileKind } from '@/lib/projects/fileRules';
import { OFFER_LABELS, type OfferSlug } from '@/lib/projects/offers';
import { isOnboardingComplete } from '@/lib/projects/onboardingSchema';
import { resolveWaiting } from '@/lib/projects/steps';
import { withStatuses } from '@/lib/documents/status';
import { requireClient } from '@/lib/server/auth/dal';
import { loadProjectDocuments } from '@/lib/server/documents/read';
import { InvoicesLoadError, loadInvoicesForProjects } from '@/lib/server/invoices/read';
import {
  latestConsent,
  loadClientProjects,
  loadProjectBundle,
  pickActiveProject,
} from '@/lib/server/projects/read';

export const dynamic = 'force-dynamic';

function kindOf(filename: string): FileKind {
  const dot = filename.lastIndexOf('.');
  const ext = dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
  return ALLOWED_FILE_TYPES.find((t) => t.ext === ext)?.kind ?? 'text';
}

function Interlocutor() {
  const who = PROJECT_COPY.portal.interlocutor;
  return (
    <section className="pt-card pt-client" aria-labelledby="interlocutor-title">
      <div className="pt-client-block">
        <h2 id="interlocutor-title">{who.heading}</h2>
        <p className="pt-helper">{who.identity}</p>
        <div className="pt-client-contact">
          <a href={who.emailHref}>{who.email}</a>
          <a href={who.phoneHref}>{who.phone}</a>
        </div>
      </div>
    </section>
  );
}

export default async function EspaceClientPage({
  searchParams,
}: {
  searchParams: Promise<{ projet?: string | string[] }>;
}) {
  const ctx = await requireClient();

  if (ctx.status === 'no_access') {
    return (
      <ShellMain width="client">
        <NoAccess action={<SignOutButton />} />
      </ShellMain>
    );
  }

  const sp = await searchParams;
  const requested = typeof sp.projet === 'string' ? sp.projet : null;
  const now = new Date();

  // Lecture via le client RLS du client uniquement (D-22) ; ?projet= n'est qu'une préférence.
  const projects = await loadClientProjects(ctx.supabase);
  const active = pickActiveProject(projects, requested, {});
  const bundle = active ? await loadProjectBundle(ctx.supabase, active.id, now) : null;

  if (!active || !bundle) {
    return (
      <>
        <ShellHeader variant="client" title={ctx.client.name} actions={<SignOutButton />} />
        <ShellMain width="client">
          <ClientNav current="projet" />
          <section className="pt-card pt-client" aria-labelledby="empty-title">
            <h1 id="empty-title" className="pt-heading">
              {PROJECT_COPY.portal.emptyHeading}
            </h1>
            <p className="pt-helper">{PROJECT_COPY.portal.emptyBody}</p>
          </section>
          <Interlocutor />
        </ShellMain>
        <ShellFooter />
      </>
    );
  }

  const { project, client, state: nominalState, onboarding, files, links, consents } = bundle;
  const offer = OFFER_LABELS[project.offer as OfferSlug] ?? project.offer;
  const onboardingComplete = !!(onboarding && isOnboardingComplete(onboarding));
  const company = (client.company ?? null) as CompanySnapshot | null;
  const current = latestConsent(consents);
  // Statut des documents dérivé des faits : alimente l'action « signer » du panneau « En attente de ».
  const projectDocs = await loadProjectDocuments(ctx.supabase, project.id);
  const toSignDocs = withStatuses(projectDocs, bundle.facts).filter((d) => d.status === 'to_sign');
  const awaitingSignature = toSignDocs.length > 0;
  let toPayInvoices: { kind: string }[] = [];
  let invoicesRead = true;
  try {
    const invoices = await loadInvoicesForProjects(ctx.supabase, [project.id]);
    toPayInvoices = invoices.filter((i) => i.status === 'to_pay');
  } catch (e) {
    // Les factures ne bloquent pas la page projet : la page Paiements affiche l'erreur de lecture.
    if (!(e instanceof InvoicesLoadError)) throw e;
    invoicesRead = false;
  }
  // Qui attend vraiment : le client seulement s'il a un document à signer ou une facture à payer.
  // Si la lecture des factures a échoué, on garde la valeur statique plutôt que d'annoncer à tort
  // « Nous préparons votre facture ».
  const state = invoicesRead
    ? resolveWaiting(nominalState, { toSign: toSignDocs.length, toPay: toPayInvoices.length })
    : nominalState;
  const actions = buildClientActions({
    state,
    onboardingComplete,
    toSignDocs: toSignDocs.map((d) => ({ id: d.id, docType: d.docType })),
    toPayInvoices,
  });

  return (
    <>
      <ShellHeader variant="client" title={ctx.client.name} actions={<SignOutButton />} />
      <ShellMain width="client">
        <ClientNav current="projet" />
        <ProjectSelector projects={projects.map((p) => ({ id: p.id, title: p.title }))} activeId={project.id} />
        <section className="pt-card" aria-labelledby="project-title">
          <h1 id="project-title" className="pt-display">
            {project.title}
          </h1>
          <p className="pt-helper">
            {offer} · {PROJECT_COPY.portal.startedOn(formatDateFr(project.startedAt))}
          </p>
          <WhoWaits state={state} now={now} actions={actions} />
          {awaitingSignature && actions.length === 0 ? (
            <p className="pt-who-since">
              {PROJECT_COPY.signature.documentsTab.awaiting}{' '}
              <Link href="/espace-client/documents" className="pt-btn-text">
                {PROJECT_COPY.signature.documentsTab.goToDocuments}
              </Link>
            </p>
          ) : null}
        </section>
        {/* Pas de second nom : la liste <ol> porte déjà « Avancement du projet » (F-C13). */}
        <div className="pt-card">
          <Timeline state={state} variant="client" />
        </div>
        <OnboardingCard
          company={company}
          siret={client.siret ?? ''}
          onboarding={onboarding}
          quotePending={!nominalState.done && nominalState.currentStep !== null && nominalState.currentStep <= 2}
        />
        <section className="pt-card pt-card-quiet" aria-labelledby="files-title">
          <FilesPanel
            projectId={project.id}
            viewer="client"
            files={files.map((f) => ({
              id: f.id,
              filename: f.filename,
              sizeBytes: f.sizeBytes,
              createdAt: f.createdAt,
              uploadedByKind: f.uploadedByKind,
              kind: kindOf(f.filename),
            }))}
            requestUpload={requestUploadAction}
            confirmUpload={confirmUploadAction}
            getDownloadUrl={downloadAction}
          />
        </section>
        <PortalLinks links={links.map((l) => ({ id: l.id, title: l.title, url: l.url }))} />
        <ConsentCard
          projectId={project.id}
          current={current ? { granted: current.granted, createdAt: current.createdAt, version: current.textVersion } : null}
        />
        <Interlocutor />
      </ShellMain>
      <ShellFooter />
    </>
  );
}
