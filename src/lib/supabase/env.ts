// Lecture centralisée des variables d'environnement Supabase / auth.
// Pas d'import `server-only` : le helper du proxy utilise les getters publics.
// Les messages d'erreur nomment la variable fautive, jamais sa valeur.

type Env = Record<string, string | undefined>;

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`[supabase/env] variable manquante : ${name}`);
  return value;
}

export function getSupabaseUrl(env: Env = process.env): string {
  return required('NEXT_PUBLIC_SUPABASE_URL', env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabasePublicKey(env: Env = process.env): string {
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', key);
}

export function getSupabaseSecretKey(env: Env = process.env): string {
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  return required('SUPABASE_SECRET_KEY', key);
}

function jwtRole(key: string): string | null {
  if (!key.startsWith('eyJ')) return null;
  const segment = key.split('.')[1];
  if (!segment) return null;
  try {
    const payload = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

/**
 * Vérifie la cohérence des clés (D-18) : pas de mode mixte, pas de clé
 * secrète dans le slot public. Lève une erreur sinon.
 */
export function assertSupabaseKeyMode(env: Env = process.env): 'modern' | 'legacy' {
  getSupabaseUrl(env);
  const pub = getSupabasePublicKey(env);
  const secret = getSupabaseSecretKey(env);

  if (pub.startsWith('sb_secret_') || jwtRole(pub) === 'service_role') {
    throw new Error('[supabase/env] clé secrète détectée dans le slot public (NEXT_PUBLIC_*)');
  }

  const pubModern = pub.startsWith('sb_publishable_');
  const pubLegacy = pub.startsWith('eyJ');
  const secretModern = secret.startsWith('sb_secret_');
  const secretLegacy = secret.startsWith('eyJ');

  if (pubModern && secretModern) return 'modern';
  if (pubLegacy && secretLegacy) return 'legacy';
  throw new Error(
    '[supabase/env] modes de clés mixtes ou format inconnu : utiliser publishable + secret, ou anon + service_role',
  );
}

export function isLoginEnabled(env: Env = process.env): boolean {
  return env.SV_LOGIN_ENABLED === 'true';
}

export function getOtpExpiryMinutes(env: Env = process.env): number | null {
  const raw = env.SV_OTP_EXPIRY_MINUTES;
  if (!raw || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function getSiteUrl(env: Env = process.env): string {
  return (env.NEXT_PUBLIC_SITE_URL || 'https://sevalys.com').replace(/\/+$/, '');
}
