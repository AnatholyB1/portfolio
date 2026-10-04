import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getStripe, type StripeMode } from './client';

// Un Customer Stripe par client et par mode (D-02). Lecture/insertion en service_role ;
// la clé d'idempotence évite les doublons en cas de course.

async function readCustomerId(clientId: string, mode: StripeMode): Promise<string | null> {
  const res = await createSupabaseAdminClient()
    .from('sv_stripe_customers')
    .select('stripe_customer_id')
    .eq('client_id', clientId)
    .eq('livemode', mode === 'live')
    .maybeSingle();
  if (res.error || !res.data) return null;
  return String((res.data as { stripe_customer_id: unknown }).stripe_customer_id);
}

export async function getOrCreateStripeCustomer(clientId: string, mode: StripeMode): Promise<string> {
  const existing = await readCustomerId(clientId, mode);
  if (existing) return existing;

  const admin = createSupabaseAdminClient();
  const client = await admin.from('sv_clients').select('name').eq('id', clientId).maybeSingle();
  const member = await admin
    .from('sv_client_members')
    .select('invited_email')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const name = client.data ? String((client.data as { name: unknown }).name) : undefined;
  const email = member.data ? String((member.data as { invited_email: unknown }).invited_email) : undefined;

  const customer = await getStripe(mode).customers.create(
    { name, email, metadata: { client_id: clientId } },
    { idempotencyKey: 'customer:' + clientId + ':' + mode },
  );

  const ins = await admin
    .from('sv_stripe_customers')
    .insert({ client_id: clientId, livemode: mode === 'live', stripe_customer_id: customer.id });
  if (ins.error) {
    const again = await readCustomerId(clientId, mode);
    if (again) return again;
    console.error('[stripe/customers] insert_failed');
    throw new Error('[stripe/customers] insert_failed');
  }
  return customer.id;
}
