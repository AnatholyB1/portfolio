import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import NoAccess from '@/components/portal/NoAccess';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import AcceptanceChecklist from '@/components/portal/project/AcceptanceChecklist';
import SigningFlow from '@/components/portal/project/SigningFlow';
import '@/components/portal/client.css';
import '@/components/portal/project/project.css';
import { documentDownloadAction, sealedDocumentDownloadAction } from '@/app/espace-client/actions';
import { formatDateFr } from '@/lib/admin/format';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { summarizeAnswers } from '@/lib/signature/acceptance';
import { requireClient } from '@/lib/server/auth/dal';
import { loadSigningContext } from '@/lib/server/signature/signingContext';
import {
  previewLinkAction,
  resumeFinalizationAction,
  sendCodeAction,
  submitAcceptanceAction,
  verifyCodeAction,
} from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Signer un document' };

const SIG = PROJECT_COPY.signature;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SignerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireClient();

  if (ctx.status === 'no_access') {
    return (
      <ShellMain width="client">
        <NoAccess action={<SignOutButton />} />
      </ShellMain>
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id) || !ctx.user.email) notFound();

  const sctx = await loadSigningContext({
    rls: ctx.supabase,
    userId: ctx.user.id,
    email: ctx.user.email,
    documentId: id,
  });
  if (sctx.status === 'not_found') notFound();

  const doc = sctx.document;
  const docType = doc.docType;

  const flow = {
    documentId: id,
    docType,
    reference: doc.reference,
    sha256: doc.sha256,
    signer: sctx.signer,
    codeState: sctx.code,
    consentRecorded: sctx.consentRecorded,
    state: sctx.state,
    signedAt: sctx.signature?.signedAt ?? null,
    sealSha256: sctx.seal?.sha256 ?? null,
    signOutSlot: <SignOutButton />,
    previewLinkAction,
    getDownloadUrl: documentDownloadAction,
    sendCodeAction,
    verifyCodeAction,
    resumeFinalizationAction,
    sealedDocumentDownloadAction,
  };

  const sub = sctx.latestSubmission;
  const needsChecklist =
    docType === 'acceptance' && sctx.criteria !== null && sctx.signer.matches && (!sub || sub.refused);

  let body: React.ReactNode;
  if (sctx.state !== 'open') {
    body = <SigningFlow {...flow} />;
  } else if (!sctx.signable.ok) {
    if (sctx.signable.code === 'replaced' && sctx.replacedBy) {
      body = (
        <section className="pt-card">
          <p className="pt-warning">{SIG.states.replaced(sctx.replacedBy.revision)}</p>
          <Link href={`/espace-client/documents/${sctx.replacedBy.id}/signer`} className="pt-btn-ghost">
            {SIG.states.seeVersion(sctx.replacedBy.revision)}
          </Link>
        </section>
      );
    } else {
      body = (
        <section className="pt-card">
          <p>{SIG.states.notSignable}</p>
        </section>
      );
    }
  } else if (needsChecklist && sctx.criteria) {
    body = (
      <AcceptanceChecklist
        documentId={id}
        criteria={sctx.criteria}
        submitAcceptanceAction={submitAcceptanceAction}
        flow={flow}
      />
    );
  } else if (docType === 'acceptance' && sub) {
    const s = summarizeAnswers(sub.answers);
    body = <SigningFlow {...flow} stepOffset={1} recap={SIG.checklist.recap(s.delivered + s.reserved, s.reserved)} />;
  } else {
    body = <SigningFlow {...flow} />;
  }

  const showTitle = !needsChecklist || sctx.state !== 'open' || !sctx.signable.ok;
  const titleKey = docType === 'quote' || docType === 'contract' || docType === 'acceptance' ? docType : null;

  return (
    <>
      <ShellHeader variant="client" title={ctx.client.name} actions={<SignOutButton />} />
      <ShellMain width="client">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Link href="/espace-client/documents" className="pt-btn-text pt-file-action">
            <ChevronLeft size={16} aria-hidden="true" />
            {SIG.back}
          </Link>
          {showTitle && titleKey ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 className="pt-heading">{SIG.titles[titleKey]}</h1>
              <p className="pt-doc-meta">{SIG.meta(doc.revision, formatDateFr(doc.issuedAt))}</p>
            </div>
          ) : null}
          {body}
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
