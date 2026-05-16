'use client';
import { useRef, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

// ─── Helpers ────────────────────────────────────────────────────
interface Point { x: number; y: number; z: number; shell: number }

function hexToRgba(hex: string, a: number): string {
  if (!hex) return `rgba(196,245,66,${a})`;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ─── HeroCanvas ─────────────────────────────────────────────────
function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef<{
    t: number; mx: number; my: number; w: number; h: number; dpr: number;
    points: Point[]; edges: [number, number, number][];
  }>({ t: 0, mx: 0, my: 0, w: 0, h: 0, dpr: 1, points: [], edges: [] });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const st = stateRef.current;

    const buildGeo = () => {
      const pts: Point[] = [];
      // shell 1: golden-spiral sphere, 120 points
      const N1 = 120;
      const r1 = 1.0;
      const phi = (1 + Math.sqrt(5)) / 2;
      for (let i = 0; i < N1; i++) {
        const y = 1 - (i / (N1 - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = (2 * Math.PI * i) / phi;
        pts.push({ x: Math.cos(theta) * radius * r1, y: y * r1, z: Math.sin(theta) * radius * r1, shell: 1 });
      }
      // shell 2: inner orbit, 36 points slightly tilted
      const N2 = 36;
      const r2 = 0.62;
      for (let i = 0; i < N2; i++) {
        const a = (i / N2) * Math.PI * 2;
        pts.push({ x: Math.cos(a) * r2, y: Math.sin(a * 2) * 0.18, z: Math.sin(a) * r2, shell: 2 });
      }
      // Build edges by nearest-neighbor (limit count for perf)
      const edges: [number, number, number][] = [];
      const threshold = 0.35;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          if (pts[i].shell !== pts[j].shell) continue;
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dz = pts[i].z - pts[j].z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < threshold) edges.push([i, j, d]);
        }
      }
      st.points = pts;
      st.edges = edges;
    };
    buildGeo();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      st.dpr = Math.min(window.devicePixelRatio || 1, 2);
      st.w = rect.width;
      st.h = rect.height;
      canvas.width = rect.width * st.dpr;
      canvas.height = rect.height * st.dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      st.mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      st.my = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouse);

    const getAcid = () => {
      const v = getComputedStyle(document.body).getPropertyValue('--acid').trim();
      return v || '#C4F542';
    };

    const draw = (timeMs: number) => {
      const dt = timeMs * 0.001;
      st.t = dt;
      const acid = getAcid();

      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.clearRect(0, 0, st.w, st.h);

      const cx = st.w / 2;
      const cy = st.h / 2;
      const baseRadius = Math.min(st.w, st.h) * 0.36;

      const ay = dt * 0.18 + st.mx * 0.3;
      const ax = -0.18 + st.my * 0.25 + Math.sin(dt * 0.12) * 0.08;
      const cosY = Math.cos(ay), sinY = Math.sin(ay);
      const cosX = Math.cos(ax), sinX = Math.sin(ax);

      const projected = st.points.map((p) => {
        let x = p.x * cosY - p.z * sinY;
        let z = p.x * sinY + p.z * cosY;
        let y = p.y * cosX - z * sinX;
        z = p.y * sinX + z * cosX;
        const f = 2.4 / (2.4 + z);
        return { x: cx + x * baseRadius * f, y: cy + y * baseRadius * f, z, f, shell: p.shell };
      });

      ctx.lineWidth = 1;
      for (let i = 0; i < st.edges.length; i++) {
        const [a, b] = st.edges[i];
        const pa = projected[a], pb = projected[b];
        const avgZ = (pa.z + pb.z) * 0.5;
        const alpha = Math.max(0.05, Math.min(0.6, (1 - (avgZ + 1) / 2) * 0.7));
        if (pa.shell === 1) {
          ctx.strokeStyle = `rgba(236, 234, 227, ${alpha * 0.35})`;
        } else {
          ctx.strokeStyle = hexToRgba(acid, alpha * 0.55);
        }
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }

      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const size = (p.shell === 2 ? 2.6 : 1.6) * p.f;
        const alpha = Math.max(0.2, Math.min(1, (p.f - 0.65) * 3.5));
        ctx.fillStyle = p.shell === 2 ? hexToRgba(acid, alpha) : `rgba(236,234,227,${alpha * 0.85})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        if (p.shell === 2 && p.z < 0.6) {
          ctx.fillStyle = hexToRgba(acid, alpha * 0.18);
          ctx.beginPath();
          ctx.arc(p.x, p.y, size * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const pulse = 0.5 + 0.5 * Math.sin(dt * 1.6);
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * (1.05 + pulse * 0.04), 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(acid, 0.08 + pulse * 0.07);
      ctx.lineWidth = 1;
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero-canvas"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// ─── HeroSection ────────────────────────────────────────────────
export default function HeroSection() {
  const { t } = useLanguage();
  const tl = t.landing;

  return (
    <section className="hero" id="top">
      <div className="hero-grid" />
      <div className="wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top pill + label */}
        <div className="hero-top" data-reveal>
          <span className="pill mono"><span className="dot" />{tl.hero.pill}</span>
          <span className="label">BRICON ANATHOLY — 2026</span>
        </div>

        {/* Stage: title left, canvas right */}
        <div className="hero-stage">
          <div>
            <h1 className="hero-title split">
              <span className="line"><span>{tl.hero.title_l1}</span></span>
              <span className="line">
                <span>{tl.hero.title_l2}<em className="it acid">{tl.hero.title_l2_it}</em></span>
              </span>
              <span className="line"><span>{tl.hero.title_l3}</span></span>
            </h1>
            <p className="hero-sub" data-reveal data-reveal-delay="2">{tl.hero.sub}</p>
            <div className="hero-ctas" data-reveal data-reveal-delay="3">
              <a className="btn btn-primary" href="/services">
                {tl.hero.cta_primary} <span className="ar">→</span>
              </a>
              <a className="btn btn-ghost" href="#contact">{tl.hero.cta_secondary}</a>
            </div>
          </div>

          {/* Canvas wrapper — explicit height prevents collapse */}
          <div
            className="hero-canvas-wrap"
            data-reveal
            data-reveal-delay="3"
            style={{ minHeight: '400px', position: 'relative' }}
          >
            <HeroCanvas />
            <div className="hero-canvas-label">
              <span>{tl.hero.canvas_l}</span>
              <span>{tl.hero.canvas_r}</span>
            </div>
          </div>
        </div>

        {/* 4-stat meta grid */}
        <div className="hero-meta" data-reveal data-reveal-delay="4">
          {([1, 2, 3, 4] as const).map((i) => (
            <div key={i}>
              <div className="it-num">{(tl.hero as Record<string, string>)[`stat_${i}_n`]}</div>
              <div className="it-lbl">{(tl.hero as Record<string, string>)[`stat_${i}_l`]}</div>
              <div className="it-desc">{(tl.hero as Record<string, string>)[`stat_${i}_d`]}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
