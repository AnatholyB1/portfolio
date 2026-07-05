// Symbole sève Sèvalys — un seul trait continu (cap rond) dessine le « S »,
// terminé par une jeune pousse. Ce tracé sert à la fois de symbole autonome
// (favicon, avatar, tampon) ET de « S » dans le lockup logo + nom.
// Source de vérité : Notion « Identité visuelle — Sèvalys », tracé figé.
export const SEVE_PATH =
  'M84 40 C84 26 64 22 50 28 C36 34 34 50 52 56 C70 62 86 66 84 82 C82 98 60 102 44 94';

interface SevalysMarkProps {
  size?: number | string;
  className?: string;
  title?: string;
}

/** Le symbole sève seul, en `currentColor` (héritant la couleur du parent). */
export default function SevalysMark({ size = '1em', className, title = 'Sèvalys' }: SevalysMarkProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
      style={{ display: 'block' }}
    >
      <path
        d={SEVE_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={14}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx={97} cy={29} rx={11} ry={5} transform="rotate(-38 97 29)" fill="currentColor" />
    </svg>
  );
}

/**
 * Lockup fusionné « Sèvalys » : le symbole sève remplace le « S », l'accent
 * grave du « è » est conservé, le « ys » reste en acide. Usage par défaut.
 */
export function SevalysWordmark({ className }: { className?: string }) {
  return (
    <span className={`sv-lock ${className ?? ''}`} aria-label="Sèvalys">
      <SevalysMark className="sv-lock-mark" title="S" />
      <span className="sv-lock-wm" aria-hidden="true">
        <span className="sv-accent">è</span>val<span className="sv-ys">ys</span>
      </span>
    </span>
  );
}
