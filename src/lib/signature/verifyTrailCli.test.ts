import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildExport } from './chainFixtures';

const root = process.cwd();
const dir = mkdtempSync(path.join(tmpdir(), 'verify-trail-'));

function run(args: string[], input?: string) {
  return spawnSync(process.execPath, ['scripts/verify-trail.mjs', ...args], {
    encoding: 'utf8',
    cwd: root,
    input,
  });
}

function write(name: string, content: unknown) {
  const p = path.join(dir, name);
  writeFileSync(p, typeof content === 'string' ? content : JSON.stringify(content));
  return p;
}

describe('scripts/verify-trail.mjs', () => {
  it('exit 0 and OK with count and head on a valid export', () => {
    const ex = buildExport();
    const r = run([write('ok.json', ex)]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('OK');
    expect(r.stdout).toContain('3');
    expect(r.stdout).toContain(ex.headHash!);
  });

  it('exit 0 on an empty export', () => {
    expect(run([write('empty.json', buildExport([]))]).status).toBe(0);
  });

  it('exit 1 with seq and link_hash on altered payload', () => {
    const ex = buildExport();
    ex.events[1].payload = '{"n":42}';
    const r = run([write('tamper.json', ex)]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('seq 2');
    expect(r.stdout).toContain('link_hash');
  });

  it('exit 1 on altered headHash', () => {
    const ex = buildExport();
    ex.headHash = 'a'.repeat(64);
    const r = run([write('head.json', ex)]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('head');
  });

  it('exit 1 with format on wrong formatVersion', () => {
    const r = run([write('fmt.json', { ...buildExport(), formatVersion: 9 })]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('format');
  });

  it('exit 2 on missing argument, missing file, non-JSON', () => {
    const none = run([]);
    expect(none.status).toBe(2);
    expect(none.stderr).toContain('Usage');
    expect(run([path.join(dir, 'does-not-exist.json')]).status).toBe(2);
    expect(run([write('bad.json', 'not json {')]).status).toBe(2);
  });

  it('reads from stdin with -', () => {
    const ex = buildExport();
    const r = run(['-'], JSON.stringify(ex));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(ex.headHash!);
    expect(run(['-'], 'garbage').status).toBe(2);
  });
});
