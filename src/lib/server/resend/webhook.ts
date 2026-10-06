import 'server-only';
import { Resend } from 'resend';
import { normalizeEmail } from '@/lib/server/mail/unsubscribeToken';

// Vérification Svix (SDK Resend, corps brut) et table pure événement -> RPC.
// Logs : chaînes fixes uniquement, jamais d'adresse, de jeton ni d'identifiant.

export type ResendEvent = { type: string; data?: unknown; [k: string]: unknown };

export type ApplyArgs = {
  p_event_id: string;
  p_event_type: 'email.bounced' | 'email.complained';
  p_emails: string[];
  p_bounce_type: string | null;
};

const MAX_RECIPIENTS = 50;
const MAX_EMAIL = 254;
// Le compte Resend est partagé avec d'autres domaines : seuls les envois Sèvalys comptent.
const OWN_SENDER_DOMAIN = 'sevalys.com';

export function resendWebhookSecret(env: Record<string, string | undefined> = process.env): string | null {
  const v = env.RESEND_WEBHOOK_SECRET;
  return typeof v === 'string' && v.startsWith('whsec_') && v.length > 'whsec_'.length ? v : null;
}

export function verifyResendEvent(
  raw: string,
  headers: { id: string; timestamp: string; signature: string },
  secret: string,
): ResendEvent | null {
  if (typeof raw !== 'string' || !headers || !headers.id || !headers.timestamp || !headers.signature) {
    return null;
  }
  try {
    // verify() ne fait aucun appel API ; la clé fixe évite seulement l'erreur "Missing API key".
    const resend = new Resend(process.env.RESEND_API_KEY || 're_verify_only');
    const event = resend.webhooks.verify({
      payload: raw,
      headers: { id: headers.id, timestamp: headers.timestamp, signature: headers.signature },
      webhookSecret: secret,
    });
    return event as unknown as ResendEvent;
  } catch {
    console.error('[resend/webhook] verify_failed');
    return null;
  }
}

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function recipients(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out = new Set<string>();
  for (const item of v.slice(0, MAX_RECIPIENTS)) {
    if (typeof item !== 'string') continue;
    const e = normalizeEmail(item);
    if (e.length > MAX_EMAIL || !e.includes('@')) continue;
    out.add(e);
  }
  return [...out];
}

export function isOwnSender(from: unknown): boolean {
  if (typeof from !== 'string') return false;
  const m = from.match(/<([^<>]+)>\s*$/);
  const addr = normalizeEmail(m ? m[1] : from);
  return addr.endsWith('@' + OWN_SENDER_DOMAIN);
}

export function toApplyArgs(eventId: string, event: unknown): ApplyArgs | null {
  if (!isObj(event) || !str(eventId)) return null;
  const type = event.type;
  if (type !== 'email.bounced' && type !== 'email.complained') return null;
  const data = event.data;
  if (!isObj(data)) return null;
  if (!isOwnSender(data.from)) return null;

  let bounceType: string | null = null;
  if (type === 'email.bounced') {
    const bounce = data.bounce;
    // Seuls les rebonds permanents suppriment (décision A1).
    if (!isObj(bounce) || bounce.type !== 'Permanent') return null;
    bounceType = 'Permanent';
  }

  const emails = recipients(data.to);
  if (emails.length === 0) return null;
  return { p_event_id: eventId, p_event_type: type, p_emails: emails, p_bounce_type: bounceType };
}
