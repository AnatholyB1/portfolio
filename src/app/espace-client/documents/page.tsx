import type { Metadata } from 'next';
import NoAccess from '@/components/portal/NoAccess';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import ClientNav from '@/components/portal/project/ClientNav';
import DocumentsList, { type DocumentListItem } from '@/components/portal/project/DocumentsList';
import '@/components/portal/client.css';
import '@/components/portal/project/project.css';
import { documentDownloadAction, sealedDocumentDownloadAction } from '@/app/espace-client/actions';
import { sortForDisplay, withStatuses } from '@/lib/documents/status';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { requireClient } from '@/lib/server/auth/dal';
import { loadDocumentsForProjects } from '@/lib/server/documents/read';
import { loadClientProjects, loadProjectBundle } from '@/lib/server/projects/read';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Documents' };

export default async function EspaceClientDocumentsPage() {
  const ctx = await requireClient();

  if (ctx.status === 'no_access') {
    return (
      <ShellMain width="client">
        <NoAccess action={<SignOutButton />} />
      </ShellMain>
    );
  }

  const now = new Date();
  // Lectures via le client RLS du client uniquement (D-14, D-15).
  const projects = await loadClientProjects(ctx.supabase);
  const projectIds = projects.map((p) => p.id);
  const docs = await loadDocumentsForProjects(ctx.supabase, projectIds);

  // Dates de signature électronique, lues via RLS (le client ne voit que les siennes).
  const signedAtById = new Map<string, string>();
  if (docs.length > 0) {
    const sigs = await ctx.supabase
      .from('sv_document_signatures')
      .select('document_id, signed_at')
      .in('document_id', docs.map((d) => d.id));
    for (const row of (sigs.data ?? []) as { document_id: string; signed_at: string }[]) {
      signedAtById.set(row.document_id, row.signed_at);
    }
  }

  const groups: { id: string; title: string; items: DocumentListItem[] }[] = [];
  for (const p of projects) {
    const projectDocs = docs.filter((d) => d.projectId === p.id);
    if (projectDocs.length === 0) continue;
    const bundle = await loadProjectBundle(ctx.supabase, p.id, now);
    // Sans faits, le statut n'est pas calculable : on n'affiche jamais « À signer » par défaut (WR-05).
    const facts = bundle?.facts ?? [];
    const items = sortForDisplay(withStatuses(projectDocs, facts)).map((d) => ({
      id: d.id,
      docType: d.docType,
      revision: d.revision,
      issuedAt: d.issuedAt,
      status: bundle ? d.status : null,
      replacedBy: d.replacedBy ? { revision: d.replacedBy.revision, issuedAt: d.replacedBy.issuedAt } : null,
      signedAt: signedAtById.get(d.id) ?? null,
    }));
    groups.push({ id: p.id, title: p.title, items });
  }

  const copy = PROJECT_COPY.documents.portal;

  return (
    <>
      <ShellHeader variant="client" title={ctx.client.name} actions={<SignOutButton />} />
      <ShellMain width="client">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <ClientNav current="documents" />
          <h1 className="pt-heading">{copy.title}</h1>
          {groups.length === 0 ? (
            <section className="pt-card" aria-labelledby="documents-empty-title">
              <h2 id="documents-empty-title">{PROJECT_COPY.documents.portal.emptyHeading}</h2>
              <p className="pt-helper">{copy.emptyBody}</p>
            </section>
          ) : (
            groups.map((g) => (
              <section key={g.id} className="pt-card" aria-labelledby={`documents-${g.id}`}>
                {groups.length > 1 ? <h2 id={`documents-${g.id}`}>{g.title}</h2> : null}
                <DocumentsList projectTitle={g.title} getDownloadUrl={documentDownloadAction} getSealedDownloadUrl={sealedDocumentDownloadAction} documents={g.items} />
              </section>
            ))
          )}
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
