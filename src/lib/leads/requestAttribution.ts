import 'server-only';
import { ATTR_FT_COOKIE, ATTR_LT_COOKIE, decodeTouch } from '@/lib/attribution/cookie';
import { assessUtm, type NonConformity, type UtmRaw } from '@/lib/attribution/utm';
import { classifyChannel, type ChannelSource, type Touch } from '@/lib/attribution/touch';
import {
  consentStatus,
  readConsentFromCookieHeader,
  type ConsentState,
  type ConsentStatus,
} from '@/lib/consent/state';

export type RequestAttribution = {
  firstTouch: Touch | null;
  lastTouch: Touch | null;
  source: ChannelSource;
  consent: ConsentState | null;
  consentStatus: ConsentStatus;
  utm: { nonconformity: NonConformity[] | null; raw: UtmRaw | null };
};

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(';')) {
    const p = part.trim();
    const eq = p.indexOf('=');
    if (eq < 0 || p.slice(0, eq) !== name) continue;
    try {
      return decodeURIComponent(p.slice(eq + 1));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Attribution lue uniquement depuis les cookies httpOnly (D-06), re-validée par la
 * liste blanche. Les identifiants publicitaires ne sont conservés que si le cookie
 * de consentement de la version courante indique « accepted » (D-05).
 */
export function readAttribution(cookieHeader: string | null): RequestAttribution {
  const consent = readConsentFromCookieHeader(cookieHeader);
  const status = consentStatus(consent);
  const allowClickIds = status === 'accepted';
  const header = cookieHeader ?? '';
  const firstTouch = decodeTouch(readCookie(header, ATTR_FT_COOKIE), { allowClickIds });
  const lastTouch = decodeTouch(readCookie(header, ATTR_LT_COOKIE), { allowClickIds });
  // Même touch que la source figée : lastTouch ?? firstTouch.
  const t = lastTouch ?? firstTouch;
  const assessment = t ? assessUtm(t.params) : null;
  return {
    firstTouch,
    lastTouch,
    source: classifyChannel(lastTouch ?? firstTouch),
    consent,
    consentStatus: status,
    utm: {
      nonconformity: assessment && assessment.reasons.length > 0 ? assessment.reasons : null,
      raw: t?.raw ?? null,
    },
  };
}
