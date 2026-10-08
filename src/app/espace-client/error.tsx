'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import ShellHeader from '@/components/portal/ShellHeader';
import ShellMain from '@/components/portal/ShellMain';
import SignOutButton from '@/components/portal/SignOutButton';
import { PROJECT_COPY } from '@/lib/projects/copy';

const COPY = PROJECT_COPY.boundaries;

// Limite d'erreur de l'espace client : reste dans le thème sombre, garde l'en-tête, propose de
// réessayer. Le détail technique n'est jamais affiché au client.
export default function EspaceClientError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <>
      <ShellHeader variant="client" title="Espace client" actions={<SignOutButton />} />
      <ShellMain width="client">
        <section className="pt-card" aria-labelledby="portal-error-title">
          <h1 id="portal-error-title" className="pt-heading" ref={headingRef} tabIndex={-1}>
            {COPY.errorTitle}
          </h1>
          <p className="pt-helper">{COPY.errorBody}</p>
          <div className="pt-actions-row">
            <button type="button" className="pt-btn-primary" onClick={reset}>
              {COPY.retry}
            </button>
            <Link href="/espace-client" className="pt-btn-text">
              {COPY.backToProject}
            </Link>
          </div>
        </section>
      </ShellMain>
    </>
  );
}
