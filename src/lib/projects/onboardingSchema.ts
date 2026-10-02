// Schémas d'onboarding client : module sûr côté client (zod uniquement).
// Les messages sont des clés de PROJECT_COPY.errors (copy.ts reste la seule source de texte).
import { z } from 'zod';

export const ONBOARDING_BLOCKS = ['societe', 'signataire', 'contact', 'facturation', 'projet'] as const;
export type OnboardingBlock = (typeof ONBOARDING_BLOCKS)[number];

const REQUIRED = 'required';
const VAT = 'vatFormat';
const URL_KEY = 'url';

export function isValidFrVat(v: string): boolean {
  return /^FR[0-9A-Z]{2}\d{9}$/.test(v.replace(/\s/g, '').toUpperCase());
}

const httpsUrl = z
  .string()
  .trim()
  .max(2000, URL_KEY)
  .refine((u) => {
    try {
      return new URL(u).protocol === 'https:';
    } catch {
      return false;
    }
  }, URL_KEY);

export const signataireSchema = z.object({
  signatoryName: z.string().trim().min(1, REQUIRED).max(120),
  signatoryRole: z.string().trim().min(1, REQUIRED).max(120),
});

export const contactSchema = z.object({
  projectContactName: z.string().trim().max(120),
  projectContactEmail: z.email().trim().toLowerCase().max(254).optional(),
  projectContactPhone: z.string().trim().max(30).optional(),
});

export const billingAddressSchema = z.object({
  adresse: z.string().trim().min(1, REQUIRED).max(300),
  code_postal: z.string().regex(/^\d{5}$/, REQUIRED),
  commune: z.string().trim().min(1, REQUIRED).max(120),
});

export const facturationSchema = z
  .object({
    billingSameAsCompany: z.boolean(),
    billingAddress: billingAddressSchema.nullable().optional(),
    vatStatus: z.enum(['number', 'not_subject']),
    vatNumber: z.string().trim().max(30).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.billingSameAsCompany && !v.billingAddress) {
      ctx.addIssue({ code: 'custom', path: ['billingAddress'], message: REQUIRED });
    }
    if (v.vatStatus === 'number' && !(v.vatNumber && isValidFrVat(v.vatNumber))) {
      ctx.addIssue({ code: 'custom', path: ['vatNumber'], message: VAT });
    }
  });

export const projetSchema = z.object({
  existingSiteUrl: httpsUrl.optional(),
  socialLinks: z.array(httpsUrl).max(4),
  projectGoal: z.string().trim().max(1000),
});

// Union discriminée pour les sauvegardes partielles (un bloc à la fois).
export const onboardingFieldSchema = z.discriminatedUnion('block', [
  z.object({ block: z.literal('societe'), confirmed: z.literal(true) }),
  z.object({ block: z.literal('signataire'), data: signataireSchema }),
  z.object({ block: z.literal('contact'), data: contactSchema }),
  z.object({ block: z.literal('facturation'), data: facturationSchema }),
  z.object({ block: z.literal('projet'), data: projetSchema }),
]);

export type OnboardingRow = {
  companyConfirmedAt: string | null;
  signatoryName: string | null;
  signatoryRole: string | null;
  projectContactName: string | null;
  projectContactEmail: string | null;
  projectContactPhone: string | null;
  billingSameAsCompany: boolean;
  billingAddress: { adresse: string; code_postal: string; commune: string } | null;
  vatStatus: 'number' | 'not_subject' | null;
  vatNumber: string | null;
  existingSiteUrl: string | null;
  socialLinks: string[];
  projectGoal: string | null;
};

const filled = (s: string | null | undefined) => !!s && s.trim().length > 0;

function signataireComplete(r: OnboardingRow): boolean {
  return filled(r.signatoryName) && filled(r.signatoryRole);
}

function facturationComplete(r: OnboardingRow): boolean {
  const vatOk =
    r.vatStatus === 'not_subject' || (r.vatStatus === 'number' && !!r.vatNumber && isValidFrVat(r.vatNumber));
  if (!vatOk) return false;
  if (r.billingSameAsCompany) return true;
  return billingAddressSchema.safeParse(r.billingAddress).success;
}

export function blockCompletion(r: OnboardingRow): Record<OnboardingBlock, boolean> {
  const contactEmpty =
    !filled(r.projectContactName) && !filled(r.projectContactEmail) && !filled(r.projectContactPhone);
  return {
    societe: !!r.companyConfirmedAt,
    signataire: signataireComplete(r),
    contact: filled(r.projectContactName) || (contactEmpty && signataireComplete(r)),
    facturation: facturationComplete(r),
    projet: filled(r.projectGoal),
  };
}

// D-12 : société confirmée, signataire, TVA et facturation. Contact et projet n'bloquent pas.
export function isOnboardingComplete(r: OnboardingRow): boolean {
  const c = blockCompletion(r);
  return c.societe && c.signataire && c.facturation;
}
