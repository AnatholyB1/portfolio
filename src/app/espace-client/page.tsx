import NoAccess from '@/components/portal/NoAccess';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { requireClient } from '@/lib/server/auth/dal';

export const dynamic = 'force-dynamic';

export default async function EspaceClientPage() {
  const ctx = await requireClient();

  if (ctx.status === 'no_access') {
    return (
      <ShellMain width="client">
        <NoAccess action={<SignOutButton />} />
      </ShellMain>
    );
  }

  return (
    <>
      <ShellHeader variant="client" title={ctx.client.name} actions={<SignOutButton />} />
      <ShellMain width="client">
        <section className="pt-card pt-empty" aria-labelledby="empty-title">
          <h1 id="empty-title" className="pt-heading">
            Votre espace est en préparation
          </h1>
          <p className="pt-helper">
            Vos documents, votre projet et vos paiements apparaîtront ici dès qu&apos;ils seront
            disponibles. Une question ? Écrivez-nous à{' '}
            <a href="mailto:contact@sevalys.com">contact@sevalys.com</a>.
          </p>
        </section>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
