// src/lib/simulateur/submit.ts
//
// This module is the single integration seam between all new Phase 7
// frontend code and the simulator backend (src/app/api/simulateur/route.ts),
// which since phase 11 writes to sv_leads via the sv_ingest_lead RPC (attribution
// comes from cookies server-side, never from this payload). It must never hand-type a second
// payload interface — ProspectSubmission from src/lib/prospects-schema.ts
// is the only type allowed to describe the request body, because a
// duplicate would silently drift from the server's .min(2)/.max(4) and
// z.literal(true) constraints.
//
// The visual gauge score (computeVisualScore) is deliberately absent from
// this payload — SIMU-03: purely visual, never stored as a metric. Adding
// it here is an explicit anti-pattern flagged by 07-RESEARCH.md.

import { prospectSchema, type ProspectSubmission } from '@/lib/prospects-schema';
import { computeRecommendedServices } from './scoring';
import type { Answer } from './questions';

export interface ContactDetails {
  nom: string;
  email: string;
  telephone: string;
}

/**
 * Cheap, side-effect-free predicate the Wizard's submit button binds its
 * `disabled` state to. Mirrors (but does not replace) the server-side
 * validation in prospectSchema — this is a UX gate, not the security
 * boundary.
 */
export function canSubmit(input: {
  contact: ContactDetails;
  consent: boolean;
  answers: Answer[];
}): boolean {
  const { contact, consent, answers } = input;
  return (
    consent === true &&
    contact.nom.trim().length > 0 &&
    contact.email.trim().length > 0 &&
    contact.telephone.trim().length > 0 &&
    answers.length >= 1
  );
}

/**
 * Assembles the exact prospectSchema shape from wizard state.
 *
 * SIMU-05 / T-07-09: throws unless consent is exactly `true`, so no code
 * path can accidentally POST an unconsented body. This is defence-in-depth
 * on the trusted client side — the server's z.literal(true) is the actual
 * security boundary (07-RESEARCH.md Security Domain, V5).
 */
export function buildProspectPayload(input: {
  contact: ContactDetails;
  consent: boolean;
  answers: Answer[];
  formRenderedAt: number;
  website?: string;
}): ProspectSubmission {
  if (input.consent !== true) {
    throw new Error(
      'buildProspectPayload: consentementRgpd must be true (SIMU-05) — the RGPD checkbox was not ticked'
    );
  }

  const payload = {
    nom: input.contact.nom.trim(),
    email: input.contact.email.trim(),
    telephone: input.contact.telephone.trim(),
    reponsesDiagnostic: input.answers,
    servicesRecommandes: computeRecommendedServices(input.answers),
    consentementRgpd: true as const,
    // Forwarded verbatim from the DOM's uncontrolled honeypot input (read via
    // ref at submit time, never state). A legitimate visitor never touches
    // it, so it defaults to empty; a scripted bot that fills every field
    // populates it, which is exactly what the server's isSpamSubmission
    // (src/lib/prospects-schema.ts) checks for. Hardcoding '' here would
    // make that server-side check permanently unreachable.
    website: input.website ?? '',
    formRenderedAt: input.formRenderedAt,
  };

  // Mirrors the server's own safeParse — a UX guard so the client fails
  // loudly on a malformed body instead of letting the server silently 400
  // (07-RESEARCH.md Security Domain, V5). Not a security boundary.
  //
  // Validated on a website-normalized COPY, not the real payload: the
  // schema's website field is max(0), which a bot-filled honeypot value
  // deliberately violates. The server's isSpamSubmission reads that raw,
  // unvalidated field before any zod parsing occurs (route.ts) — if this
  // function threw on a non-empty honeypot instead of forwarding it, the
  // bot's request would never even reach the server, defeating the silent
  // (no-signal) rejection the backend was built for.
  prospectSchema.parse({ ...payload, website: '' });
  return payload;
}
