'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { isPrivatePath } from '@/lib/privateRoutes';
import { CONSENT_VERSION, CONSENT_CHANGED_EVENT } from '@/lib/consent/constants';
import { needsPrompt, readConsentFromCookieHeader, type ConsentChoice } from '@/lib/consent/state';
import { CONSENT_TEXT } from '@/lib/consent/text';
import { closeConsent, openConsent, useConsentStore } from '@/lib/consent/store';
import './consent.css';

const INTRO_FALLBACK_MS = 2500;
const CLICK_ID_RE = /[?&](gclid|fbclid|ttclid)=/;

export default function ConsentDialog() {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const { open, introDone } = useConsentStore();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = CONSENT_TEXT[lang];
  const blocked = isPrivatePath(pathname) || pathname === '/mentions-legales';

  // First visit: open once the intro has ended (or after a fallback delay).
  useEffect(() => {
    if (blocked) return;
    if (!needsPrompt(readConsentFromCookieHeader(document.cookie))) return;
    if (introDone) {
      openConsent();
      return;
    }
    const id = window.setTimeout(openConsent, INTRO_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [blocked, introDone, pathname]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !blocked) {
      if (!d.open) d.showModal();
      headingRef.current?.focus();
    } else if (d.open) {
      d.close();
    }
  }, [open, blocked]);

  const choose = useCallback(
    async (choice: ConsentChoice) => {
      setPending(true);
      setFailed(false);
      try {
        const res = await fetch('/api/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ choice, version: CONSENT_VERSION, locale: lang }),
        });
        if (!res.ok) throw new Error('consent');
        closeConsent();
        window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: { status: choice } }));
        if (
          choice === 'accepted' &&
          CLICK_ID_RE.test(window.location.search) &&
          readConsentFromCookieHeader(document.cookie)?.choice === 'accepted'
        ) {
          window.location.reload();
        }
      } catch {
        setFailed(true);
      } finally {
        setPending(false);
      }
    },
    [lang],
  );

  return (
    <dialog
      ref={dialogRef}
      className="consent-dialog"
      lang={lang}
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
      onCancel={(e) => e.preventDefault()}
    >
      <h2 id="consent-title" className="consent-title" tabIndex={-1} ref={headingRef}>
        {copy.heading}
      </h2>
      <p id="consent-body" className="consent-body">
        {copy.body}
      </p>
      <Link href="/mentions-legales#cookies" className="consent-link">
        {copy.link}
      </Link>
      {failed && (
        <p className="consent-error" aria-live="polite">
          <AlertCircle size={20} aria-hidden="true" />
          <span>{copy.error}</span>
        </p>
      )}
      <div className="consent-actions">
        <button type="button" className="consent-btn" disabled={pending} onClick={() => choose('refused')}>
          {copy.refuse}
        </button>
        <button type="button" className="consent-btn" disabled={pending} onClick={() => choose('accepted')}>
          {copy.accept}
        </button>
      </div>
    </dialog>
  );
}
