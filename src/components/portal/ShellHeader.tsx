// En-tête des espaces privés (UI-SPEC S3/S4). Composant serveur, sans navbar publique (D-14).
// Les entrées « Projet / Documents / Paiements » sont désactivées (D-13) : ce ne sont pas des liens.
interface ShellHeaderProps {
  variant: 'client' | 'admin';
  title: string;
  actions?: React.ReactNode;
}

const CLIENT_NAV = ['Projet', 'Documents', 'Paiements'] as const;

export default function ShellHeader({ variant, title, actions }: ShellHeaderProps) {
  return (
    <header className="pt-header">
      <span className="pt-heading pt-header-title" title={title}>
        {title}
      </span>
      {variant === 'client' ? (
        <nav className="pt-nav" aria-label="Espace client">
          {CLIENT_NAV.map((label) => (
            <span key={label} className="pt-nav-item" aria-disabled="true">
              {label}
              <span className="tg">Bientôt</span>
            </span>
          ))}
        </nav>
      ) : null}
      {actions ? <div className="pt-header-actions">{actions}</div> : null}
    </header>
  );
}
