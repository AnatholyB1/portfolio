// Module pur (zod uniquement). Entrées admin par type de document, avec plafonds explicites (T-13-11).
// Les montants sont des centimes entiers ; le serveur recalcule tous les totaux (D-06).
import { z } from 'zod';

/** Retire U+0000-0008, 000B, 000C, 000E-001F et 007F ; conserve \n et \t. */
export function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

const uuid = z.string().uuid();
/** Date calendaire réelle (rejette 2026-13-45 ou 2026-02-30) : le document émis est immuable (WR-03). */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Date invalide.');
const text = (min: number, max: number) =>
  z.string().transform(stripControlChars).pipe(z.string().trim().min(min).max(max));
const intIn = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

const base = <T extends string>(docType: T) => ({
  projectId: uuid,
  documentId: uuid,
  docType: z.literal(docType),
});

export const quoteLineSchema = z.object({
  designation: text(1, 200),
  quantity: intIn(1, 10000),
  unitPriceCents: intIn(0, 100000000),
});

export const quoteInputSchema = z.object({
  ...base('quote'),
  lines: z.array(quoteLineSchema).min(1).max(30),
  depositPercent: intIn(0, 100).default(30),
  validityDays: intIn(1, 365).default(30),
  leadTime: text(1, 120),
});

/** Un critère par ligne ; retire les puces « - » et la numérotation « N. » / « N) ». */
export function parseCriteria(input: string): string[] {
  return stripControlChars(input)
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^(?:-(?:\s+|$)|\d+\s*[.)]\s*)/, '').trim())
    .filter((l) => l.length > 0);
}

export const specInputSchema = z
  .object({
    ...base('spec'),
    context: text(1, 4000),
    scope: text(1, 4000),
    deliverables: text(1, 4000),
    outOfScope: text(0, 4000).default(''),
    planning: text(0, 4000).default(''),
    acceptanceCriteria: text(1, 4000),
  })
  .transform((v, ctx) => {
    const list = parseCriteria(v.acceptanceCriteria);
    if (list.length < 1 || list.length > 50 || list.some((c) => c.length > 300)) {
      ctx.addIssue({
        code: 'custom',
        path: ['acceptanceCriteria'],
        message: 'Entre 1 et 50 critères, 300 caractères maximum chacun.',
      });
      return z.NEVER;
    }
    return { ...v, acceptanceCriteriaList: list };
  });

export const contractInputSchema = z.object({
  ...base('contract'),
  startDate: isoDate.optional(),
});

export const acceptanceInputSchema = z.object({
  ...base('acceptance'),
  deliveryDate: isoDate,
  reservations: text(0, 2000).optional(),
});

export const invoicePreviewSchema = z.object({
  ...base('invoice'),
  kind: z.enum(['deposit', 'balance']),
  serviceDate: isoDate,
  orderNumber: text(1, 40).optional(),
});

// z.discriminatedUnion exige des objets : la spec (transformée) est donc validée à part
// via un objet de base, puis transformée par specInputSchema.
const specObject = z.object({
  ...base('spec'),
  context: z.string(),
  scope: z.string(),
  deliverables: z.string(),
  outOfScope: z.string().optional(),
  planning: z.string().optional(),
  acceptanceCriteria: z.string(),
});

export const documentInputSchema = z
  .discriminatedUnion('docType', [
    quoteInputSchema,
    specObject,
    contractInputSchema,
    acceptanceInputSchema,
    invoicePreviewSchema,
  ])
  .superRefine((v, ctx) => {
    if (v.docType !== 'spec') return;
    const r = specInputSchema.safeParse(v);
    if (!r.success) for (const issue of r.error.issues) ctx.addIssue({ ...issue });
  });

export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type SpecInput = z.infer<typeof specInputSchema>;
export type ContractInput = z.infer<typeof contractInputSchema>;
export type AcceptanceInput = z.infer<typeof acceptanceInputSchema>;
export type InvoicePreviewInput = z.infer<typeof invoicePreviewSchema>;
// Pour la spec, documentInputSchema valide seulement ; utilisez specInputSchema pour obtenir
// acceptanceCriteriaList.
export type DocumentInput = QuoteInput | SpecInput | ContractInput | AcceptanceInput | InvoicePreviewInput;
