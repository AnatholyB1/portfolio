'use client';

// Suivi d'audience Sèvalys via PostHog.
// - Autocapture des clics/interactions (où les visiteurs cliquent)
// - Pageviews manuels (App Router = navigation SPA)
// - Provenance du trafic capturée automatiquement (referrer / UTM)
// No-op tant que NEXT_PUBLIC_POSTHOG_KEY n'est pas défini → aucun tracking en local.

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let initialized = false;
function ensureInit() {
  if (initialized || !KEY || typeof window === 'undefined') return;
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: 'identified_only',
    capture_pageview: false, // géré manuellement ci-dessous
    capture_pageleave: true,
    autocapture: true, // clics, soumissions de formulaire, etc.
    respect_dnt: true, // respecte « Do Not Track »
    persistence: 'localStorage+cookie',
  });
  initialized = true;
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!KEY || !initialized) return;
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureInit();
  }, []);

  if (!KEY) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}
