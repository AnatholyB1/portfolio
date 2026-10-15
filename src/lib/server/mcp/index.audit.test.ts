import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const insert = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ from: () => ({ insert }) }) }));

import { auditToDb } from './index';

const attempt = {
  tokenId: 't1',
  userId: 'u1',
  tool: 'erase_lead',
  destructive: true,
  argsDigest: 'a'.repeat(64),
  outcome: 'attempt' as const,
  previewJti: '3f2b8c1e-5a4d-4e6f-8a9b-1c2d3e4f5a6b',
  previewDigest: 'b'.repeat(64),
};

beforeEach(() => insert.mockReset());

describe('auditToDb', () => {
  it('writes the preview jti and digest on the attempt row', async () => {
    insert.mockResolvedValue({ error: null });
    expect(await auditToDb(attempt)).toBeUndefined();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'attempt', preview_jti: attempt.previewJti, preview_digest: attempt.previewDigest }),
    );
  });
  it('writes null jti and digest on other rows', async () => {
    insert.mockResolvedValue({ error: null });
    await auditToDb({ ...attempt, outcome: 'ok', previewJti: undefined, previewDigest: undefined });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ preview_jti: null, preview_digest: null }));
  });
  it('maps a unique violation (23505) on a claim to a typed conflict instead of throwing', async () => {
    insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key value violates unique constraint' } });
    expect(await auditToDb(attempt)).toEqual({ conflict: true });
  });
  it('any other insert error throws', async () => {
    insert.mockResolvedValue({ error: { code: '08006', message: 'connection failure' } });
    await expect(auditToDb(attempt)).rejects.toThrow('mcp_audit_insert_failed');
  });
  it('a unique violation on a row that carries no claim is not a conflict', async () => {
    insert.mockResolvedValue({ error: { code: '23505', message: 'x' } });
    await expect(auditToDb({ ...attempt, previewJti: undefined, previewDigest: undefined })).rejects.toThrow('mcp_audit_insert_failed');
  });
});

describe('migration sv_mcp (edited in place)', () => {
  const sql = readFileSync(new URL('../../../../supabase/migrations/20261015000000_sv_mcp.sql', import.meta.url), 'utf8');
  it('adds the preview claim columns and the partial unique index on attempt rows', () => {
    expect(sql).toMatch(/preview_jti\s+text\s+null/i);
    expect(sql).toMatch(/preview_digest\s+text\s+null/i);
    expect(sql).toMatch(/create\s+unique\s+index\s+(?:if\s+not\s+exists\s+)?sv_mcp_audit_preview_jti_uq\s+on\s+public\.sv_mcp_audit\s*\(\s*preview_jti\s*\)\s+where\s+outcome\s*=\s*'attempt'/i);
  });
});
