import 'server-only';
import { z } from 'zod';
import {
  downloadInvoiceCore,
  findIssuedCreditNoteCore,
  findIssuedInvoiceCore,
  issueCreditNoteCore,
  issuePeriodInvoiceCore,
  loadInvoiceDataCore,
  prepareCreditNoteCore,
  preparePeriodInvoiceCore,
  previewCreditNoteCore,
  previewPeriodInvoiceCore,
  totalsOf,
  verifyInvoiceHashCore,
} from '@/lib/server/admin/core/billing';
import type { LedgerSnapshot } from '@/lib/documents/types';
import { loadAdminBillingView } from '@/lib/server/invoices/adminView';
import { loadInvoicesForProjects } from '@/lib/server/invoices/read';
import { loadProjectBundle } from '@/lib/server/projects/read';
import { pdfTooLarge, pdfTooLargeMessage } from '../pdf';
import { stripSeller } from '../redact';
import { defineTool, type ToolDef } from '../registry';
import type { AdminCtx } from '../session';

const invoiceId = z.string().uuid();
const projectId = z.string().uuid();

// Montants en texte, comme dans les formulaires web : le core les valide et renvoie les mêmes messages.
const periodShape = {
  projectId,
  periodStart: z.string().max(10).describe('Début de période AAAA-MM-JJ'),
  periodEnd: z.string().max(10).describe('Fin de période AAAA-MM-JJ'),
  lines: z
    .array(
      z.object({
        designation: z.string().max(200),
        days: z.string().max(20).describe('Jours (pas de 0,5), ex. "10,5"'),
        dailyRate: z.string().max(40).describe('Tarif journalier en euros, ex. "400"'),
      }),
    )
    .min(1)
    .max(30),
  orderNumber: z.string().max(100).optional(),
  dueDate: z.string().max(10).optional().describe('Échéance AAAA-MM-JJ (facultative)'),
};

const NUMBER_NOTE = "Le numéro de facture (séquentiel) est attribué à l'émission : il n'existe pas encore dans cet aperçu.";

function coreInput(input: Record<string, unknown>): Record<string, unknown> {
  const { includePdf: _includePdf, ...rest } = input;
  void _includePdf;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

/** Parties, période et montants HT / TVA / TTC de l'instantané. Aucune identité vendeur, aucun SIRET. */
function ledgerSummary(snapshot: LedgerSnapshot) {
  const base = {
    client: snapshot.client.name,
    project: snapshot.project.title,
    lines: snapshot.lines,
    totals: totalsOf(snapshot),
    numberNote: NUMBER_NOTE,
  };
  if (snapshot.docType === 'invoice') {
    return {
      ...base,
      kind: snapshot.kind,
      servicePeriod: snapshot.servicePeriod,
      dueDate: snapshot.dueDate,
      orderNumber: snapshot.orderNumber,
      deductions: snapshot.deductions,
      prepaidCents: snapshot.prepaidCents,
    };
  }
  return {
    ...base,
    scope: snapshot.scope,
    reason: snapshot.reason,
    originNumber: snapshot.origin.number,
    originIssuedOn: snapshot.origin.issuedOn,
    originTotalInclTaxCents: snapshot.origin.totalInclTaxCents,
  };
}

// Garde anti-doublon (couche outil uniquement) : un identifiant régénéré contourne la clé d'idempotence. On refuse
// une émission équivalente (même projet et même période ; même facture et même montant pour un avoir partiel)
// déjà faite sous un autre identifiant depuis moins de 15 minutes. Lecteur existant (loadInvoicesForProjects) pour
// repérer les candidats, puis lecture RLS de issued_at (colonne accordée) pour la fenêtre de temps.
const DUPLICATE_WINDOW_MS = 15 * 60_000;
type Duplicate = { number: string; id: string };

async function issuedRecently(ctx: AdminCtx, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await ctx.supabase.from('sv_invoices').select('id, issued_at').in('id', ids);
  const now = Date.now();
  return new Set(
    ((data ?? []) as { id: string; issued_at: string }[])
      .filter((r) => now - new Date(r.issued_at).getTime() < DUPLICATE_WINDOW_MS)
      .map((r) => r.id),
  );
}

async function periodDuplicate(ctx: AdminCtx, input: Record<string, unknown>): Promise<Duplicate | null> {
  const views = await loadInvoicesForProjects(ctx.supabase, [String(input.projectId)]);
  const candidates = views.filter(
    (v) =>
      v.kind === 'period' &&
      v.id !== input.invoiceId &&
      v.periodStart === input.periodStart &&
      v.periodEnd === input.periodEnd,
  );
  const recent = await issuedRecently(ctx, candidates.map((c) => c.id));
  const hit = candidates.find((c) => recent.has(c.id));
  return hit ? { number: hit.number, id: hit.id } : null;
}

async function creditDuplicate(
  ctx: AdminCtx,
  input: Record<string, unknown>,
  prep: { load: { projectId: string }; args: { snapshot: { totalInclTaxCents: number } } },
): Promise<Duplicate | null> {
  if (input.scope !== 'partial') return null;
  const views = await loadInvoicesForProjects(ctx.supabase, [prep.load.projectId]);
  const origin = views.find((v) => v.id === input.originInvoiceId);
  const candidates = (origin?.creditNotes ?? []).filter(
    (c) => c.id !== input.creditNoteId && c.totalInclTaxCents === prep.args.snapshot.totalInclTaxCents,
  );
  const recent = await issuedRecently(ctx, candidates.map((c) => c.id));
  const hit = candidates.find((c) => recent.has(c.id));
  return hit ? { number: hit.number, id: hit.id } : null;
}

const duplicateMessage = (what: string, d: Duplicate) =>
  `${what} équivalent a déjà été émis il y a moins de 15 minutes sous un autre identifiant (numéro ${d.number}). Appelez list_project_invoices pour le vérifier avant de réessayer avec un nouvel identifiant.`;

const previewPeriodInvoice = defineTool({
  name: 'preview_period_invoice',
  description:
    "Aperçu d'une facture de période (lignes en jours x tarif journalier) sans rien émettre : mêmes contrôles que l'émission, renvoie client, période et montants HT / TVA / TTC. includePdf: true ajoute le PDF en base64 (2 Mo maximum ; il contient l'identité et les coordonnées bancaires du vendeur).",
  covers: ['previewPeriodInvoiceAction'],
  input: z.object({
    ...periodShape,
    invoiceId: invoiceId.optional(),
    includePdf: z.boolean().default(false),
  }),
  run: async (ctx, input) => {
    const res = await previewPeriodInvoiceCore(ctx, coreInput(input as Record<string, unknown>));
    if (!res.ok) return res;
    if (input.includePdf && pdfTooLarge(res.pdfBase64)) return { ok: false, message: pdfTooLargeMessage('get_invoice_url') };
    return { summary: ledgerSummary(res.snapshot), ...(input.includePdf ? { pdfBase64: res.pdfBase64 } : {}) };
  },
});

// Destructif : l'émission attribue un numéro de facture séquentiel (irréversible, jamais réutilisé), fige le PDF
// et envoie la facture au client par e-mail. Seul un avoir peut l'annuler comptablement.
const issuePeriodInvoice = defineTool({
  name: 'issue_period_invoice',
  description:
    "Émet une facture de période : attribue le prochain numéro séquentiel, fige le PDF et peut l'envoyer au client par e-mail. Mêmes champs que preview_period_invoice, invoiceId obligatoire : un uuid v4 généré une fois et réutilisé à chaque nouvel essai du même envoi (clé d'idempotence, évite toute double facture). Avant de réessayer avec un NOUVEL invoiceId, appelez list_project_invoices : une émission équivalente (même projet et même période) de moins de 15 minutes est refusée. Sans confirm, renvoie exactement client, période et montants qui seraient facturés ; avec confirm: true et le previewToken, refait tous les contrôles puis émet et renvoie le numéro et l'identifiant.",
  covers: ['issuePeriodInvoiceAction'],
  destructive: true,
  input: z.object({ ...periodShape, invoiceId }),
  preview: async (ctx, input) => {
    const raw = coreInput(input as Record<string, unknown>);
    // Identifiant déjà utilisé : la facture existe, rien ne serait émis.
    const used = await findIssuedInvoiceCore(ctx, raw);
    if (used) {
      return {
        wouldIssue: false,
        alreadyIssued: true,
        number: used.number,
        invoiceId: used.invoiceId,
        message: 'Cet invoiceId a déjà servi : la facture existe déjà, rien ne sera émis.',
      };
    }
    // Mêmes contrôles et même construction que l'émission confirmée (mode 'issue').
    const prep = await preparePeriodInvoiceCore(ctx, raw, 'issue');
    if (!prep.ok) {
      return { wouldIssue: false, message: prep.message, ...(prep.fieldErrors ? { fieldErrors: prep.fieldErrors } : {}) };
    }
    const dup = await periodDuplicate(ctx, raw);
    if (dup) return { wouldIssue: false, duplicateOf: dup, message: duplicateMessage('Une facture pour la même période', dup) };
    return {
      action: "Émission d'une facture numérotée ; le client peut la recevoir par e-mail",
      wouldIssue: true,
      invoiceId: prep.invoiceId,
      summary: ledgerSummary(prep.snapshot),
      mail: "La facture peut être envoyée par e-mail aux membres du client à l'émission.",
    };
  },
  run: async (ctx, input) => {
    const raw = coreInput(input as Record<string, unknown>);
    const dup = await periodDuplicate(ctx, raw);
    if (dup) return { ok: false, message: duplicateMessage('Une facture pour la même période', dup) };
    const res = await issuePeriodInvoiceCore(ctx, raw);
    if (!res.ok) {
      // Rejeu de la même clé d'idempotence : la facture existe déjà, l'appelant doit connaître son numéro.
      if (res.alreadyIssued) return { issued: false, alreadyIssued: true, ...res.alreadyIssued, message: res.message };
      return res;
    }
    return {
      issued: true,
      number: res.number,
      invoiceId: res.invoiceId,
      tone: res.tone,
      message: res.message,
      mail: res.mail,
      pdf: res.pdf,
      totals: res.totals,
    };
  },
});

const creditShape = {
  originInvoiceId: invoiceId,
  scope: z.enum(['total', 'partial']),
  amount: z.string().max(40).optional().describe("partial : montant TTC de l'avoir en euros, ex. \"100\""),
  reason: z.string().max(1100).describe('Motif (3 à 1000 caractères)'),
  refundRequested: z.boolean().describe('Demander le remboursement Stripe (seulement si la facture a été payée via Stripe)'),
};

const previewCreditNote = defineTool({
  name: 'preview_credit_note',
  description:
    "Aperçu d'un avoir sur une facture sans rien émettre : mêmes contrôles que l'émission, renvoie la facture d'origine, la portée, les montants et si un remboursement serait demandé. includePdf: true ajoute le PDF en base64 (2 Mo maximum ; il contient l'identité et les coordonnées bancaires du vendeur).",
  covers: ['previewCreditNoteAction'],
  input: z.object({ ...creditShape, creditNoteId: invoiceId.optional(), includePdf: z.boolean().default(false) }),
  run: async (ctx, input) => {
    const res = await previewCreditNoteCore(ctx, coreInput(input as Record<string, unknown>));
    if (!res.ok) return res;
    if (input.includePdf && pdfTooLarge(res.pdfBase64)) return { ok: false, message: pdfTooLargeMessage('get_invoice_url') };
    return {
      summary: { ...ledgerSummary(res.snapshot), ...res.credit },
      ...(input.includePdf ? { pdfBase64: res.pdfBase64 } : {}),
    };
  },
});

// Destructif : l'avoir reçoit un numéro séquentiel, réduit définitivement le montant facturable de la facture
// d'origine, peut déclencher un remboursement Stripe, expire les sessions de paiement ouvertes d'une facture
// impayée et prévient le client par e-mail.
const issueCreditNote = defineTool({
  name: 'issue_credit_note',
  description:
    "Émet un avoir (total ou partiel) sur une facture : numéro séquentiel, réduction définitive de la facture, remboursement Stripe éventuel et e-mail au client. creditNoteId obligatoire : un uuid v4 généré une fois et réutilisé à chaque nouvel essai du même envoi. Avant de réessayer avec un NOUVEAU creditNoteId, appelez list_project_invoices : un avoir partiel équivalent (même facture, même montant) de moins de 15 minutes est refusé. Sans confirm, renvoie les montants, le remboursement prévu et les effets ; avec confirm: true et le previewToken, refait tous les contrôles puis émet.",
  covers: ['issueCreditNoteAction'],
  destructive: true,
  input: z.object({ ...creditShape, creditNoteId: invoiceId }),
  preview: async (ctx, input) => {
    const raw = coreInput(input as Record<string, unknown>);
    const used = await findIssuedCreditNoteCore(ctx, raw);
    if (used) {
      return {
        wouldIssue: false,
        alreadyIssued: true,
        number: used.number,
        creditNoteId: used.creditNoteId,
        message: 'Ce creditNoteId a déjà servi : l\'avoir existe déjà, rien ne sera émis.',
      };
    }
    const prep = await prepareCreditNoteCore(ctx, raw);
    if (!prep.ok) {
      return { wouldIssue: false, message: prep.message, ...(prep.fieldErrors ? { fieldErrors: prep.fieldErrors } : {}) };
    }
    const dup = await creditDuplicate(ctx, raw, prep);
    if (dup) return { wouldIssue: false, duplicateOf: dup, message: duplicateMessage('Un avoir pour la même facture et le même montant', dup) };
    return {
      action: "Émission d'un avoir numéroté ; le client est prévenu par e-mail",
      wouldIssue: true,
      creditNoteId: prep.id,
      summary: {
        ...ledgerSummary(prep.args.snapshot),
        refundWillBeRequested: prep.refund,
        refundEligible: prep.load.refundEligible,
        openPaymentsWillBeExpired: !prep.load.paid,
      },
      mail: "L'avoir peut être envoyé par e-mail aux membres du client à l'émission.",
    };
  },
  run: async (ctx, input) => {
    const raw = coreInput(input as Record<string, unknown>);
    // Le doublon n'est cherché que si la préparation aboutit (un rejeu déjà émis est géré par le core).
    const prep = await prepareCreditNoteCore(ctx, raw);
    if (prep.ok) {
      const dup = await creditDuplicate(ctx, raw, prep);
      if (dup) return { ok: false, message: duplicateMessage('Un avoir pour la même facture et le même montant', dup) };
    }
    const res = await issueCreditNoteCore(ctx, raw);
    if (!res.ok) return res;
    if (res.outcome === 'already_issued') {
      return {
        issued: false,
        alreadyIssued: true,
        number: res.number,
        creditNoteId: res.creditNoteId,
        originNumber: res.originNumber,
        message: res.message,
      };
    }
    return {
      issued: true,
      number: res.number,
      creditNoteId: res.creditNoteId,
      originNumber: res.originNumber,
      tone: res.tone,
      message: res.message,
      refundRequested: res.refundRequested,
      totals: res.totals,
    };
  },
});

const getInvoiceUrl = defineTool({
  name: 'get_invoice_url',
  description: "Renvoie une URL signée de courte durée pour télécharger le PDF d'une facture ou d'un avoir (le contenu n'est pas renvoyé).",
  covers: ['adminInvoiceDownloadAction'],
  input: z.object({ invoiceId }),
  run: (ctx, input) => downloadInvoiceCore(ctx, input),
});

const verifyInvoiceHash = defineTool({
  name: 'verify_invoice_hash',
  description: "Vérifie que le PDF stocké d'une facture correspond à l'empreinte enregistrée (match: true/false).",
  covers: ['verifyInvoiceHashAction'],
  input: z.object({ invoiceId }),
  run: (ctx, input) => verifyInvoiceHashCore(ctx, input),
});

const getInvoiceData = defineTool({
  name: 'get_invoice_data',
  description: "Lit l'instantané figé d'une facture ou d'un avoir émis (lignes, montants, parties) ; l'identité du vendeur est retirée à toute profondeur.",
  covers: ['loadInvoiceDataAction'],
  input: z.object({ invoiceId }),
  run: async (ctx, input) => {
    const res = await loadInvoiceDataCore(ctx, input);
    if (!res.ok) return res;
    // Les lignes brutes de la table ne sont pas renvoyées : l'instantané contient les lignes figées.
    return { snapshot: stripSeller(res.data!.snapshot) };
  },
});

// Reprend la section « Facturation » de la fiche projet. Les identifiants Stripe (intention de paiement, références)
// ne sont pas renvoyés ; la page les affiche, un client MCP n'en a pas besoin.
const listProjectInvoices = defineTool({
  name: 'list_project_invoices',
  description:
    "Liste la facturation d'un projet : synthèse (devis, facturé, encaissé, reste), factures automatiques, factures et avoirs avec statut et plafond d'avoir, paiements en attente. À consulter avant de réessayer une émission avec un nouvel identifiant.",
  covers: [],
  input: z.object({ projectId }),
  run: async (ctx, input) => {
    const bundle = await loadProjectBundle(ctx.supabase, input.projectId, new Date());
    if (!bundle) return { ok: false, message: 'Projet introuvable.' };
    const view = await loadAdminBillingView(ctx.supabase, bundle, new Date());
    return {
      isTest: view.isTest,
      contractSigned: view.contractSigned,
      summary: view.summary,
      depositPaidViaStripeAt: view.depositPaidViaStripeAt,
      auto: view.auto,
      invoices: view.invoices.map(({ stripe, ...inv }) => ({ ...inv, paidViaStripeAt: stripe.confirmedAt })),
      pending: view.pending.map(({ stripeRef: _ref, ...p }) => {
        void _ref;
        return p;
      }),
    };
  },
});

export const billingTools: ToolDef[] = [
  previewPeriodInvoice,
  issuePeriodInvoice,
  previewCreditNote,
  issueCreditNote,
  getInvoiceUrl,
  verifyInvoiceHash,
  getInvoiceData,
  listProjectInvoices,
];
