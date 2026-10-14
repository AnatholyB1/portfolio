import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NOT_SET, formatDateFr, formatSiret } from './format';

const SRC = fileURLToPath(new URL('../../', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const FILES = ['app/admin', 'app/espace-client', 'components/admin', 'components/portal', 'lib/server/pilotage']
  .flatMap((d) => walk(join(SRC, d)))
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));

describe('empty values are written out, never an em dash', () => {
  it('formats missing values as « Non renseigné »', () => {
    expect(NOT_SET).toBe('Non renseigné');
    expect(formatSiret('')).toBe(NOT_SET);
    expect(formatDateFr(null)).toBe(NOT_SET);
    expect(formatDateFr('nope')).toBe(NOT_SET);
  });

  it('keeps em dash string literals out of admin and portal views', () => {
    const offenders = FILES.filter((f) => /(['"`])—\1|>—<|EM_DASH/.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => f.slice(SRC.length))).toEqual([]);
  });
});
