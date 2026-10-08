'use client';

import type { ReactNode } from 'react';

type Props = { targetId: string; className?: string; children: ReactNode };

// Lien d'ancre qui déplace aussi le focus : un simple #hash fait défiler la page mais laisse le
// focus clavier et lecteur d'écran sur le lien. La cible doit porter tabIndex={-1}.
// Sans JavaScript, le lien reste un ancrage normal.
export default function HashFocusLink({ targetId, className, children }: Props) {
  const hash = '#' + targetId;
  return (
    <a
      href={hash}
      className={className}
      onClick={(e) => {
        const el = document.getElementById(targetId);
        if (!el) return;
        e.preventDefault();
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        el.focus({ preventScroll: true });
        window.history.replaceState(null, '', hash);
      }}
    >
      {children}
    </a>
  );
}
