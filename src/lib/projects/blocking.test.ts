import { describe, expect, it } from 'vitest';
import {
  DORMANT_AFTER_DAYS,
  classifyProject,
  daysSince,
  filterProjects,
  lastActivity,
  sortProjects,
  type AdminProjectRow,
} from './blocking';
import type { ProjectState, StepIndex } from './steps';

const NOW = new Date('2026-02-01T12:00:00.000Z');
const daysAgo = (d: number, extraH = 0) => new Date(NOW.getTime() - d * 86400000 - extraH * 3600000).toISOString();

function state(step: StepIndex | null, sinceAt = daysAgo(1)): ProjectState {
  const waiting = step === null ? 'none' : step === 1 || step >= 5 ? 'client' : 'admin';
  return {
    currentStep: step,
    done: step === null,
    steps: [],
    waitingOn: waiting,
    expectedAction: '',
    sinceAt,
  };
}

function row(over: Partial<AdminProjectRow> & { projectId: string }): AdminProjectRow {
  const st = over.state ?? state(2);
  const c = classifyProject(st, over.lastActivityAt ?? daysAgo(1), NOW);
  return {
    clientName: 'Client',
    title: 'Projet',
    offer: 'vitrine',
    state: st,
    lastActivityAt: daysAgo(1),
    daysWaiting: c.daysWaiting,
    isDormant: c.isDormant,
    blockers: c.blockers,
    ...over,
  };
}

describe('constants and helpers', () => {
  it('DORMANT_AFTER_DAYS is 14', () => {
    expect(DORMANT_AFTER_DAYS).toBe(14);
  });

  it('lastActivity returns max non-null ISO', () => {
    const a = '2026-01-01T00:00:00.000Z';
    const b = '2026-01-05T00:00:00.000Z';
    const c = '2026-01-03T00:00:00.000Z';
    expect(lastActivity({ startedAt: a, dates: [c, null], lastSignInAt: b })).toBe(b);
    expect(lastActivity({ startedAt: a, dates: [], lastSignInAt: null })).toBe(a);
  });

  it('daysSince floors to whole days', () => {
    expect(daysSince(daysAgo(13, 23), NOW)).toBe(13);
    expect(daysSince(daysAgo(0), NOW)).toBe(0);
  });
});

describe('classifyProject', () => {
  it('client waiting -> client blocker', () => {
    expect(classifyProject(state(1), daysAgo(1), NOW).blockers).toEqual(['client']);
  });
  it('admin waiting -> admin blocker', () => {
    expect(classifyProject(state(2), daysAgo(1), NOW).blockers).toEqual(['admin']);
  });
  it('14 days idle adds dormant in addition', () => {
    const c = classifyProject(state(2), daysAgo(14), NOW);
    expect(c.blockers).toEqual(['admin', 'dormant']);
    expect(c.isDormant).toBe(true);
  });
  it('13 days idle is not dormant', () => {
    const c = classifyProject(state(2), daysAgo(13, 23), NOW);
    expect(c.isDormant).toBe(false);
    expect(c.blockers).toEqual(['admin']);
  });
  it('done project has no blockers even if old', () => {
    const c = classifyProject(state(null), daysAgo(100), NOW);
    expect(c.blockers).toEqual([]);
    expect(c.isDormant).toBe(false);
  });
  it('daysWaiting from sinceAt', () => {
    expect(classifyProject(state(2, daysAgo(5)), daysAgo(1), NOW).daysWaiting).toBe(5);
  });
});

describe('filterProjects', () => {
  const rows = [
    row({ projectId: 'a', state: state(3) }),
    row({ projectId: 'b', state: state(null) }),
    row({ projectId: 'c', state: state(1), lastActivityAt: daysAgo(20) }),
  ];
  it('by etape', () => {
    expect(filterProjects(rows, { etape: '3' }).map((r) => r.projectId)).toEqual(['a']);
    expect(filterProjects(rows, { etape: 'done' }).map((r) => r.projectId)).toEqual(['b']);
  });
  it('by blocage', () => {
    const c = row({ projectId: 'c', state: state(1), lastActivityAt: daysAgo(20) });
    expect(filterProjects([rows[0], c], { blocage: 'dormant' }).map((r) => r.projectId)).toEqual(['c']);
    expect(filterProjects([rows[0], c], { blocage: 'admin' }).map((r) => r.projectId)).toEqual(['a']);
  });
  it('unknown values are ignored', () => {
    expect(filterProjects(rows, { etape: '99', blocage: 'zzz' })).toHaveLength(3);
  });
});

describe('sortProjects', () => {
  it('default: admin-waiting first then daysWaiting desc', () => {
    const rows = [
      row({ projectId: 'client-old', state: state(1, daysAgo(30)) }),
      row({ projectId: 'admin-2', state: state(2, daysAgo(2)) }),
      row({ projectId: 'admin-9', state: state(3, daysAgo(9)) }),
      row({ projectId: 'done', state: state(null) }),
    ];
    expect(sortProjects(rows).map((r) => r.projectId)).toEqual(['admin-9', 'admin-2', 'client-old', 'done']);
  });
  it('explicit keys and direction', () => {
    const rows = [
      row({ projectId: 'b', clientName: 'Bravo', state: state(4) }),
      row({ projectId: 'a', clientName: 'Alpha', state: state(2) }),
    ];
    expect(sortProjects(rows, 'client', 'asc').map((r) => r.projectId)).toEqual(['a', 'b']);
    expect(sortProjects(rows, 'client', 'desc').map((r) => r.projectId)).toEqual(['b', 'a']);
    expect(sortProjects(rows, 'etape', 'asc').map((r) => r.projectId)).toEqual(['a', 'b']);
  });
  it('stable for ties and does not mutate input', () => {
    const rows = [
      row({ projectId: 'x', clientName: 'Same' }),
      row({ projectId: 'y', clientName: 'Same' }),
      row({ projectId: 'z', clientName: 'Same' }),
    ];
    expect(sortProjects(rows, 'client', 'asc').map((r) => r.projectId)).toEqual(['x', 'y', 'z']);
    expect(rows.map((r) => r.projectId)).toEqual(['x', 'y', 'z']);
  });
});
