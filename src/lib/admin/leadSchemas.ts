// Schémas de formulaires admin leads. Module sûr côté client (zod uniquement).
import { z } from 'zod';
import { ERASE_REASONS, LOST_REASONS, STATUS_ORDER } from './leadLabels';

const leadId = z.string().uuid();
const lostCodes = LOST_REASONS.map((r) => r.code) as [string, ...string[]];
const eraseCodes = ERASE_REASONS.map((r) => r.code) as [string, ...string[]];

export const statusSchema = z.object({
  leadId,
  status: z.enum(STATUS_ORDER),
});

export const lostSchema = z.object({
  leadId,
  reason: z.enum(lostCodes),
  note: z.string().trim().max(500).optional(),
});

export const correctionSchema = z.object({
  leadId,
  source: z.string().trim().min(1).max(200),
  medium: z.string().trim().min(1).max(200),
  campaign: z.string().trim().max(200),
  reason: z.string().trim().min(10).max(500),
});

export const eraseSchema = z.object({
  leadId,
  reason: z.enum(eraseCodes),
  confirmEmail: z.string().trim().min(1).max(254),
});

export const costSchema = z
  .object({
    source: z.string().trim().min(1).max(200),
    campaign: z.string().trim().max(200),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    amount: z
      .string()
      .trim()
      .regex(/^\d+([.,]\d{1,2})?$/),
  })
  .transform((v, ctx) => {
    const cents = Math.round(Number(v.amount.replace(',', '.')) * 100);
    if (!Number.isInteger(cents) || cents <= 0) {
      ctx.addIssue({ code: 'custom', message: 'amount' });
      return z.NEVER;
    }
    return {
      source: v.source.toLowerCase(),
      campaign: v.campaign.toLowerCase(),
      month: `${v.month}-01`,
      cents,
    };
  });
