import { Check } from 'lucide-react';
import { formatDateFr } from '@/lib/admin/format';
import { PROJECT_COPY } from '@/lib/projects/copy';
import type { ActorKind, ProjectState } from '@/lib/projects/steps';
import './project.css';

const ACTOR_LABEL: Record<ActorKind, string> = {
  system: 'Système',
  admin: 'Admin',
  client: 'Client',
};

const SUFFIX = {
  done: PROJECT_COPY.portal.doneSuffix,
  current: PROJECT_COPY.portal.currentSuffix,
  upcoming: PROJECT_COPY.portal.upcomingSuffix,
} as const;

// Frise des 6 étapes, partagée portail / admin. La variante client n'affiche jamais l'acteur (Pitfall 4).
export default function Timeline({
  state,
  variant,
}: {
  state: ProjectState;
  variant: 'client' | 'admin';
}) {
  return (
    <ol aria-label="Avancement du projet" className="pt-step-list">
      {state.steps.map((s) => (
        <li
          key={s.index}
          className={`pt-step pt-step-${s.state}`}
          aria-current={s.state === 'current' ? 'step' : undefined}
        >
          <span className="pt-step-marker" aria-hidden="true">
            {s.state === 'done' ? <Check size={16} /> : null}
          </span>
          <div className="pt-step-body">
            <p className="pt-step-title">
              <span className="pt-step-num">{String(s.index).padStart(2, '0')}</span>
              <span className="pt-step-name">
                {s.name}
                <span className="pt-sr-only">{SUFFIX[s.state]}</span>
              </span>
              {s.state === 'current' ? (
                <span className="pt-step-badge">{PROJECT_COPY.portal.current}</span>
              ) : null}
            </p>
            <p className="pt-step-desc">{s.description}</p>
            {s.state === 'done' && s.completedAt ? (
              <p className="pt-step-date">
                {`le ${formatDateFr(s.completedAt)}`}
                {variant === 'admin' && s.completedBy ? ` · ${ACTOR_LABEL[s.completedBy]}` : ''}
              </p>
            ) : null}
            {s.state === 'current' ? (
              <p className="pt-step-date">{`depuis le ${formatDateFr(state.sinceAt)}`}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
