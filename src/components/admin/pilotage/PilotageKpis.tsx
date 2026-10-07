import Link from 'next/link';
import type { Tile } from '@/lib/server/pilotage/dashboard';
import { pilotageHref, type PilotageParams } from '@/lib/server/pilotage/params';
import { formatSignedEuros } from './format';
import './pilotage.css';

type Props = { tiles: Tile[]; params: PilotageParams };

export default function PilotageKpis({ tiles, params }: Props) {
  return (
    <div className="pt-funnel-kpis">
      {tiles.map((tile) => {
        const amount = formatSignedEuros(tile.cents);
        const href = tile.detail
          ? pilotageHref(params, { detail: tile.detail, projectId: null, page: 1 })
          : `${pilotageHref(params, { detail: null, projectId: null })}${tile.anchor ?? ''}`;
        return (
          <div key={tile.key} className="pt-funnel-kpi">
            <span className="pt-funnel-kpi-label">{tile.label}</span>
            <Link
              href={href}
              className="pt-pilot-kpi-link"
              aria-label={`${tile.label} : ${amount}. Voir le détail`}
            >
              <span className="pt-funnel-kpi-value">{amount}</span>
              <span className="pt-pilot-kpi-link-text">{tile.linkText}</span>
            </Link>
            <p className="pt-pilot-kpi-rule">{tile.rule}</p>
          </div>
        );
      })}
    </div>
  );
}
