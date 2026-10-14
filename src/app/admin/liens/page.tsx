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
        <div className="pt-admin">
          <AdminNav current="liens" />
          <section className="pt-card" aria-labelledby="liens-title">
            <h1 id="liens-title" className="pt-heading pt-admin-title-tight">
              Liens de campagne
            </h1>
            <h2 className="pt-heading pt-admin-title-tight">
              Générer un lien
            </h2>
            <p className="pt-helper pt-admin-lede">
              Composez l&apos;adresse à utiliser dans vos annonces et sur la fiche Google Business. Le lien
              produit respecte toujours la convention de nommage.
            </p>
            <LinkBuilder origin={origin} destinations={destinations} />
          </section>

          <section className="pt-card" aria-labelledby="convention-title">
            <h2 id="convention-title" className="pt-heading pt-admin-title-tight">
              Convention
            </h2>

            <div className="pt-link-scroll" role="region" aria-label="Sources autorisées" tabIndex={0}>
              <table className="pt-table pt-admin-table" role="table">
                <caption className="pt-sr-only">Sources autorisées</caption>
                <thead role="rowgroup">
                  <tr role="row">
                    <th scope="col" role="columnheader">Source</th>
                    <th scope="col" role="columnheader">Plateforme</th>
                    <th scope="col" role="columnheader">Support habituel</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {UTM_SOURCES.map((s) => (
                    <tr key={s} role="row">
                      <th scope="row" role="rowheader" data-label="Source" className="pt-link-mono">{s}</th>
                      <td role="cell" data-label="Plateforme">{SOURCE_LABELS[s]}</td>
                      <td role="cell" data-label="Support habituel" className="pt-link-mono">{PLATFORM_PRESETS[s]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-link-scroll" role="region" aria-label="Supports autorisés" tabIndex={0}>
              <table className="pt-table pt-admin-table" role="table">
                <caption className="pt-sr-only">Supports autorisés</caption>
                <thead role="rowgroup">
                  <tr role="row">
                    <th scope="col" role="columnheader">Support</th>
                    <th scope="col" role="columnheader">Signification</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {UTM_MEDIUMS.map((m) => (
                    <tr key={m} role="row">
                      <th scope="row" role="rowheader" data-label="Support" className="pt-link-mono">{m}</th>
                      <td role="cell" data-label="Signification">{MEDIUM_LABELS[m]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="pt-admin-my-16">
              Format de la campagne : <span className="pt-link-mono">offre_cible_aaaamm</span>, par exemple{' '}
              <span className="pt-link-mono">agent-vocal_restaurants_202611</span>. Limite : {CAMPAIGN_MAX}{' '}
              caractères.
            </p>

            <div className="pt-link-scroll" role="region" aria-label="Valeurs équivalentes acceptées" tabIndex={0}>
              <table className="pt-table pt-admin-table" role="table">
                <caption className="pt-sr-only">Valeurs équivalentes acceptées</caption>
                <thead role="rowgroup">
                  <tr role="row">
                    <th scope="col" role="columnheader">Valeur reçue</th>
                    <th scope="col" role="columnheader">Valeur enregistrée</th>
                  </tr>
                </thead>
                <tbody role="rowgroup">
                  {aliases.map(([received, stored]) => (
                    <tr key={received} role="row">
                      <th scope="row" role="rowheader" data-label="Valeur reçue" className="pt-link-mono">{received}</th>
                      <td role="cell" data-label="Valeur enregistrée" className="pt-link-mono">{stored}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="pt-helper pt-admin-mt-16">
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
