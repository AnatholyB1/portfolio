import { describe, expect, it } from 'vitest';
import { adminNavKeyForPath } from './AdminNav';

describe('adminNavKeyForPath', () => {
  it('maps the admin landing to clients', () => {
    expect(adminNavKeyForPath('/admin')).toBe('clients');
    expect(adminNavKeyForPath('/admin/')).toBe('clients');
  });

  it('maps sections and their detail pages', () => {
    expect(adminNavKeyForPath('/admin/leads')).toBe('leads');
    expect(adminNavKeyForPath('/admin/leads/abc')).toBe('leads');
    expect(adminNavKeyForPath('/admin/projets/xyz')).toBe('projets');
    expect(adminNavKeyForPath('/admin/pilotage/couts')).toBe('pilotage');
    expect(adminNavKeyForPath('/admin/emails')).toBe('emails');
  });

  it('returns undefined for unknown or empty paths', () => {
    expect(adminNavKeyForPath('/admin/inconnu')).toBeUndefined();
    expect(adminNavKeyForPath(null)).toBeUndefined();
    expect(adminNavKeyForPath('/admin/leadsx')).toBeUndefined();
  });
});
