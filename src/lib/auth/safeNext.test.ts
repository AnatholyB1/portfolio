import { describe, expect, it } from 'vitest';
import { safeNext } from './safeNext';

describe('safeNext', () => {
  it('keeps a path under the admin destination', () => {
    expect(safeNext('/admin/x', '/admin')).toBe('/admin/x');
  });
  it('keeps the destination itself, with query or hash', () => {
    expect(safeNext('/admin', '/admin')).toBe('/admin');
    expect(safeNext('/espace-client?a=1', '/espace-client')).toBe('/espace-client?a=1');
    expect(safeNext('/espace-client#x', '/espace-client')).toBe('/espace-client#x');
  });
  it('rejects a path under the other destination', () => {
    expect(safeNext('/espace-client', '/admin')).toBe('/admin');
  });
  it('rejects protocol-relative URLs', () => {
    expect(safeNext('//evil.com', '/admin')).toBe('/admin');
    expect(safeNext('/admin//evil.com', '/admin')).toBe('/admin');
  });
  it('rejects absolute URLs', () => {
    expect(safeNext('https://evil.com/admin', '/admin')).toBe('/admin');
  });
  it('rejects backslashes', () => {
    expect(safeNext('/admin\\evil', '/admin')).toBe('/admin');
  });
  it('rejects look-alike prefixes', () => {
    expect(safeNext('/administration', '/admin')).toBe('/admin');
  });
  it('falls back on null or empty', () => {
    expect(safeNext(null, '/espace-client')).toBe('/espace-client');
    expect(safeNext(undefined, '/admin')).toBe('/admin');
    expect(safeNext('', '/admin')).toBe('/admin');
  });
});
