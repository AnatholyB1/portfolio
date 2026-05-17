'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLanguage } from '@/context/LanguageContext';

gsap.registerPlugin(ScrollTrigger);

export default function MethodologySection() {
  const { t } = useLanguage();
  const ts = t.services.method;

  const [active, setActive] = useState(0);
  const [railFill, setRailFill] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const stepEls = Array.from(wrap.querySelectorAll<HTMLElement>('.method-step'));

    // Per-step triggers: set active index when step center crosses viewport center
    stepEls.forEach((stepEl, i) => {
      ScrollTrigger.create({
        trigger: stepEl,
        start: 'center center',
        end: 'center center',
        onEnter: () => setActive(i),
        onEnterBack: () => setActive(i),
      });
    });

    // Rail fill progress: scrub a value from 0→100 as section scrolls
    ScrollTrigger.create({
      trigger: wrap,
      start: 'top center',
      end: 'bottom center',
      scrub: 1,
      onUpdate: (self) => setRailFill(self.progress * 100),
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section className="sec border-t">
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{ts.num}</div>
          <h2 className="sec-title">
            {ts.title_l1}
            <br />
            <em className="it">{ts.title_l2_it}</em>
          </h2>
          <p className="sec-intro">{ts.intro}</p>
        </div>

        <div className="method" ref={wrapRef}>
          <div className="method-rail" />
          <div className="method-rail-active" style={{ height: `${railFill}%` }} />
          <div className="method-steps">
            {ts.steps.map((s, i) => (
              <div key={i} data-reveal data-reveal-delay={String(i % 3)}>
                <div className={`method-step${i === active ? ' active' : ''}`}>
                  <span className="ndot" />
                  <div className="meta">
                    <span className="num-big">{s.n}</span>
                    <h3>{s.t}</h3>
                    <p>{s.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
