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
import { defineTool, type ToolDef } from '../registry';

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

/** a***@d***.fr : conserve la 1re lettre du local-part et du domaine, et le suffixe. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.indexOf('.');
  const name = dot === -1 ? domain : domain.slice(0, dot);
  const suffix = dot === -1 ? '' : domain.slice(dot);
  return `${local[0]}***@${name[0]}***${suffix}`;
}

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
    return { leads: data ?? [] };
  },
});

const getLead = defineTool({
  name: 'get_lead',
  description: 'Lit un lead par identifiant (uuid).',
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
  input: z.object({ leadId, reason: z.enum(lostCodes), note: z.string().max(500).optional() }),
  run: (ctx, input) => markLeadLostCore(ctx, input),
});

const correctLeadSource = defineTool({
  name: 'correct_lead_source',
  description: 'Corrige la source d\'acquisition d\'un lead (motif de 10 caractères minimum, tracé).',
  covers: ['correctSourceAction'],
  input: z.object({
    leadId,
    source: z.string().min(1).max(200),
    medium: z.string().min(1).max(200),
    campaign: z.string().max(200).default(''),
    reason: z.string().min(10).max(500),
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
  input: z.object({ leadId, reason: z.enum(eraseCodes), confirmEmail: z.string().min(1).max(254) }),
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
    name: z.string().min(1).max(200),
    email: z.string().max(254),
    siret: z.string().max(40),
    offer: z.enum(OFFER_SLUGS),
    projectTitle: z.string().min(1).max(80),
    company: companySnapshotSchema.nullable().optional(),
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
