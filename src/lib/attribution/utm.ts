// UTM convention rules (D-01..D-05). Pure module: no next/*, supabase or node:*
// imports. Single source of truth shared by proxy, route handlers and the admin
// link generator, so the generator can never emit a link the capture would flag.
// Only a type import from ./params (no runtime cycle).
import type { AttrParams } from './params';

export const UTM_SOURCES = ['meta', 'google', 'gbp'] as const;
export type UtmSource = (typeof UTM_SOURCES)[number];

export const UTM_MEDIUMS = ['paid_social', 'cpc', 'organic', 'referral'] as const;
export type UtmMedium = (typeof UTM_MEDIUMS)[number];

export const SOURCE_LABELS: Record<UtmSource, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  gbp: 'Fiche Google Business',
};

export const MEDIUM_LABELS: Record<UtmMedium, string> = {
  paid_social: 'Réseaux sociaux payants',
  cpc: 'Recherche payante',
  organic: 'Organique',
  referral: 'Site référent',
};

export const PLATFORM_PRESETS: Record<UtmSource, UtmMedium> = {
  meta: 'paid_social',
  google: 'cpc',
  gbp: 'organic',
};

// Keys are lowercased values; targets are canonical values.
export const SOURCE_ALIASES: Readonly<Record<string, UtmSource>> = {
  facebook: 'meta',
  fb: 'meta',
  instagram: 'meta',
  ig: 'meta',
  'facebook-ads': 'meta',
  meta_ads: 'meta',
  'meta-ads': 'meta',
  adwords: 'google',
  googleads: 'google',
  'google-ads': 'google',
  google_ads: 'google',
  gmb: 'gbp',
  'google-business': 'gbp',
  googlebusiness: 'gbp',
  google_business: 'gbp',
  gmaps: 'gbp',
};

export const MEDIUM_ALIASES: Readonly<Record<string, UtmMedium>> = {
  paid: 'paid_social',
  paidsocial: 'paid_social',
  'paid-social': 'paid_social',
  social_paid: 'paid_social',
  'social-paid': 'paid_social',
  ppc: 'cpc',
  paid_search: 'cpc',
  'paid-search': 'cpc',
  seo: 'organic',
  local: 'organic',
};

export type UtmRaw = Partial<Record<'utm_source' | 'utm_medium', string>>;

const hasOwn = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

// Expects an already lowercased value. Alias -> canonical, otherwise unchanged.
export function canonicaliseUtmValue(key: 'utm_source' | 'utm_medium', lowered: string): string {
  const table: Readonly<Record<string, string>> = key === 'utm_source' ? SOURCE_ALIASES : MEDIUM_ALIASES;
  return hasOwn(table, lowered) ? table[lowered] : lowered;
}

export const NONCONFORMITY_CODES = [
  'source_missing',
  'source_unknown',
  'medium_missing',
  'medium_unknown',
  'campaign_malformed',
  'content_malformed',
] as const;
export type NonConformity = (typeof NONCONFORMITY_CODES)[number];

export const NONCONFORMITY_LABELS: Record<NonConformity, string> = {
  source_missing: "Source (utm_source) absente alors que d'autres paramètres UTM sont présents.",
  source_unknown: 'Source inconnue : valeurs attendues meta, google ou gbp.',
  medium_missing: "Support (utm_medium) absent alors que d'autres paramètres UTM sont présents.",
  medium_unknown: 'Support inconnu : valeurs attendues paid_social, cpc, organic ou referral.',
  campaign_malformed: 'Campagne mal formée : format attendu offre_cible_aaaamm (60 caractères maximum).',
  content_malformed: 'Variante de création mal formée : minuscules, chiffres et tirets uniquement.',
};

export const CAMPAIGN_MAX = 60;
// Linear: blocks are [a-z0-9]+ words joined by single hyphens, anchored.
export const CAMPAIGN_RE =
  /^[a-z0-9]+(?:-[a-z0-9]+)*_[a-z0-9]+(?:-[a-z0-9]+)*_20\d\d(?:0[1-9]|1[0-2])$/;
export const CONTENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

// Flags, never rewrites. null when no utm_* key is present (gclid-only and
// referrer arrivals are never flagged).
export function assessUtm(params: AttrParams): { conform: boolean; reasons: NonConformity[] } | null {
  if (!UTM_KEYS.some((k) => params[k] !== undefined)) return null;
  const reasons = new Set<NonConformity>();

  const source = params.utm_source;
  if (source === undefined) reasons.add('source_missing');
  else if (!(UTM_SOURCES as readonly string[]).includes(canonicaliseUtmValue('utm_source', source))) {
    reasons.add('source_unknown');
  }

  const medium = params.utm_medium;
  if (medium === undefined) reasons.add('medium_missing');
  else if (!(UTM_MEDIUMS as readonly string[]).includes(canonicaliseUtmValue('utm_medium', medium))) {
    reasons.add('medium_unknown');
  }

  const campaign = params.utm_campaign;
  if (campaign !== undefined && (campaign.length > CAMPAIGN_MAX || !CAMPAIGN_RE.test(campaign))) {
    reasons.add('campaign_malformed');
  }

  const content = params.utm_content;
  if (content !== undefined && !CONTENT_RE.test(content)) reasons.add('content_malformed');

  const ordered = NONCONFORMITY_CODES.filter((c) => reasons.has(c));
  return { conform: ordered.length === 0, reasons: ordered };
}

export function slugifyBlock(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// month 'yyyy-mm' -> 'yyyymm'
export function composeCampaign(offre: string, cible: string, month: string): string {
  return `${slugifyBlock(offre)}_${slugifyBlock(cible)}_${month.replace('-', '')}`;
}

export const BASE_LINK_PATHS = ['/', '/services', '/simulateur', '/calculateur-roi', '/demo', '/avis'] as const;

export type LinkError =
  | 'offre_missing'
  | 'cible_missing'
  | 'month_invalid'
  | 'campaign_too_long'
  | 'content_invalid'
  | 'path_not_allowed'
  | 'origin_invalid';

export type TrackedUrlInput = {
  origin: string;
  path: string;
  source: UtmSource;
  medium: UtmMedium;
  offre: string;
  cible: string;
  month: string;
  content?: string;
  term?: string;
};

const MONTH_RE = /^20\d\d-(?:0[1-9]|1[0-2])$/;

export function buildTrackedUrl(
  input: TrackedUrlInput,
  allowedPaths: readonly string[],
):
  | { ok: true; url: string; campaign: string; params: AttrParams }
  | { ok: false; errors: LinkError[]; campaign: string } {
  const errors: LinkError[] = [];

  let originOk = false;
  try {
    const o = new URL(input.origin);
    originOk = o.protocol === 'https:' && o.origin === input.origin;
  } catch {
    originOk = false;
  }
  if (!originOk) errors.push('origin_invalid');

  if (!allowedPaths.includes(input.path)) errors.push('path_not_allowed');

  const offreSlug = slugifyBlock(input.offre);
  const cibleSlug = slugifyBlock(input.cible);
  if (!offreSlug) errors.push('offre_missing');
  if (!cibleSlug) errors.push('cible_missing');
  const monthOk = MONTH_RE.test(input.month);
  if (!monthOk) errors.push('month_invalid');

  const campaign = offreSlug && cibleSlug && monthOk ? composeCampaign(input.offre, input.cible, input.month) : '';
  if (campaign.length > CAMPAIGN_MAX) errors.push('campaign_too_long');

  let content: string | undefined;
  if (input.content !== undefined && input.content.trim() !== '') {
    content = slugifyBlock(input.content);
    if (!content) errors.push('content_invalid');
  }

  if (errors.length > 0) return { ok: false, errors, campaign };

  const params: AttrParams = {
    utm_source: input.source,
    utm_medium: input.medium,
    utm_campaign: campaign,
  };
  if (content) params.utm_content = content;
  if (input.source === 'google' && input.term !== undefined) {
    const term = input.term.trim().toLowerCase().slice(0, 200);
    if (term) params.utm_term = term;
  }

  // Defence in depth: the generator never emits a non-conformant link (D-05).
  const verdict = assessUtm(params);
  if (!verdict || !verdict.conform) return { ok: false, errors: ['content_invalid'], campaign };

  const url = new URL(input.path, input.origin);
  for (const k of UTM_KEYS) {
    const v = params[k];
    if (v !== undefined) url.searchParams.set(k, v);
  }
  return { ok: true, url: url.toString(), campaign, params };
}
