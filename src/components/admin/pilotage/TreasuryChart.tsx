import type { ReactNode } from 'react';
import type { CashProjection } from '@/lib/server/pilotage/forecast';
import { monthLongFr, monthShortFr } from '@/lib/server/pilotage/periods';
import { formatMonthFr, formatSignedEuros } from './format';
import { chartGeometry, VIEW_H, VIEW_W } from './chartGeometry';
import './pilotage.css';

type Props = { cash: CashProjection; balanceLink?: ReactNode };

export default function TreasuryChart({ cash, balanceLink }: Props) {
  const months = cash.months;
  const first = months[0];
  const last = months[months.length - 1];
  const g = chartGeometry(months);
  const ariaLabel =
    first && last
      ? `Courbe de trésorerie sur 6 mois, de ${monthLongFr(first.month)} à ${monthLongFr(last.month)}. Solde de clôture de ${monthLongFr(last.month)} : ${formatSignedEuros(last.closingCents)}.`
      : 'Courbe de trésorerie sur 6 mois, aucune donnée.';
  const desc = months
    .map(
      (m) =>
        `${monthLongFr(m.month)} : entrées ${formatSignedEuros(m.inflowCents)}, sorties ${formatSignedEuros(m.outflowCents)}, solde de clôture ${formatSignedEuros(m.closingCents)}.`,
    )
    .join(' ');

  return (
    <section className="pt-pilot-chart-section" aria-labelledby="pilot-cash-title">
      <h2 id="pilot-cash-title" className="pt-heading">
        Trésorerie projetée sur 6 mois
      </h2>
      <p className="pt-helper">
        Entrées : factures émises impayées, à leur échéance (les factures en retard comptent dans le mois courant).
        Sorties : coûts récurrents et coûts de projet à venir.
      </p>
      {!cash.hasBalance ? (
        <div className="pt-warning">
          <p>Aucun solde de départ saisi. La courbe montre le flux net cumulé depuis zéro.</p>
          {balanceLink}
        </div>
      ) : null}
      <div className="pt-pilot-chart">
        <svg
          role="img"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          aria-label={ariaLabel}
        >
          <title>Trésorerie projetée</title>
          <desc>{desc}</desc>
          {g.yTicks.map((t) => (
            <text
              key={t.cents}
              x={56}
              y={t.y + 5}
              textAnchor="end"
              fontSize={14}
              fill="var(--ink-dim)"
              fontFamily="var(--font-mono), monospace"
            >
              {formatSignedEuros(t.cents)}
            </text>
          ))}
          <line x1={64} x2={VIEW_W - 16} y1={g.zeroY} y2={g.zeroY} stroke="var(--ink-dim)" strokeWidth={1} strokeDasharray="4 4" />
          <text
            x={56}
            y={g.zeroY + 5}
            textAnchor="end"
            fontSize={14}
            fill="var(--ink-dim)"
            fontFamily="var(--font-mono), monospace"
          >
            0 €
          </text>
          {months.map((m, i) => (
            <g key={m.month}>
              <rect x={g.inflowBars[i].x} y={g.inflowBars[i].y} width={g.inflowBars[i].w} height={g.inflowBars[i].h} fill="var(--ink-dim)">
                <title>{`Entrées ${monthLongFr(m.month)} : ${formatSignedEuros(m.inflowCents)}`}</title>
              </rect>
              <rect
                x={g.outflowBars[i].x}
                y={g.outflowBars[i].y}
                width={g.outflowBars[i].w}
                height={g.outflowBars[i].h}
                fill="none"
                stroke="var(--ink-dim)"
                strokeWidth={1.5}
              >
                <title>{`Sorties ${monthLongFr(m.month)} : ${formatSignedEuros(m.outflowCents)}`}</title>
              </rect>
              <text x={g.xs[i]} y={VIEW_H - 4} textAnchor="middle" fontSize={14} fill="var(--ink-dim)">
                {monthShortFr(m.month)}
              </text>
            </g>
          ))}
          <path d={g.linePath} fill="none" stroke="var(--acid)" strokeWidth={2} />
          {g.negativeSegments.map((s, i) => (
            <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="var(--warm)" strokeWidth={2} />
          ))}
          {g.points.map((p, i) => (
            <circle key={months[i].month} cx={p.x} cy={p.y} r={3} fill="var(--acid)">
              <title>{`Solde de clôture ${monthLongFr(months[i].month)} : ${formatSignedEuros(months[i].closingCents)}`}</title>
            </circle>
          ))}
          {g.negativeSegments.length > 0 ? (
            <text x={VIEW_W - 16} y={g.zeroY + 20} textAnchor="end" fontSize={14} fill="var(--warm)">
              Découvert
            </text>
          ) : null}
        </svg>
      </div>
      <ul className="pt-pilot-legend">
        <li>
          <span className="pt-pilot-swatch pt-pilot-swatch-line" aria-hidden="true" /> Solde projeté
        </li>
        <li>
          <span className="pt-pilot-swatch pt-pilot-swatch-fill" aria-hidden="true" /> Entrées
        </li>
        <li>
          <span className="pt-pilot-swatch pt-pilot-swatch-outline" aria-hidden="true" /> Sorties
        </li>
      </ul>
      <table className="pt-table pt-pilot-table">
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Ouverture</th>
            <th scope="col">Entrées</th>
            <th scope="col">Sorties</th>
            <th scope="col">Clôture</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m, i) => (
            <tr key={m.month}>
              <th scope="row" data-label="Mois">
                {formatMonthFr(m.month)}
              </th>
              <td data-label="Ouverture" className="pt-pilot-num">
                {formatSignedEuros(m.openingCents)}
              </td>
              <td data-label="Entrées" className="pt-pilot-num">
                {formatSignedEuros(m.inflowCents)}
                {i === 0 && m.overdueInflowCents > 0 ? (
                  <span className="pt-pilot-overdue">
                    {' '}
                    <span aria-hidden="true" className="pt-pilot-warn-glyph">
                      !
                    </span>{' '}
                    dont {formatSignedEuros(m.overdueInflowCents)} en retard
                  </span>
                ) : null}
              </td>
              <td data-label="Sorties" className="pt-pilot-num">
                {formatSignedEuros(m.outflowCents)}
              </td>
              <td data-label="Clôture" className="pt-pilot-num">
                {formatSignedEuros(m.closingCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
