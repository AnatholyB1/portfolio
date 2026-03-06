'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="py-8 px-4 border-t border-gray-800">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-gray-400">
          © {new Date().getFullYear()} BRICON Anatholy. {t.footer.rights}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          {t.footer.built_with}
        </p>
      </div>
    </footer>
  );
}
