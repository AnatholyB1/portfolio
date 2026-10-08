import type { Metadata } from 'next';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';
import InviteForm from '@/components/admin/InviteForm';
import ClientsTable, { type ClientRow } from '@/components/admin/ClientsTable';
import Pager, { ADMIN_PAGE_SIZE, parsePage } from '@/components/admin/Pager';
import WorkQueue from '@/components/admin/WorkQueue';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { requireAdmin } from '@/lib/server/auth/dal';
import { loadWorkQueue } from '@/lib/server/admin/workQueue';
import { getClientStatuses } from '@/lib/server/clients/status';
import '@/components/admin/admin.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Clients' };

type Member = { user_id: string | null; invited_email: string | null; created_at: string };
type Row = {
  id: string;
  name: string;
  siret: string | null;
  created_at: string;
  sv_client_members: Member[] | Member | null;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Lecture via le client RLS (politique is_admin), jamais service_role (T-10-47).
  const { supabase } = await requireAdmin();
  const page = parsePage((await searchParams).page);
  const from = (page - 1) * ADMIN_PAGE_SIZE;

  // Lectures en parallèle : la liste (une ligne de plus que la page pour savoir s'il y a une
  // suite) et la file « À traiter » (chaque tuile tolère son propre échec).
  const [clientsRes, queue] = await Promise.all([
    supabase
      .from('sv_clients')
      .select('id, name, siret, created_at, sv_client_members(user_id, invited_email, created_at)')
      .order('created_at', { ascending: false })
      .range(from, from + ADMIN_PAGE_SIZE),
    loadWorkQueue(supabase),
  ]);
  const loadFailed = Boolean(clientsRes.error);

  const fetched = (clientsRes.data ?? []) as unknown as Row[];
  const hasNext = fetched.length > ADMIN_PAGE_SIZE;
  const clients = fetched.slice(0, ADMIN_PAGE_SIZE);
  const firstMember = (c: Row): Member | undefined => {
    const members = Array.isArray(c.sv_client_members)
      ? c.sv_client_members
      : c.sv_client_members
        ? [c.sv_client_members]
        : [];
    return members[0];
  };

  // Statut de connexion : service_role côté serveur uniquement, après requireAdmin.
  const statuses = await getClientStatuses(
    clients.map((c) => firstMember(c)?.user_id ?? '').filter(Boolean),
  );

  const rows: ClientRow[] = clients.map((c) => {
    const first = firstMember(c);
    return {
      id: c.id,
      client: c.name,
      siret: c.siret ?? '',
      email: first?.invited_email ?? '',
      invitedAt: first?.created_at ?? c.created_at,
      // Lecture impossible : tiret cadratin plutôt qu'un « Invité » potentiellement faux.
      status: (first?.user_id && statuses.get(first.user_id)) || '',
    };
  });

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin">
          <AdminNav current="clients" />
          <h1 className="pt-heading">Clients</h1>
          <WorkQueue counts={queue} />
          <section className="pt-card" aria-labelledby="invite-title">
            <h2 id="invite-title" className="pt-heading pt-admin-title">
              Inviter un client
            </h2>
            <p className="pt-intro">Le client reçoit un code par e-mail, sans mot de passe.</p>
            <InviteForm />
          </section>
          <section className="pt-card" aria-labelledby="clients-title">
            <h2 id="clients-title" className="pt-heading pt-admin-title">
              Clients invités
            </h2>
            {loadFailed ? (
              <div className="pt-admin-state">
                <p className="pt-heading">Clients indisponibles</p>
                <p className="pt-helper">
                  La liste n&apos;a pas pu être lue. Rechargez la page ; si l&apos;erreur persiste, vérifiez la
                  connexion à la base.
                </p>
                <Link href="/admin" className="pt-btn-ghost">
                  Recharger
                </Link>
              </div>
            ) : (
              <>
                <ClientsTable rows={rows} />
                <Pager
                  page={page}
                  hasNext={hasNext}
                  hrefFor={(n) => (n > 1 ? `/admin?page=${n}` : '/admin')}
                  label="clients"
                />
              </>
            )}
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
