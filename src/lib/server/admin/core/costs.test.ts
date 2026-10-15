import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_COPY } from '@/lib/admin/leadLabels';
import { COST_COPY } from '@/lib/server/pilotage/costSchemas';

const leads = vi.hoisted(() => ({ upsertAcquisitionCost: vi.fn() }));
const w = vi.hoisted(() => ({
  addRecurringCost: vi.fn(),
  stopRecurringCost: vi.fn(),
  addProjectCost: vi.fn(),
  voidProjectCost: vi.fn(),
  addCashBalance: vi.fn(),
}));
vi.mock('@/lib/server/leads/admin', () => leads);
vi.mock('@/lib/server/pilotage/adminCosts', () => w);

import {
  addProjectCostCore,
  addRecurringCostCore,
  saveAcquisitionCostCore,
  saveBalanceCore,
  stopRecurringCostCore,
  voidProjectCostCore,
} from './costs';

const UUID = '11111111-1111-4111-8111-111111111111';
const ctx = { supabase: {} as never, user: { id: 'admin-1' } as never };

beforeEach(() => {
  leads.upsertAcquisitionCost.mockReset();
  leads.upsertAcquisitionCost.mockResolvedValue({ ok: true, data: null });
  for (const fn of Object.values(w)) {
    fn.mockReset();
    fn.mockResolvedValue({ ok: true, data: {} });
  }
});

describe('saveAcquisitionCostCore', () => {
  const base = { source: 'Google', campaign: 'Brand', month: '2026-10', amount: '12,5' };
  it('stores cents on the first of the month, lowercased, with the actor', async () => {
    const r = await saveAcquisitionCostCore(ctx, base);
    expect(leads.upsertAcquisitionCost).toHaveBeenCalledWith('google', 'brand', '2026-10-01', 1250, 'admin-1');
    expect(r).toEqual({ ok: true, message: ADMIN_COPY.costSuccess('google', 'brand', '2026-10') });
  });
  it('rejects 0 and malformed input with costInvalid', async () => {
    for (const amount of ['0', 'abc', '']) {
      expect(await saveAcquisitionCostCore(ctx, { ...base, amount })).toEqual({ ok: false, message: ADMIN_COPY.costInvalid });
    }
    expect(await saveAcquisitionCostCore(ctx, { ...base, month: '2026-13' })).toEqual({ ok: false, message: ADMIN_COPY.costInvalid });
    expect(leads.upsertAcquisitionCost).not.toHaveBeenCalled();
  });
  it('maps a wrapper error to genericError', async () => {
    leads.upsertAcquisitionCost.mockResolvedValue({ ok: false, code: 'unknown' });
    expect(await saveAcquisitionCostCore(ctx, base)).toEqual({ ok: false, message: ADMIN_COPY.genericError });
  });
});

describe('addRecurringCostCore', () => {
  const base = { label: 'Figma', category: 'outils', amount: '12,5', frequency: 'monthly', startsOn: '2026-10-01' };
  it('adds with the actor and cents', async () => {
    expect(await addRecurringCostCore(ctx, base)).toEqual({ ok: true, message: COST_COPY.successRecurring });
    expect(w.addRecurringCost).toHaveBeenCalledWith({
      seriesId: null,
      label: 'Figma',
      category: 'outils',
      amountCents: 1250,
      frequency: 'monthly',
      startsOn: '2026-10-01',
      endsOn: null,
      actor: 'admin-1',
    });
  });
  it('returns the first schema issue as the message', async () => {
    expect(await addRecurringCostCore(ctx, { ...base, amount: '0' })).toEqual({ ok: false, message: COST_COPY.amountInvalid });
    expect(await addRecurringCostCore(ctx, { ...base, endsOn: '2026-09-01' })).toEqual({ ok: false, message: COST_COPY.endBeforeStart });
    expect(w.addRecurringCost).not.toHaveBeenCalled();
  });
  it('treats missing required fields as empty strings like the form did', async () => {
    const r = await addRecurringCostCore(ctx, {});
    expect(r.ok).toBe(false);
    expect(w.addRecurringCost).not.toHaveBeenCalled();
  });
  it('maps RPC codes to messages, unknown codes to serverError', async () => {
    w.addRecurringCost.mockResolvedValue({ ok: false, code: 'sv_cost_end_before_start' });
    expect(await addRecurringCostCore(ctx, base)).toEqual({ ok: false, message: COST_COPY.endBeforeStart });
    w.addRecurringCost.mockResolvedValue({ ok: false, code: 'toString' });
    expect(await addRecurringCostCore(ctx, base)).toEqual({ ok: false, message: COST_COPY.serverError });
  });
});

describe('stopRecurringCostCore', () => {
  it('stops from the first of the month with the actor', async () => {
    expect(await stopRecurringCostCore(ctx, { seriesId: UUID, fromMonth: '2026-11' })).toEqual({ ok: true, message: COST_COPY.successStop });
    expect(w.stopRecurringCost).toHaveBeenCalledWith({ seriesId: UUID, from: '2026-11-01', actor: 'admin-1' });
  });
  it('rejects a bad month and maps already_stopped', async () => {
    expect((await stopRecurringCostCore(ctx, { seriesId: UUID, fromMonth: '2026-1' })).ok).toBe(false);
    w.stopRecurringCost.mockResolvedValue({ ok: false, code: 'sv_series_already_stopped' });
    expect(await stopRecurringCostCore(ctx, { seriesId: UUID, fromMonth: '2026-11' })).toEqual({ ok: false, message: COST_COPY.alreadyStopped });
  });
});

describe('addProjectCostCore', () => {
  const base = { projectId: UUID, incurredOn: '2026-10-02', category: 'autre', label: 'Photos', amount: '12,5' };
  it('adds with cents, null vat by default and the actor', async () => {
    expect(await addProjectCostCore(ctx, base)).toEqual({ ok: true, message: COST_COPY.successCost });
    expect(w.addProjectCost).toHaveBeenCalledWith({
      projectId: UUID,
      incurredOn: '2026-10-02',
      category: 'autre',
      label: 'Photos',
      amountCents: 1250,
      vatCents: null,
      actor: 'admin-1',
    });
  });
  it('passes the vat in cents', async () => {
    await addProjectCostCore(ctx, { ...base, vat: '2,5' });
    expect(w.addProjectCost.mock.calls[0][0]).toMatchObject({ vatCents: 250 });
  });
  it('maps sv_project_not_found', async () => {
    w.addProjectCost.mockResolvedValue({ ok: false, code: 'sv_project_not_found' });
    expect(await addProjectCostCore(ctx, base)).toEqual({ ok: false, message: COST_COPY.projectUnknown });
  });
});

describe('voidProjectCostCore', () => {
  it('voids with the actor, accepting a string or numeric id', async () => {
    expect(await voidProjectCostCore(ctx, { costId: '4' })).toEqual({ ok: true, message: COST_COPY.successVoid });
    await voidProjectCostCore(ctx, { costId: 5 });
    expect(w.voidProjectCost).toHaveBeenNthCalledWith(1, { costId: 4, actor: 'admin-1' });
    expect(w.voidProjectCost).toHaveBeenNthCalledWith(2, { costId: 5, actor: 'admin-1' });
  });
  it('rejects a non-positive or non-numeric id', async () => {
    for (const costId of ['0', 'x', '', -1]) expect((await voidProjectCostCore(ctx, { costId })).ok).toBe(false);
    expect(w.voidProjectCost).not.toHaveBeenCalled();
  });
  it('maps already_voided', async () => {
    w.voidProjectCost.mockResolvedValue({ ok: false, code: 'sv_cost_already_voided' });
    expect(await voidProjectCostCore(ctx, { costId: '4' })).toEqual({ ok: false, message: COST_COPY.alreadyVoided });
  });
});

describe('saveBalanceCore', () => {
  it('stores a signed balance with a null note by default', async () => {
    expect(await saveBalanceCore(ctx, { amount: '-100', asOf: '2026-10-01' })).toEqual({ ok: true, message: COST_COPY.successBalance });
    expect(w.addCashBalance).toHaveBeenCalledWith({ amountCents: -10000, asOf: '2026-10-01', note: null, actor: 'admin-1' });
  });
  it('rejects a note over 200 characters', async () => {
    expect(await saveBalanceCore(ctx, { amount: '1', asOf: '2026-10-01', note: 'x'.repeat(201) })).toEqual({
      ok: false,
      message: COST_COPY.noteInvalid,
    });
  });
});
