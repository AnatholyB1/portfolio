import type { Metadata } from 'next';
import NoAccess from '@/components/portal/NoAccess';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import ClientNav from '@/components/portal/project/ClientNav';
import PaymentsList from '@/components/portal/project/PaymentsList';
import ReturnBanner from '@/components/portal/project/ReturnBanner';
import '@/components/portal/client.css';
import '@/components/portal/project/project.css';
import { invoiceDownloadAction, payInvoiceAction } from '@/app/espace-client/actions';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { requireClient } from '@/lib/server/auth/dal';
import { InvoicesLoadError, loadInvoicesForProjects, type InvoiceView } from '@/lib/server/invoices/read';
import { loadClientProjects } from '@/lib/server/projects/read';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Paiements' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(v: string | string[] | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export default async function EspaceClientPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireClient();

  if (ctx.status === 'no_access') {
    return (
      <ShellMain width="client">
        <NoAccess action={<SignOutButton />} />
      </ShellMain>
    );
  }

  const copy = PROJECT_COPY.payments.portal;
  const params = await searchParams;

  // Lectures via le client RLS du client uniquement (T-15-52).
  const projects = await loadClientProjects(ctx.supabase);
  let invoices: InvoiceView[] = [];
  let loadFailed = false;
  try {
    invoices = await loadInvoicesForProjects(ctx.supabase, projects.map((p) => p.id));
  } catch (e) {
    if (e instanceof InvoicesLoadError) loadFailed = true;
    else throw e;
  }

  // Paramètres de retour non fiables : UUID validé, facture résolue dans la liste RLS du client, sinon ignorée.
  const factureParam = single(params.facture);
  const retourParam = single(params.retour);
  const retour = retourParam === 'succes' || retourParam === 'annule' ? retourParam : null;
  const bannerInvoice =
    retour && factureParam && UUID_RE.test(factureParam) ? (invoices.find((i) => i.id === factureParam) ?? null) : null;

  const groups = projects
    .map((p) => ({ id: p.id, title: p.title, items: invoices.filter((i) => i.projectId === p.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <ShellHeader variant="client" title={ctx.client.name} actions={<SignOutButton />} />
      <ShellMain width="client">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <ClientNav current="paiements" />
          <h1 className="pt-heading">{copy.title}</h1>
          {loadFailed ? (
            <p className="pt-error" role="alert">
              {copy.loadError}
            </p>
          ) : null}
          {!loadFailed && retour && bannerInvoice ? (
            <ReturnBanner retour={retour} invoice={bannerInvoice} pay={payInvoiceAction} />
          ) : null}
          {!loadFailed && groups.length === 0 ? (
            <section className="pt-card" aria-labelledby="payments-empty-title">
              <h2 id="payments-empty-title">{copy.emptyHeading}</h2>
              <p className="pt-helper">{copy.emptyBody}</p>
            </section>
          ) : null}
          {!loadFailed
            ? groups.map((g) => (
                <section key={g.id} className="pt-card" aria-labelledby={`payments-${g.id}`}>
                  {groups.length > 1 ? <h2 id={`payments-${g.id}`}>{g.title}</h2> : null}
                  {g.items.some((i) => i.isTest) ? <p className="pt-warning">{copy.testMode}</p> : null}
                  <PaymentsList
                    projectTitle={g.title}
                    invoices={g.items}
                    pay={payInvoiceAction}
                    getDownloadUrl={invoiceDownloadAction}
                  />
                </section>
              ))
            : null}
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
