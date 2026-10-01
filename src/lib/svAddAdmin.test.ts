import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addAdmin, parseArgs } from '../../scripts/sv-add-admin.mjs';

type Opts = {
  authRow?: { id: string } | null;
  isAdmin?: boolean;
  isMember?: boolean;
  insertError?: { message: string } | null;
  createError?: boolean;
};

function makeSvc(o: Opts = {}) {
  const insert = vi.fn(async () => ({ error: o.insertError ?? null }));
  const createUser = vi.fn(async () =>
    o.createError ? { data: { user: null }, error: { message: 'x' } } : { data: { user: { id: 'created-id' } }, error: null },
  );
  const deleteUser = vi.fn(async () => ({ error: null }));
  const rpc = vi.fn(async () => ({ data: o.authRow ? [o.authRow] : [], error: null }));
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: table === 'sv_admins' ? (o.isAdmin ? { user_id: 'u' } : null) : o.isMember ? { user_id: 'u' } : null,
          error: null,
        }),
      }),
    }),
    insert,
  }));
  const svc = { rpc, from, auth: { admin: { createUser, deleteUser } } } as unknown as SupabaseClient;
  return { svc, insert, createUser, deleteUser, rpc, from };
}

const email = 'admin2@sevalys.com';

describe('parseArgs', () => {
  it('normalises the email and defaults to dry run', () => {
    expect(parseArgs(['--email', ' Admin2@Sevalys.com '])).toEqual({
      email: 'admin2@sevalys.com',
      create: false,
      yes: false,
      dryRun: true,
    });
  });
  it('handles --yes and --create', () => {
    expect(parseArgs(['--email', email, '--yes'])).toMatchObject({ yes: true, dryRun: false });
    expect(parseArgs(['--email', email, '--create'])).toMatchObject({ create: true });
  });
  it('returns null when --email is missing', () => {
    expect(parseArgs([]).email).toBeNull();
    expect(parseArgs(['--yes']).email).toBeNull();
  });
});

describe('addAdmin', () => {
  it('rejects an invalid email without any Supabase call', async () => {
    const m = makeSvc();
    expect(await addAdmin({ svc: m.svc, email: 'nope', create: false, write: true })).toMatchObject({ status: 'invalid' });
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.from).not.toHaveBeenCalled();
  });

  it('returns no_auth_user when unknown and --create is off', async () => {
    const m = makeSvc();
    expect(await addAdmin({ svc: m.svc, email, create: false, write: true })).toMatchObject({ status: 'no_auth_user' });
    expect(m.createUser).not.toHaveBeenCalled();
    expect(m.insert).not.toHaveBeenCalled();
  });

  it('creates a passwordless user then inserts the admin with --create', async () => {
    const m = makeSvc();
    const r = await addAdmin({ svc: m.svc, email, create: true, write: true });
    expect(r).toEqual({ status: 'created_and_added', wouldWrite: true });
    expect(m.createUser).toHaveBeenCalledWith({ email, email_confirm: true });
    expect(m.insert).toHaveBeenCalledWith({ user_id: 'created-id', email });
  });

  it('is idempotent: already_admin means no insert', async () => {
    const m = makeSvc({ authRow: { id: 'u' }, isAdmin: true });
    expect(await addAdmin({ svc: m.svc, email, create: false, write: true })).toMatchObject({ status: 'already_admin' });
    expect(m.insert).not.toHaveBeenCalled();
  });

  it('refuses client members (D-04)', async () => {
    const m = makeSvc({ authRow: { id: 'u' }, isMember: true });
    expect(await addAdmin({ svc: m.svc, email, create: false, write: true })).toMatchObject({ status: 'role_conflict' });
    expect(m.insert).not.toHaveBeenCalled();
  });

  it('adds an existing auth user without a role', async () => {
    const m = makeSvc({ authRow: { id: 'u' } });
    const r = await addAdmin({ svc: m.svc, email: 'Admin2@Sevalys.com', create: false, write: true });
    expect(r).toEqual({ status: 'added', wouldWrite: true });
    expect(m.insert).toHaveBeenCalledWith({ user_id: 'u', email });
  });

  it('maps sv_role_conflict and other insert errors', async () => {
    const a = makeSvc({ authRow: { id: 'u' }, insertError: { message: 'sv_role_conflict' } });
    expect(await addAdmin({ svc: a.svc, email, create: false, write: true })).toMatchObject({ status: 'role_conflict' });
    const b = makeSvc({ authRow: { id: 'u' }, insertError: { message: 'boom' } });
    expect(await addAdmin({ svc: b.svc, email, create: false, write: true })).toMatchObject({ status: 'error' });
  });

  it('dry run performs no writes and reports what would happen', async () => {
    const a = makeSvc({ authRow: { id: 'u' } });
    expect(await addAdmin({ svc: a.svc, email, create: false, write: false })).toEqual({ status: 'added', wouldWrite: true });
    expect(a.insert).not.toHaveBeenCalled();
    const b = makeSvc();
    expect(await addAdmin({ svc: b.svc, email, create: true, write: false })).toEqual({ status: 'created_and_added', wouldWrite: true });
    expect(b.createUser).not.toHaveBeenCalled();
    expect(b.insert).not.toHaveBeenCalled();
    const c = makeSvc({ authRow: { id: 'u' }, isAdmin: true });
    expect(await addAdmin({ svc: c.svc, email, create: false, write: false })).toEqual({ status: 'already_admin', wouldWrite: false });
  });

  it('deletes a user it created if the insert fails, never an existing one', async () => {
    const a = makeSvc({ insertError: { message: 'boom' } });
    expect(await addAdmin({ svc: a.svc, email, create: true, write: true })).toMatchObject({ status: 'error' });
    expect(a.deleteUser).toHaveBeenCalledWith('created-id');
    const b = makeSvc({ authRow: { id: 'u' }, insertError: { message: 'boom' } });
    await addAdmin({ svc: b.svc, email, create: true, write: true });
    expect(b.deleteUser).not.toHaveBeenCalled();
  });

  it('reports error when createUser fails', async () => {
    const m = makeSvc({ createError: true });
    expect(await addAdmin({ svc: m.svc, email, create: true, write: true })).toMatchObject({ status: 'error' });
    expect(m.insert).not.toHaveBeenCalled();
  });
});
