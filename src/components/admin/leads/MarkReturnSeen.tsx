'use client';

import { useActionState, useEffect, useRef, startTransition } from 'react';
import { markReturnSeenAction, type LeadActionState } from '@/app/admin/leads/actions';

const INITIAL: LeadActionState = { status: 'idle' };

// Ouvrir le détail d'un lead revenu efface son badge « Revenu » (D-12), une seule fois.
export default function MarkReturnSeen({ leadId }: { leadId: string }) {
  const [, formAction] = useActionState(markReturnSeenAction, INITIAL);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const fd = new FormData();
    fd.set('leadId', leadId);
    startTransition(() => formAction(fd));
  }, [leadId, formAction]);

  return null;
}
