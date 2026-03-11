import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Mentions Légales | Anatholy BRICON',
  description: 'Mentions légales du site personnel de Anatholy BRICON, développeur Full Stack & ingénieur IA freelance basé à Tours, France.',
  robots: { index: true, follow: true },
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-10">
    <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-indigo-500/30">
      {title}
    </h2>
    <div className="text-gray-400 leading-relaxed space-y-2 text-sm">
      {children}
    </div>
  </div>
);

export default function MentionsLegalesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#030311] pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <p className="text-xs font-mono tracking-[0.3em] text-indigo-400/70 uppercase mb-3">
              // INFORMATIONS LÉGALES
            </p>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-indigo-400 to-purple-400">
              Mentions Légales
            </h1>
            <p className="text-gray-500 text-sm mt-3">
              Conformément à la loi n°2004‑575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique (LCEN)
            </p>
          </div>

          {/* 1 – Éditeur du site */}
          <Section title="1. Éditeur du site">
            <p><span className="text-gray-300 font-medium">Nom :</span> BRICON Anatholy</p>
            <p><span className="text-gray-300 font-medium">Qualité :</span> Entrepreneur individuel — Développeur web & IA freelance</p>
            <p><span className="text-gray-300 font-medium">Adresse :</span> Tours (37), France</p>
            <p>
              <span className="text-gray-300 font-medium">Contact :</span>{' '}
              <a
                href="mailto:contact@selenium-studio.com"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                contact@selenium-studio.com
              </a>
            </p>
            <p><span className="text-gray-300 font-medium">Directeur de la publication :</span> BRICON Anatholy</p>
          </Section>

          {/* 2 – Hébergement */}
          <Section title="2. Hébergement">
            <p>Le présent site est hébergé par :</p>
            <p className="mt-2">
              <span className="text-gray-300 font-medium">Vercel Inc.</span><br />
              340 Pine Street, Suite 701<br />
              San Francisco, California 94104<br />
              États-Unis<br />
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                https://vercel.com
              </a>
            </p>
          </Section>

          {/* 3 – Propriété intellectuelle */}
          <Section title="3. Propriété intellectuelle">
            <p>
              L&apos;ensemble des éléments constituant ce site (textes, images, graphismes, code source, animations, logotypes) sont la propriété exclusive de BRICON Anatholy, sauf mention contraire explicite.
            </p>
            <p>
              Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable.
            </p>
            <p>
              Toute exploitation non autorisée du site ou de son contenu serait susceptible d&apos;engager la responsabilité civile et pénale de son auteur, conformément aux dispositions des articles L.335-2 et suivants du Code de la propriété intellectuelle.
            </p>
          </Section>

          {/* 4 – Données personnelles */}
          <Section title="4. Protection des données personnelles (RGPD)">
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD — Règlement EU 2016/679) et à la loi n°78-17 du 6 janvier 1978 modifiée (loi Informatique et Libertés), vous disposez des droits suivants concernant les données collectées via ce site :
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>Droit d&apos;accès à vos données personnelles</li>
              <li>Droit de rectification et d&apos;effacement</li>
              <li>Droit à la limitation du traitement</li>
              <li>Droit d&apos;opposition au traitement</li>
              <li>Droit à la portabilité de vos données</li>
            </ul>
            <p className="mt-2">
              <span className="text-gray-300 font-medium">Données collectées :</span> Le formulaire de contact collecte uniquement votre nom, votre adresse e-mail et le contenu de votre message, dans le seul but de répondre à votre demande. Ces données ne sont ni cédées ni vendues à des tiers.
            </p>
            <p>
              <span className="text-gray-300 font-medium">Durée de conservation :</span> Les données sont conservées le temps nécessaire au traitement de votre demande, et au maximum 3 ans à compter du dernier contact.
            </p>
            <p>
              Pour exercer vos droits ou pour toute question relative au traitement de vos données, vous pouvez contacter :{' '}
              <a
                href="mailto:contact@selenium-studio.com"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                contact@selenium-studio.com
              </a>
            </p>
            <p>
              En cas de litige non résolu, vous pouvez introduire une réclamation auprès de la{' '}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                CNIL
              </a>{' '}
              (Commission Nationale de l&apos;Informatique et des Libertés).
            </p>
          </Section>

          {/* 5 – Cookies */}
          <Section title="5. Cookies">
            <p>
              Ce site n&apos;utilise pas de cookies à des fins publicitaires ou de traçage. Aucun cookie de mesure d&apos;audience tiers n&apos;est déposé sur votre terminal.
            </p>
            <p>
              Des cookies techniques strictement nécessaires au bon fonctionnement du site (comme la préférence de langue) peuvent être utilisés. Ces derniers ne nécessitent pas de consentement préalable conformément à l&apos;article 82 de la loi Informatique et Libertés.
            </p>
          </Section>

          {/* 6 – Liens hypertextes */}
          <Section title="6. Liens hypertextes">
            <p>
              Le site peut contenir des liens vers des sites internet tiers. BRICON Anatholy n&apos;exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu ou leur politique de confidentialité.
            </p>
            <p>
              La création de liens hypertextes vers ce site est autorisée sous réserve de ne pas nuire à l&apos;image du site ou de son éditeur, et sous réserve que le lien ne soit pas présenté dans un cadre (framing).
            </p>
          </Section>

          {/* 7 – Limitation de responsabilité */}
          <Section title="7. Limitation de responsabilité">
            <p>
              BRICON Anatholy s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées sur ce site. Toutefois, il ne peut garantir l&apos;exactitude, la précision ou l&apos;exhaustivité des informations mises à disposition.
            </p>
            <p>
              L&apos;éditeur ne saurait être tenu responsable des dommages directs ou indirects résultant de l&apos;utilisation de ce site ou de l&apos;impossibilité d&apos;y accéder.
            </p>
          </Section>

          {/* 8 – Droit applicable */}
          <Section title="8. Droit applicable et tribunaux compétents">
            <p>
              Le présent site et ses mentions légales sont soumis au droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux compétents du ressort de Tours (Indre-et-Loire) seront seuls compétents.
            </p>
          </Section>

          <p className="text-center text-gray-600 text-xs font-mono mt-10">
            Dernière mise à jour : mars 2026
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
