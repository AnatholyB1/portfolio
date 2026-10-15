import 'server-only';
import { z } from 'zod';
import {
  addProjectCostCore,
  addRecurringCostCore,
  saveAcquisitionCostCore,
  saveBalanceCore,
  stopRecurringCostCore,
  voidProjectCostCore,
} from '@/lib/server/admin/core/costs';
import { ADMIN_COPY } from '@/lib/admin/leadLabels';
import { costSchema } from '@/lib/admin/leadSchemas';
import { currentBalance, projectCostRegister, recurringRegister } from '@/lib/server/pilotage/costs';
import { COST_CATEGORY_KEYS } from '@/lib/server/pilotage/costSchemas';
import { loadCostsRegister } from '@/lib/server/pilotage/load';
import { parisToday } from '@/lib/server/pilotage/periods';
import { defineTool, type ToolDef } from '../registry';

// Plafonds de réponse du registre (les plus récents d'abord).
const MAX_PROJECT_COSTS = 200;
const MAX_BALANCES = 50;

// Les montants sont des textes en euros ("12,50"), comme dans les formulaires : le core les valide et renvoie
// les mêmes messages français. Les dates sont au format AAAA-MM-JJ, les mois AAAA-MM.
const euros = (what: string) => z.string().max(40).describe(`${what}, en euros (ex. "12,50")`);
const text = (max: number) => z.string().trim().max(max);

const getCostRegister = defineTool({
  name: 'get_cost_register',
  description:
    'Lit le registre des coûts : charges récurrentes (par série, avec statut), coûts de projet (valides ou annulés), soldes de départ et solde en vigueur. Montants en centimes.',
  covers: [],
  input: z.object({}),
  run: async (ctx) => {
    const data = await loadCostsRegister(ctx.supabase);
    const titles = new Map(data.projects.map((p) => [p.id, p.title]));
    const costs = projectCostRegister(data.projectCosts).sort((a, b) => b.id - a.id);
    const balances = [...data.balances].sort((a, b) => b.id - a.id);
    return {
      recurring: recurringRegister(data.recurring, parisToday(new Date())),
      // Le nom du client n'est pas exposé : le titre du projet suffit pour s'y retrouver.
      projectCosts: costs.slice(0, MAX_PROJECT_COSTS).map((c) => ({ ...c, projectTitle: titles.get(c.projectId) ?? null })),
      projectCostsTruncated: costs.length > MAX_PROJECT_COSTS,
      balances: balances.slice(0, MAX_BALANCES),
      currentBalance: currentBalance(data.balances),
    };
  },
});

// Destructif : l'écriture REMPLACE le coût par rendez-vous déjà enregistré pour (source, campagne, mois) ; l'ancien
// montant n'est pas conservé (seul l'acteur est tracé). L'aperçu montre le montant existant et le nouveau.
const saveAcquisitionCost = defineTool({
  name: 'save_acquisition_cost',
  description:
    "Enregistre ou REMPLACE le coût par rendez-vous (en euros) d'un mois pour une source et une campagne (entonnoir). Le montant précédent n'est pas conservé : sans confirm, l'aperçu montre le montant existant et le nouveau.",
  covers: ['saveCostAction'],
  destructive: true,
  input: z.object({
    source: text(200),
    campaign: text(200).default(''),
    month: z.string().max(7).describe('Mois AAAA-MM'),
    amount: euros('Coût par rendez-vous'),
  }),
  preview: async (ctx, input) => {
    // Même normalisation que l'écriture (minuscules, 1er du mois, centimes).
    const parsed = costSchema.safeParse({ source: input.source, campaign: input.campaign, month: input.month, amount: input.amount });
    if (!parsed.success) return { wouldSave: false, message: ADMIN_COPY.costInvalid };
    const { source, campaign, month, cents } = parsed.data;
    // Lecture RLS d'une ligne : aucun lecteur existant n'expose ce montant (la page entonnoir lit la vue agrégée).
    const row = await ctx.supabase
      .from('sv_acquisition_costs')
      .select('cost_per_rdv_cents')
      .eq('source', source)
      .eq('campaign', campaign)
      .eq('month', month)
      .maybeSingle();
    const existing = (row.data as { cost_per_rdv_cents?: number } | null)?.cost_per_rdv_cents;
    return {
      action: 'Enregistrement du coût par rendez-vous (remplace le montant existant)',
      wouldSave: true,
      source,
      campaign,
      month,
      newAmountCents: cents,
      existingAmountCents: existing === undefined ? null : Number(existing),
      replacesExisting: existing !== undefined,
    };
  },
  run: (ctx, input) => saveAcquisitionCostCore(ctx, input),
});

// Non destructif : registre en ajout seul (une charge est une nouvelle ligne, l'historique est conservé).
const addRecurringCost = defineTool({
  name: 'add_recurring_cost',
  description:
    "Ajoute une charge récurrente, ou une nouvelle version d'une série existante (seriesId). Les saisies ne se modifient pas : corriger = ajouter une version.",
  covers: ['addRecurringCostAction'],
  input: z.object({
    seriesId: z.string().uuid().optional(),
    label: text(120),
    category: z.enum(COST_CATEGORY_KEYS),
    amount: euros('Montant par période'),
    frequency: z.enum(['monthly', 'yearly']),
    startsOn: z.string().max(10).describe('Début AAAA-MM-JJ'),
    endsOn: z.string().max(10).optional().describe('Fin AAAA-MM-JJ'),
  }),
  run: (ctx, input) => addRecurringCostCore(ctx, input),
});

// Non destructif : ajoute une ligne « arrêtée » à la série ; une nouvelle version peut la relancer.
const stopRecurringCost = defineTool({
  name: 'stop_recurring_cost',
  description: "Arrête une charge récurrente à partir d'un mois (ajoute une ligne d'arrêt, l'historique est conservé).",
  covers: ['stopRecurringAction'],
  input: z.object({
    seriesId: z.string().uuid(),
    fromMonth: z.string().max(7).describe('Mois AAAA-MM'),
  }),
  run: (ctx, input) => stopRecurringCostCore(ctx, input),
});

// Non destructif : registre en ajout seul.
const addProjectCost = defineTool({
  name: 'add_project_cost',
  description: "Ajoute un coût réel à un projet (montant et TVA facultative en euros).",
  covers: ['addProjectCostAction'],
  input: z.object({
    projectId: z.string().uuid(),
    incurredOn: z.string().max(10).describe('Date AAAA-MM-JJ'),
    category: z.enum(COST_CATEGORY_KEYS),
    label: text(120),
    amount: euros('Montant'),
    vat: euros('TVA').optional(),
  }),
  run: (ctx, input) => addProjectCostCore(ctx, input),
});

// Non destructif : un solde de départ est une nouvelle ligne ; le plus récent est « en vigueur ».
const saveCashBalance = defineTool({
  name: 'save_cash_balance',
  description: 'Enregistre un solde de trésorerie de départ (peut être négatif) à une date, avec une note facultative.',
  covers: ['saveBalanceAction'],
  input: z.object({
    amount: euros('Solde'),
    asOf: z.string().max(10).describe('Date AAAA-MM-JJ'),
    note: text(200).optional(),
  }),
  run: (ctx, input) => saveBalanceCore(ctx, input),
});

// Destructif : seule suppression du lot. L'annulation d'un coût le retire des totaux (ligne d'annulation) et
// aucune action ne la défait ; il faudrait ressaisir le coût.
const voidProjectCost = defineTool({
  name: 'void_project_cost',
  description: 'Annule un coût de projet (il sort des totaux). Utiliser get_cost_register pour l\'identifiant.',
  covers: ['voidProjectCostAction'],
  destructive: true,
  input: z.object({ costId: z.number().int().positive() }),
  preview: async (ctx, input) => {
    const base = { action: 'Annulation du coût de projet (il sort des totaux)', costId: input.costId };
    try {
      const data = await loadCostsRegister(ctx.supabase);
      const cost = data.projectCosts.find((c) => c.id === input.costId && c.voidsCostId === null);
      if (!cost) return { ...base, found: false };
      const project = data.projects.find((p) => p.id === cost.projectId);
      return {
        ...base,
        found: true,
        label: cost.label,
        category: cost.category,
        amountCents: cost.amountCents,
        incurredOn: cost.incurredOn,
        projectTitle: project?.title ?? null,
      };
    } catch {
      return base;
    }
  },
  run: (ctx, input) => voidProjectCostCore(ctx, input),
});

export const costTools: ToolDef[] = [
  getCostRegister,
  saveAcquisitionCost,
  addRecurringCost,
  stopRecurringCost,
  addProjectCost,
  voidProjectCost,
  saveCashBalance,
];
