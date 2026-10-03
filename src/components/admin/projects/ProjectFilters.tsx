import Link from 'next/link';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { STEPS } from '@/lib/projects/steps';
import '../leads/leads.css';
import './projects.css';

export interface ProjectFiltersProps {
  etape?: string;
  blocage?: string;
}

// Filtres en GET (fonctionnent sans JS, état partageable dans l'URL).
export default function ProjectFilters({ etape, blocage }: ProjectFiltersProps) {
  return (
    <form method="get" action="/admin/projets" className="pt-lead-filters">
      <div>
        <label htmlFor="f-etape">Étape</label>
        <select id="f-etape" name="etape" defaultValue={etape ?? ''}>
          <option value="">Toutes</option>
          {STEPS.map((s) => (
            <option key={s.index} value={String(s.index)}>
              {s.index} {s.name}
            </option>
          ))}
          <option value="done">{PROJECT_COPY.blocage.done}</option>
        </select>
      </div>
      <div>
        <label htmlFor="f-blocage">Blocage</label>
        <select id="f-blocage" name="blocage" defaultValue={blocage ?? ''}>
          <option value="">Tous</option>
          <option value="client">{PROJECT_COPY.blocage.client}</option>
          <option value="admin">{PROJECT_COPY.blocage.admin}</option>
          <option value="dormant">Dormant</option>
        </select>
      </div>
      <button type="submit" className="pt-btn-ghost">
        Appliquer les filtres
      </button>
      <Link href="/admin/projets" className="pt-btn-text">
        {PROJECT_COPY.admin.resetFilters}
      </Link>
    </form>
  );
}
