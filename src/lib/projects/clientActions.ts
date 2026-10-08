// Actions que le client doit faire, affichées dans le panneau « En attente de » : pur, sans accès base.
// Module sûr côté client. Les libellés viennent de copy.ts.
import { PROJECT_COPY } from './copy';
import type { ProjectState } from './steps';

export type ClientAction = { kind: 'anchor' | 'link'; href: string; label: string };

type SignableType = 'quote' | 'contract' | 'acceptance';
const SIGNABLE: readonly string[] = ['quote', 'contract', 'acceptance'];

export type ClientActionInput = {
  state: ProjectState;
  onboardingComplete: boolean;
  /** Documents au statut « à signer » (déjà dérivé des faits). */
  toSignDocs: { id: string; docType: string }[];
  /** Factures au statut « à payer ». */
  toPayInvoices: { kind: string }[];
};

export const ONBOARDING_ANCHOR = '#onboarding';
export const DOCUMENTS_HREF = '/espace-client/documents';
export const PAYMENTS_HREF = '/espace-client/paiements';

export function buildClientActions(input: ClientActionInput): ClientAction[] {
  const { state } = input;
  if (state.done || state.waitingOn !== 'client') return [];
  const who = PROJECT_COPY.whoWaits;
  const out: ClientAction[] = [];

  if (state.currentStep === 1 && !input.onboardingComplete) {
    out.push({ kind: 'anchor', href: ONBOARDING_ANCHOR, label: who.cta });
  }

  const docs = input.toSignDocs.filter((d) => SIGNABLE.includes(d.docType));
  if (docs.length === 1) {
    const d = docs[0];
    out.push({
      kind: 'link',
      href: `${DOCUMENTS_HREF}/${d.id}/signer`,
      label: PROJECT_COPY.signature.titles[d.docType as SignableType],
    });
  } else if (docs.length > 1) {
    out.push({ kind: 'link', href: DOCUMENTS_HREF, label: who.openDocuments });
  }

  const pay = PROJECT_COPY.payments.portal;
  if (input.toPayInvoices.length === 1) {
    const kind = input.toPayInvoices[0].kind;
    out.push({
      kind: 'link',
      href: PAYMENTS_HREF,
      label: kind === 'deposit' ? pay.payDeposit : kind === 'final' ? pay.payBalance : pay.payInvoice,
    });
  } else if (input.toPayInvoices.length > 1) {
    out.push({ kind: 'link', href: PAYMENTS_HREF, label: who.openPayments });
  }

  return out;
}
