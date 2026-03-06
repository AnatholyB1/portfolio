'use client';

import dynamic from 'next/dynamic';
import { useLanguage } from '@/context/LanguageContext';

const Scene = dynamic(() => import('../three/Scene'), { ssr: false });

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <Scene />
      
      <div className="relative z-10 text-center px-4">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          {t.hero.title}
        </h1>
        <p
          className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto"
          dangerouslySetInnerHTML={{ __html: t.hero.subtitle }}
        />
        <p
          className="text-lg text-gray-400 mb-10 max-w-xl mx-auto"
          dangerouslySetInnerHTML={{ __html: t.hero.description }}
        />
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/services"
            className="px-8 py-3 bg-linear-to-r from-indigo-600 to-purple-600 rounded-full text-white font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
          >
            {t.hero.cta_services}
          </a>
          <a
            href="#projects"
            className="px-8 py-3 border border-gray-600 rounded-full text-white font-medium hover:bg-white/10 transition-all duration-300"
          >
            {t.hero.cta_projects}
          </a>
          <a
            href="#contact"
            className="px-8 py-3 border border-gray-600 rounded-full text-white font-medium hover:bg-white/10 transition-all duration-300"
          >
            {t.hero.cta_hire}
          </a>
        </div>
      </div>
      
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <svg
          className="w-6 h-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  );
}
