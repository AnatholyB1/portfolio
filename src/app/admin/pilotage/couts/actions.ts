'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
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

export type CostFormState = { status: 'idle' | 'success' | 'error'; message?: string };

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

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

function optional(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === 'string' ? v : undefined;
}

function fail(code: string): CostFormState {
  const message = Object.prototype.hasOwnProperty.call(CODE_MESSAGES, code)
    ? CODE_MESSAGES[code]
    : COST_COPY.serverError;
  return { status: 'error', message };
}

function invalid(issues: { message: string }[]): CostFormState {
  return { status: 'error', message: issues[0]?.message ?? COST_COPY.serverError };
}

function done(message: string): CostFormState {
  revalidatePath('/admin/pilotage');
  revalidatePath('/admin/pilotage/couts');
  return { status: 'success', message };
}

export async function addRecurringCostAction(
  _prev: CostFormState,
  fd: FormData,
): Promise<CostFormState> {
  const { user } = await requireAdmin();
  const parsed = recurringCostSchema.safeParse({
    seriesId: optional(fd, 'seriesId'),
    label: str(fd, 'label'),
    category: str(fd, 'category'),
    amount: str(fd, 'amount'),
    frequency: str(fd, 'frequency'),
    startsOn: str(fd, 'startsOn'),
    endsOn: optional(fd, 'endsOn'),
  });
  if (!parsed.success) return invalid(parsed.error.issues);
  const res = await addRecurringCost({ ...parsed.data, actor: user.id });
  return res.ok ? done(COST_COPY.successRecurring) : fail(res.code);
}

export async function stopRecurringAction(
  _prev: CostFormState,
  fd: FormData,
): Promise<CostFormState> {
  const { user } = await requireAdmin();
  const parsed = stopRecurringSchema.safeParse({
    seriesId: str(fd, 'seriesId'),
    fromMonth: str(fd, 'fromMonth'),
  });
  if (!parsed.success) return invalid(parsed.error.issues);
  const res = await stopRecurringCost({ ...parsed.data, actor: user.id });
  return res.ok ? done(COST_COPY.successStop) : fail(res.code);
}

export async function addProjectCostAction(
  _prev: CostFormState,
  fd: FormData,
): Promise<CostFormState> {
  const { user } = await requireAdmin();
  const parsed = projectCostSchema.safeParse({
    projectId: str(fd, 'projectId'),
    incurredOn: str(fd, 'incurredOn'),
    category: str(fd, 'category'),
    label: str(fd, 'label'),
    amount: str(fd, 'amount'),
    vat: optional(fd, 'vat'),
  });
  if (!parsed.success) return invalid(parsed.error.issues);
  const res = await addProjectCost({ ...parsed.data, actor: user.id });
  return res.ok ? done(COST_COPY.successCost) : fail(res.code);
}

export async function voidProjectCostAction(
  _prev: CostFormState,
  fd: FormData,
): Promise<CostFormState> {
  const { user } = await requireAdmin();
  const parsed = voidCostSchema.safeParse({ costId: str(fd, 'costId') });
  if (!parsed.success) return invalid(parsed.error.issues);
  const res = await voidProjectCost({ ...parsed.data, actor: user.id });
  return res.ok ? done(COST_COPY.successVoid) : fail(res.code);
}

export async function saveBalanceAction(
  _prev: CostFormState,
  fd: FormData,
): Promise<CostFormState> {
  const { user } = await requireAdmin();
  const parsed = cashBalanceSchema.safeParse({
    amount: str(fd, 'amount'),
    asOf: str(fd, 'asOf'),
    note: optional(fd, 'note'),
  });
  if (!parsed.success) return invalid(parsed.error.issues);
  const res = await addCashBalance({ ...parsed.data, actor: user.id });
  return res.ok ? done(COST_COPY.successBalance) : fail(res.code);
}
