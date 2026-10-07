// Schémas de saisie des coûts et du solde. Module sûr côté client (zod uniquement).
import { z } from 'zod';
import { toCents } from '@/lib/documents/money';

export const COST_CATEGORY_KEYS = [
  'sous_traitance',
  'outils',
  'hebergement',
  'publicite',
  'licences',
  'autre',
] as const;

export const COST_CATEGORY_LABELS: Record<(typeof COST_CATEGORY_KEYS)[number], string> = {
  sous_traitance: 'Sous-traitance',
  outils: 'Outils',
  hebergement: 'Hébergement',
  publicite: 'Publicité',
  licences: 'Licences',
  autre: 'Autre',
};

export const COST_COPY = {
  amountInvalid: 'Saisissez un montant supérieur à 0, par exemple 12,50.',
  labelInvalid: 'Indiquez un libellé (120 caractères maximum).',
  projectUnknown: "Ce projet n'existe plus. Rechargez la page et choisissez-en un autre.",
  dateInvalid: "Cette date est trop éloignée. Vérifiez l'année.",
  endBeforeStart: 'La date de fin doit suivre la date de début.',
  serverError:
    "L'enregistrement a échoué. Rien n'a été modifié. Réessayez ; si l'erreur persiste, rechargez la page.",
  successCost: 'Coût ajouté.',
  successRecurring: 'Charge ajoutée.',
  successBalance: 'Solde enregistré.',
  successStop: 'Charge arrêtée.',
  successVoid: 'Coût annulé.',
  alreadyVoided: 'Ce coût est déjà annulé.',
  alreadyStopped: 'Cette charge est déjà arrêtée.',
  noteInvalid: 'La note ne doit pas dépasser 200 caractères.',
} as const;

/** Montant en euros avec signe optionnel (moins ASCII ou U+2212) vers centimes. */
export function toSignedCents(input: string): number | null {
  const s = input.trim();
  const negative = s.startsWith('-') || s.startsWith('−');
  const cents = toCents(negative ? s.slice(1) : s);
  if (cents === null) return null;
  return negative && cents !== 0 ? -cents : cents;
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, COST_COPY.dateInvalid);
const category = z.enum(COST_CATEGORY_KEYS);
const label = z.string().trim().min(1, COST_COPY.labelInvalid).max(120, COST_COPY.labelInvalid);

const positiveAmount = z.string().transform((v, ctx) => {
  const cents = toCents(v);
  if (cents === null || cents <= 0) {
    ctx.addIssue({ code: 'custom', message: COST_COPY.amountInvalid });
    return z.NEVER;
  }
  return cents;
});

const signedAmount = z.string().transform((v, ctx) => {
  const cents = toSignedCents(v);
  if (cents === null) {
    ctx.addIssue({ code: 'custom', message: COST_COPY.amountInvalid });
    return z.NEVER;
  }
  return cents;
});

const emptyToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

export const recurringCostSchema = z
  .object({
    seriesId: z.preprocess(emptyToNull, z.string().uuid().nullable().default(null)),
    label,
    category,
    amount: positiveAmount,
    frequency: z.enum(['monthly', 'yearly']),
    startsOn: dateStr,
    endsOn: z.preprocess(emptyToNull, dateStr.nullable().default(null)),
  })
  .superRefine((v, ctx) => {
    if (v.endsOn !== null && v.endsOn < v.startsOn) {
      ctx.addIssue({ code: 'custom', message: COST_COPY.endBeforeStart, path: ['endsOn'] });
    }
  })
  .transform(({ amount, ...rest }) => ({ ...rest, amountCents: amount }));

export const stopRecurringSchema = z
  .object({
    seriesId: z.string().uuid(),
    fromMonth: z.string().regex(/^\d{4}-\d{2}$/, COST_COPY.dateInvalid),
  })
  .transform(({ seriesId, fromMonth }) => ({ seriesId, from: `${fromMonth}-01` }));

export const projectCostSchema = z
  .object({
    projectId: z.string().uuid(),
    incurredOn: dateStr,
    category,
    label,
    amount: positiveAmount,
    vat: z.preprocess(
      emptyToNull,
      z
        .string()
        .nullable()
        .default(null)
        .transform((v, ctx) => {
          if (v === null) return null;
          const cents = toCents(v);
          if (cents === null) {
            ctx.addIssue({ code: 'custom', message: COST_COPY.amountInvalid });
            return z.NEVER;
          }
          return cents;
        }),
    ),
  })
  .transform(({ amount, vat, ...rest }) => ({ ...rest, amountCents: amount, vatCents: vat }));

export const voidCostSchema = z
  .object({ costId: z.string().regex(/^\d+$/) })
  .transform(({ costId }) => ({ costId: Number(costId) }))
  .refine((v) => Number.isSafeInteger(v.costId) && v.costId > 0);

export const cashBalanceSchema = z
  .object({
    amount: signedAmount,
    asOf: dateStr,
    note: z.preprocess(
      emptyToNull,
      z.string().trim().max(200, COST_COPY.noteInvalid).nullable().default(null),
    ),
  })
  .transform(({ amount, ...rest }) => ({ ...rest, amountCents: amount }));
