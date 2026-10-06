import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export type HoldState = { suspended: boolean; since: string | null };

type HoldRow = { id: number; action: string; created_at: string };
type ProjectHoldRow = HoldRow & { project_id: string };

/** Pure: latest id wins; no rows means reminders are active. */
export function currentHold(rows: HoldRow[]): HoldState {
  let latest: HoldRow | null = null;
  for (const r of rows) {
    if (!latest || Number(r.id) > Number(latest.id)) latest = r;
  }
  if (latest && latest.action === 'suspend') {
    return { suspended: true, since: latest.created_at };
  }
  return { suspended: false, since: null };
}

/** Pure batch helper: projects whose latest hold row is a suspension. */
export function heldProjectIds(rows: ProjectHoldRow[]): Set<string> {
  const latest = new Map<string, ProjectHoldRow>();
  for (const r of rows) {
    const cur = latest.get(r.project_id);
    if (!cur || Number(r.id) > Number(cur.id)) latest.set(r.project_id, r);
  }
  const held = new Set<string>();
  for (const [projectId, r] of latest) {
    if (r.action === 'suspend') held.add(projectId);
  }
  return held;
}

/** RLS-scoped read (admin policy). Returns null on error. */
export async function loadReminderHold(
  supabase: SupabaseClient,
  projectId: string,
): Promise<HoldState | null> {
  const { data, error } = await supabase
    .from('sv_reminder_holds')
    .select('id, action, created_at')
    .eq('project_id', projectId)
    .order('id', { ascending: false })
    .limit(1);
  if (error) {
    console.error('[admin/projets] loadReminderHold failed');
    return null;
  }
  return currentHold((data ?? []) as unknown as HoldRow[]);
}
