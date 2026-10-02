import Link from 'next/link';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/admin/leadLabels';
import './leads.css';

export interface LeadFiltersProps {
  statut?: string;
  source?: string;
  retours: boolean;
  sources: string[];
}

// Filtres en GET (fonctionnent sans JS, état partageable dans l'URL).
export default function LeadFilters({ statut, source, retours, sources }: LeadFiltersProps) {
  const chips: string[] = [];
  if (statut) chips.push(`Statut : ${STATUS_LABELS[statut as keyof typeof STATUS_LABELS]}`);
  if (source) chips.push(`Source : ${source}`);
  if (retours) chips.push('Retours uniquement');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form method="get" action="/admin/leads" className="pt-lead-filters">
        <div>
          <label htmlFor="f-statut">Statut</label>
          <select id="f-statut" name="statut" defaultValue={statut ?? ''}>
            <option value="">Tous</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-source">Source</label>
          <select id="f-source" name="source" defaultValue={source ?? ''}>
            <option value="">Toutes</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <label className="pt-lead-check">
          <input type="checkbox" name="retours" value="1" defaultChecked={retours} />
          Retours uniquement
        </label>
        <button type="submit" className="pt-btn-ghost">
          Appliquer les filtres
        </button>
        <Link href="/admin/leads" className="pt-btn-text">
          Réinitialiser
        </Link>
      </form>
      {chips.length > 0 ? (
        <div className="pt-lead-chips">
          {chips.map((c) => (
            <span key={c} className="pt-lead-chip">
              {c}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
