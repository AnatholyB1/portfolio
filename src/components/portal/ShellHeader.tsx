// En-tête des espaces privés (UI-SPEC S3/S4). Composant serveur, sans navbar publique (D-14).
// Espace client : symbole Sèvalys + nom de l'entreprise, aucune navigation tant qu'aucune
// section n'existe (pas d'onglets désactivés). L'API (variant, title, actions) est inchangée.
import SevalysMark from '@/components/ui/SevalysMark';
import './client.css';

interface ShellHeaderProps {
  variant: 'client' | 'admin';
  title: string;
  actions?: React.ReactNode;
}

export default function ShellHeader({ variant, title, actions }: ShellHeaderProps) {
  return (
    <header className="pt-header pt-header-bar" data-variant={variant}>
      {variant === 'client' ? (
        <div className="pt-header-id">
          <SevalysMark size={28} className="pt-header-mark" />
          <span className="pt-heading pt-header-title" title={title}>
            {title}
          </span>
        </div>
      ) : (
        <span className="pt-heading pt-header-title" title={title}>
          {title}
        </span>
      )}
      {actions ? <div className="pt-header-actions">{actions}</div> : null}
    </header>
  );
}
