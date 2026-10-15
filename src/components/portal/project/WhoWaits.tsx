import Link from 'next/link';
import { CircleCheck, Clock, UserRound } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { daysSince } from '@/lib/projects/blocking';
import type { ClientAction } from '@/lib/projects/clientActions';
import { DONE_COPY, type ProjectState } from '@/lib/projects/steps';
import HashFocusLink from './HashFocusLink';
import './project.css';

const COPY = PROJECT_COPY.whoWaits;

type Props = { state: ProjectState; now: Date; actions?: ClientAction[] };

// Panneau « En attente de » (PORTAL-03, D-12). Quand c'est au client d'agir, le panneau porte
// l'action : compléter les informations, signer ou payer. Un seul bouton principal.
export default function WhoWaits({ state, now, actions = [] }: Props) {
  const Icon = state.done ? CircleCheck : state.waitingOn === 'client' ? UserRound : Clock;
  const name = state.done ? DONE_COPY.waitingLine : state.waitingOn === 'client' ? COPY.client : COPY.admin;
  const shown = state.done ? [] : actions;
  return (
    <div className="pt-who" data-waiting={state.done ? 'done' : state.waitingOn} data-actionable={shown.length > 0 ? '' : undefined}>
      <Icon size={20} aria-hidden="true" className="pt-who-icon" />
      <div className="pt-who-body">
        {state.done ? null : <p className="pt-who-label">{COPY.label}</p>}
        <p className="pt-who-name">{name}</p>
        {state.done ? null : (
          <p className="pt-who-since">
            {state.expectedAction} · {COPY.since(daysSince(state.sinceAt, now))}
          </p>
        )}
        {shown.length > 0 ? (
          <div className="pt-who-actions">
            {shown.map((a, i) => {
              const cls = i === 0 ? 'pt-btn-primary' : 'pt-btn-ghost';
              return a.kind === 'anchor' ? (
                <HashFocusLink key={a.href} targetId={a.href.replace(/^#/, '')} className={cls}>
                  {a.label}
                </HashFocusLink>
              ) : (
                <Link key={a.href} href={a.href} className={cls}>
                  {a.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
