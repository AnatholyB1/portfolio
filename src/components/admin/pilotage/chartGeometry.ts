// Géométrie pure du graphique de trésorerie (viewBox 720 x 240). Aucune dépendance React.
import type { CashMonth } from '@/lib/server/pilotage/forecast';

export const VIEW_W = 720;
export const VIEW_H = 240;
const M_TOP = 24;
const M_BOTTOM = 24;
const M_LEFT = 64;
const M_RIGHT = 16;

export type Bar = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };
export type Segment = { x1: number; y1: number; x2: number; y2: number };
export type Geometry = {
  xs: number[];
  zeroY: number;
  inflowBars: Bar[];
  outflowBars: Bar[];
  linePath: string;
  points: Point[];
  negativeSegments: Segment[];
  yTicks: { y: number; cents: number }[];
};

const r = (n: number) => Math.round(n * 100) / 100;

export function chartGeometry(months: CashMonth[]): Geometry {
  const n = months.length;
  const closings = months.map((m) => m.closingCents);
  let min = Math.min(0, ...closings, ...months.map((m) => -m.outflowCents));
  let max = Math.max(0, ...closings, ...months.map((m) => m.inflowCents));
  if (max === min) max = min + 100;
  // Marge de respiration pour des graduations arrondies à l'euro.
  min = Math.floor(min / 100) * 100;
  max = Math.ceil(max / 100) * 100;
  const plotH = VIEW_H - M_TOP - M_BOTTOM;
  const plotW = VIEW_W - M_LEFT - M_RIGHT;
  const y = (cents: number) => r(M_TOP + ((max - cents) / (max - min)) * plotH);
  const slot = plotW / Math.max(n, 1);
  const xs = months.map((_, i) => r(M_LEFT + slot * (i + 0.5)));
  const zeroY = y(0);
  const bw = Math.min(16, slot / 4);

  const inflowBars = months.map((m, i) => {
    const top = y(m.inflowCents);
    return { x: r(xs[i] - bw - 2), y: top, w: r(bw), h: r(zeroY - top) };
  });
  // Les sorties sont dessinées sous la ligne zéro.
  const outflowBars = months.map((m, i) => {
    const bottom = y(-m.outflowCents);
    return { x: r(xs[i] + 2), y: zeroY, w: r(bw), h: r(bottom - zeroY) };
  });
  const points = months.map((m, i) => ({ x: xs[i], y: y(m.closingCents) }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

  const negativeSegments: Segment[] = [];
  for (let i = 1; i < n; i++) {
    if (months[i - 1].closingCents < 0 || months[i].closingCents < 0) {
      negativeSegments.push({ x1: points[i - 1].x, y1: points[i - 1].y, x2: points[i].x, y2: points[i].y });
    }
  }

  const span = max - min;
  const rawStep = span / 4;
  const step = Math.max(100, Math.round(rawStep / 100) * 100);
  const yTicks: { y: number; cents: number }[] = [];
  for (let c = Math.ceil(min / step) * step; c <= max; c += step) {
    if (c === 0) continue;
    yTicks.push({ y: y(c), cents: c });
  }
  return { xs, zeroY, inflowBars, outflowBars, linePath, points, negativeSegments, yTicks };
}
