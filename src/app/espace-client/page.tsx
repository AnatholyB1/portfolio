import NoAccess from '@/components/portal/NoAccess';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import '@/components/portal/client.css';
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
        <section className="pt-card pt-client" aria-labelledby="empty-title">
          <h1 id="empty-title" className="pt-heading">
            Votre espace est en préparation
          </h1>
          <p className="pt-helper">Vous êtes bien connecté. Voici ce que vous y trouverez.</p>

          <div className="pt-client-block">
            <h2>Ce qui arrivera ici</h2>
            <ul className="pt-client-list">
              <li>
                <strong>Projet</strong> : le suivi d&apos;avancement.
              </li>
              <li>
                <strong>Documents</strong> : devis, contrats, livrables.
              </li>
              <li>
                <strong>Paiements</strong> : factures et règlements.
              </li>
            </ul>
          </div>

          <div className="pt-client-block">
            <h2>Prochaine étape</h2>
            <p className="pt-helper">
              Nous vous prévenons par e-mail dès que votre premier document est en ligne.
            </p>
          </div>

          <div className="pt-client-block">
            <h2>Votre interlocuteur</h2>
            <p className="pt-helper">Anatholy Bricon, Sèvalys · Tours</p>
            <div className="pt-client-contact">
              <a href="mailto:contact@sevalys.com">contact@sevalys.com</a>
              <a href="tel:+33607184133">+33 6 07 18 41 33</a>
            </div>
          </div>
        </section>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
