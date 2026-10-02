export const CONSENT_COOKIE = 'sv_consent';
export const CONSENT_VERSION = '2026-10-v1';
/** 13 months (D-03). */
export const CONSENT_MAX_AGE_DAYS = 395;

/**
 * Whether the first/last-touch attribution cookie is set before the visitor chooses.
 * D-07 owner decision (default true). The research flags this as outside the CNIL
 * audience-measurement exemption (assumption A1). Flipping to false (strict variant)
 * requires changing the banner body copy and bumping CONSENT_VERSION together
 * (UI-SPEC copy accuracy constraint).
 */
export const ATTR_COOKIE_BEFORE_CONSENT = true;

/** false = call opt_out_capturing() on refuse (RESEARCH Pattern 7). */
export const PH_CAPTURE_ON_REFUSE = true;

/** window CustomEvent name, detail { status: ConsentStatus }. */
export const CONSENT_CHANGED_EVENT = 'sv:consent-changed';

export const CONSENT_LOCALES = ['fr', 'en', 'th'] as const;
