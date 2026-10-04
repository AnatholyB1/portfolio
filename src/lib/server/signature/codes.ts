import 'server-only';
import { createHmac, randomInt } from 'node:crypto';
import { Resend } from 'resend';
import { callRpc } from '@/lib/server/rpc';
import {
  buildSignatureCodeEmail,
  SIGNATURE_EMAIL_FROM,
  SIGNATURE_EMAIL_REPLY_TO,
} from '@/lib/server/mail/signatureCodeEmail';

export const SIGNATURE_CODE_TTL_MINUTES = 10;

const SCOPE = 'signature/codes';

/** Code à 6 chiffres (zéros initiaux conservés), tiré via crypto.randomInt. */
export function newSignatureCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** HMAC-SHA256(secret, `${documentId}:${userId}:${code}`) en hexadécimal. */
export function signatureCodeHmac(secret: string, documentId: string, userId: string, code: string): string {
  return createHmac('sha256', secret).update(`${documentId}:${userId}:${code}`).digest('hex');
}

const RAISED_CODES: Record<string, string> = {
  sv_document_superseded: 'superseded',
  sv_document_signed: 'already_signed',
  sv_document_not_signable: 'not_signable',
  sv_not_client_member: 'not_member',
  sv_signatory_incomplete: 'signatory_incomplete',
  sv_consent_missing: 'consent_missing',
  sv_acceptance_missing: 'acceptance_missing',
  sv_acceptance_refused: 'acceptance_refused',
};

function mapRaised(code: string): string {
  return RAISED_CODES[code] ?? 'unknown';
}

export type RequestCodeResult =
  | { ok: true; codeId: string; expiresAt: string; sendsLeft: number }
  | { ok: false; code: 'too_soon'; retryAfterS: number }
  | { ok: false; code: string };

interface RequestRpcData {
  ok: boolean;
  reason?: string;
  code_id?: string;
  expires_at?: string;
  sends_left?: number;
  retry_after_s?: number;
}

export async function requestSignatureCode(a: {
  documentId: string;
  userId: string;
  email: string;
  ip: string | null;
  consentVersion: string;
  documentLabel: string;
}): Promise<RequestCodeResult> {
  const secret = process.env.SV_SIGNATURE_CODE_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  if (!secret || !apiKey) {
    console.error(`[${SCOPE}] not configured`);
    return { ok: false, code: 'not_configured' };
  }

  const code = newSignatureCode();
  const codeHmac = signatureCodeHmac(secret, a.documentId, a.userId, code);

  const rpc = await callRpc<RequestRpcData>(SCOPE, 'sv_request_signature_code', {
    p_document_id: a.documentId,
    p_actor_id: a.userId,
    p_ip: a.ip,
    p_code_hmac: codeHmac,
    p_consent_version: a.consentVersion,
  });
  if (!rpc.ok) return { ok: false, code: mapRaised(rpc.code) };

  const data = rpc.data;
  if (!data || data.ok !== true) {
    if (data?.reason === 'too_soon') {
      return { ok: false, code: 'too_soon', retryAfterS: Number(data.retry_after_s ?? 0) };
    }
    if (data?.reason === 'hourly_cap') return { ok: false, code: 'hourly_cap' };
    return { ok: false, code: 'unknown' };
  }

  const codeId = String(data.code_id);
  const expiresAt = String(data.expires_at);
  const sendsLeft = Number(data.sends_left ?? 0);

  const markFailed = async () => {
    await callRpc(SCOPE, 'sv_log_code_send_failed', { p_code_id: codeId, p_ip: a.ip });
  };

  try {
    const mail = buildSignatureCodeEmail({
      code,
      documentLabel: a.documentLabel,
      expiryMinutes: SIGNATURE_CODE_TTL_MINUTES,
    });
    const resend = new Resend(apiKey);
    const result = await resend.emails.send(
      {
        from: SIGNATURE_EMAIL_FROM,
        to: a.email,
        replyTo: SIGNATURE_EMAIL_REPLY_TO,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      },
      { idempotencyKey: codeId },
    );
    if (result.error) {
      console.error(`[${SCOPE}] send failed`);
      await markFailed();
      return { ok: false, code: 'send_failed' };
    }
  } catch {
    console.error(`[${SCOPE}] send failed`);
    await markFailed();
    return { ok: false, code: 'send_failed' };
  }

  return { ok: true, codeId, expiresAt, sendsLeft };
}

export type VerifyCodeResult =
  | { ok: true; alreadySigned: boolean; signedAtUtc?: string; linkHash?: string }
  | { ok: false; code: string; remaining?: number };

interface VerifyRpcData {
  ok: boolean;
  already_signed?: boolean;
  signed_at_utc?: string;
  link_hash?: string;
  reason?: string;
  remaining?: number;
}

export async function verifySignatureCode(a: {
  documentId: string;
  userId: string;
  ip: string | null;
  code: string;
}): Promise<VerifyCodeResult> {
  if (!/^[0-9]{6}$/.test(a.code)) return { ok: false, code: 'invalid_format' };

  const secret = process.env.SV_SIGNATURE_CODE_SECRET;
  if (!secret) {
    console.error(`[${SCOPE}] not configured`);
    return { ok: false, code: 'not_configured' };
  }

  const rpc = await callRpc<VerifyRpcData>(SCOPE, 'sv_verify_signature_code', {
    p_document_id: a.documentId,
    p_actor_id: a.userId,
    p_ip: a.ip,
    p_code_hmac: signatureCodeHmac(secret, a.documentId, a.userId, a.code),
  });
  if (!rpc.ok) return { ok: false, code: mapRaised(rpc.code) };

  const d = rpc.data;
  if (d && d.ok === true) {
    return {
      ok: true,
      alreadySigned: d.already_signed === true,
      signedAtUtc: d.signed_at_utc,
      linkHash: d.link_hash,
    };
  }
  const out: VerifyCodeResult = { ok: false, code: d?.reason ?? 'unknown' };
  if (typeof d?.remaining === 'number') out.remaining = d.remaining;
  return out;
}
