import { PROJECT_COPY } from '@/lib/projects/copy';

// Lien d'évitement des espaces privés : premier élément focalisable, visible au focus seulement.
// La cible est le <main id="contenu"> de ShellMain / AuthCard.
export default function SkipLink() {
  return (
    <a href="#contenu" className="pt-skip">
      {PROJECT_COPY.boundaries.skipToContent}
    </a>
  );
}
