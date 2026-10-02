import InviteForm from '@/components/admin/InviteForm';
import ClientsTable, { type ClientRow } from '@/components/admin/ClientsTable';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { requireAdmin } from '@/lib/server/auth/dal';

export const dynamic = 'force-dynamic';

type Member = { invited_email: string | null; created_at: string };
type Row = {
  id: string;
  name: string;
  siret: string | null;
  created_at: string;
  sv_client_members: Member[] | Member | null;
};

export default async function AdminPage() {
  // Lecture via le client RLS (politique is_admin), jamais service_role (T-10-47).
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('sv_clients')
    .select('id, name, siret, created_at, sv_client_members(invited_email, created_at)')
    .order('created_at', { ascending: false });

  const rows: ClientRow[] = ((data ?? []) as unknown as Row[]).map((c) => {
    const members = Array.isArray(c.sv_client_members)
      ? c.sv_client_members
      : c.sv_client_members
        ? [c.sv_client_members]
        : [];
    const first = members[0];
    return {
      id: c.id,
      client: c.name,
      siret: c.siret ?? '',
      email: first?.invited_email ?? '',
      invitedAt: first?.created_at ?? c.created_at,
    };
  });

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <section className="pt-card" aria-labelledby="invite-title">
            <h1 id="invite-title" className="pt-heading" style={{ marginBottom: 24 }}>
              Inviter un client
            </h1>
            <InviteForm />
          </section>
          <section className="pt-card" aria-labelledby="clients-title">
            <h2 id="clients-title" className="pt-heading" style={{ marginBottom: 24 }}>
              Clients invités
            </h2>
            <ClientsTable rows={rows} />
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
