'use client';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';

// ─── PhoneFlow SVG ────────────────────────────────────────────────
interface FlowStep { t: string; k: string; v: string }

function PhoneFlow({ steps, active, label, rec }: {
  steps: FlowStep[];
  active: number;
  label: string;
  rec: string;
}) {
  return (
    <div className="flow" data-reveal data-reveal-delay="1">
      <div className="flow-grid" />
      <div className="flow-header" style={{ position: 'relative', zIndex: 3 }}>
        <span>{label}</span>
        <span className="rec"><span className="d" />{rec}</span>
      </div>

      <svg className="flow-svg" viewBox="0 0 400 460" preserveAspectRatio="none">
        <defs>
          <linearGradient id="g-line" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--acid)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--acid)" stopOpacity="0.6" />
            <stop offset="1" stopColor="var(--acid)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Dashed connector lines between steps */}
        {steps.map((_, i) =>
          i < steps.length - 1 ? (
            <line
              key={i}
              x1="80" y1={120 + i * 90}
              x2="80" y2={120 + (i + 1) * 90}
              stroke="rgba(196,245,66,0.25)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
          ) : null
        )}

        {/* Moving particle dot — animates from previous to current step Y */}
        <circle cx="80" cy={120 + active * 90} r="5" fill="var(--acid)">
          <animate
            attributeName="cy"
            from={120 + Math.max(0, active - 1) * 90}
            to={120 + active * 90}
            dur="0.6s"
          />
        </circle>

        {/* Pulsing ring */}
        <circle
          cx="80" cy={120 + active * 90} r="14"
          fill="none" stroke="var(--acid)" strokeOpacity="0.3"
        >
          <animate attributeName="r" values="6;22;6" dur="2s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* Step labels — positioned absolutely over the SVG area */}
      <div style={{ position: 'absolute', inset: '64px 32px 32px 96px', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', zIndex: 2 }}>
        {steps.map((s, i) => {
          const isActive = i === active;
          const isPast = i < active;
          return (
            <div key={i} style={{
              opacity: isActive ? 1 : (isPast ? 0.55 : 0.3),
              transition: 'opacity .5s ease, transform .5s ease',
              transform: isActive ? 'translateX(0)' : 'translateX(-6px)',
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <span className="mono" style={{ fontSize: 10, color: isActive ? 'var(--acid)' : 'var(--ink-faint)', letterSpacing: '0.15em' }}>
                  {s.t}
                </span>
                <span style={{ fontFamily: "var(--font-bricolage), serif", fontSize: 22, letterSpacing: '-0.02em', color: isActive ? 'var(--ink)' : 'var(--ink-dim)' }}>
                  {s.k}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-dim)', marginTop: 4, paddingLeft: 38 }}>{s.v}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PhoneAgent section ──────────────────────────────────────────
export default function PhoneAgent() {
  const { t } = useLanguage();
  const pa = t.landing.phone;
  const steps = pa.flow_steps;
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const onScroll = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = rect.height - vh;
    if (total <= 0) return;
    const p = Math.max(0, Math.min(1, -rect.top / total));
    const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
    setActiveStep(idx);
  }, [steps.length]);

  useEffect(() => {
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  return (
    <section className="phone-section border-t" id="phone" ref={sectionRef}>
      <div className="wrap">
        <div className="sec-head" data-reveal>
          <div className="sec-num">{pa.num}</div>
          <h2 className="sec-title">
            {pa.title_l1}<br />{pa.title_l2} <em className="it">{pa.title_l3_it}</em>
          </h2>
          <p className="sec-intro">{pa.sub}</p>
        </div>

        <div className="phone-grid">
          <div data-reveal>
            <span className="phone-badge">
              <span className="live" />{pa.badge}
            </span>
            <ul className="phone-features">
              {pa.features.map((f, i) => (
                <li key={i}><span className="check">→</span>{f}</li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="#contact" className="btn btn-primary">
                {pa.cta_demo} <span className="ar">→</span>
              </a>
              <a href="/services#phone-agent" className="btn btn-ghost">{pa.cta_more}</a>
            </div>
          </div>

          <PhoneFlow
            steps={steps}
            active={activeStep}
            label={pa.flow_label}
            rec={pa.flow_rec}
          />
        </div>
      </div>
    </section>
  );
}
