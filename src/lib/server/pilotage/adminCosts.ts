import 'server-only';
import { callRpc, type RpcResult } from '@/lib/server/rpc';

export function addRecurringCost(input: {
  seriesId: string | null;
  label: string;
  category: string;
  amountCents: number;
  frequency: string;
  startsOn: string;
  endsOn: string | null;
  actor: string;
}): Promise<RpcResult<{ cost_id: number; series_id: string }>> {
  return callRpc('pilotage/costs', 'sv_add_recurring_cost', {
    p_series_id: input.seriesId,
    p_label: input.label,
    p_category: input.category,
    p_amount_cents: input.amountCents,
    p_frequency: input.frequency,
    p_starts_on: input.startsOn,
    p_ends_on: input.endsOn,
    p_actor: input.actor,
  });
}

export function stopRecurringCost(input: {
  seriesId: string;
  from: string;
  actor: string;
}): Promise<RpcResult<{ cost_id: number }>> {
  return callRpc('pilotage/costs', 'sv_stop_recurring_cost', {
    p_series_id: input.seriesId,
    p_from: input.from,
    p_actor: input.actor,
  });
}

export function addProjectCost(input: {
  projectId: string;
  incurredOn: string;
  category: string;
  label: string;
  amountCents: number;
  vatCents: number | null;
  actor: string;
}): Promise<RpcResult<{ cost_id: number }>> {
  return callRpc('pilotage/costs', 'sv_add_project_cost', {
    p_project_id: input.projectId,
    p_incurred_on: input.incurredOn,
    p_category: input.category,
    p_label: input.label,
    p_amount_cents: input.amountCents,
    p_vat_cents: input.vatCents,
    p_actor: input.actor,
  });
}

export function voidProjectCost(input: {
  costId: number;
  actor: string;
}): Promise<RpcResult<{ cost_id: number }>> {
  return callRpc('pilotage/costs', 'sv_void_project_cost', {
    p_cost_id: input.costId,
    p_actor: input.actor,
  });
}

export function addCashBalance(input: {
  asOf: string;
  amountCents: number;
  note: string | null;
  actor: string;
}): Promise<RpcResult<{ balance_id: number }>> {
  return callRpc('pilotage/costs', 'sv_add_cash_balance', {
    p_as_of: input.asOf,
    p_amount_cents: input.amountCents,
    p_note: input.note,
    p_actor: input.actor,
  });
}
