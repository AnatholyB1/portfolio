// Outbox idempotente (D-17, D-18, MAIL-02) : insert ON CONFLICT DO NOTHING,
// claim atomique pending->sending, envoi Resend avec idempotencyKey, puis sent/failed.
// Jamais d'adresse e-mail dans les logs ni dans last_error (codes courts seulement).
import 'server-only';
import { Resend } from 'resend';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { callRpc } from '@/lib/server/rpc';
import { INVITE_EMAIL_FROM, INVITE_EMAIL_REPLY_TO, buildInviteEmail } from './inviteEmail';
import { buildStepChangedEmail } from './stepChangedEmail';
import { buildOnboardingCompletedEmail } from './onboardingCompletedEmail';
import { buildDocumentIssuedEmail } from './documentIssuedEmail';
import {
  buildAcceptanceRefusedAdminEmail,
  buildDocumentSignedAdminEmail,
  buildDocumentSignedEmail,
} from './documentSignedEmail';
import {
  creditNoteIssuedEmail,
  paymentAnomalyAdminEmail,
  paymentReceivedEmail,
  paymentReminderAdminEmail,
  paymentReminderEmail,
  paymentRequestEmail,
} from './paymentEmails';
import {
  buildAdminProjectUrl,
  buildLoginUrl,
  buildPortalDocumentsUrl,
  buildPortalUrl,
} from './urls';
import { MAIL_RULES, type MailEvent, type MailTemplate } from './rules';

const TABLE = 'sv_mail_outbox';

export type OutboxRow = {
  id: string;
  event_type: string;
  template: MailTemplate;
  recipient_email: string;
  recipient_kind: 'client' | 'admin';
  dedupe_key: string;
  payload: Record<string, unknown> | null;
  client_id: string | null;
  project_id: string | null;
  send_after: string;
  status: string;
  attempts: number;
};

export type EnqueueInput = {
  event: MailEvent;
  recipientEmail: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
  clientId?: string;
  projectId?: string;
};

export type BuiltMail = {
  from: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function cents(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('invalid_amount');
  return v;
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T {
  if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) return v as T;
  throw new Error('invalid_payload');
}

export function buildMail(row: OutboxRow): BuiltMail {
  const p = row.payload ?? {};
  let mail: { subject: string; html: string; text: string };
  switch (row.template) {
    case 'invite':
      mail = buildInviteEmail({
        clientName: str(p.clientName),
        loginUrl: buildLoginUrl(row.recipient_email),
      });
      break;
    case 'step_changed':
      mail = buildStepChangedEmail({
        stepName: str(p.stepName),
        expectedAction: str(p.expectedAction),
        portalUrl: buildPortalUrl(),
      });
      break;
    case 'onboarding_completed':
      mail = buildOnboardingCompletedEmail({
        companyName: str(p.companyName),
        projectTitle: str(p.projectTitle),
        adminUrl: buildAdminProjectUrl(row.project_id ?? ''),
      });
      break;
    case 'document_issued':
      mail = buildDocumentIssuedEmail({
        documentLabel: str(p.documentLabel),
        projectTitle: str(p.projectTitle),
        revision: typeof p.revision === 'number' ? p.revision : 1,
        portalUrl: buildPortalDocumentsUrl(),
      });
      break;
    case 'document_signed':
      mail = buildDocumentSignedEmail({
        documentLabel: str(p.documentLabel),
        projectTitle: str(p.projectTitle),
        signedDate: str(p.signedDate),
        signedTime: str(p.signedTime),
        portalUrl: buildPortalDocumentsUrl(),
      });
      break;
    case 'document_signed_admin':
      mail = buildDocumentSignedAdminEmail({
        documentLabel: str(p.documentLabel),
        projectTitle: str(p.projectTitle),
        clientName: str(p.clientName),
        reference: str(p.reference),
        signedDate: str(p.signedDate),
        signedTime: str(p.signedTime),
        reservedCount: typeof p.reservedCount === 'number' ? p.reservedCount : 0,
        adminUrl: buildAdminProjectUrl(row.project_id ?? ''),
      });
      break;
    case 'acceptance_refused': {
      const refused = Array.isArray(p.refused)
        ? p.refused.map((r: unknown) => {
            const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
            return {
              index: typeof o.index === 'number' ? o.index : undefined,
              criterion: str(o.criterion),
              note: str(o.note),
            };
          })
        : [];
      mail = buildAcceptanceRefusedAdminEmail({
        projectTitle: str(p.projectTitle),
        clientName: str(p.clientName),
        refused,
        refusedCount: typeof p.refusedCount === 'number' ? p.refusedCount : refused.length,
        adminUrl: buildAdminProjectUrl(row.project_id ?? ''),
      });
      break;
    }
    case 'payment_requested':
      mail = paymentRequestEmail({
        invoiceNumber: str(p.invoiceNumber),
        kind: oneOf(p.kind, ['deposit', 'period', 'final'] as const),
        amountCents: cents(p.amountCents),
        projectTitle: str(p.projectTitle),
        periodStart: str(p.periodStart) || null,
        periodEnd: str(p.periodEnd) || null,
      });
      break;
    case 'payment_received':
      mail = paymentReceivedEmail({
        invoiceNumber: str(p.invoiceNumber),
        amountCents: cents(p.amountCents),
        projectTitle: str(p.projectTitle),
        kind: str(p.kind),
      });
      break;
    case 'payment_reminder':
      mail = paymentReminderEmail({
        invoiceNumber: str(p.invoiceNumber),
        amountCents: cents(p.amountCents),
        projectTitle: str(p.projectTitle),
        stage: oneOf(p.stage, ['d3', 'd7'] as const),
      });
      break;
    case 'payment_reminder_admin':
      mail = paymentReminderAdminEmail({
        invoiceNumber: str(p.invoiceNumber),
        amountCents: cents(p.amountCents),
        projectTitle: str(p.projectTitle),
        clientName: str(p.clientName),
        issuedOn: str(p.issuedOn),
        projectId: str(p.projectId) || (row.project_id ?? ''),
      });
      break;
    case 'payment_anomaly_admin':
      mail = paymentAnomalyAdminEmail({
        invoiceNumber: str(p.invoiceNumber) || null,
        amountCents: cents(p.amountCents),
        expectedCents: typeof p.expectedCents === 'number' ? p.expectedCents : 0,
        projectTitle: str(p.projectTitle),
        projectId: str(p.projectId) || (row.project_id ?? ''),
        detail: str(p.detail),
      });
      break;
    case 'credit_note_issued':
      mail = creditNoteIssuedEmail({
        creditNoteNumber: str(p.creditNoteNumber),
        invoiceNumber: str(p.invoiceNumber),
        amountCents: cents(p.amountCents),
        projectTitle: str(p.projectTitle),
        refundRequested: p.refundRequested === true,
      });
      break;
    default:
      throw new Error('unknown_template');
  }
  return { from: INVITE_EMAIL_FROM, replyTo: INVITE_EMAIL_REPLY_TO, ...mail };
}

export async function enqueueMail(
  input: EnqueueInput,
): Promise<{ id: string | null; inserted: boolean }> {
  const rule = MAIL_RULES[input.event];
  const sb = createSupabaseAdminClient();
  const row = {
    event_type: input.event,
    template: rule.template,
    recipient_email: input.recipientEmail.toLowerCase(),
    recipient_kind: rule.to,
    dedupe_key: input.dedupeKey,
    payload: input.payload,
    client_id: input.clientId ?? null,
    project_id: input.projectId ?? null,
    send_after: new Date(Date.now() + rule.delayMs).toISOString(),
    status: 'pending',
  };
  const ins = await sb
    .from(TABLE)
    .upsert(row, { onConflict: 'dedupe_key', ignoreDuplicates: true })
    .select('id');
  if (ins.error) {
    console.error('[mail/outbox] enqueue failed');
    return { id: null, inserted: false };
  }
  const created = Array.isArray(ins.data) ? ins.data[0] : null;
  if (created && typeof created.id === 'string') return { id: created.id, inserted: true };

  const existing = await sb.from(TABLE).select('id').eq('dedupe_key', input.dedupeKey).maybeSingle();
  const id = existing.data && typeof existing.data.id === 'string' ? existing.data.id : null;
  return { id, inserted: false };
}

async function markRow(id: string, patch: Record<string, unknown>): Promise<void> {
  try {
    await createSupabaseAdminClient().from(TABLE).update(patch).eq('id', id);
  } catch {
    console.error('[mail/outbox] status update failed');
  }
}

async function deliver(row: OutboxRow): Promise<'sent' | 'failed'> {
  const fail = async (code: string) => {
    await markRow(row.id, { status: 'failed', last_error: code });
    console.error(`[mail/outbox] ${row.template} ${code}`);
    return 'failed' as const;
  };

  if (!process.env.RESEND_API_KEY) return fail('no_api_key');

  let mail: BuiltMail;
  try {
    mail = buildMail(row);
  } catch {
    return fail('render_error');
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send(
      {
        from: mail.from,
        to: row.recipient_email,
        replyTo: mail.replyTo,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      },
      { idempotencyKey: row.dedupe_key },
    );
    if (result.error) return fail('resend_error');
    await markRow(row.id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
      provider_id: result.data?.id ?? null,
      last_error: null,
    });
    return 'sent';
  } catch {
    return fail('exception');
  }
}

export async function sendOutboxRow(id: string): Promise<'sent' | 'failed' | 'not_claimed'> {
  const sb = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const cur = await sb.from(TABLE).select('attempts').eq('id', id).maybeSingle();
  if (cur.error || !cur.data) return 'not_claimed';
  const attempts = typeof cur.data.attempts === 'number' ? cur.data.attempts : 0;

  // Claim atomique : filtre sur statut, échéance et compteur d'essais lu.
  const claimed = await sb
    .from(TABLE)
    .update({ status: 'sending', attempts: attempts + 1, claimed_at: now })
    .eq('id', id)
    .eq('attempts', attempts)
    .in('status', ['pending', 'failed'])
    .lte('send_after', now)
    .select()
    .maybeSingle();
  if (claimed.error || !claimed.data) return 'not_claimed';

  return deliver(claimed.data as OutboxRow);
}

export async function enqueueAndSend(
  input: EnqueueInput,
): Promise<'sent' | 'pending' | 'failed' | 'duplicate'> {
  try {
    const { id, inserted } = await enqueueMail(input);
    if (!id) return 'failed';
    if (!inserted) return 'duplicate';
    const out = await sendOutboxRow(id);
    return out === 'not_claimed' ? 'pending' : out;
  } catch {
    console.error('[mail/outbox] enqueueAndSend failed');
    return 'failed';
  }
}

export async function processDueMail(
  limit = 25,
): Promise<{ claimed: number; sent: number; failed: number }> {
  const res = await callRpc<OutboxRow[]>('mail/outbox', 'sv_claim_due_mail', { p_limit: limit });
  if (!res.ok || !Array.isArray(res.data)) return { claimed: 0, sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  for (const row of res.data) {
    try {
      if ((await deliver(row)) === 'sent') sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { claimed: res.data.length, sent, failed };
}
