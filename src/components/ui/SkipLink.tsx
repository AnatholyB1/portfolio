'use client';

import type { MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { hasOwnSkipLink } from './skipLinkScope';

// First focusable element of every page. Every page owns exactly one <main>, so the
// link moves focus to it (pages do not all share an id). The #main-content href is the
// no-JS fallback for pages whose <main> carries that id.
// Dans les zones privées (admin, portail, connexion) le layout pose son propre lien :
// celui-ci n'est alors pas rendu du tout (un seul lien dans le DOM, pas seulement un seul visible).
export default function SkipLink() {
  const { t } = useLanguage();
  const pathname = usePathname();

  if (hasOwnSkipLink(pathname)) return null;

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    const main = document.querySelector<HTMLElement>('main');
    if (!main) return;
    e.preventDefault();
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus();
    main.scrollIntoView();
  }

  return (
    <a href="#main-content" className="skip-link" onClick={onClick}>
      {t.nav.skipToContent}
    </a>
  );
}
