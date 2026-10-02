// Règles d'e-mail en code (D-17) : pas d'éditeur admin. Aucun e-mail prospect (D-19).
import 'server-only';

export const MAIL_EVENTS = ['client_invited', 'step_changed', 'onboarding_completed'] as const;
export type MailEvent = (typeof MAIL_EVENTS)[number];
export type MailTemplate = 'invite' | 'step_changed' | 'onboarding_completed';
export type Rule = { template: MailTemplate; delayMs: number; to: 'client' | 'admin' };

export const MAIL_RULES: Record<MailEvent, Rule> = {
  client_invited: { template: 'invite', delayMs: 0, to: 'client' },
  step_changed: { template: 'step_changed', delayMs: 0, to: 'client' },
  onboarding_completed: { template: 'onboarding_completed', delayMs: 0, to: 'admin' },
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
};
