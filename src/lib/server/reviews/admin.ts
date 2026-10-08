// Lecture admin des avis et de leur historique de modération (D-06, D-07).
// Lectures via le client RLS de l'admin appelant, jamais service_role.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// D-06 : liste fermée des motifs légaux. Aucun motif lié à la note ou à l'opinion.
export const REVIEW_HIDE_REASONS = [
  { value: 'defamation_or_insult', label: 'Diffamation ou injure' },
  { value: 'third_party_personal_data', label: "Données personnelles d'un tiers" },
  { value: 'illegal_content', label: 'Contenu illégal' },
  { value: 'inauthentic', label: 'Avis non authentique ou usurpation' },
] as const;

const REASON_LABELS: Record<string, string> = Object.fromEntries(
  REVIEW_HIDE_REASONS.map((r) => [r.value, r.label]),
);

export type AdminReviewHistory = {
  id: number;
  action: 'hide' | 'unhide';
  reason: string | null;
  reasonLabel: string | null;
  detail: string;
  actorEmail: string | null;
  createdAt: string;
};

export type AdminReview = {
  id: string;
  publishedAt: string;
  projectId: string;
  projectTitle: string;
  companyName: string;
  rating: number;
  title: string | null;
  body: string;
  displayName: string;
  status: 'published' | 'hidden';
  history: AdminReviewHistory[];
};

const REVIEW_COLS =
  'id, project_id, rating, title, body, display_name, company_name_snapshot, published_at';
const LOG_COLS = 'id, review_id, action, reason, detail, actor_id, created_at';

// Statut = action de la ligne de journal la plus récente (id le plus élevé).
export function deriveStatus(history: ReadonlyArray<{ action: string }>): 'published' | 'hidden' {
  // history est trié du plus récent au plus ancien.
  return history[0]?.action === 'hide' ? 'hidden' : 'published';
}

export async function loadAdminReviews(supabase: SupabaseClient): Promise<AdminReview[]> {
  const { data: reviews, error } = await supabase
    .from('sv_reviews')
    .select(REVIEW_COLS)
    .order('published_at', { ascending: false });
  if (error) throw new Error('reviews_read_failed');
  const revs = (reviews ?? []) as Row[];
  if (revs.length === 0) return [];

  const reviewIds = revs.map((r) => r.id as string);
  const projectIds = [...new Set(revs.map((r) => r.project_id as string))];

  const [projRes, logRes] = await Promise.all([
    supabase.from('sv_projects').select('id, title, client_id').in('id', projectIds),
    supabase
      .from('sv_review_moderation_log')
      .select(LOG_COLS)
      .in('review_id', reviewIds)
      .order('id', { ascending: false }),
  ]);
  if (projRes.error || logRes.error) throw new Error('reviews_read_failed');

  const projects = (projRes.data ?? []) as Row[];
  const logs = (logRes.data ?? []) as Row[];

  const clientIds = [...new Set(projects.map((p) => p.client_id as string).filter(Boolean))];
  const clientRes = clientIds.length
    ? await supabase.from('sv_clients').select('id, name').in('id', clientIds)
    : { data: [] as Row[], error: null };
  if (clientRes.error) throw new Error('reviews_read_failed');
  const clientName = new Map<string, string>(
    ((clientRes.data ?? []) as Row[]).map((c) => [c.id as string, String(c.name ?? '')]),
  );

  // E-mails des auteurs d'actions : affichage réservé aux admins (RLS). Illisible -> null.
  const actorIds = [...new Set(logs.map((l) => l.actor_id as string))];
  const actorEmail = new Map<string, string>();
  if (actorIds.length > 0) {
    const admRes = await supabase.from('sv_admins').select('user_id, email').in('user_id', actorIds);
    if (!admRes.error) {
      for (const a of (admRes.data ?? []) as Row[]) actorEmail.set(a.user_id as string, a.email as string);
    }
  }

  const projectById = new Map<string, Row>(projects.map((p) => [p.id as string, p]));
  const historyByReview = new Map<string, AdminReviewHistory[]>();
  for (const l of [...logs].sort((a, b) => Number(b.id) - Number(a.id))) {
    const list = historyByReview.get(l.review_id as string) ?? [];
    list.push({
      id: Number(l.id),
      action: l.action as 'hide' | 'unhide',
      reason: (l.reason as string | null) ?? null,
      reasonLabel: l.reason ? (REASON_LABELS[l.reason as string] ?? (l.reason as string)) : null,
      detail: String(l.detail ?? ''),
      actorEmail: actorEmail.get(l.actor_id as string) ?? null,
      createdAt: String(l.created_at),
    });
    historyByReview.set(l.review_id as string, list);
  }

  return revs.map((r) => {
    const project = projectById.get(r.project_id as string);
    const history = historyByReview.get(r.id as string) ?? [];
    return {
      id: r.id as string,
      publishedAt: String(r.published_at),
      projectId: r.project_id as string,
      projectTitle: String(project?.title ?? ''),
      companyName: String(r.company_name_snapshot ?? clientName.get(project?.client_id as string) ?? ''),
      rating: Number(r.rating),
      title: (r.title as string | null) ?? null,
      body: String(r.body ?? ''),
      displayName: String(r.display_name ?? ''),
      status: deriveStatus(history),
      history,
    };
  });
}
