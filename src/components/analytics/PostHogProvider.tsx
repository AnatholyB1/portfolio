'use client';

// Suivi d'audience Sèvalys via PostHog.
// - Avant consentement (D-01) : mode mémoire, aucun cookie ni localStorage, IP non collectée
// - Après Accepter : persistance localStorage+cookie et autocapture
// - Retrait (Accepter -> Refuser) : reset() puis retour en mode mémoire
// - Pageviews manuels (App Router = navigation SPA)
// La configuration vient uniquement de buildPostHogConfig (src/lib/consent/posthogConfig.ts).
// No-op tant que NEXT_PUBLIC_POSTHOG_KEY n'est pas défini → aucun tracking en local.

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { PostHog } from 'posthog-js';
import { isPrivatePath } from '@/lib/privateRoutes';
import { isClickIdKey } from '@/lib/attribution/params';
import {
  CONSENT_CHANGED_EVENT,
  PH_CAPTURE_ON_REFUSE,
} from '@/lib/consent/constants';
import { consentStatus, readConsentFromCookieHeader, type ConsentStatus } from '@/lib/consent/state';
import { buildPostHogConfig } from '@/lib/consent/posthogConfig';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let initialized = false;
let currentStatus: ConsentStatus = 'pending';

// Perf (LCP/TBT) : posthog-js (~70 Ko gzip) n'est pas dans le bundle initial. Il est importé
// dynamiquement quand le navigateur est inactif, puis toutes les opérations sont exécutées
// dans l'ordre d'appel via une file (Promise chaînée).
let loader: Promise<PostHog> | null = null;
let queue: Promise<void> = Promise.resolve();

function whenIdle(cb: () => void) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => cb(), { timeout: 3000 });
  } else {
    setTimeout(cb, 1500);
  }
}

function loadPostHog(): Promise<PostHog> {
  if (!loader) {
    loader = new Promise<PostHog>((resolve, reject) => {
      whenIdle(() => {
        import('posthog-js').then((m) => resolve(m.default), reject);
      });
    });
  }
  return loader;
}

function withPostHog(task: (ph: PostHog) => void) {
  if (!KEY || typeof window === 'undefined') return;
  queue = queue
    .then(() => loadPostHog())
    .then(task)
    .catch(() => {
      // Chargement bloqué (adblock, réseau) : le suivi est best-effort.
    });
}

function readStatus(): ConsentStatus {
  return consentStatus(readConsentFromCookieHeader(document.cookie));
}

function ensureInit(posthog: PostHog) {
  if (initialized || !KEY) return;
  currentStatus = readStatus();
  posthog.init(KEY, buildPostHogConfig(currentStatus, HOST));
  if (currentStatus === 'refused' && !PH_CAPTURE_ON_REFUSE) posthog.opt_out_capturing();
  initialized = true;
}

function applyConsentChange(next: ConsentStatus) {
  const previous = currentStatus;
  currentStatus = next;
  withPostHog((posthog) => {
    if (!initialized) return;
    if (next === 'accepted') {
      posthog.set_config(buildPostHogConfig('accepted', HOST));
      if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
      return;
    }
    if (previous === 'accepted') posthog.reset();
    posthog.set_config(buildPostHogConfig('refused', HOST));
    if (next === 'refused' && !PH_CAPTURE_ON_REFUSE) posthog.opt_out_capturing();
  });
}

function stripClickIdParams(qs: string): string {
  const params = new URLSearchParams(qs);
  for (const key of Array.from(params.keys())) {
    if (isClickIdKey(key)) params.delete(key);
  }
  return params.toString();
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!KEY) return;
    // Aucune donnée client ne doit atteindre PostHog : le portail affichera
    // contrats et prix. On coupe toute capture sur les routes privées.
    if (isPrivatePath(pathname)) {
      withPostHog((posthog) => {
        if (initialized) posthog.opt_out_capturing();
      });
      return;
    }
    const rawQs = searchParams?.toString() ?? '';
    withPostHog((posthog) => {
      ensureInit(posthog);
      if (!initialized) return;
      if (currentStatus !== 'refused' || PH_CAPTURE_ON_REFUSE) {
        if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
      }
      let url = window.origin + pathname;
      let qs = rawQs;
      if (qs && currentStatus !== 'accepted') qs = stripClickIdParams(qs);
      if (qs) url += `?${qs}`;
      posthog.capture('$pageview', { $current_url: url });
    });
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const onChange = (e: Event) => {
      const status = (e as CustomEvent<{ status?: ConsentStatus }>).detail?.status;
      if (status === 'accepted' || status === 'refused') applyConsentChange(status);
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
  }, []);

  useEffect(() => {
    // Pas d'init (donc pas d'autocapture) sur un atterrissage direct privé ;
    // PageviewTracker initialise paresseusement dès qu'une route publique est atteinte.
    if (isPrivatePath(window.location.pathname)) return;
    withPostHog((posthog) => ensureInit(posthog));
  }, []);

  if (!KEY) return <>{children}</>;

  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  );
}
