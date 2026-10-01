import { describe, expect, it } from 'vitest';
import { INVITE_COPY, inviteSchema } from './inviteSchema';

const base = {
  name: 'Acme',
  email: 'Client@Example.com',
  siret: '552 100 554 00025',
  company: null,
  companySource: 'manual' as const,
};

describe('inviteSchema', () => {
  it('strips whitespace from the SIRET and lowercases the email', () => {
    const r = inviteSchema.parse(base);
    expect(r.siret).toBe('55210055400025');
    expect(r.email).toBe('client@example.com');
  });

  it('rejects 13 and 15 digit SIRETs and letters', () => {
    expect(inviteSchema.safeParse({ ...base, siret: '5521005540002' }).success).toBe(false);
    expect(inviteSchema.safeParse({ ...base, siret: '552100554000255' }).success).toBe(false);
    expect(inviteSchema.safeParse({ ...base, siret: '5521005540002A' }).success).toBe(false);
  });

  it('rejects an invalid company source and bad email', () => {
    expect(inviteSchema.safeParse({ ...base, companySource: 'x' }).success).toBe(false);
    expect(inviteSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
  });

  it('builds the success message', () => {
    expect(INVITE_COPY.success('a@b.fr')).toBe('Invitation envoyée à a@b.fr.');
  });
});
