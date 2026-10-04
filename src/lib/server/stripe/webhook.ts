import 'server-only';
import Stripe from 'stripe';
import { webhookSecrets, type StripeMode } from './client';

// Vérification de signature (SDK, corps brut) et table pure événement -> registre.
// Logs : chaînes fixes uniquement, jamais d'identifiants ni de montants.

export const LEDGER_KINDS = [
  'processing',
  'paid',
  'failed',
  'expired',
  'partially_funded',
  'refund_requested',
  'refunded',
  'refund_failed',
  'anomaly',
] as const;

export type LedgerKind = (typeof LEDGER_KINDS)[number];

export type ApplyArgs = {
  p_event_id: string;
  p_type: string;
  p_livemode: boolean;
  p_object_id: string;
  p_kind: LedgerKind;
  p_invoice_id: string | null;
  p_customer_id: string | null;
  p_payment_intent_id: string | null;
  p_checkout_session_id: string | null;
  p_amount_cents: number | null;
  p_expected_cents: number | null;
  p_currency: string | null;
  p_method: 'card' | 'bank_transfer' | null;
  p_refund_id: string | null;
};

export function verifyStripeEvent(
  raw: string,
  signature: string | null,
  secrets: { mode: StripeMode; secret: string }[] = webhookSecrets(),
): { event: Stripe.Event; mode: StripeMode } | null {
  if (!signature || typeof raw !== 'string') return null;
  for (const { mode, secret } of secrets) {
    try {
      const event = Stripe.webhooks.constructEvent(raw, signature, secret);
      if (event.livemode !== (mode === 'live')) {
        console.error('[stripe/webhook] livemode_mismatch');
        return null;
      }
      return { event, mode };
    } catch {
      // essai du secret suivant
    }
  }
  console.error('[stripe/webhook] verify_failed');
  return null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function idOf(v: unknown): string | null {
  if (typeof v === 'string') return str(v);
  if (isObj(v)) return str(v.id);
  return null;
}

function cents(v: unknown): number | null {
  return typeof v === 'number' && Number.isSafeInteger(v) ? v : null;
}

function invoiceIdOf(o: Obj): string | null {
  const md = o.metadata;
  if (!isObj(md)) return null;
  const id = md.invoice_id;
  return typeof id === 'string' && UUID_RE.test(id) ? id : null;
}

function currencyOf(o: Obj): string | null {
  const c = str(o.currency);
  return c ? c.toLowerCase() : null;
}

export function toApplyArgs(event: Stripe.Event): ApplyArgs | null {
  const raw: unknown = event.data?.object;
  if (!isObj(raw)) return null;
  const o = raw;
  // cash_balance n'a pas d'id propre : on utilise le client.
  const objectId = str(o.id) ?? (event.type === 'cash_balance.funds_available' ? idOf(o.customer) : null);
  if (!objectId) return null;

  const base = {
    p_event_id: event.id,
    p_type: event.type,
    p_livemode: event.livemode === true,
    p_object_id: objectId,
    p_invoice_id: invoiceIdOf(o),
    p_customer_id: idOf(o.customer),
    p_payment_intent_id: null as string | null,
    p_checkout_session_id: null as string | null,
    p_amount_cents: null as number | null,
    p_expected_cents: null as number | null,
    p_currency: currencyOf(o),
    p_method: null as 'card' | 'bank_transfer' | null,
    p_refund_id: null as string | null,
  };

  switch (event.type as string) {
    case 'checkout.session.completed': {
      const status = o.payment_status;
      const total = cents(o.amount_total);
      const common = {
        ...base,
        p_payment_intent_id: idOf(o.payment_intent),
        p_checkout_session_id: objectId,
        p_expected_cents: total,
      };
      if (status === 'paid') {
        return { ...common, p_kind: 'paid', p_amount_cents: total, p_method: 'card' };
      }
      if (status === 'unpaid') {
        return { ...common, p_kind: 'processing', p_method: 'bank_transfer' };
      }
      return null;
    }
    case 'checkout.session.async_payment_succeeded': {
      const total = cents(o.amount_total);
      return {
        ...base,
        p_kind: 'paid',
        p_payment_intent_id: idOf(o.payment_intent),
        p_checkout_session_id: objectId,
        p_amount_cents: total,
        p_expected_cents: total,
        p_method: 'bank_transfer',
      };
    }
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      return {
        ...base,
        p_kind: event.type === 'checkout.session.expired' ? 'expired' : 'failed',
        p_payment_intent_id: idOf(o.payment_intent),
        p_checkout_session_id: objectId,
        p_expected_cents: cents(o.amount_total),
        p_method: event.type === 'checkout.session.expired' ? null : 'bank_transfer',
      };
    }
    case 'payment_intent.partially_funded': {
      const amount = cents(o.amount);
      const next = isObj(o.next_action) ? o.next_action : null;
      const dbti = next && isObj(next.display_bank_transfer_instructions) ? next.display_bank_transfer_instructions : null;
      const remaining = dbti ? cents(dbti.amount_remaining) : null;
      const funded = amount !== null && remaining !== null ? amount - remaining : null;
      return {
        ...base,
        p_kind: 'partially_funded',
        p_payment_intent_id: objectId,
        p_amount_cents: funded,
        p_expected_cents: amount,
        p_method: 'bank_transfer',
      };
    }
    case 'charge.refunded': {
      return {
        ...base,
        p_kind: 'refunded',
        p_payment_intent_id: idOf(o.payment_intent),
        p_amount_cents: cents(o.amount_refunded),
        p_expected_cents: cents(o.amount),
      };
    }
    case 'refund.failed': {
      return {
        ...base,
        p_kind: 'refund_failed',
        p_payment_intent_id: idOf(o.payment_intent),
        p_amount_cents: cents(o.amount),
        p_refund_id: objectId,
      };
    }
    case 'cash_balance.funds_available': {
      return { ...base, p_kind: 'anomaly', p_invoice_id: null, p_customer_id: idOf(o.customer) };
    }
    default:
      return null;
  }
}
