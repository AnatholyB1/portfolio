import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client browser (anon key) — pour le dashboard realtime
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client serveur (clé anon) — utilisé par les routes CRM existantes
// (nom historique trompeur : utilise bien la clé anon, pas service_role)
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Client serveur (service_role) — pour l'écriture prospects uniquement.
// NE JAMAIS importer dans un composant 'use client'. Bypasse la RLS par
// design : réservé au code serveur (Route Handlers), jamais au bundle client.
export function createServiceRoleClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
