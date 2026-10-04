// Module pur, sûr côté client. Règles de signabilité (D-01, D-04, D-17).
import { deriveProjectState, effectiveFacts, type Fact } from '@/lib/projects/steps';
import { DOC_STEP_GUARD, replacedByMap, SIGNING_FACT, type ChainDoc } from '@/lib/documents/steps';

export type SignableCode = 'not_signable_type' | 'replaced' | 'already_signed' | 'wrong_step';
export type SignableCheck = { ok: true } | { ok: false; code: SignableCode };

type SignableArgs = {
  doc: ChainDoc;
  docs: ChainDoc[];
  facts: Fact[];
  startedAt: string;
  hasSignature: boolean;
};

export function checkSignable({ doc, docs, facts, startedAt, hasSignature }: SignableArgs): SignableCheck {
  const signing = SIGNING_FACT[doc.docType];
  if (!signing) return { ok: false, code: 'not_signable_type' };
  if (replacedByMap(docs).has(doc.id)) return { ok: false, code: 'replaced' };
  if (hasSignature || effectiveFacts(facts).some((f) => f.type === signing)) {
    return { ok: false, code: 'already_signed' };
  }
  if (deriveProjectState(facts, startedAt).currentStep !== DOC_STEP_GUARD[doc.docType]) {
    return { ok: false, code: 'wrong_step' };
  }
  return { ok: true };
}

/** D-04 : membre du client ET section signataire de l'onboarding complète. */
export function signerMatches(a: {
  isMember: boolean;
  signatoryName: string | null;
  signatoryRole: string | null;
}): boolean {
  return a.isMember && !!a.signatoryName?.trim() && !!a.signatoryRole?.trim();
}

export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';
  return `${email[0]}***${email.slice(at)}`;
}
