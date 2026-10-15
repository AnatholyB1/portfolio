import 'server-only';
import { ADMIN_COPY } from '@/lib/admin/leadLabels';
import { costSchema } from '@/lib/admin/leadSchemas';
import { upsertAcquisitionCost } from '@/lib/server/leads/admin';
import {
  addCashBalance,
  addProjectCost,
  addRecurringCost,
  stopRecurringCost,
  voidProjectCost,
} from '@/lib/server/pilotage/adminCosts';
import {
  COST_COPY,
  cashBalanceSchema,
  projectCostSchema,
  recurringCostSchema,
  stopRecurringSchema,
  voidCostSchema,
} from '@/lib/server/pilotage/costSchemas';
// Type seul (effacé à la compilation) : aucun import runtime de mcp/session.
import type { AdminCtx } from '@/lib/server/mcp/session';
import type { CoreResult } from './result';
import { rec } from './shared';

const CODE_MESSAGES: Record<string, string> = {
  sv_project_not_found: COST_COPY.projectUnknown,
  sv_cost_date_invalid: COST_COPY.dateInvalid,
  sv_cost_end_before_start: COST_COPY.endBeforeStart,
  sv_cost_amount_invalid: COST_COPY.amountInvalid,
  sv_balance_amount_invalid: COST_COPY.amountInvalid,
  sv_cost_label_invalid: COST_COPY.labelInvalid,
  sv_cost_already_voided: COST_COPY.alreadyVoided,
  sv_series_already_stopped: COST_COPY.alreadyStopped,
};

// Champ obligatoire : une valeur absente ou non textuelle devient '' (comme FormData.get côté web).
// Un nombre (entrée d'outil) est ramené à sa forme texte.
function textOrNumber(v: unknown): string {
  if (typeof v === 'number') return String(v);
  return typeof v === 'string' ? v : '';
}

// Champ facultatif : transmis tel quel s'il est textuel, sinon absent.
function optional(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function failCode(code: string): CoreResult {
  const message = Object.prototype.hasOwnProperty.call(CODE_MESSAGES, code)
    ? CODE_MESSAGES[code]
    : COST_COPY.serverError;
  return { ok: false, message };
}

function invalid(issues: { message: string }[]): CoreResult {
  return { ok: false, message: issues[0]?.message ?? COST_COPY.serverError };
}

// Coût d'acquisition mensuel par source/campagne (entonnoir).
export async function saveAcquisitionCostCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const i = rec(input);
  const parsed = costSchema.safeParse({
    source: textOrNumber(i.source),
    campaign: textOrNumber(i.campaign),
    month: textOrNumber(i.month),
    amount: textOrNumber(i.amount),
  });
  if (!parsed.success) return { ok: false, message: ADMIN_COPY.costInvalid };

  const { source, campaign, month, cents } = parsed.data;
  const res = await upsertAcquisitionCost(source, campaign, month, cents, ctx.user.id);
  if (!res.ok) return { ok: false, message: ADMIN_COPY.genericError };

  return { ok: true, message: ADMIN_COPY.costSuccess(source, campaign, month.slice(0, 7)) };
}

export async function addRecurringCostCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const i = rec(input);
  const parsed = recurringCostSchema.safeParse({
    seriesId: optional(i.seriesId),
    label: textOrNumber(i.label),
    category: textOrNumber(i.category),
    amount: textOrNumber(i.amount),
    frequency: textOrNumber(i.frequency),
    startsOn: textOrNumber(i.startsOn),
    endsOn: optional(i.endsOn),
  });
  if (!parsed.success) return invalid(parsed.error.issues);
  const res = await addRecurringCost({ ...parsed.data, actor: ctx.user.id });
  return res.ok ? { ok: true, message: COST_COPY.successRecurring } : failCode(res.code);
}

export async function stopRecurringCostCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const i = rec(input);
  const parsed = stopRecurringSchema.safeParse({
    seriesId: textOrNumber(i.seriesId),
    fromMonth: textOrNumber(i.fromMonth),
  });
  if (!parsed.success) return invalid(parsed.error.issues);
  const res = await stopRecurringCost({ ...parsed.data, actor: ctx.user.id });
  return res.ok ? { ok: true, message: COST_COPY.successStop } : failCode(res.code);
}

export async function addProjectCostCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const i = rec(input);
  const parsed = projectCostSchema.safeParse({
    projectId: textOrNumber(i.projectId),
    incurredOn: textOrNumber(i.incurredOn),
    category: textOrNumber(i.category),
    label: textOrNumber(i.label),
    amount: textOrNumber(i.amount),
    vat: optional(i.vat),
  });
  if (!parsed.success) return invalid(parsed.error.issues);
  const res = await addProjectCost({ ...parsed.data, actor: ctx.user.id });
  return res.ok ? { ok: true, message: COST_COPY.successCost } : failCode(res.code);
}

export async function voidProjectCostCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const parsed = voidCostSchema.safeParse({ costId: textOrNumber(rec(input).costId) });
  if (!parsed.success) return invalid(parsed.error.issues);
  const res = await voidProjectCost({ ...parsed.data, actor: ctx.user.id });
  return res.ok ? { ok: true, message: COST_COPY.successVoid } : failCode(res.code);
}

export async function saveBalanceCore(ctx: AdminCtx, input: unknown): Promise<CoreResult> {
  const i = rec(input);
  const parsed = cashBalanceSchema.safeParse({
    amount: textOrNumber(i.amount),
    asOf: textOrNumber(i.asOf),
    note: optional(i.note),
  });
  if (!parsed.success) return invalid(parsed.error.issues);
  const res = await addCashBalance({ ...parsed.data, actor: ctx.user.id });
  return res.ok ? { ok: true, message: COST_COPY.successBalance } : failCode(res.code);
}
