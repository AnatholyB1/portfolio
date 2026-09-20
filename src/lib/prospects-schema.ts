import { z } from 'zod';

// Shared prospect-capture payload contract. Consumed server-side by
// src/app/api/simulateur/route.ts (Plan 03) and client-side by Phase 7's
// simulator wizard. Must stay free of next/server, Supabase, Resend or
// node:crypto imports so both sides can import it safely.

export const prospectSchema = z.object({
  nom: z.string().trim().min(1).max(120),
  email: z.email().trim(),
  telephone: z.string().trim().min(6).max(30),
  reponsesDiagnostic: z
    .array(
      z.object({
        questionId: z.string(),
        value: z.union([z.string(), z.array(z.string())]),
      })
    )
    .min(1),
  servicesRecommandes: z.array(z.string()).min(2).max(4),
  consentementRgpd: z.literal(true),
  // Honeypot: legitimate clients never populate this field. Kept optional
  // and length-bounded to zero so any non-empty value fails validation.
  website: z.string().max(0).optional(),
  // Client epoch ms captured when the wizard mounted, used by
  // isSpamSubmission's timing check below.
  formRenderedAt: z.number(),
});

export type ProspectSubmission = z.infer<typeof prospectSchema>;

// Provisional threshold (05-RESEARCH.md assumption A3) — revisit once
// Phase 7's wizard step count/UX is known; a very short wizard could make
// this too aggressive for legitimate fast users.
export const SPAM_MIN_ELAPSED_MS = 2000;

/**
 * Pure spam predicate operating on the RAW, unparsed request body — it runs
 * BEFORE zod parsing in the route handler, so a bot's payload may not even
 * be schema-valid. Returns true when the honeypot field `website` is a
 * non-empty string, or when `formRenderedAt` is a finite number and the
 * elapsed time since then is below SPAM_MIN_ELAPSED_MS. Never throws on a
 * malformed (non-object/null) body — that is zod's job to 400, not this
 * predicate's job to crash on.
 */
export function isSpamSubmission(raw: unknown, now: number = Date.now()): boolean {
  if (typeof raw !== 'object' || raw === null) {
    return false;
  }

  const body = raw as Record<string, unknown>;

  if (typeof body.website === 'string' && body.website.length > 0) {
    return true;
  }

  if (typeof body.formRenderedAt === 'number' && Number.isFinite(body.formRenderedAt)) {
    if (now - body.formRenderedAt < SPAM_MIN_ELAPSED_MS) {
      return true;
    }
  }

  return false;
}
