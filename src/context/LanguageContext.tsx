'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, Translations, translations } from '@/lib/translations';

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
      setLangState(stored);
    } else {
      setLangState(detectBrowserLang());
    }
  }, []);

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
