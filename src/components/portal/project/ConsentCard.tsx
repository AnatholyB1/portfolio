'use client';

import { useActionState, useState } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import { setConsentAction, type PortalActionState } from '@/app/espace-client/actions';
import { formatDateFr } from '@/lib/admin/format';
import { PRESENTATION_CONSENT } from '@/lib/projects/consent';
import { PROJECT_COPY } from '@/lib/projects/copy';
import './project.css';

const INITIAL: PortalActionState = { status: 'idle' };
const COPY = PROJECT_COPY.consent;

type Props = {
  projectId: string;
  current: { granted: boolean; createdAt: string; version: string } | null;
};

export default function ConsentCard({ projectId, current }: Props) {
  const [state, formAction, pending] = useActionState(setConsentAction, INITIAL);
  const [checked, setChecked] = useState(false);
  const granted = current?.granted === true;
  const stale = state.status === 'error' && state.message === PROJECT_COPY.errors.consentStale;

  return (
    <section className="pt-consent" aria-labelledby="consent-heading" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 id="consent-heading">{COPY.heading}</h2>
      <p className="pt-status">{COPY.intro}</p>
      <blockquote className="pt-consent-quote pt-readback">{PRESENTATION_CONSENT.text}</blockquote>
      <p className="pt-status">{COPY.version(PRESENTATION_CONSENT.version)}</p>

      <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="version" value={PRESENTATION_CONSENT.version} />
        {granted ? (
          <>
            <input type="hidden" name="granted" value="false" />
            <p className="pt-success">
              <Check size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 4 }} />
              <span>{COPY.granted(formatDateFr(current?.createdAt))}</span>
            </p>
            <button type="submit" className="pt-btn-ghost" disabled={pending}>
              {COPY.withdraw}
            </button>
          </>
        ) : (
          <>
            <input type="hidden" name="granted" value="true" />
            <label className="pt-consent-check">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
              <span>{COPY.checkbox}</span>
            </label>
            <button type="submit" className="pt-btn-primary" disabled={!checked || pending}>
              {COPY.save}
            </button>
          </>
        )}
      </form>

      <div aria-live="polite">
        {state.status === 'success' && state.message && !granted ? (
          <p className="pt-success">
            <Check size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 4 }} />
            <span>{state.message}</span>
          </p>
        ) : null}
        {state.status === 'error' ? (
          <p className="pt-error">
            <CircleAlert size={16} aria-hidden="true" style={{ flex: 'none', marginTop: 4 }} />
            <span>{state.message}</span>
          </p>
        ) : null}
      </div>
      {stale ? (
        <button type="button" className="pt-btn-ghost" onClick={() => window.location.reload()}>
          {COPY.reload}
        </button>
      ) : null}
    </section>
  );
}
