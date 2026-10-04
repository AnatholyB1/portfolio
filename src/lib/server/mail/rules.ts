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
] as const;
export type MailEvent = (typeof MAIL_EVENTS)[number];
export type MailTemplate =
  | 'invite'
  | 'step_changed'
  | 'onboarding_completed'
  | 'document_issued'
  | 'document_signed'
  | 'document_signed_admin'
  | 'acceptance_refused';
export type Rule = { template: MailTemplate; delayMs: number; to: 'client' | 'admin' };

export const MAIL_RULES: Record<MailEvent, Rule> = {
  client_invited: { template: 'invite', delayMs: 0, to: 'client' },
  step_changed: { template: 'step_changed', delayMs: 0, to: 'client' },
  onboarding_completed: { template: 'onboarding_completed', delayMs: 0, to: 'admin' },
  document_issued: { template: 'document_issued', delayMs: 0, to: 'client' },
  document_signed: { template: 'document_signed', delayMs: 0, to: 'client' },
  document_signed_admin: { template: 'document_signed_admin', delayMs: 0, to: 'admin' },
  acceptance_refused: { template: 'acceptance_refused', delayMs: 0, to: 'admin' },
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
};
