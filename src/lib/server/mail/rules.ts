// Règles d'e-mail en code (D-17) : pas d'éditeur admin. Aucun e-mail prospect (D-19).
import 'server-only';

export const MAIL_EVENTS = [
  'client_invited',
  'step_changed',
  'onboarding_completed',
  'document_issued',
  'document_signed',
  'document_signed_admin',
  'acceptance_refused',
  'payment_requested',
  'payment_received',
  'payment_reminder',
  'payment_reminder_admin',
  'payment_anomaly_admin',
  'credit_note_issued',
] as const;
export type MailEvent = (typeof MAIL_EVENTS)[number];
export type MailTemplate =
  | 'invite'
  | 'step_changed'
  | 'onboarding_completed'
  | 'document_issued'
  | 'document_signed'
  | 'document_signed_admin'
  | 'acceptance_refused'
  | 'payment_requested'
  | 'payment_received'
  | 'payment_reminder'
  | 'payment_reminder_admin'
  | 'payment_anomaly_admin'
  | 'credit_note_issued';
export type Rule = { template: MailTemplate; delayMs: number; to: 'client' | 'admin' };

export const MAIL_RULES: Record<MailEvent, Rule> = {
  client_invited: { template: 'invite', delayMs: 0, to: 'client' },
  step_changed: { template: 'step_changed', delayMs: 0, to: 'client' },
  onboarding_completed: { template: 'onboarding_completed', delayMs: 0, to: 'admin' },
  document_issued: { template: 'document_issued', delayMs: 0, to: 'client' },
  document_signed: { template: 'document_signed', delayMs: 0, to: 'client' },
  document_signed_admin: { template: 'document_signed_admin', delayMs: 0, to: 'admin' },
  acceptance_refused: { template: 'acceptance_refused', delayMs: 0, to: 'admin' },
  payment_requested: { template: 'payment_requested', delayMs: 0, to: 'client' },
  payment_received: { template: 'payment_received', delayMs: 0, to: 'client' },
  payment_reminder: { template: 'payment_reminder', delayMs: 0, to: 'client' },
  payment_reminder_admin: { template: 'payment_reminder_admin', delayMs: 0, to: 'admin' },
  payment_anomaly_admin: { template: 'payment_anomaly_admin', delayMs: 0, to: 'admin' },
  credit_note_issued: { template: 'credit_note_issued', delayMs: 0, to: 'client' },
};

export const ADMIN_NOTIFY_EMAIL = 'contact@sevalys.com';

const MAX_KEY = 256;
const clamp = (k: string) => (k.length <= MAX_KEY ? k : k.slice(0, MAX_KEY));
const norm = (e: string) => e.toLowerCase();

export const dedupeKey = {
  clientInvited(clientId: string, email: string, resendN?: number): string {
    const suffix = resendN ? `:resend:${resendN}` : '';
    const base = `client_invited:${clientId}:${norm(email)}`;
    return clamp(base.slice(0, MAX_KEY - suffix.length) + suffix);
  },
  stepChanged(factId: string, email: string): string {
    return clamp(`step_changed:${factId}:${norm(email)}`);
  },
  onboardingCompleted(projectId: string, email: string): string {
    return clamp(`onboarding_completed:${projectId}:${norm(email)}`);
  },
  documentIssued(documentId: string, email: string): string {
    return clamp(`document_issued:${documentId}:${norm(email)}`);
  },
  documentSigned(documentId: string, email: string): string {
    return clamp(`document_signed:${documentId}:${norm(email)}`);
  },
  documentSignedAdmin(documentId: string): string {
    return clamp(`document_signed_admin:${documentId}`);
  },
  acceptanceRefused(submissionId: string): string {
    return clamp(`acceptance_refused:${submissionId}`);
  },
  paymentRequested(invoiceId: string, email: string): string {
    return clamp(`payment_requested:${invoiceId}:${norm(email)}`);
  },
  paymentReceived(invoiceId: string, email: string): string {
    return clamp(`payment_received:${invoiceId}:${norm(email)}`);
  },
  paymentReminder(invoiceId: string, stage: 'd3' | 'd7', email: string): string {
    return clamp(`payment_reminder:${invoiceId}:${stage}:${norm(email)}`);
  },
  paymentReminderAdmin(invoiceId: string): string {
    return clamp(`payment_reminder_admin:${invoiceId}:d14`);
  },
  paymentAnomalyAdmin(stripeEventId: string): string {
    return clamp(`payment_anomaly_admin:${stripeEventId}`);
  },
  creditNoteIssued(creditNoteId: string, email: string): string {
    return clamp(`credit_note_issued:${creditNoteId}:${norm(email)}`);
  },
};
