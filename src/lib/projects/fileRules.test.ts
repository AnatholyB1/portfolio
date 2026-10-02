import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALLOWED_FILE_TYPES, MAX_FILE_BYTES, formatSize, sanitizeFilename, validateUpload } from './fileRules';

describe('validateUpload', () => {
  it('rejects too large', () => {
    expect(validateUpload({ filename: 'a.pdf', size: MAX_FILE_BYTES + 1, mime: 'application/pdf' })).toEqual({
      ok: false,
      code: 'too_large',
    });
  });
  it('rejects exe', () => {
    const r = validateUpload({ filename: 'logo.exe', size: 10, mime: 'application/octet-stream' });
    expect(r).toEqual({ ok: false, code: 'bad_type' });
  });
  it('accepts svg as vector', () => {
    expect(validateUpload({ filename: 'logo.svg', size: 10, mime: 'image/svg+xml' })).toEqual({
      ok: true,
      ext: 'svg',
      kind: 'vector',
    });
  });
  it('rejects ext/mime mismatch', () => {
    expect(validateUpload({ filename: 'doc.pdf', size: 10, mime: 'image/png' })).toEqual({ ok: false, code: 'bad_type' });
  });
  it('rejects empty size', () => {
    expect(validateUpload({ filename: 'a.pdf', size: 0, mime: 'application/pdf' })).toMatchObject({ ok: false });
  });
});

describe('sanitizeFilename', () => {
  it('strips traversal', () => {
    const s = sanitizeFilename('../../etc/passwd');
    expect(s).not.toContain('/');
    expect(s).not.toContain('..');
  });
  it('replaces spaces and keeps extension', () => {
    const s = sanitizeFilename('Mon logo (final).PNG');
    expect(s).not.toMatch(/\s/);
    expect(s.toLowerCase().endsWith('.png')).toBe(true);
  });
  it('never empty', () => {
    expect(sanitizeFilename('...')).not.toBe('');
    expect(sanitizeFilename('')).toBe('fichier');
  });
  it('caps length', () => {
    expect(sanitizeFilename('a'.repeat(300) + '.pdf').length).toBeLessThanOrEqual(120);
    expect(sanitizeFilename('a'.repeat(300) + '.pdf').endsWith('.pdf')).toBe(true);
  });
});

describe('formatSize', () => {
  it('formats Mo in French', () => expect(formatSize(2516582)).toBe('2,4 Mo'));
});

describe('bucket whitelist', () => {
  it('every mime is in the migration list', () => {
    const p = join(process.cwd(), 'supabase/migrations/20261004000000_sv_projects_engine.sql');
    if (!existsSync(p)) return;
    const sql = readFileSync(p, 'utf8');
    for (const t of ALLOWED_FILE_TYPES) for (const m of t.mimes) expect(sql).toContain(`'${m}'`);
  });
});
