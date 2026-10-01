import type { SupabaseClient } from '@supabase/supabase-js';

export type AddAdminStatus =
  | 'invalid'
  | 'role_conflict'
  | 'already_admin'
  | 'no_auth_user'
  | 'added'
  | 'created_and_added'
  | 'error';

export function parseArgs(argv: string[]): {
  email: string | null;
  create: boolean;
  yes: boolean;
  dryRun: boolean;
};

export function addAdmin(opts: {
  svc: SupabaseClient;
  email: string;
  create: boolean;
  write: boolean;
}): Promise<{ status: AddAdminStatus; wouldWrite: boolean }>;
