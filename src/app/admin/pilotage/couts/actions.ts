'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/server/auth/dal';
import {
  addProjectCostCore,
  addRecurringCostCore,
  saveBalanceCore,
  stopRecurringCostCore,
  voidProjectCostCore,
} from '@/lib/server/admin/core/costs';

export type CostFormState = { status: 'idle' | 'success' | 'error'; message?: string };

type Core = (
  ctx: Awaited<ReturnType<typeof requireAdmin>>,
  input: Record<string, string | undefined>,
) => Promise<{ ok: boolean; message: string }>;

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v : '';
}

function optional(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === 'string' ? v : undefined;
}

// Wrapper commun : admin d'abord, puis core (validation + écriture), puis revalidation.
async function run(
  core: Core,
  input: (fd: FormData) => Record<string, string | undefined>,
  fd: FormData,
): Promise<CostFormState> {
  const ctx = await requireAdmin();
  const res = await core(ctx, input(fd));
  if (!res.ok) return { status: 'error', message: res.message };
  revalidatePath('/admin/pilotage');
  revalidatePath('/admin/pilotage/couts');
  return { status: 'success', message: res.message };
}

export async function addRecurringCostAction(
  _prev: CostFormState,
  fd: FormData,
): Promise<CostFormState> {
  return run(
    addRecurringCostCore,
    (f) => ({
      seriesId: optional(f, 'seriesId'),
      label: str(f, 'label'),
      category: str(f, 'category'),
      amount: str(f, 'amount'),
      frequency: str(f, 'frequency'),
      startsOn: str(f, 'startsOn'),
      endsOn: optional(f, 'endsOn'),
    }),
    fd,
  );
}

export async function stopRecurringAction(
  _prev: CostFormState,
  fd: FormData,
): Promise<CostFormState> {
  return run(
    stopRecurringCostCore,
    (f) => ({ seriesId: str(f, 'seriesId'), fromMonth: str(f, 'fromMonth') }),
    fd,
  );
}

export async function addProjectCostAction(
  _prev: CostFormState,
  fd: FormData,
): Promise<CostFormState> {
  return run(
    addProjectCostCore,
    (f) => ({
      projectId: str(f, 'projectId'),
      incurredOn: str(f, 'incurredOn'),
      category: str(f, 'category'),
      label: str(f, 'label'),
      amount: str(f, 'amount'),
      vat: optional(f, 'vat'),
    }),
    fd,
  );
}

export async function voidProjectCostAction(
  _prev: CostFormState,
  fd: FormData,
): Promise<CostFormState> {
  return run(voidProjectCostCore, (f) => ({ costId: str(f, 'costId') }), fd);
}

export async function saveBalanceAction(
  _prev: CostFormState,
  fd: FormData,
): Promise<CostFormState> {
  return run(
    saveBalanceCore,
    (f) => ({ amount: str(f, 'amount'), asOf: str(f, 'asOf'), note: optional(f, 'note') }),
    fd,
  );
}
