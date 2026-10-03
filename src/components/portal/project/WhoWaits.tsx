import Link from 'next/link';
import { CircleCheck, Clock, UserRound } from 'lucide-react';
import { PROJECT_COPY } from '@/lib/projects/copy';
import { daysSince } from '@/lib/projects/blocking';
import { DONE_COPY, type ProjectState } from '@/lib/projects/steps';
import './project.css';

const COPY = PROJECT_COPY.whoWaits;

type Props = { state: ProjectState; now: Date; showOnboardingCta: boolean };

// Panneau « En attente de » (PORTAL-03, D-12).
export default function WhoWaits({ state, now, showOnboardingCta }: Props) {
  const Icon = state.done ? CircleCheck : state.waitingOn === 'client' ? UserRound : Clock;
  const name = state.done ? DONE_COPY.waitingLine : state.waitingOn === 'client' ? COPY.client : COPY.admin;
  return (
    <div className="pt-who">
      <Icon size={20} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
      <div className="pt-who-body">
        {state.done ? null : <p className="pt-who-label">{COPY.label}</p>}
        <p className="pt-who-name">{name}</p>
        {state.done ? null : (
          <p className="pt-who-since">
            {state.expectedAction} · {COPY.since(daysSince(state.sinceAt, now))}
          </p>
        )}
        {showOnboardingCta ? (
          <Link href="#onboarding" className="pt-btn-primary">
            {COPY.cta}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
