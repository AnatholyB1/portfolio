// Pied de page des espaces privés : un seul lien discret vers le site (D-14).
import Link from 'next/link';

export default function ShellFooter() {
  return (
    <footer className="pt-footer">
      <Link href="/" className="pt-back">
        Retour au site
      </Link>
    </footer>
  );
}
