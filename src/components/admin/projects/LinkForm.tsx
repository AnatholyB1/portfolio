'use client';

import { useActionState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { addLinkAction, type ProjectActionState } from '@/app/admin/projets/actions';
import { PROJECT_COPY } from '@/lib/projects/copy';
import '../leads/leads.css';

const INITIAL: ProjectActionState = { status: 'idle' };

export default function LinkForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ProjectActionState, fd: FormData) => addLinkAction(prev, fd),
    INITIAL,
  );

  return (
    <form action={formAction} className="pt-lead-form">
      <input type="hidden" name="projectId" value={projectId} />
      <div>
        <label htmlFor={`lk-title-${projectId}`} className="pt-lead-label">
          Titre
        </label>
        <input id={`lk-title-${projectId}`} name="title" type="text" required maxLength={80} />
      </div>
      <div>
        <label htmlFor={`lk-url-${projectId}`} className="pt-lead-label">
          Adresse (https://…)
        </label>
        <input id={`lk-url-${projectId}`} name="url" type="url" required maxLength={2000} />
      </div>
      <div aria-live="polite">
        {state.status === 'error' ? (
          <p className="pt-error">
            <AlertCircle size={16} aria-hidden="true" /> {state.message}
          </p>
        ) : null}
        {state.status === 'success' ? (
          <p className="pt-success">
            <CheckCircle2 size={16} aria-hidden="true" /> Lien ajouté
          </p>
        ) : null}
      </div>
      <button type="submit" className="pt-btn-ghost" disabled={pending}>
        {PROJECT_COPY.links.add}
      </button>
    </form>
  );
}
