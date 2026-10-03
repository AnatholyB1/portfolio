/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const S = vi.hoisted(() => ({
  tables: {} as Record<string, any[]>,
  selects: {} as Record<string, string>,
  rpc: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/rpc', () => ({ callRpc: (...a: any[]) => S.rpc(...a) }));

import { latestConsent, loadAdminProjects, loadClientProjects, loadProjectBundle, pickActiveProject } from './read';

function fake() {
  return {
    from(table: string) {
      let rows = S.tables[table] ?? [];
      const b: any = {
        select(cols: string) {
          S.selects[table] = cols;
          return b;
        },
        eq(col: string, v: any) {
          rows = rows.filter((r) => r[col] === v);
          return b;
        },
        in(col: string, vs: any[]) {
          rows = rows.filter((r) => vs.includes(r[col]));
          return b;
        },
        order: () => b,
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        then: (res: any, rej: any) => Promise.resolve({ data: rows, error: null }).then(res, rej),
      };
      return b;
    },
  } as any;
}

const NOW = new Date('2026-10-03T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';
const C1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function project(id = P1, startedAt = daysAgo(60)) {
  return { id, client_id: C1, lead_id: null, title: 'Site', offer: 'vitrine', started_at: startedAt, created_at: startedAt };
}
const fact = (id: number, type: string, at: string, project_id = P1) => ({
  id, project_id, type, target_fact_id: null, actor_kind: 'admin', occurred_at: at, created_at: at,
});

beforeEach(() => {
  S.tables = { sv_clients: [{ id: C1, name: 'Jean', siret: '123', company: { nom: 'ACME SAS' } }] };
  S.selects = {};
  S.rpc.mockReset();
  S.rpc.mockResolvedValue({ ok: true, data: [] });
});

describe('portal loaders', () => {
  it('loadClientProjects maps rows', async () => {
    S.tables.sv_projects = [project()];
    const r = await loadClientProjects(fake());
    expect(r).toEqual([{ id: P1, clientId: C1, title: 'Site', offer: 'vitrine', startedAt: project().started_at }]);
  });

  it('returns null when the project is not visible', async () => {
    S.tables.sv_projects = [];
    expect(await loadProjectBundle(fake(), P1, NOW)).toBeNull();
  });

  it('uses explicit columns without actor_id / uploaded_by', async () => {
    S.tables.sv_projects = [project()];
    await loadProjectBundle(fake(), P1, NOW);
    expect(S.selects.sv_project_facts).not.toContain('actor_id');
    expect(S.selects.sv_project_files).not.toMatch(/uploaded_by(,|$)/);
    for (const s of Object.values(S.selects)) expect(s).not.toBe('*');
  });

  it('drops stale pending files, keeps ready, newest first', async () => {
    S.tables.sv_projects = [project()];
    const f = (id: string, status: string, at: string) => ({
      id, project_id: P1, storage_path: id, filename: id, mime: 'a/b', size_bytes: 1,
      uploaded_by_kind: 'client', status, created_at: at, ready_at: status === 'ready' ? at : null,
    });
    S.tables.sv_project_files = [
      f('old-pending', 'pending', daysAgo(3)),
      f('fresh-pending', 'pending', new Date(NOW.getTime() - 3_600_000).toISOString()),
      f('ready-old', 'ready', daysAgo(10)),
      f('ready-new', 'ready', daysAgo(2)),
    ];
    const b = await loadProjectBundle(fake(), P1, NOW);
    expect(b!.files.map((x) => x.id)).toEqual(['fresh-pending', 'ready-new', 'ready-old']);
  });

  it('state equals deriveProjectState', async () => {
    S.tables.sv_projects = [project()];
    S.tables.sv_project_facts = [fact(1, 'onboarding_completed', daysAgo(5))];
    const b = await loadProjectBundle(fake(), P1, NOW);
    expect(b!.state.currentStep).toBe(2);
    expect(b!.state.waitingOn).toBe('admin');
    expect(b!.facts[0].createdAt).toBe(daysAgo(5));
  });

  it('latestConsent picks the greatest id', () => {
    const c = (id: number) => ({ id, projectId: P1, granted: true, textVersion: 'v', textSnapshot: 't', createdAt: '' });
    expect(latestConsent([c(2), c(5), c(3)])!.id).toBe(5);
    expect(latestConsent([])).toBeNull();
  });

  it('pickActiveProject whitelists requested id and falls back to most active', () => {
    const p = (id: string) => ({ id, clientId: C1, title: '', offer: '', startedAt: daysAgo(30) });
    const list = [p(P1), p(P2)];
    expect(pickActiveProject(list, P2, {})!.id).toBe(P2);
    expect(pickActiveProject(list, 'not-in-list', { [P1]: daysAgo(1), [P2]: daysAgo(4) })!.id).toBe(P1);
    expect(pickActiveProject([], P1, {})).toBeNull();
  });
});

describe('loadAdminProjects', () => {
  function seedStep2() {
    S.tables.sv_projects = [project()];
    S.tables.sv_project_facts = [fact(1, 'onboarding_completed', daysAgo(20))];
  }

  it('admin-waiting and dormant with no sign-in', async () => {
    seedStep2();
    const rows = await loadAdminProjects(fake(), NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0].blockers).toEqual(['admin', 'dormant']);
    expect(rows[0].daysWaiting).toBe(20);
  });

  it('recent member sign-in removes dormant', async () => {
    seedStep2();
    S.rpc.mockResolvedValue({ ok: true, data: [{ client_id: C1, last_sign_in_at: daysAgo(2) }] });
    const rows = await loadAdminProjects(fake(), NOW);
    expect(rows[0].blockers).toEqual(['admin']);
    expect(S.rpc).toHaveBeenCalledWith('admin/projects', 'sv_client_last_sign_in', { p_client_ids: [C1] });
  });

  it('rpc failure still returns rows', async () => {
    seedStep2();
    S.rpc.mockResolvedValue({ ok: false, code: 'unknown' });
    const rows = await loadAdminProjects(fake(), NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0].isDormant).toBe(true);
  });

  it('done project has no blockers', async () => {
    S.tables.sv_projects = [project()];
    S.tables.sv_project_facts = [
      'onboarding_completed', 'quote_accepted', 'contract_signed', 'deposit_received',
      'production_completed', 'acceptance_signed', 'balance_received',
    ].map((t, i) => fact(i + 1, t, daysAgo(30)));
    const rows = await loadAdminProjects(fake(), NOW);
    expect(rows[0].state.done).toBe(true);
    expect(rows[0].blockers).toEqual([]);
  });

  it('clientName prefers company.nom, falls back to name', async () => {
    seedStep2();
    expect((await loadAdminProjects(fake(), NOW))[0].clientName).toBe('ACME SAS');
    S.tables.sv_clients = [{ id: C1, name: 'Jean', siret: null, company: null }];
    expect((await loadAdminProjects(fake(), NOW))[0].clientName).toBe('Jean');
  });
});
