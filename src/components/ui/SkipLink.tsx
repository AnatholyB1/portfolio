'use client';

import type { MouseEvent } from 'react';
import { useLanguage } from '@/context/LanguageContext';

// First focusable element of every page. Every page owns exactly one <main>, so the
// link moves focus to it (pages do not all share an id). The #main-content href is the
// no-JS fallback for pages whose <main> carries that id.
export default function SkipLink() {
  const { t } = useLanguage();

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
