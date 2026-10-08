import { z } from 'zod';

// Schéma de soumission d'avis (D-01, D-02, D-05). Pur : utilisable côté client et serveur.
// Seules des règles techniques sont appliquées (longueur, balisage, liens, caractères de
// contrôle) : jamais de filtrage sur le ton ou la note.

export const DISPLAY_MODES = ['first_company', 'first_initial', 'company_only'] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

export const REVIEW_BODY_MIN = 20;
export const REVIEW_BODY_MAX = 2000;
export const REVIEW_TITLE_MAX = 100;
export const REVIEW_FIRST_NAME_MAX = 40;

export type ReviewFieldCode =
  | 'rating'
  | 'title_long'
  | 'body_short'
  | 'body_long'
  | 'markup_or_link'
  | 'first_name'
  | 'initial'
  | 'consent';

export const REVIEW_FIELD_ERRORS: Record<ReviewFieldCode, string> = {
  rating: 'Choisissez une note de 1 à 5.',
  title_long: 'Le titre ne peut pas dépasser 100 caractères.',
  body_short: 'Votre avis doit faire au moins 20 caractères.',
  body_long: 'Votre avis ne peut pas dépasser 2 000 caractères.',
  markup_or_link: 'Les liens et le balisage ne sont pas acceptés dans un avis. Retirez-les puis réessayez.',
  first_name: 'Indiquez votre prénom.',
  initial: "Indiquez l'initiale de votre nom.",
  consent: 'Cochez la case pour que votre avis puisse être publié.',
};

// Caractères de contrôle : tout C0 sauf tab/LF/CR (multiligne) ou tout C0 (une ligne), plus DEL.
const CONTROL_MULTILINE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const CONTROL_SINGLE = /[\u0000-\u001F\u007F]/;
const LINK_OR_TAG = /[<>]|https?:\/\/|www\./i;

function hasMarkupOrLink(value: string, multiline = false): boolean {
  return LINK_OR_TAG.test(value) || (multiline ? CONTROL_MULTILINE : CONTROL_SINGLE).test(value);
}

export const reviewSubmissionSchema = z
  .object({
    token: z.string().min(1).max(64),
    rating: z
      .number({ error: 'rating' })
      .int('rating')
      .min(1, 'rating')
      .max(5, 'rating'),
    title: z
      .string()
      .trim()
      .max(REVIEW_TITLE_MAX, 'title_long')
      .refine((v) => !hasMarkupOrLink(v), 'markup_or_link')
      .optional()
      .transform((v) => (v ? v : undefined)),
    body: z
      .string()
      .trim()
      .min(REVIEW_BODY_MIN, 'body_short')
      .max(REVIEW_BODY_MAX, 'body_long')
      .refine((v) => !hasMarkupOrLink(v, true), 'markup_or_link'),
    displayMode: z.enum(DISPLAY_MODES).default('first_company'),
    firstName: z
      .string()
      .trim()
      .max(REVIEW_FIRST_NAME_MAX, 'first_name')
      .refine((v) => !hasMarkupOrLink(v), 'markup_or_link')
      .optional(),
    lastInitial: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\p{L}$/u.test(v), 'initial')
      .optional(),
    consent: z.literal(true, { error: 'consent' }),
  })
  .superRefine((val, ctx) => {
    if (val.displayMode !== 'company_only' && !val.firstName) {
      ctx.addIssue({ code: 'custom', path: ['firstName'], message: 'first_name' });
    }
    if (val.displayMode === 'first_initial' && !val.lastInitial) {
      ctx.addIssue({ code: 'custom', path: ['lastInitial'], message: 'initial' });
    }
  });

export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;

// Même règle que la colonne display_name côté SQL (18-01).
export function composeDisplayName(
  mode: DisplayMode,
  firstName: string,
  lastInitial: string,
  companyName: string,
): string {
  const first = firstName.trim();
  if (mode === 'first_company') return `${first}, ${companyName}`;
  if (mode === 'first_initial') return `${first} ${lastInitial.trim().toUpperCase()}.`;
  return companyName;
}
