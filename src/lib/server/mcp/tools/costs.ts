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

// Non destructif : l'écriture remplace le montant d'un mois pour une source/campagne, mais l'action est tracée
// avec l'acteur et se corrige en la rejouant ; aucune donnée n'est supprimée.
const saveAcquisitionCost = defineTool({
  name: 'save_acquisition_cost',
  description:
    "Enregistre (ou remplace) le coût d'acquisition d'un mois pour une source et une campagne (entonnoir).",
  covers: ['saveCostAction'],
  input: z.object({
    source: text(200),
    campaign: text(200).default(''),
    month: z.string().max(7).describe('Mois AAAA-MM'),
    amount: euros('Coût du mois'),
  }),
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
