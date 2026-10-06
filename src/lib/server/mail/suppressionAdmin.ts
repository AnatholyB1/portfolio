import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SuppressionRow = {
  id: number;
  email_norm: string;
  scope: string;
  cause: string;
  source?: string | null;
  created_at: string;
};

export type LiftRow = {
  suppression_id: number;
  reason: string;
  created_at: string;
};

export type SuppressionView = {
  id: number;
  email: string;
  causeLabel: string;
  flowsLabel: string;
  createdAt: string;
  active: boolean;
  liftReason: string | null;
  liftedAt: string | null;
};

const CAUSE_LABELS: Record<string, string> = {
  complaint: 'Plainte (spam)',
  bounce_permanent: 'Rebond définitif',
  unsubscribe: 'Désinscription',
};

const SCOPE_LABELS: Record<string, string> = {
  marketing: 'Information (avis, actualités)',
  all: 'Tous les e-mails',
};

/** Pure mapper: newest first, lift rows joined by suppression id. */
export function toSuppressionView(rows: SuppressionRow[], lifts: LiftRow[]): SuppressionView[] {
  const liftById = new Map<number, LiftRow>();
  for (const l of lifts) liftById.set(Number(l.suppression_id), l);

  return [...rows]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((r) => {
      const lift = liftById.get(Number(r.id));
      return {
        id: Number(r.id),
        email: r.email_norm,
        causeLabel: CAUSE_LABELS[r.cause] ?? r.cause,
        flowsLabel: SCOPE_LABELS[r.scope] ?? r.scope,
        createdAt: r.created_at,
        active: !lift,
        liftReason: lift ? lift.reason : null,
        liftedAt: lift ? lift.created_at : null,
      };
    });
}

/** RLS-scoped read (admin policy). Returns null on error; no address in logs. */
export async function loadSuppressions(
  supabase: SupabaseClient,
): Promise<SuppressionView[] | null> {
  const [sup, lifts] = await Promise.all([
    supabase
      .from('sv_mail_suppressions')
      .select('id, email_norm, scope, cause, source, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('sv_mail_suppression_lifts').select('suppression_id, reason, created_at'),
  ]);
  if (sup.error || lifts.error) {
    console.error('[admin/emails] loadSuppressions failed');
    return null;
  }
  return toSuppressionView(
    (sup.data ?? []) as unknown as SuppressionRow[],
    (lifts.data ?? []) as unknown as LiftRow[],
  );
}
