import { describe, expect, it } from 'vitest';
import { INVITE_COPY, inviteInvalidMessage, inviteSchema } from './inviteSchema';

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

describe('inviteInvalidMessage (F-X1)', () => {
  const ok = { name: 'Atelier Dupont', email: 'contact@atelier.fr', siret: '12345678901234' };
  it('names the invalid email instead of a generic outage message', () => {
    expect(inviteInvalidMessage({ ...ok, email: 'contact@atelier' })).toBe(INVITE_COPY.emailInvalid);
  });
  it('names the missing client name', () => {
    expect(inviteInvalidMessage({ ...ok, name: '   ' })).toBe(INVITE_COPY.nameInvalid);
  });
  it('reports the SIRET first, and falls back to generic when nothing explains the rejection', () => {
    expect(inviteInvalidMessage({ ...ok, siret: '123' })).toBe(INVITE_COPY.siretInvalid);
    expect(inviteInvalidMessage(ok)).toBe(INVITE_COPY.generic);
  });
});
