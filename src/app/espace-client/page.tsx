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
import { PROJECT_COPY } from '@/lib/projects/copy';
import { ALLOWED_FILE_TYPES, type FileKind } from '@/lib/projects/fileRules';
import { OFFER_LABELS, type OfferSlug } from '@/lib/projects/offers';
import { isOnboardingComplete } from '@/lib/projects/onboardingSchema';
import { requireClient } from '@/lib/server/auth/dal';
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
  return (
    <section className="pt-card pt-client" aria-labelledby="interlocutor-title">
      <div className="pt-client-block">
        <h2 id="interlocutor-title">Votre interlocuteur</h2>
        <p className="pt-helper">Anatholy Bricon, Sèvalys · Tours</p>
        <div className="pt-client-contact">
          <a href="mailto:contact@sevalys.com">contact@sevalys.com</a>
          <a href="tel:+33607184133">+33 6 07 18 41 33</a>
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
          <ClientNav />
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

  const { project, client, state, onboarding, files, links, consents } = bundle;
  const offer = OFFER_LABELS[project.offer as OfferSlug] ?? project.offer;
  const showOnboardingCta = state.currentStep === 1 && !(onboarding && isOnboardingComplete(onboarding));
  const company = (client.company ?? null) as CompanySnapshot | null;
  const current = latestConsent(consents);

  return (
    <>
      <ShellHeader variant="client" title={ctx.client.name} actions={<SignOutButton />} />
      <ShellMain width="client">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <ClientNav />
          <ProjectSelector projects={projects.map((p) => ({ id: p.id, title: p.title }))} activeId={project.id} />
          <section className="pt-card" aria-labelledby="project-title">
            <h1 id="project-title" className="pt-heading">
              {project.title}
            </h1>
            <p className="pt-helper">
              {offer} · {PROJECT_COPY.portal.startedOn(formatDateFr(project.startedAt))}
            </p>
            <WhoWaits state={state} now={now} showOnboardingCta={showOnboardingCta} />
          </section>
          <section className="pt-card" aria-label={PROJECT_COPY.portal.timelineLabel}>
            <Timeline state={state} variant="client" />
          </section>
          <OnboardingCard company={company} siret={client.siret ?? ''} onboarding={onboarding} />
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
          <PortalLinks links={links.map((l) => ({ id: l.id, title: l.title, url: l.url }))} />
          <ConsentCard
            projectId={project.id}
            current={current ? { granted: current.granted, createdAt: current.createdAt, version: current.textVersion } : null}
          />
          <Interlocutor />
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
