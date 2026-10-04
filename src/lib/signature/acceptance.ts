// Module pur, sûr côté client. Réponses de recette par critère (D-14, D-15).
import { z } from 'zod';

export const ACCEPTANCE_STATUSES = ['delivered', 'reserved', 'refused'] as const;
export type AcceptanceStatus = (typeof ACCEPTANCE_STATUSES)[number];
export const ACCEPTANCE_NOTE_MAX = 1000;
export const ACCEPTANCE_NOTE_MIN = 3;
export const ACCEPTANCE_MAX_CRITERIA = 100;

export type AcceptanceAnswer = { index: number; status: AcceptanceStatus; note?: string | null };

export function acceptanceAnswersSchema(criteriaCount: number) {
  const item = z
    .object({
      index: z.number().int().min(1).max(Math.min(criteriaCount, ACCEPTANCE_MAX_CRITERIA)),
      status: z.enum(ACCEPTANCE_STATUSES),
      note: z.string().max(ACCEPTANCE_NOTE_MAX).optional(),
    })
    .superRefine((v, ctx) => {
      if (v.status === 'delivered') {
        if (v.note !== undefined) {
          ctx.addIssue({ code: 'custom', path: ['note'], message: 'note_not_allowed' });
        }
      } else if (v.note === undefined || v.note.trim().length < ACCEPTANCE_NOTE_MIN) {
        ctx.addIssue({ code: 'custom', path: ['note'], message: 'note_required' });
      }
    });

  return z
    .array(item)
    .length(criteriaCount)
    .superRefine((arr, ctx) => {
      const seen = new Set(arr.map((a) => a.index));
      if (seen.size !== arr.length) ctx.addIssue({ code: 'custom', message: 'duplicate_index' });
    });
}

export function summarizeAnswers<T extends { status: AcceptanceStatus }>(answers: readonly T[]) {
  const out = { delivered: 0, reserved: 0, refused: 0, total: answers.length };
  for (const a of answers) out[a.status] += 1;
  return out;
}
