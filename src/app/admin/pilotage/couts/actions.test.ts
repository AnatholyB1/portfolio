import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }));

const w = {
  addRecurringCost: vi.fn(),
  stopRecurringCost: vi.fn(),
  addProjectCost: vi.fn(),
  voidProjectCost: vi.fn(),
  addCashBalance: vi.fn(),
};
vi.mock('@/lib/server/pilotage/adminCosts', () => ({
  addRecurringCost: (...a: unknown[]) => w.addRecurringCost(...a),
  stopRecurringCost: (...a: unknown[]) => w.stopRecurringCost(...a),
  addProjectCost: (...a: unknown[]) => w.addProjectCost(...a),
  voidProjectCost: (...a: unknown[]) => w.voidProjectCost(...a),
  addCashBalance: (...a: unknown[]) => w.addCashBalance(...a),
}));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const actions = await import('./actions');

const idle = { status: 'idle' as const };
const UUID = '11111111-1111-4111-8111-111111111111';
function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const recurring = {
  label: 'Figma',
  category: 'outils',
  amount: '12,5',
  frequency: 'monthly',
  startsOn: '2026-10-01',
};
const project = {
  projectId: UUID,
  incurredOn: '2026-10-02',
  category: 'autre',
  label: 'Photos',
  amount: '12,5',
};
const cases = [
  ['addRecurringCostAction', 'addRecurringCost', recurring],
  ['stopRecurringAction', 'stopRecurringCost', { seriesId: UUID, fromMonth: '2026-11' }],
  ['addProjectCostAction', 'addProjectCost', project],
  ['voidProjectCostAction', 'voidProjectCost', { costId: '4' }],
  ['saveBalanceAction', 'addCashBalance', { amount: '100', asOf: '2026-10-01' }],
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } });
  for (const fn of Object.values(w)) fn.mockResolvedValue({ ok: true, data: {} });
});

describe.each(cases)('%s', (action, wrapper, fields) => {
  it('propagates requireAdmin rejection without calling the wrapper', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(actions[action](idle, form(fields))).rejects.toThrow('NOT_FOUND');
    expect(w[wrapper]).not.toHaveBeenCalled();
  });

  it('calls requireAdmin before the wrapper', async () => {
    await actions[action](idle, form(fields));
    expect(requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(
      w[wrapper].mock.invocationCallOrder[0],
    );
  });
});

describe('addProjectCostAction', () => {
  it('stores cents, passes the actor, revalidates', async () => {
    const res = await actions.addProjectCostAction(idle, form(project));
    expect(res).toEqual({ status: 'success', message: 'Coût ajouté.' });
    expect(w.addProjectCost).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 1250, actor: 'admin-1', vatCents: null }),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/admin/pilotage');
    expect(revalidatePath).toHaveBeenCalledWith('/admin/pilotage/couts');
  });

  it('rejects 0 without calling the wrapper', async () => {
    const res = await actions.addProjectCostAction(idle, form({ ...project, amount: '0' }));
    expect(res).toEqual({
      status: 'error',
      message: 'Saisissez un montant supérieur à 0, par exemple 12,50.',
    });
    expect(w.addProjectCost).not.toHaveBeenCalled();
  });

  it.each([
    ['sv_project_not_found', "Ce projet n'existe plus. Rechargez la page et choisissez-en un autre."],
    ['sv_cost_date_invalid', "Cette date est trop éloignée. Vérifiez l'année."],
    ['sv_cost_end_before_start', 'La date de fin doit suivre la date de début.'],
    ['sv_cost_already_voided', 'Ce coût est déjà annulé.'],
    ['sv_series_already_stopped', 'Cette charge est déjà arrêtée.'],
    [
      'unknown',
      "L'enregistrement a échoué. Rien n'a été modifié. Réessayez ; si l'erreur persiste, rechargez la page.",
    ],
    [
      'constructor',
      "L'enregistrement a échoué. Rien n'a été modifié. Réessayez ; si l'erreur persiste, rechargez la page.",
    ],
  ])('maps %s', async (code, message) => {
    w.addProjectCost.mockResolvedValue({ ok: false, code });
    const res = await actions.addProjectCostAction(idle, form(project));
    expect(res).toEqual({ status: 'error', message });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('other actions', () => {
  it('addRecurringCostAction passes the series id for a new version', async () => {
    const res = await actions.addRecurringCostAction(idle, form({ ...recurring, seriesId: UUID }));
    expect(res).toEqual({ status: 'success', message: 'Charge ajoutée.' });
    expect(w.addRecurringCost).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: UUID, amountCents: 1250, actor: 'admin-1' }),
    );
  });

  it('stopRecurringAction maps the month to a date', async () => {
    const res = await actions.stopRecurringAction(
      idle,
      form({ seriesId: UUID, fromMonth: '2026-11' }),
    );
    expect(res).toEqual({ status: 'success', message: 'Charge arrêtée.' });
    expect(w.stopRecurringCost).toHaveBeenCalledWith({
      seriesId: UUID,
      from: '2026-11-01',
      actor: 'admin-1',
    });
  });

  it('voidProjectCostAction voids by id', async () => {
    const res = await actions.voidProjectCostAction(idle, form({ costId: '4' }));
    expect(res).toEqual({ status: 'success', message: 'Coût annulé.' });
    expect(w.voidProjectCost).toHaveBeenCalledWith({ costId: 4, actor: 'admin-1' });
  });

  it('saveBalanceAction stores -500 as -50000', async () => {
    const res = await actions.saveBalanceAction(idle, form({ amount: '-500', asOf: '2026-10-01' }));
    expect(res).toEqual({ status: 'success', message: 'Solde enregistré.' });
    expect(w.addCashBalance).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: -50000, note: null, actor: 'admin-1' }),
    );
  });
});
