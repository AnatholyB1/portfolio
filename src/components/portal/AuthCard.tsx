// Carte de connexion centrée (UI-SPEC S1/S2). Composant serveur, français uniquement (D-12).
// Le titre (h1 unique, id `pt-auth-title`) est fourni soit par `title`, soit par les enfants
// quand il dépend de l'étape (LoginForm). Les mentions sous la carte sont passées en `notes`.
import Link from 'next/link';
import SevalysMark from '@/components/ui/SevalysMark';

interface AuthCardProps {
  title?: string;
  helper?: string;
  notes?: React.ReactNode;
  children: React.ReactNode;
}

export default function AuthCard({ title, helper, notes, children }: AuthCardProps) {
  return (
    <main className="pt-auth">
      <div className="pt-brand">
        <SevalysMark size={32} />
        <span>Sèvalys</span>
      </div>
      <section className="pt-card" aria-labelledby="pt-auth-title">
        {title ? (
          <h1 id="pt-auth-title" className="pt-heading">
            {title}
          </h1>
        ) : null}
        {helper ? <p className="pt-helper">{helper}</p> : null}
        {children}
        <div className="pt-card-footer">
          <Link href="/" className="pt-back">
            Retour au site
          </Link>
        </div>
      </section>
      {notes ? <div className="pt-auth-notes">{notes}</div> : null}
    </main>
  );
}
