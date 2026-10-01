import 'server-only';
import type { EmailOtpType } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { loginEmailSchema } from '@/lib/auth/schemas';
import {
  LOGIN_EMAIL_FROM,
  LOGIN_EMAIL_REPLY_TO,
  buildLoginCodeEmail,
} from '@/lib/server/mail/loginCodeEmail';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getOtpExpiryMinutes, getSiteUrl, isLoginEnabled } from '@/lib/supabase/env';
import { hashKey, hitThrottle } from './throttle';

// Émission du code de connexion (FOUND-01, FOUND-02, D-09, D-10).
// Amendement D-06 : la porte d'entrée est la fonction SQL sv_login_allowed (tables de rôles) ;
// l'envoi passe par notre propre e-mail Resend, jamais par le modèle/SMTP Supabase partagé
// avec Ziko/Gecko. Aucun compte n'est créé à la connexion.

// Valeur provisoire (hypothèse A1), confirmée par le spike de branche du plan 10-07
// et réconciliée par le plan 10-10 Task 1. Source unique pour le lien de secours
// (`type=`) et pour les appels verifyOtp du plan 10-10.
export const LOGIN_VERIFY_TYPES: { code: EmailOtpType; link: EmailOtpType } = {
  code: 'email',
  link: 'email',
};

// Limites (au choix de Claude, fenêtre de 15 minutes).
const WINDOW_SECONDS = 900;
const LOGIN_EMAIL_MAX = 5;
const LOGIN_IP_MAX = 20;
const VERIFY_EMAIL_MAX = 10;
const VERIFY_IP_MAX = 30;

export type RequestCodeResult = { status: 'sent' } | { status: 'invalid' } | { status: 'rate_limited' };

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Ne lève jamais ; ne journalise ni code, ni jeton, ni e-mail. */
export async function issueLoginCode(email: string): Promise<void> {
  try {
    if (!isLoginEnabled()) return;

    const admin = createSupabaseAdminClient();
    const allowed = await admin.rpc('sv_login_allowed', { p_email: email });
    if (allowed.error) {
      console.error('[auth/login] gate check failed');
      return;
    }
    if (allowed.data !== true) return;

    const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (link.error || !link.data?.properties) {
      console.error('[auth/login] link generation failed');
      return;
    }
    const { email_otp: code, hashed_token: tokenHash } = link.data.properties;
    if (typeof code !== 'string' || !/^\d{6}$/.test(code) || !tokenHash) {
      console.error('[auth/login] unexpected link payload');
      return;
    }

    const confirmUrl =
      `${getSiteUrl()}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}` +
      `&type=${LOGIN_VERIFY_TYPES.link}`;
    const { subject, html, text } = buildLoginCodeEmail({
      code,
      link: confirmUrl,
      expiryMinutes: getOtpExpiryMinutes(),
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const sent = await resend.emails.send({
      from: LOGIN_EMAIL_FROM,
      replyTo: LOGIN_EMAIL_REPLY_TO,
      to: email,
      subject,
      html,
      text,
    });
    if (sent.error) console.error('[auth/login] mail send failed');
  } catch {
    console.error('[auth/login] unexpected failure');
  }
}

/**
 * Valide, applique la limitation de débit, puis diffère l'émission via `schedule`
 * (le Server Action passe `after` de Next) : réponse identique et durée constante
 * pour adresse invitée, inconnue ou connexion désactivée (D-09).
 */
export async function requestLoginCode(
  input: { email: unknown; ip: string | null },
  schedule: (task: () => Promise<void>) => void,
): Promise<RequestCodeResult> {
  const parsed = loginEmailSchema.safeParse({ email: input.email });
  if (!parsed.success) return { status: 'invalid' };
  const email = parsed.data.email;

  const emailOk = await hitThrottle(hashKey('login-email', email), WINDOW_SECONDS, LOGIN_EMAIL_MAX);
  const ipOk = input.ip
    ? await hitThrottle(hashKey('login-ip', input.ip), WINDOW_SECONDS, LOGIN_IP_MAX)
    : true;
  if (!emailOk || !ipOk) return { status: 'rate_limited' };

  schedule(() => issueLoginCode(email));
  return { status: 'sent' };
}

/** true = vérification autorisée. */
export async function checkVerifyThrottle(email: string, ip: string | null): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const emailOk = await hitThrottle(hashKey('verify-email', normalized), WINDOW_SECONDS, VERIFY_EMAIL_MAX);
  const ipOk = ip ? await hitThrottle(hashKey('verify-ip', ip), WINDOW_SECONDS, VERIFY_IP_MAX) : true;
  return emailOk && ipOk;
}
