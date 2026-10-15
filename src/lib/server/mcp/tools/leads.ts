import 'server-only';
import { z } from 'zod';
import { ERASE_REASONS, LOST_REASONS, STATUS_ORDER } from '@/lib/admin/leadLabels';
import { companySnapshotSchema } from '@/lib/admin/inviteSchema';
import { OFFER_SLUGS } from '@/lib/projects/offers';
import {
  convertLeadCore,
  correctLeadSourceCore,
  eraseLeadCore,
  markLeadLostCore,
  markReturnSeenCore,
  setLeadStatusCore,
  siretExistsCore,
} from '@/lib/server/admin/core/leads';
import { maskEmail } from '../mask';
import { defineTool, type ToolDef } from '../registry';

// Réexporté : les tests et appelants historiques importent maskEmail depuis ce module.
export { maskEmail };

const leadId = z.string().uuid();
const lostCodes = LOST_REASONS.map((r) => r.code) as [string, ...string[]];
const eraseCodes = ERASE_REASONS.map((r) => r.code) as [string, ...string[]];

// Colonnes de sv_leads_admin_v (sv_leads + dernier contact) exposées au client MCP.
// Pas de payload brut, pas de first/last_touch : seulement ce que l'UI admin affiche.
const LEAD_COLUMNS = [
  'id',
  'status',
  'lost_reason',
  'channel',
  'source_kind',
  'source_source',
  'source_medium',
  'source_campaign',
  'contact_count',
  'unseen_return',
  'converted_client_id',
  'created_at',
  'last_contact_at',
  'qualified_at',
  'rdv_at',
  'quote_sent_at',
  'signed_at',
  'lost_at',
  'erased_at',
  'contact_nom',
  'contact_email',
  'contact_telephone',
].join(', ');

function initial(nom: unknown): string | null {
  if (typeof nom !== 'string') return null;
  const first = Array.from(nom.trim())[0];
  return first ? `${first}.` : null;
}

// Liste : pas de PII en clair (e-mail masqué, pas de téléphone, nom réduit à l'initiale).
function redactLead(row: Record<string, unknown>): Record<string, unknown> {
  const { contact_telephone: _tel, ...rest } = row;
  void _tel;
  return {
    ...rest,
    contact_nom: initial(row.contact_nom),
    contact_email: typeof row.contact_email === 'string' ? maskEmail(row.contact_email) : null,
  };
}

// Retire les champs vides et trim les autres, comme buildCompany ; un objet vide devient null.
export function cleanCompany(v: unknown): unknown {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return v;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'string') {
      const t = val.trim();
      if (t) out[k] = t;
    } else if (val !== undefined) {
      out[k] = val;
    }
  }
  return Object.keys(out).length ? out : null;
}

const t = (max: number, min = 1) => z.string().trim().min(min).max(max);

const listLeads = defineTool({
  name: 'list_leads',
  description: 'Liste les leads (plus récents d\'abord), avec filtre optionnel par statut.',
  covers: [],
  input: z.object({
    status: z.enum(STATUS_ORDER).optional(),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  run: async (ctx, input) => {
    let q = ctx.supabase
      .from('sv_leads_admin_v')
      .select(LEAD_COLUMNS)
      .order('created_at', { ascending: false });
    if (input.status) q = q.eq('status', input.status);
    const { data, error } = await q.limit(input.limit);
    if (error) throw new Error('list_leads_failed');
    return { leads: ((data ?? []) as unknown as Record<string, unknown>[]).map(redactLead) };
  },
});

const getLead = defineTool({
  name: 'get_lead',
  // Contrairement à list_leads, les coordonnées complètes sont renvoyées : nécessaires pour agir sur ce lead.
  description: 'Lit un lead par identifiant (uuid), coordonnées de contact complètes.',
  covers: [],
  input: z.object({ leadId }),
  run: async (ctx, input) => {
    const { data, error } = await ctx.supabase
      .from('sv_leads_admin_v')
      .select(LEAD_COLUMNS)
      .eq('id', input.leadId)
      .maybeSingle();
    if (error) throw new Error('get_lead_failed');
    return { lead: data ?? null };
  },
});

const setLeadStatus = defineTool({
  name: 'set_lead_status',
  description: 'Change le statut d\'un lead. « lost » est refusé : utiliser mark_lead_lost (motif requis).',
  covers: ['setStatusAction'],
  input: z.object({ leadId, status: z.enum(STATUS_ORDER) }),
  run: (ctx, input) => setLeadStatusCore(ctx, input),
});

const markLeadLost = defineTool({
  name: 'mark_lead_lost',
  description: 'Marque un lead comme perdu, avec un motif obligatoire et une note facultative.',
  covers: ['markLostAction'],
  input: z.object({ leadId, reason: z.enum(lostCodes), note: t(500, 0).optional() }),
  run: (ctx, input) => markLeadLostCore(ctx, input),
});

const correctLeadSource = defineTool({
  name: 'correct_lead_source',
  description: 'Corrige la source d\'acquisition d\'un lead (motif de 10 caractères minimum, tracé).',
  covers: ['correctSourceAction'],
  input: z.object({
    leadId,
    source: t(200),
    medium: t(200),
    campaign: t(200, 0).default(''),
    reason: t(500, 10),
  }),
  run: (ctx, input) => correctLeadSourceCore(ctx, input),
});

const markLeadReturnSeen = defineTool({
  name: 'mark_lead_return_seen',
  description: 'Marque le retour d\'un lead comme vu.',
  covers: ['markReturnSeenAction'],
  input: z.object({ leadId }),
  run: (ctx, input) => markReturnSeenCore(ctx, input),
});

const lookupSiretExists = defineTool({
  name: 'lookup_siret_exists',
  description: 'Indique si un SIRET (14 chiffres) correspond déjà à un client.',
  covers: ['siretExistsAction'],
  input: z.object({ siret: z.string().max(40) }),
  run: async (ctx, input) => {
    if (!/^\d{14}$/.test(input.siret.replace(/\s/g, ''))) return { exists: false, reason: 'invalid_siret' };
    const res = await siretExistsCore(ctx, input);
    return { exists: res.ok ? Boolean(res.data?.exists) : false };
  },
});

const eraseLead = defineTool({
  name: 'erase_lead',
  description:
    'Efface définitivement les données personnelles d\'un lead (irréversible). confirmEmail doit être l\'e-mail exact du lead.',
  covers: ['eraseLeadAction'],
  destructive: true,
  input: z.object({ leadId, reason: z.enum(eraseCodes), confirmEmail: t(254) }),
  preview: async (ctx, input) => {
    const { data } = await ctx.supabase
      .from('sv_leads_admin_v')
      .select('contact_email')
      .eq('id', input.leadId)
      .maybeSingle();
    const email = typeof data?.contact_email === 'string' ? data.contact_email : null;
    return {
      action: 'Effacement irréversible des données personnelles du lead',
      leadId: input.leadId,
      reason: input.reason,
      contactEmail: email ? maskEmail(email) : null,
      note: 'confirmEmail doit correspondre exactement à l\'e-mail du lead.',
    };
  },
  run: (ctx, input) => eraseLeadCore(ctx, input),
});

const convertLeadToClient = defineTool({
  name: 'convert_lead_to_client',
  description:
    'Convertit un lead en client : crée (ou réutilise) le client par SIRET, son premier projet, et envoie l\'invitation par e-mail.',
  covers: ['convertLeadAction'],
  destructive: true,
  input: z.object({
    leadId,
    name: t(200),
    email: t(254, 0),
    siret: t(40, 0),
    offer: z.enum(OFFER_SLUGS),
    projectTitle: t(80),
    company: z.preprocess(cleanCompany, companySnapshotSchema.nullable().optional()),
    companySource: z.enum(['api', 'manual']).default('api'),
  }),
  preview: async (_ctx, input) => ({
    action: 'Conversion du lead en client, création du projet et envoi de l\'invitation',
    leadId: input.leadId,
    client: { name: input.name, email: input.email, siret: input.siret, company: input.company?.nom ?? null },
    project: { title: input.projectTitle, offer: input.offer },
    mail: `Invitation envoyée à ${input.email}`,
  }),
  run: (ctx, input) =>
    convertLeadCore(ctx, {
      leadId: input.leadId,
      name: input.name.trim(),
      email: input.email.trim(),
      siret: input.siret.trim(),
      company: input.company ?? null,
      companySource: input.companySource,
      offer: input.offer,
      projectTitle: input.projectTitle.trim(),
    }),
});

export const leadTools: ToolDef[] = [
  listLeads,
  getLead,
  setLeadStatus,
  markLeadLost,
  correctLeadSource,
  markLeadReturnSeen,
  lookupSiretExists,
  eraseLead,
  convertLeadToClient,
];
