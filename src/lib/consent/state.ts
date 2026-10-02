import { CONSENT_COOKIE, CONSENT_VERSION } from './constants';

export type ConsentChoice = 'accepted' | 'refused';
export type ConsentStatus = 'accepted' | 'refused' | 'pending';
export type ConsentState = { version: string; choice: ConsentChoice; id: string; at: number };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function serialiseConsentCookie(s: ConsentState): string {
  return `${s.version}~${s.choice === 'accepted' ? 'a' : 'r'}~${s.id}~${s.at}`;
}

export function parseConsentCookie(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;
  const parts = raw.split('~');
  if (parts.length !== 4) return null;
  const [version, c, id, atRaw] = parts;
  if (!version) return null;
  if (c !== 'a' && c !== 'r') return null;
  if (!UUID_RE.test(id)) return null;
  if (!/^\d+$/.test(atRaw)) return null;
  const at = Number(atRaw);
  if (!Number.isFinite(at)) return null;
  return { version, choice: c === 'a' ? 'accepted' : 'refused', id, at };
}

export function consentStatus(
  s: ConsentState | null,
  version: string = CONSENT_VERSION,
): ConsentStatus {
  if (!s || s.version !== version) return 'pending';
  return s.choice;
}

export function needsPrompt(s: ConsentState | null, version: string = CONSENT_VERSION): boolean {
  return consentStatus(s, version) === 'pending';
}

export function readConsentFromCookieHeader(cookieHeader: string | null): ConsentState | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const p = part.trim();
    if (!p.startsWith(`${CONSENT_COOKIE}=`)) continue;
    const v = p.slice(CONSENT_COOKIE.length + 1);
    let decoded: string;
    try {
      decoded = decodeURIComponent(v);
    } catch {
      return null;
    }
    return parseConsentCookie(decoded);
  }
  return null;
}
