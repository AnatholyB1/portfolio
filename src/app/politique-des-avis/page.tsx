import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Politique des avis',
  description:
    'Comment les avis clients de Sèvalys sont collectés, vérifiés, publiés et modérés.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/politique-des-avis' },
};

// Same scale as /avis: medium-weight 24px section titles, 16px body.
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="mb-4 border-b border-[var(--line)] pb-2 text-2xl font-medium text-[var(--ink)]">
      {title}
    </h2>
    <div className="space-y-2 text-base leading-relaxed text-[var(--ink-dim)]">{children}</div>
  </section>
);

const linkClass =
  'text-[var(--acid)] hover:text-[var(--acid)]/80 underline underline-offset-2 transition-colors';
// Contact links get a 44px hit area.
const mailClass = `${linkClass} inline-flex min-h-[44px] items-center`;

export default function PolitiqueDesAvisPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen bg-[var(--bg)] pt-32 pb-16 px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-[var(--acid)]/70">
              {'// TRANSPARENCE'}
            </p>
            <h1 className="text-[32px] font-medium leading-tight text-[var(--ink)]">
              Politique des avis
            </h1>
            <p className="mt-3 text-sm text-[var(--ink-dim)]">
              Dernière mise à jour&nbsp;: 8&nbsp;octobre&nbsp;2026
            </p>
            <p className="mt-4 leading-relaxed text-[var(--ink-dim)]">
              Cette page décrit comment les avis publiés sur{' '}
              <Link href="/avis" className={linkClass}>
                la page des avis
              </Link>{' '}
              sont collectés, vérifiés et modérés.
            </p>
          </div>

          <Section title="Qui peut déposer un avis">
            <p>
              Seul un client dont le projet a été livré, avec un procès-verbal de recette signé, peut déposer un avis.
              Chaque client concerné reçoit un lien personnel par e-mail.
            </p>
          </Section>

          <Section title="Comment un avis est vérifié">
            <p>
              Après la signature du procès-verbal de recette, un lien unique est envoyé à chaque client livré, sans
              sélection. Ce lien est personnel, valable 60&nbsp;jours et utilisable une seule fois. Un avis ne peut être
              déposé qu&apos;avec ce lien, ce qui garantit qu&apos;il provient d&apos;un client réellement livré.
            </p>
          </Section>

          <Section title="Publication sans filtrage">
            <p>
              Un avis valide est publié immédiatement, sans filtrage selon la note ou le ton. Les avis critiques sont
              publiés comme les autres.
            </p>
          </Section>

          <Section title="Refus technique d'une soumission">
            <p>
              Une soumission n&apos;est refusée que pour des raisons techniques&nbsp;: texte de 20 à 2000&nbsp;caractères, liens
              et balisage non acceptés, consentement à la publication obligatoire. Le motif du refus est affiché à
              l&apos;auteur, qui peut corriger et renvoyer son avis.
            </p>
          </Section>

          <Section title="Modération limitée à la légalité">
            <p>Un avis publié ne peut être masqué que pour l&apos;un des quatre motifs suivants&nbsp;:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Diffamation ou injure</li>
              <li>Données personnelles d&apos;un tiers</li>
              <li>Contenu illégal</li>
              <li>Avis non authentique ou usurpation</li>
            </ul>
            <p>
              Aucun autre motif n&apos;est possible. Un avis n&apos;est jamais supprimé&nbsp;: il est masqué avec un détail
              écrit du motif.
            </p>
          </Section>

          <Section title="Journal et notification de l'auteur">
            <p>
              Chaque action de modération est inscrite dans un journal. L&apos;auteur est informé par e-mail du
              masquage de son avis et du motif retenu, et peut le contester en répondant à ce message.
            </p>
          </Section>

          <Section title="Aucune contrepartie, aucun filtrage de la demande">
            <p>Aucune contrepartie n&apos;est proposée pour déposer un avis, quelle que soit la note.</p>
            <p>
              La demande d&apos;avis est envoyée à tous les clients livrés, sans tri préalable selon leur satisfaction
              supposée.
            </p>
          </Section>

          <Section title="Affichage du nom, dates et consentement">
            <p>
              L&apos;auteur choisit son affichage&nbsp;: prénom et entreprise, prénom et initiale, ou entreprise seule. La
              date de publication et la date de l&apos;expérience (livraison) sont affichées. Le consentement à la
              publication est obligatoire.
            </p>
            <p>
              Pour retirer votre consentement ou exercer vos droits sur vos données (accès, rectification,
              opposition, effacement), écrivez à{' '}
              <a href="mailto:contact@sevalys.com" className={mailClass}>
                contact@sevalys.com
              </a>
              &nbsp;; nous vous répondons sous un mois.
            </p>
          </Section>

          <Section title="Lien Google">
            <p>
              Après la publication, chaque auteur se voit proposer le même lien Google facultatif, quelle que soit sa
              note.
            </p>
          </Section>

          <Section title="Durée de conservation">
            <p>
              Les avis restent publiés tant que l&apos;activité de Sèvalys est maintenue&nbsp;; ils sont conservés trois
              ans après la dernière action de modération.
            </p>
          </Section>

          <Section title="Signaler un doute">
            <p>
              Si vous doutez de l&apos;authenticité d&apos;un avis, écrivez à{' '}
              <a href="mailto:contact@sevalys.com" className={mailClass}>
                contact@sevalys.com
              </a>
              . Chaque signalement est examiné.
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </>
  );
}
