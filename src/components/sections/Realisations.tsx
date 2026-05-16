'use client';
import { useLanguage } from '@/context/LanguageContext';
import { projects } from '@/data/projects';

export default function Realisations() {
  const { t } = useLanguage();
  const w = t.landing.work;

  return (
    <section className="sec border-t" id="work">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{w.num}</div>
          <h2 className="sec-title">
            {w.title_l1}<br /><em className="it">{w.title_l2_it}</em>
          </h2>
          <p className="sec-intro">{w.intro}</p>
        </div>

        <div className="work-list" data-reveal>
          {projects.map((project) => {
            const item = w.items[project.index];
            const Wrapper = project.href ? 'a' : 'div';
            const wrapperProps = project.href
              ? { href: project.href, className: 'work-item' }
              : { className: 'work-item' };
            return (
              <Wrapper key={project.name} {...wrapperProps}>
                <span className="work-num">{String(project.index + 1).padStart(2, '0')}</span>
                <div>
                  <div className="work-name">{project.name}</div>
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.1em' }}
                  >
                    —— {project.year}
                  </span>
                </div>
                <p className="work-desc">{item.desc}</p>
                <div className="work-tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="tg">{tag}</span>
                  ))}
                </div>
                <span className="work-go">→</span>
              </Wrapper>
            );
          })}
        </div>

        <a href="/services" className="work-bridge" data-reveal>
          <div>
            <span
              className="mono"
              style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink-faint)' }}
            >
              —— PROCHAINE ÉTAPE
            </span>
            <h3>Voir toutes nos <em className="it acid">offres &amp; tarifs</em></h3>
            <p>Quatre formules, des prix publics et un devis sous 48h.</p>
          </div>
          <span className="bridge-arrow">→</span>
        </a>
      </div>
    </section>
  );
}
