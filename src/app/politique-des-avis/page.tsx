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

const Section = ({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) => (
  <div className="mb-10" id={id}>
    <h2 className="text-xl font-bold text-[var(--ink)] mb-4 pb-2 border-b border-[var(--line)]">
      {title}
    </h2>
    <div className="text-[var(--ink-dim)] leading-relaxed space-y-2 text-sm">
      {children}
    </div>
  </div>
);

const linkClass =
  'text-[var(--acid)] hover:text-[var(--acid)]/80 underline underline-offset-2 transition-colors';

export default function PolitiqueDesAvisPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--bg)] pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12 text-center">
            <p className="text-xs font-mono tracking-[0.3em] text-[var(--acid)]/70 uppercase mb-3">
              {'// TRANSPARENCE'}
            </p>
            <h1 className="text-4xl font-bold text-[var(--ink)]">Politique des avis</h1>
            <p className="text-[var(--ink-faint)] text-sm mt-3">
              Dernière mise à jour : 8 octobre 2026
            </p>
            <p className="text-[var(--ink-dim)] text-sm mt-4">
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
              sélection. Ce lien est personnel, valable 60 jours et utilisable une seule fois. Un avis ne peut être
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
              Une soumission n&apos;est refusée que pour des raisons techniques : texte de 20 à 2000 caractères, liens
              et balisage non acceptés, consentement à la publication obligatoire. Le motif du refus est affiché à
              l&apos;auteur, qui peut corriger et renvoyer son avis.
            </p>
          </Section>

          <Section title="Modération limitée à la légalité">
            <p>Un avis publié ne peut être masqué que pour l&apos;un des quatre motifs suivants :</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Diffamation ou injure</li>
              <li>Données personnelles d&apos;un tiers</li>
              <li>Contenu illégal</li>
              <li>Avis non authentique ou usurpation</li>
            </ul>
            <p>
              Aucun autre motif n&apos;est possible. Un avis n&apos;est jamais supprimé : il est masqué avec un détail
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
              L&apos;auteur choisit son affichage : prénom et entreprise, prénom et initiale, ou entreprise seule. La
              date de publication et la date de l&apos;expérience (livraison) sont affichées. Le consentement à la
              publication est obligatoire.
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
              Les avis restent publiés tant que l&apos;activité de Sèvalys est maintenue ; ils sont conservés trois
              ans après la dernière action de modération.
            </p>
            <p>
              Pour exercer vos droits d&apos;accès, de rectification ou d&apos;opposition, écrivez à{' '}
              <a href="mailto:contact@sevalys.com" className={linkClass}>
                contact@sevalys.com
              </a>
              .
            </p>
          </Section>

          <Section title="Signaler un doute">
            <p>
              Si vous doutez de l&apos;authenticité d&apos;un avis, écrivez à{' '}
              <a href="mailto:contact@sevalys.com" className={linkClass}>
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
