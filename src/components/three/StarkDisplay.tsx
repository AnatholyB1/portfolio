'use client';

import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

// ─────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────

const PROJECTS = [
  {
    id: 0,
    title: 'Selenium Studio',
    url: 'selenium-studio.com',
    live: 'https://selenium-studio.com',
    tech: ['Next.js', 'Three.js', 'TypeScript', 'Tailwind'],
    icon: '🎯',
    primary: '#6366f1',
    secondary: '#4f46e5',
    accent: '#a5b4fc',
    shape: 'torus' as const,
  },
  {
    id: 1,
    title: 'Gecko Cabane',
    url: 'geckocabanerestaurant.com',
    live: 'https://geckocabanerestaurant.com',
    tech: ['Next.js', 'Tailwind CSS', 'SEO Local', 'Responsive'],
    icon: '🦎',
    primary: '#10b981',
    secondary: '#059669',
    accent: '#6ee7b7',
    shape: 'icosahedron' as const,
  },
  {
    id: 2,
    title: 'Victor Verissimo',
    url: 'victor-verissimo.vercel.app',
    live: 'https://victor-verissimo.vercel.app',
    tech: ['Next.js', 'Framer Motion', 'Tailwind', 'Vercel'],
    icon: '✨',
    primary: '#f59e0b',
    secondary: '#d97706',
    accent: '#fde68a',
    shape: 'octahedron' as const,
  },
  {
    id: 3,
    title: 'Ghjulianu Codani',
    url: 'ghjulianu-codani.com',
    live: 'https://www.ghjulianu-codani.com',
    tech: ['Next.js', 'Tailwind CSS', 'SEO', 'Responsive'],
    icon: '🎵',
    primary: '#e11d48',
    secondary: '#be123c',
    accent: '#fda4af',
    shape: 'triangle' as const,
  },
  {
    id: 4,
    title: 'Les Folies Temps Danse',
    url: 'lesfoliestempsdanse.com',
    live: 'https://lesfoliestempsdanse.com',
    tech: ['Next.js', 'Tailwind CSS', 'Animations', 'Responsive'],
    icon: '💃',
    primary: '#d946ef',
    secondary: '#a21caf',
    accent: '#f0abfc',
    shape: 'hexagon' as const,
  },
] as const;

type Project = typeof PROJECTS[number];

// ─────────────────────────────────────────────────────────
// SHAPE DECORATION (above each card)
// ─────────────────────────────────────────────────────────

function ShapeDecoration({ shape, primary }: { shape: Project['shape']; primary: string }) {
  return (
    <div className="flex items-center justify-center" style={{ width: '80px', height: '80px', position: 'relative' }}>
      {/* Outer orbit ring */}
      <div
        className="absolute rounded-full animate-spin"
        style={{
          width: '74px',
          height: '74px',
          border: `1px solid ${primary}55`,
          animationDuration: '10s',
          animationTimingFunction: 'linear',
        }}
      />
      {/* Inner orbit ring */}
      <div
        className="absolute rounded-full animate-spin"
        style={{
          width: '54px',
          height: '54px',
          border: `1px solid ${primary}33`,
          animationDuration: '16s',
          animationTimingFunction: 'linear',
          animationDirection: 'reverse',
        }}
      />
      {/* Torus */}
      {shape === 'torus' && (
        <div
          className="animate-spin"
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            border: `6px solid ${primary}`,
            boxShadow: `0 0 14px ${primary}aa, 0 0 28px ${primary}44`,
            animationDuration: '3s',
            animationTimingFunction: 'linear',
          }}
        />
      )}
      {/* Icosahedron (diamond) */}
      {shape === 'icosahedron' && (
        <div
          className="animate-spin"
          style={{
            width: '22px',
            height: '22px',
            background: primary,
            transform: 'rotate(45deg)',
            boxShadow: `0 0 14px ${primary}aa, 0 0 28px ${primary}44`,
            animationDuration: '4s',
            animationTimingFunction: 'linear',
          }}
        />
      )}
      {/* Octahedron (diamond clipped) */}
      {shape === 'octahedron' && (
        <div
          className="animate-spin"
          style={{
            width: '24px',
            height: '24px',
            background: primary,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            boxShadow: `0 0 14px ${primary}aa, 0 0 28px ${primary}44`,
            animationDuration: '4s',
            animationTimingFunction: 'linear',
          }}
        />
      )}
      {/* Triangle */}
      {shape === 'triangle' && (
        <div
          className="animate-spin"
          style={{
            width: '24px',
            height: '24px',
            background: primary,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            boxShadow: `0 0 14px ${primary}aa, 0 0 28px ${primary}44`,
            animationDuration: '5s',
            animationTimingFunction: 'linear',
          }}
        />
      )}
      {/* Hexagon */}
      {shape === 'hexagon' && (
        <div
          className="animate-spin"
          style={{
            width: '26px',
            height: '26px',
            background: primary,
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            boxShadow: `0 0 14px ${primary}aa, 0 0 28px ${primary}44`,
            animationDuration: '5.5s',
            animationTimingFunction: 'linear',
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// IFRAME WITH BLOCKED-SITE FALLBACK
// ─────────────────────────────────────────────────────────

function IframePreview({ src, url, primary, accent }: { src: string; url: string; primary: string; accent: string }) {
  const { t } = useLanguage();
  const [blocked, setBlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (blocked) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-4"
           style={{ background: '#09091e' }}>
        <span className="text-4xl">🔒</span>
        <p className="text-xs font-mono tracking-widest text-center" style={{ color: primary }}>
          {t.projects.preview_blocked}
        </p>
        <p className="text-[11px] text-center leading-relaxed" style={{ color: '#ffffff44' }}>
          {t.projects.preview_blocked_desc}
        </p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: `linear-gradient(135deg, ${primary}, ${primary}99)` }}
        >
          ↗ {t.projects.open} {url}
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#09091e' }}>
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: `${primary}66`, borderTopColor: primary }}
            />
            <span className="text-[10px] font-mono" style={{ color: accent }}>{t.projects.loading}</span>
          </div>
        </div>
      )}
      <iframe
        src={src}
        title={url}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
        onLoad={() => setLoaded(true)}
        onError={() => setBlocked(true)}
        style={{ display: 'block', opacity: loaded ? 1 : 0, transition: 'opacity 0.4s' }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// HTML FLIP CARD
// ─────────────────────────────────────────────────────────

function HtmlCard({ project }: { project: Project }) {
  const { t } = useLanguage();
  const subtitles = [t.projects.selenium_subtitle, t.projects.gecko_subtitle, t.projects.victor_subtitle, t.projects.ghjulianu_subtitle, t.projects.folies_subtitle];
  const descriptions = [t.projects.selenium_desc, t.projects.gecko_desc, t.projects.victor_desc, t.projects.ghjulianu_desc, t.projects.folies_desc];
  const subtitle = subtitles[project.id];
  const description = descriptions[project.id];
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative w-full md:flex-1"
      style={{ perspective: '1400px', maxWidth: '400px' }}
    >
      {/* Floating shape above */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none" style={{ top: '-48px' }}>
        <ShapeDecoration shape={project.shape} primary={project.primary} />
      </div>

      {/* Glow halo */}
      <div
        className="absolute inset-0 rounded-2xl blur-2xl transition-opacity duration-500 pointer-events-none"
        style={{ background: project.primary, opacity: flipped ? 0.22 : 0.1 }}
      />

      {/* Flip container */}
      <div
        className="relative cursor-pointer select-none"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.65s cubic-bezier(0.4, 0.2, 0.2, 1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          height: '520px',
        }}
        onClick={() => setFlipped((f) => !f)}
      >

        {/* FRONT */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: '#07071c',
            border: `1px solid ${project.primary}55`,
            boxShadow: `0 0 32px ${project.primary}1a, inset 0 0 32px ${project.primary}08`,
          }}
        >
          {/* Title bar */}
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom: `1px solid ${project.primary}33`, background: `${project.secondary}22` }}
          >
            <span className="text-xl">{project.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{project.title}</p>
              <p className="text-[10px] font-mono tracking-wider truncate" style={{ color: project.accent }}>
                {subtitle.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Browser chrome */}
          <div
            className="flex items-center gap-2 px-3 py-2 shrink-0"
            style={{ background: '#0d0d2a', borderBottom: `1px solid ${project.primary}22` }}
          >
            <div className="flex gap-1 shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ background: '#ff5f5799' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#ffbc2e99' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#28c84099' }} />
            </div>
            <div
              className="flex-1 rounded px-2 py-0.5 text-[10px] font-mono truncate"
              style={{ background: '#16163a', color: '#ffffff44' }}
            >
              {project.url}
            </div>
          </div>

          {/* Iframe area — stopPropagation so scrolling/clicking inside does not flip the card */}
          <div
            className="flex-1 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <IframePreview
              src={project.live}
              url={project.url}
              primary={project.primary}
              accent={project.accent}
            />
          </div>

          {/* Footer hint */}
          <div
            className="px-4 py-2.5 text-center shrink-0"
            style={{ borderTop: `1px solid ${project.primary}22` }}
          >
            <span className="text-[9px] font-mono tracking-widest" style={{ color: '#ffffff22' }}>
              {t.projects.click_to_explore}
            </span>
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: '#07071c',
            border: `1px solid ${project.primary}55`,
            boxShadow: `0 0 32px ${project.primary}1a, inset 0 0 32px ${project.primary}08`,
          }}
        >
          {/* Header */}
          <div
            className="px-5 pt-5 pb-4 shrink-0"
            style={{ borderBottom: `1px solid ${project.primary}33`, background: `${project.secondary}18` }}
          >
            <p className="text-lg font-semibold text-white">{project.title}</p>
            <p className="text-[10px] font-mono tracking-widest mt-0.5" style={{ color: project.primary }}>
              {t.projects.about_label}
            </p>
          </div>

          {/* Body */}
          <div className="px-5 py-4 flex-1">
            <p className="text-sm leading-relaxed" style={{ color: '#9999bb' }}>
              {description}
            </p>

            <p className="text-[10px] font-mono tracking-widest mt-5 mb-2.5" style={{ color: project.primary }}>
              {t.projects.tech_label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {project.tech.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded text-[10px] font-mono"
                  style={{
                    background: `${project.secondary}44`,
                    color: project.accent,
                    border: `1px solid ${project.primary}33`,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="px-5 pb-5 shrink-0 flex flex-col gap-2">
            <a
              href={project.live}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block text-center py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-85 active:opacity-70"
              style={{ background: `linear-gradient(135deg, ${project.primary}, ${project.secondary})` }}
            >
              ↗ {t.projects.visit} {project.url}
            </a>
            <p className="text-center text-[9px] font-mono tracking-widest" style={{ color: '#ffffff1a' }}>
              {t.projects.flip_back_hint}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────

export default function StarkDisplay() {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="relative w-full">

      {/* CSS ambient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 20% 50%, #1e1040 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 50%, #0a2a1a 0%, transparent 55%), #020210',
        }}
      >
        {/* Subtle grid lines */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(#3344aa22 1px, transparent 1px), linear-gradient(90deg, #3344aa22 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── MOBILE: single-card carousel ── */}
      <div className="md:hidden relative z-10 flex flex-col items-center px-4" style={{ paddingTop: '72px', paddingBottom: '40px' }}>
        {/* Card */}
        <div className="w-full" style={{ maxWidth: '400px' }}>
          <HtmlCard key={PROJECTS[activeIndex].id} project={PROJECTS[activeIndex]} />
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            title="Previous project"
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 disabled:opacity-20 transition-all"
          >
            &#8592;
          </button>

          {PROJECTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              title={`Project ${i + 1}`}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                background: i === activeIndex ? PROJECTS[activeIndex].primary : '#ffffff22',
                transform: i === activeIndex ? 'scale(1.4)' : 'scale(1)',
                boxShadow: i === activeIndex ? `0 0 8px ${PROJECTS[activeIndex].primary}` : 'none',
              }}
            />
          ))}

          <button
            onClick={() => setActiveIndex((i) => Math.min(PROJECTS.length - 1, i + 1))}
            disabled={activeIndex === PROJECTS.length - 1}
            title="Next project"
            className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/30 disabled:opacity-20 transition-all"
          >
            &#8594;
          </button>
        </div>

        {/* Counter */}
        <p className="mt-2 text-[10px] font-mono tracking-widest text-white/20">
          {activeIndex + 1} / {PROJECTS.length}
        </p>
      </div>

      {/* ── DESKTOP: all cards in a row ── */}
      <div className="hidden md:flex relative z-10 items-center justify-center gap-5 px-6" style={{ paddingTop: '80px', paddingBottom: '48px' }}>
        {PROJECTS.map((p) => (
          <HtmlCard key={p.id} project={p} />
        ))}
      </div>

      {/* HUD (desktop only) */}
      <div className="hidden md:flex absolute bottom-5 left-1/2 -translate-x-1/2 z-20 items-center gap-3 px-5 py-2 bg-black/40 border border-white/10 rounded-full backdrop-blur-sm pointer-events-none">
        <span className="text-white/40 text-xs font-mono tracking-wider">{t.projects.hud_flip}</span>
        <span className="text-white/20 text-xs">•</span>
        <span className="text-white/40 text-xs font-mono tracking-wider">{t.projects.hud_interact}</span>
      </div>

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.022]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.06) 2px, rgba(255,255,255,0.06) 4px)',
        }}
      />
    </div>
  );
}
