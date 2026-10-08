// Statut des liens d'avis côté admin (D-09). Lectures via le client RLS de l'admin.
// Colonnes explicites uniquement : le hash du jeton n'est jamais sélectionné.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ReviewLinkStatus =
  | { kind: 'none' }
  | { kind: 'active'; expiresAt: string }
  | { kind: 'used'; usedAt: string }
  | { kind: 'expired'; expiresAt: string }
  | { kind: 'invalidated'; invalidatedAt: string };

export type ReviewLinkRow = {
  id?: string;
  project_id?: string;
  generation?: number;
  expires_at: string;
  created_at?: string;
  used_at: string | null;
  invalidated_at: string | null;
};

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const LINK_COLS = 'id, project_id, generation, expires_at, created_at, used_at, invalidated_at';

export function reviewLinkStatusOf(latest: ReviewLinkRow | null, now: Date): ReviewLinkStatus {
  if (!latest) return { kind: 'none' };
  if (latest.used_at) return { kind: 'used', usedAt: latest.used_at };
  if (latest.invalidated_at) return { kind: 'invalidated', invalidatedAt: latest.invalidated_at };
  if (new Date(latest.expires_at).getTime() <= now.getTime()) {
    return { kind: 'expired', expiresAt: latest.expires_at };
  }
  return { kind: 'active', expiresAt: latest.expires_at };
}

function latestPerProject(rows: Row[]): Map<string, Row> {
  const latest = new Map<string, Row>();
  for (const r of rows) {
    const cur = latest.get(r.project_id as string);
    if (!cur || Number(r.generation) > Number(cur.generation)) latest.set(r.project_id as string, r);
  }
  return latest;
}

export async function loadReviewLinkStatus(
  supabase: SupabaseClient,
  projectId: string,
  now: Date = new Date(),
): Promise<{ status: ReviewLinkStatus; reviewFiled: boolean }> {
  const [linkRes, revRes] = await Promise.all([
    supabase
      .from('sv_review_links')
      .select(LINK_COLS)
      .eq('project_id', projectId)
      .order('generation', { ascending: false })
      .limit(1),
    supabase.from('sv_reviews').select('id').eq('project_id', projectId).limit(1),
  ]);
  if (linkRes.error || revRes.error) throw new Error('review_links_read_failed');
  const latest = ((linkRes.data ?? []) as Row[])[0] as ReviewLinkRow | undefined;
  return {
    status: reviewLinkStatusOf(latest ?? null, now),
    reviewFiled: ((revRes.data ?? []) as Row[]).length > 0,
  };
}

export async function loadOpenReviewLinks(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<Array<{ projectId: string; projectTitle: string; companyName: string; status: ReviewLinkStatus }>> {
  const [linkRes, revRes] = await Promise.all([
    supabase.from('sv_review_links').select(LINK_COLS).order('generation', { ascending: false }),
    supabase.from('sv_reviews').select('project_id'),
  ]);
  if (linkRes.error || revRes.error) throw new Error('review_links_read_failed');

  const reviewed = new Set(((revRes.data ?? []) as Row[]).map((r) => r.project_id as string));
  const latest = latestPerProject((linkRes.data ?? []) as Row[]);
  const projectIds = [...latest.keys()].filter((id) => !reviewed.has(id));
  if (projectIds.length === 0) return [];

  const projRes = await supabase.from('sv_projects').select('id, title, client_id').in('id', projectIds);
  if (projRes.error) throw new Error('review_links_read_failed');
  const projects = (projRes.data ?? []) as Row[];

  const clientIds = [...new Set(projects.map((p) => p.client_id as string).filter(Boolean))];
  const names = new Map<string, string>();
  if (clientIds.length > 0) {
    const cRes = await supabase.from('sv_clients').select('id, name').in('id', clientIds);
    if (cRes.error) throw new Error('review_links_read_failed');
    for (const c of (cRes.data ?? []) as Row[]) names.set(c.id as string, (c.name as string) ?? '');
  }

  return projects.map((p) => ({
    projectId: p.id as string,
    projectTitle: (p.title as string) ?? '',
    companyName: names.get(p.client_id as string) ?? '',
    status: reviewLinkStatusOf(latest.get(p.id as string) as ReviewLinkRow, now),
  }));
}
