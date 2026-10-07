// Ventilation du CA signé par la source figée du lead (colonnes source_* de sv_leads, corrigeables avec motif par sv_correct_lead_source ; D-11 amendé par le propriétaire le 2026-10-07 : libellé « Source figée du lead », jamais la première touche).
export type LeadSourceRow = { id: string; sourceKind: 'touch' | 'direct' | 'legacy'; sourceSource: string; sourceMedium: string; sourceCampaign: string | null };
export type ProjectLeadRow = { projectId: string; leadId: string | null };
export type SourceRow = { key: string; source: string; campaign: string | null; isNoLead: boolean; projectIds: string[]; signedCents: number; shareBp: number };

export const DIRECT_NO_LEAD = 'Direct / hors lead';
export const LEAD_MISSING = '(lead introuvable)';

const NO_LEAD_KEY = '__no_lead__';
const MISSING_KEY = '__lead_missing__';

export function signedBySource(
  signed: { projectId: string; amountCents: number }[],
  projects: ProjectLeadRow[],
  leads: LeadSourceRow[],
): { rows: SourceRow[]; totalCents: number } {
  const leadOf = new Map(projects.map((p) => [p.projectId, p.leadId]));
  const leadById = new Map(leads.map((l) => [l.id, l]));
  const perProject = new Map<string, number>();
  for (const s of signed) perProject.set(s.projectId, (perProject.get(s.projectId) ?? 0) + s.amountCents);

  const groups = new Map<string, SourceRow>();
  let totalCents = 0;
  for (const [projectId, cents] of perProject) {
    const leadId = leadOf.get(projectId) ?? null;
    const lead = leadId === null ? null : leadById.get(leadId) ?? null;
    let key: string;
    let source: string;
    let campaign: string | null = null;
    let isNoLead = false;
    if (leadId === null) {
      key = NO_LEAD_KEY;
      source = DIRECT_NO_LEAD;
      isNoLead = true;
    } else if (!lead) {
      key = MISSING_KEY;
      source = LEAD_MISSING;
    } else {
      key = `${lead.sourceSource}\u0000${lead.sourceCampaign ?? ''}`;
      source = lead.sourceSource;
      campaign = lead.sourceCampaign;
    }
    let row = groups.get(key);
    if (!row) {
      row = { key, source, campaign, isNoLead, projectIds: [], signedCents: 0, shareBp: 0 };
      groups.set(key, row);
    }
    row.projectIds.push(projectId);
    row.signedCents += cents;
    totalCents += cents;
  }

  const rank = (r: SourceRow) => (r.isNoLead ? 2 : r.key === MISSING_KEY ? 1 : 0);
  const rows = [...groups.values()].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    const s = a.source.localeCompare(b.source, 'fr');
    if (s !== 0) return s;
    if (a.campaign === b.campaign) return 0;
    if (a.campaign === null) return -1;
    if (b.campaign === null) return 1;
    return a.campaign.localeCompare(b.campaign, 'fr');
  });
  for (const r of rows) r.shareBp = totalCents === 0 ? 0 : Math.round((r.signedCents * 10000) / totalCents);
  return { rows, totalCents };
}
