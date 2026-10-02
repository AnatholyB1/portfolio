// Schémas d'entrée des server actions projets : module sûr côté client.
import { z } from 'zod';
import { inviteSchema } from '@/lib/admin/inviteSchema';
import { OFFER_SLUGS } from './offers';
import { MAX_FILE_BYTES } from './fileRules';

const uuid = z.string().uuid();

export const convertSchema = inviteSchema.extend({
  leadId: uuid,
  offer: z.enum(OFFER_SLUGS),
  projectTitle: z.string().trim().min(1).max(80),
});
export type ConvertInput = z.infer<typeof convertSchema>;

export const postFactSchema = z.object({
  projectId: uuid,
  type: z.enum([
    'quote_accepted',
    'contract_signed',
    'deposit_received',
    'production_completed',
    'acceptance_signed',
    'balance_received',
  ]),
  note: z.string().trim().max(500).optional(),
});

export const revokeFactSchema = z.object({
  projectId: uuid,
  factId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(10).max(500),
});

export const linkSchema = z.object({
  projectId: uuid,
  title: z.string().trim().min(1).max(80),
  url: z
    .url()
    .max(2000)
    .refine((u) => {
      try {
        return new URL(u).protocol === 'https:';
      } catch {
        return false;
      }
    }, 'url'),
});

export const uploadRequestSchema = z.object({
  projectId: uuid,
  filename: z.string().min(1).max(200),
  size: z.number().int().min(1).max(MAX_FILE_BYTES),
  mime: z.string().min(1).max(150),
});

export const consentSchema = z.object({
  projectId: uuid,
  granted: z.enum(['true', 'false']).transform((v) => v === 'true'),
  version: z.string().min(1).max(40),
});
