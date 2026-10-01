import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertSupabaseKeyMode, getSupabaseSecretKey, getSupabaseUrl } from './env';

// Client service_role : contourne la RLS. NE JAMAIS importer dans un
// composant 'use client' (D-18). Distinct du module hérité src/lib/supabase.ts.
export function createSupabaseAdminClient(): SupabaseClient {
  assertSupabaseKeyMode();
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
