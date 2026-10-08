import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';
import LinkBuilder from '@/components/admin/links/LinkBuilder';
import ShellFooter from '@/components/portal/ShellFooter';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { services } from '@/data/services';
import {
  BASE_LINK_PATHS,
  CAMPAIGN_MAX,
  MEDIUM_ALIASES,
  MEDIUM_LABELS,
  PLATFORM_PRESETS,
  SOURCE_ALIASES,
  SOURCE_LABELS,
  UTM_MEDIUMS,
  UTM_SOURCES,
} from '@/lib/attribution/utm';
import { requireAdmin } from '@/lib/server/auth/dal';
import { translations } from '@/lib/translations';
import '@/components/admin/admin.css';
import '@/components/admin/leads/leads.css';
import '@/components/admin/links/links.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Liens de campagne',
  robots: { index: false, follow: false },
};

const BASE_LABELS: Record<(typeof BASE_LINK_PATHS)[number], string> = {
  '/': 'Accueil',
  '/services': 'Services',
  '/simulateur': 'Simulateur',
  '/calculateur-roi': 'Calculateur ROI',
  '/demo': 'Démo',
  '/avis': 'Avis',
};

export default async function AdminLiensPage() {
  // Garde d'accès : la page ne lit aucune table.
  await requireAdmin();

  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sevalys.com').origin;
  const destinations = [
    ...BASE_LINK_PATHS.map((path) => ({ path: path as string, label: BASE_LABELS[path] })),
    ...services.map((s) => ({
      path: `/services/${s.slug}`,
      label: translations.fr.services.pages.items[s.index]?.name ?? s.slug,
    })),
  ];
  const aliases = [...Object.entries(SOURCE_ALIASES), ...Object.entries(MEDIUM_ALIASES)];

  return (
    <>
      <ShellHeader variant="admin" title="Sèvalys · Administration" actions={<SignOutButton />} />
      <ShellMain width="admin">
        <div className="pt-admin" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <AdminNav current="liens" />
          <section className="pt-card" aria-labelledby="liens-title">
            <h1 id="liens-title" className="pt-heading" style={{ marginBottom: 16 }}>
              Liens de campagne
            </h1>
            <h2 className="pt-heading" style={{ marginBottom: 16 }}>
              Générer un lien
            </h2>
            <p className="pt-helper" style={{ marginBottom: 24 }}>
              Composez l&apos;adresse à utiliser dans vos annonces et sur la fiche Google Business. Le lien
              produit respecte toujours la convention de nommage.
            </p>
            <LinkBuilder origin={origin} destinations={destinations} />
          </section>

          <section className="pt-card" aria-labelledby="convention-title">
            <h2 id="convention-title" className="pt-heading" style={{ marginBottom: 16 }}>
              Convention
            </h2>

            <div className="pt-link-scroll" tabIndex={0} role="region" aria-label="Sources autorisées">
              <table className="pt-admin-table">
                <caption className="pt-sr-only">Sources autorisées</caption>
                <thead>
                  <tr>
                    <th scope="col">Source</th>
                    <th scope="col">Plateforme</th>
                    <th scope="col">Support habituel</th>
                  </tr>
                </thead>
                <tbody>
                  {UTM_SOURCES.map((s) => (
                    <tr key={s}>
                      <th scope="row" className="pt-link-mono">{s}</th>
                      <td>{SOURCE_LABELS[s]}</td>
                      <td className="pt-link-mono">{PLATFORM_PRESETS[s]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-link-scroll" tabIndex={0} role="region" aria-label="Supports autorisés">
              <table className="pt-admin-table">
                <caption className="pt-sr-only">Supports autorisés</caption>
                <thead>
                  <tr>
                    <th scope="col">Support</th>
                    <th scope="col">Signification</th>
                  </tr>
                </thead>
                <tbody>
                  {UTM_MEDIUMS.map((m) => (
                    <tr key={m}>
                      <th scope="row" className="pt-link-mono">{m}</th>
                      <td>{MEDIUM_LABELS[m]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ margin: '16px 0' }}>
              Format de la campagne : <span className="pt-link-mono">offre_cible_aaaamm</span>, par exemple{' '}
              <span className="pt-link-mono">agent-vocal_restaurants_202611</span>. Limite : {CAMPAIGN_MAX}{' '}
              caractères.
            </p>

            <div className="pt-link-scroll" tabIndex={0} role="region" aria-label="Valeurs équivalentes">
              <table className="pt-admin-table">
                <caption className="pt-sr-only">Valeurs équivalentes acceptées</caption>
                <thead>
                  <tr>
                    <th scope="col">Valeur reçue</th>
                    <th scope="col">Valeur enregistrée</th>
                  </tr>
                </thead>
                <tbody>
                  {aliases.map(([received, stored]) => (
                    <tr key={received}>
                      <th scope="row" className="pt-link-mono">{received}</th>
                      <td className="pt-link-mono">{stored}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="pt-helper" style={{ marginTop: 16 }}>
              Un lien hors convention est conservé et signalé « Hors convention » dans l&apos;entonnoir et sur
              la fiche du lead. Document de convention :{' '}
              <span className="pt-link-mono">docs/convention-utm.md</span>
            </p>
          </section>
        </div>
      </ShellMain>
      <ShellFooter />
    </>
  );
}
