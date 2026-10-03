// Onboarding structuré (D-11, D-12, D-13). Sauvegardes partielles par bloc.
// PRECONDITION : clientId et actorUserId viennent de requireClient() côté appelant,
// jamais du formulaire. Un client_id présent dans l'input est ignoré (T-12-29).
import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { enqueueAndSend } from '@/lib/server/mail/outbox';
import { ADMIN_NOTIFY_EMAIL, dedupeKey } from '@/lib/server/mail/rules';
import {
  blockCompletion,
  isOnboardingComplete,
  onboardingFieldSchema,
  type OnboardingRow,
} from '@/lib/projects/onboardingSchema';
import { postProjectFact } from './facts';

const TABLE = 'sv_client_onboarding';

export type OnboardingSaveResult =
  | { ok: true; complete: boolean; blocks: Record<string, boolean>; savedAt: string }
  | { ok: false; code: 'invalid' | 'error'; fieldErrors?: Record<string, string> };

function toRow(d: Record<string, any> | null): OnboardingRow { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    companyConfirmedAt: d?.company_confirmed_at ?? null,
    signatoryName: d?.signatory_name ?? null,
    signatoryRole: d?.signatory_role ?? null,
    projectContactName: d?.project_contact_name ?? null,
    projectContactEmail: d?.project_contact_email ?? null,
    projectContactPhone: d?.project_contact_phone ?? null,
    billingSameAsCompany: d?.billing_same_as_company ?? true,
    billingAddress: d?.billing_address ?? null,
    vatStatus: d?.vat_status ?? null,
    vatNumber: d?.vat_number ?? null,
    existingSiteUrl: d?.existing_site_url ?? null,
    socialLinks: Array.isArray(d?.social_links) ? d.social_links : [],
    projectGoal: d?.project_goal ?? null,
  };
}

async function readRow(clientId: string): Promise<OnboardingRow | null> {
  const res = await createSupabaseAdminClient().from(TABLE).select('*').eq('client_id', clientId).maybeSingle();
  if (res.error) return null;
  return toRow(res.data as Record<string, unknown> | null);
}

async function upsertColumns(
  clientId: string,
  actorUserId: string,
  cols: Record<string, unknown>,
): Promise<string | null> {
  const savedAt = new Date().toISOString();
  const res = await createSupabaseAdminClient()
    .from(TABLE)
    .upsert(
      { ...cols, client_id: clientId, updated_at: savedAt, updated_by: actorUserId },
      { onConflict: 'client_id' },
    );
  if (res.error) {
    console.error('[projects/onboarding] upsert failed');
    return null;
  }
  return savedAt;
}

async function finish(clientId: string, savedAt: string): Promise<OnboardingSaveResult> {
  try {
    await syncOnboardingFacts(clientId);
  } catch {
    console.error('[projects/onboarding] sync failed');
  }
  const row = await readRow(clientId);
  if (!row) return { ok: false, code: 'error' };
  return { ok: true, complete: isOnboardingComplete(row), blocks: blockCompletion(row), savedAt };
}

export async function confirmCompany(clientId: string, actorUserId: string): Promise<OnboardingSaveResult> {
  try {
    const row = await readRow(clientId);
    if (!row) return { ok: false, code: 'error' };
    let savedAt = new Date().toISOString();
    if (!row.companyConfirmedAt) {
      const s = await upsertColumns(clientId, actorUserId, { company_confirmed_at: savedAt });
      if (!s) return { ok: false, code: 'error' };
      savedAt = s;
    }
    return await finish(clientId, savedAt);
  } catch {
    console.error('[projects/onboarding] confirmCompany failed');
    return { ok: false, code: 'error' };
  }
}

export async function saveOnboardingBlock(
  clientId: string,
  actorUserId: string,
  input: unknown,
): Promise<OnboardingSaveResult> {
  const parsed = onboardingFieldSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const key = i.path.filter((p) => p !== 'data').join('.') || 'block';
      if (!(key in fieldErrors)) fieldErrors[key] = i.message;
    }
    return { ok: false, code: 'invalid', fieldErrors };
  }
  const v = parsed.data;
  try {
    if (v.block === 'societe') return await confirmCompany(clientId, actorUserId);

    let cols: Record<string, unknown>;
    switch (v.block) {
      case 'signataire':
        cols = { signatory_name: v.data.signatoryName, signatory_role: v.data.signatoryRole };
        break;
      case 'contact':
        cols = {
          project_contact_name: v.data.projectContactName,
          project_contact_email: v.data.projectContactEmail ?? null,
          project_contact_phone: v.data.projectContactPhone ?? null,
        };
        break;
      case 'facturation':
        cols = {
          billing_same_as_company: v.data.billingSameAsCompany,
          billing_address: v.data.billingSameAsCompany ? null : (v.data.billingAddress ?? null),
          vat_status: v.data.vatStatus,
          vat_number: v.data.vatStatus === 'number' ? (v.data.vatNumber ?? null) : null,
        };
        break;
      case 'projet':
        cols = {
          existing_site_url: v.data.existingSiteUrl ?? null,
          social_links: v.data.socialLinks,
          project_goal: v.data.projectGoal,
        };
        break;
    }
    const savedAt = await upsertColumns(clientId, actorUserId, cols);
    if (!savedAt) return { ok: false, code: 'error' };
    return await finish(clientId, savedAt);
  } catch {
    console.error('[projects/onboarding] save failed');
    return { ok: false, code: 'error' };
  }
}

/** Poste onboarding_completed (système) sur les projets du client qui ne l'ont pas encore (D-08, D-12). */
export async function syncOnboardingFacts(clientId: string): Promise<void> {
  const row = await readRow(clientId);
  if (!row || !isOnboardingComplete(row)) return;

  const sb = createSupabaseAdminClient();
  const [projects, client] = await Promise.all([
    sb.from('sv_projects').select('id, title').eq('client_id', clientId),
    sb.from('sv_clients').select('name').eq('id', clientId).maybeSingle(),
  ]);
  if (projects.error || !Array.isArray(projects.data)) return;
  const companyName = typeof client.data?.name === 'string' ? client.data.name : '';

  for (const p of projects.data as { id: string; title: string }[]) {
    const res = await postProjectFact({
      projectId: p.id,
      type: 'onboarding_completed',
      actorKind: 'system',
      actorId: null,
    });
    if (!res.ok || !res.changed) continue;
    try {
      await enqueueAndSend({
        event: 'onboarding_completed',
        recipientEmail: ADMIN_NOTIFY_EMAIL,
        dedupeKey: dedupeKey.onboardingCompleted(p.id, ADMIN_NOTIFY_EMAIL),
        payload: { companyName, projectTitle: p.title },
        clientId,
        projectId: p.id,
      });
    } catch {
      console.error('[projects/onboarding] admin mail failed');
    }
  }
}
