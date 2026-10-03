import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
vi.mock('@/lib/server/auth/dal', () => ({ requireAdmin: () => requireAdmin() }));

const setLeadStatus = vi.fn();
const correctLeadSource = vi.fn();
const eraseLead = vi.fn();
const markReturnSeen = vi.fn();
vi.mock('@/lib/server/leads/admin', () => ({
  setLeadStatus: (...a: unknown[]) => setLeadStatus(...a),
  correctLeadSource: (...a: unknown[]) => correctLeadSource(...a),
  eraseLead: (...a: unknown[]) => eraseLead(...a),
  markReturnSeen: (...a: unknown[]) => markReturnSeen(...a),
}));

const convertLead = vi.fn();
vi.mock('@/lib/server/projects/convert', () => ({ convertLead: (...a: unknown[]) => convertLead(...a) }));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => revalidatePath(p) }));

const { convertLeadAction, setStatusAction, markLostAction, correctSourceAction, eraseLeadAction, markReturnSeenAction } =
  await import('./actions');

const ID = '11111111-1111-4111-8111-111111111111';
const idle = { status: 'idle' as const };
function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let contactEmail: string | null;
const maybeSingle = vi.fn(async () => ({ data: contactEmail ? { contact_email: contactEmail } : null }));
const supabase = {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
};

beforeEach(() => {
  vi.clearAllMocks();
  contactEmail = 'Jean@Acme.fr';
  requireAdmin.mockResolvedValue({ user: { id: 'admin-1' }, supabase });
  for (const m of [setLeadStatus, correctLeadSource, eraseLead, markReturnSeen]) {
    m.mockResolvedValue({ ok: true, data: null });
  }
});

const cases: [string, (p: typeof idle, f: FormData) => Promise<unknown>, Record<string, string>, ReturnType<typeof vi.fn>][] = [
  ['setStatusAction', (p, f) => setStatusAction(p, f), { leadId: ID, status: 'rdv' }, setLeadStatus],
  ['markLostAction', (p, f) => markLostAction(p, f), { leadId: ID, reason: 'autre' }, setLeadStatus],
  [
    'correctSourceAction',
    (p, f) => correctSourceAction(p, f),
    { leadId: ID, source: 'google', medium: 'cpc', campaign: '', reason: 'Erreur de saisie UTM' },
    correctLeadSource,
  ],
  [
    'eraseLeadAction',
    (p, f) => eraseLeadAction(p, f),
    { leadId: ID, reason: 'doublon', confirmEmail: 'jean@acme.fr' },
    eraseLead,
  ],
  ['markReturnSeenAction', (p, f) => markReturnSeenAction(p, f), { leadId: ID }, markReturnSeen],
];

describe.each(cases)('%s guard', (_name, run, fields, wrapper) => {
  it('propagates requireAdmin rejection and calls no wrapper', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(run(idle, form(fields))).rejects.toThrow('NOT_FOUND');
    expect(wrapper).not.toHaveBeenCalled();
  });
  it('calls requireAdmin before the wrapper', async () => {
    await run(idle, form(fields));
    expect(requireAdmin.mock.invocationCallOrder[0]).toBeLessThan(wrapper.mock.invocationCallOrder[0]);
  });
});

describe('setStatusAction', () => {
  it('refuses lost', async () => {
    const res = await setStatusAction(idle, form({ leadId: ID, status: 'lost' }));
    expect(res).toEqual({ status: 'error', message: 'Choisissez un motif de perte avant de continuer.' });
    expect(setLeadStatus).not.toHaveBeenCalled();
  });
  it('succeeds and revalidates', async () => {
    const res = await setStatusAction(idle, form({ leadId: ID, status: 'rdv' }));
    expect(res).toEqual({ status: 'success', message: 'Statut mis à jour : RDV.' });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/leads');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/leads/${ID}`);
  });
  it('maps wrapper error to the status error', async () => {
    setLeadStatus.mockResolvedValue({ ok: false, code: 'sv_lead_not_found' });
    const res = await setStatusAction(idle, form({ leadId: ID, status: 'rdv' }));
    expect(res).toEqual({
      status: 'error',
      message: "Le statut n'a pas pu être modifié. Réessayez dans un instant.",
    });
  });
});

describe('markLostAction', () => {
  it('requires a reason', async () => {
    const res = await markLostAction(idle, form({ leadId: ID, reason: '' }));
    expect(res).toEqual({ status: 'error', message: 'Choisissez un motif de perte avant de continuer.' });
    expect(setLeadStatus).not.toHaveBeenCalled();
  });
  it('passes reason and note', async () => {
    const res = await markLostAction(idle, form({ leadId: ID, reason: 'hors_budget', note: 'trop cher' }));
    expect(res).toEqual({ status: 'success', message: 'Statut mis à jour : Perdu.' });
    expect(setLeadStatus).toHaveBeenCalledWith({
      leadId: ID,
      status: 'lost',
      actor: 'admin-1',
      lostReason: 'hors_budget',
      note: 'trop cher',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/leads');
  });
  it('rejects a note over 500 characters', async () => {
    const res = await markLostAction(idle, form({ leadId: ID, reason: 'autre', note: 'x'.repeat(501) }));
    expect(res.status).toBe('error');
    expect(setLeadStatus).not.toHaveBeenCalled();
  });
});

describe('correctSourceAction', () => {
  const ok = { leadId: ID, source: 'google', medium: 'cpc', campaign: '' };
  it('rejects a 9-character reason', async () => {
    const res = await correctSourceAction(idle, form({ ...ok, reason: '123456789' }));
    expect(res).toEqual({
      status: 'error',
      message: 'Indiquez le motif de la correction (10 caractères minimum).',
    });
    expect(correctLeadSource).not.toHaveBeenCalled();
  });
  it('corrects with the session user as actor', async () => {
    const res = await correctSourceAction(idle, form({ ...ok, reason: '1234567890' }));
    expect(res).toEqual({
      status: 'success',
      message: "Source corrigée. L'ancienne valeur reste visible dans le journal.",
    });
    expect(correctLeadSource).toHaveBeenCalledWith(expect.objectContaining({ actor: 'admin-1', source: 'google' }));
  });
});

describe('eraseLeadAction', () => {
  it('refuses a mismatching e-mail', async () => {
    const res = await eraseLeadAction(idle, form({ leadId: ID, reason: 'doublon', confirmEmail: 'autre@x.fr' }));
    expect(res.status).toBe('error');
    expect(eraseLead).not.toHaveBeenCalled();
  });
  it('erases on a case-insensitive match', async () => {
    const res = await eraseLeadAction(idle, form({ leadId: ID, reason: 'doublon', confirmEmail: 'JEAN@acme.FR' }));
    expect(res.status).toBe('success');
    expect(eraseLead).toHaveBeenCalledWith(ID, 'admin-1', 'doublon');
  });
  it('refuses an unknown reason', async () => {
    const res = await eraseLeadAction(idle, form({ leadId: ID, reason: 'nope', confirmEmail: 'jean@acme.fr' }));
    expect(res.status).toBe('error');
    expect(eraseLead).not.toHaveBeenCalled();
  });
});

describe('markReturnSeenAction', () => {
  it('marks seen with the actor', async () => {
    const res = await markReturnSeenAction(idle, form({ leadId: ID }));
    expect(res.status).toBe('success');
    expect(markReturnSeen).toHaveBeenCalledWith(ID, 'admin-1');
  });
});

describe('convertLeadAction', () => {
  const fields = {
    leadId: ID,
    name: 'Acme',
    email: 'jean@acme.fr',
    siret: '55210055400025',
    company_nom: 'ACME SAS',
    companySource: 'api',
    offer: 'site-vitrine',
    projectTitle: 'Site Acme',
  };
  const okRes = { ok: true, clientId: 'c1', projectId: 'p1', clientReused: false, email: 'jean@acme.fr', mailSent: true };

  it('propagates requireAdmin rejection and never calls the service', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(convertLeadAction(idle, form(fields))).rejects.toThrow('NOT_FOUND');
    expect(convertLead).not.toHaveBeenCalled();
  });

  it('passes the form and actor to the service', async () => {
    convertLead.mockResolvedValue(okRes);
    await convertLeadAction(idle, form(fields));
    expect(convertLead).toHaveBeenCalledWith(
      expect.objectContaining({ leadId: ID, offer: 'site-vitrine', company: { nom: 'ACME SAS' } }),
      { userId: 'admin-1' },
    );
  });

  it('success with mail sent', async () => {
    convertLead.mockResolvedValue(okRes);
    const res = await convertLeadAction(idle, form(fields));
    expect(res).toEqual({
      status: 'success',
      message: 'Client créé. Invitation envoyée à jean@acme.fr.',
      projectId: 'p1',
      mailSent: true,
      clientReused: false,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/admin/leads');
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/leads/${ID}`);
    expect(revalidatePath).toHaveBeenCalledWith('/admin/projets');
  });

  it('success with mail failure shows the warn text', async () => {
    convertLead.mockResolvedValue({ ...okRes, mailSent: false });
    const res = await convertLeadAction(idle, form(fields));
    expect(res.status).toBe('success');
    expect(res.mailSent).toBe(false);
    expect(res.message).toMatch(/n'a pas pu partir/);
  });

  it.each(['role_conflict', 'already_member', 'existing_account'])('%s maps to the e-mail used text', async (code) => {
    convertLead.mockResolvedValue({ ok: false, code });
    const res = await convertLeadAction(idle, form(fields));
    expect(res.status).toBe('error');
    expect(res.message).toMatch(/^Cette adresse e-mail est déjà utilisée/);
  });

  it('maps already_converted and not_convertible', async () => {
    convertLead.mockResolvedValue({ ok: false, code: 'already_converted' });
    expect((await convertLeadAction(idle, form(fields))).message).toBe('Ce lead est déjà converti en client.');
    convertLead.mockResolvedValue({ ok: false, code: 'not_convertible' });
    expect((await convertLeadAction(idle, form(fields))).message).toMatch(/Qualifié/);
  });

  it('maps unknown errors to a generic error without revalidating', async () => {
    convertLead.mockResolvedValue({ ok: false, code: 'error' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await convertLeadAction(idle, form(fields));
    expect(res.status).toBe('error');
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
