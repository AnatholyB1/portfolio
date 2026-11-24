'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, Translations, translations } from '@/lib/translations';
import { isCrawlerUserAgent } from '@/lib/crawler';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function detectBrowserLang(): Lang {
  if (typeof navigator === 'undefined') return 'fr';
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('th')) return 'th';
  if (browserLang.startsWith('fr')) return 'fr';
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    const stored = localStorage.getItem('portfolio-lang') as Lang | null;
    if (stored && (stored === 'fr' || stored === 'en' || stored === 'th')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: localStorage is only readable after mount
      setLangState(stored);
    } else if (!isCrawlerUserAgent(navigator.userAgent)) {
      // Robots : FR par défaut (pas de bascule selon navigator.language).
      setLangState(detectBrowserLang());
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('portfolio-lang', newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
