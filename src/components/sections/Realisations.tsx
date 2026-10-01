'use client';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { projects } from '@/data/projects';
import BrowserShot from '@/components/ui/BrowserShot';

const MORE: Record<string, string> = { fr: 'Voir les autres réalisations', en: 'See the other projects', th: 'ดูผลงานอื่น ๆ' };

export default function Realisations() {
  const { t, lang } = useLanguage();
  const [more, setMore] = useState(false);
  const w = t.landing.work;

  return (
    <section className="sec border-t" id="work">
      <div className="wrap">
        <div className="idx-head" data-reveal>
          <div>
            <span className="sec-num">{w.num}</span>
            <h2 className="sec-title">
              {w.title_l1}<br /><em className="it">{w.title_l2_it}</em>
            </h2>
          </div>
          <p className="sec-intro">{w.intro}</p>
        </div>

        <div className={`rz-list${more ? ' is-expanded' : ''}`}>
          {projects.map((project, i) => {
            const item = w.items[project.index];
            const isExternal = project.href?.startsWith('http');
            return (
              <article key={project.name} className={`rz${i % 2 ? ' rz-flip' : ''}${i >= 2 ? ' rz-extra' : ''}`} data-reveal>
                <div className="rz-media">
                  <BrowserShot
                    src={project.image}
                    alt={project.name}
                    host={project.host}
                    height={project.imageHeight}
                    sizes="(max-width: 900px) 100vw, 760px"
                  />
                </div>
                <div className="rz-info">
                  <span className="rz-n mono">{String(project.index + 1).padStart(2, '0')} · {project.year}</span>
                  <h3 className="rz-name">{project.name}</h3>
                  <p className="rz-desc">{item.desc}</p>
                  <div className="work-tags rz-tags">
                    {item.tags.map((tag) => (
                      <span key={tag} className="tg">{tag}</span>
                    ))}
                  </div>
                  {project.href && (
                    <a
                      className="rz-link mono"
                      href={project.href}
                      {...(isExternal && { target: '_blank', rel: 'noopener noreferrer' })}
                    >
                      {project.host} <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {!more && (
          <button type="button" className="more-btn" onClick={() => setMore(true)} aria-expanded={false}>
            {MORE[lang]} <span aria-hidden="true">↓</span>
          </button>
        )}

        <a href="/simulateur" className="work-bridge" data-reveal>
          <div>
            <span
              className="mono"
              style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink-faint)' }}
            >
              —— {w.bridge_eyebrow}
            </span>
            <h3>{w.bridge_title_l1} <em className="it acid">{w.bridge_title_it}</em></h3>
            <p>{w.bridge_body}</p>
          </div>
          <span className="bridge-arrow">→</span>
        </a>
      </div>
    </section>
  );
}
