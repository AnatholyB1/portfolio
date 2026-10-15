import 'server-only';
import { createProjectSchema } from '@/lib/projects/schemas';
import { callRpc } from '@/lib/server/rpc';
import { syncOnboardingFacts } from '@/lib/server/projects/onboarding';

export type CreateProjectResult =
  | { ok: true; projectId: string; title: string }
  | { ok: false; code: 'invalid' | 'client_not_found' | 'error' };

type RpcPayload = { project_id: string };

/**
 * Creation d'un projet pour un client existant (hors conversion de lead).
 *
 * PRECONDITION : l'appelant a deja execute requireAdmin(). Ce module utilise
 * service_role et ne verifie pas lui-meme l'appelant. Toute l'ecriture vit dans
 * la RPC sv_create_project (atomique). Aucun e-mail client n'est envoye.
 */
export async function createProject(
  input: unknown,
  actor: { userId: string },
): Promise<CreateProjectResult> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'invalid' };
  const { clientId, offer, projectTitle } = parsed.data;

  const rpc = await callRpc<RpcPayload>('admin/create-project', 'sv_create_project', {
    p_client_id: clientId,
    p_actor: actor.userId,
    p_title: projectTitle,
    p_offer: offer,
  });

  if (!rpc.ok) {
    switch (rpc.code) {
      case 'sv_client_not_found':
        return { ok: false, code: 'client_not_found' };
      case 'sv_invalid_offer':
      case 'sv_invalid_title':
        return { ok: false, code: 'invalid' };
      default:
        return { ok: false, code: 'error' };
    }
  }

  // L'onboarding est porte par le client : s'il est deja complet, le nouveau projet
  // doit recevoir le fait onboarding_completed. Un echec n'annule jamais la creation.
  try {
    await syncOnboardingFacts(clientId);
  } catch {
    console.error('[admin/create-project] onboarding sync failed');
  }

  return { ok: true, projectId: rpc.data.project_id, title: projectTitle };
}
