import { describe, expect, it } from 'vitest';
import {
  convertSchema,
  consentSchema,
  linkSchema,
  postFactSchema,
  revokeFactSchema,
  uploadRequestSchema,
} from './schemas';

const uuid = '3f2b8c1e-5d4a-4b6f-8a9c-1d2e3f4a5b6c';
const base = {
  name: 'Jeanne Martin',
  email: 'jeanne@example.fr',
  siret: '123 456 789 01234',
  company: null,
  companySource: 'manual' as const,
  leadId: uuid,
  offer: 'site-vitrine',
  projectTitle: 'Projet Test',
};

describe('convertSchema', () => {
  it('accepts valid', () => expect(convertSchema.safeParse(base).success).toBe(true));
  it('rejects missing/unknown offer', () => {
    expect(convertSchema.safeParse({ ...base, offer: undefined }).success).toBe(false);
    expect(convertSchema.safeParse({ ...base, offer: 'nope' }).success).toBe(false);
  });
  it('rejects long title and bad lead id', () => {
    expect(convertSchema.safeParse({ ...base, projectTitle: 'x'.repeat(81) }).success).toBe(false);
    expect(convertSchema.safeParse({ ...base, leadId: 'abc' }).success).toBe(false);
  });
});

describe('postFactSchema', () => {
  it('rejects system facts', () => {
    expect(postFactSchema.safeParse({ projectId: uuid, type: 'onboarding_completed' }).success).toBe(false);
    expect(postFactSchema.safeParse({ projectId: uuid, type: 'fact_revoked' }).success).toBe(false);
  });
  it('accepts postable fact', () => {
    expect(postFactSchema.safeParse({ projectId: uuid, type: 'quote_accepted' }).success).toBe(true);
  });
});

describe('revokeFactSchema', () => {
  it('reason 10..500', () => {
    expect(revokeFactSchema.safeParse({ projectId: uuid, factId: '3', reason: 'x'.repeat(9) }).success).toBe(false);
    expect(revokeFactSchema.safeParse({ projectId: uuid, factId: '3', reason: 'x'.repeat(10) }).success).toBe(true);
  });
});

describe('linkSchema', () => {
  it('https only', () => {
    expect(linkSchema.safeParse({ projectId: uuid, title: 'a', url: 'http://x.fr' }).success).toBe(false);
    expect(linkSchema.safeParse({ projectId: uuid, title: 'a', url: 'javascript:alert(1)' }).success).toBe(false);
    expect(linkSchema.safeParse({ projectId: uuid, title: 'a', url: 'https://x.fr' }).success).toBe(true);
  });
});

describe('uploadRequestSchema / consentSchema', () => {
  it('bounds size', () => {
    expect(uploadRequestSchema.safeParse({ projectId: uuid, filename: 'a.pdf', size: 26214401, mime: 'application/pdf' }).success).toBe(false);
    expect(uploadRequestSchema.safeParse({ projectId: uuid, filename: 'a.pdf', size: 5, mime: 'application/pdf' }).success).toBe(true);
  });
  it('consent granted from string', () => {
    const r = consentSchema.parse({ projectId: uuid, granted: 'true', version: 'v1' });
    expect(r.granted).toBe(true);
    expect(consentSchema.parse({ projectId: uuid, granted: 'false', version: 'v1' }).granted).toBe(false);
  });
});
