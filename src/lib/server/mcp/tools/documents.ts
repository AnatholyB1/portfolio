import 'server-only';
import { z } from 'zod';
import {
  downloadDocumentCore,
  exportSignatureTrailCore,
  issueDocumentCore,
  loadSnapshotCore,
  prepareDocumentCore,
  previewDocumentCore,
  resumeFinalizationCore,
  sealedDownloadCore,
  verifyDocumentHashCore,
  verifySignatureChainCore,
} from '@/lib/server/admin/core/documents';
import type { SignatureView } from '@/components/admin/projects/documents/types';
import type { DocumentSnapshot } from '@/lib/documents/types';
import { loadAdminDocumentsView } from '@/lib/server/documents/adminView';
import { loadProjectBundle } from '@/lib/server/projects/read';
import { loadSignatureViews } from '@/lib/server/signature/adminView';
import { maskEmail } from '../mask';
import { defineTool, type ToolDef } from '../registry';

const documentId = z.string().uuid();
const projectId = z.string().uuid();

// Entrée à plat (un outil MCP attend un objet) : le core revalide tout avec le schéma discriminé du web.
// Champs par docType : quote = lines, depositPercent, validityDays, leadTime ; spec = context, scope,
// deliverables, outOfScope, planning, acceptanceCriteria ; contract = startDate ; acceptance = deliveryDate,
// reservations ; invoice (aperçu seulement) = kind, serviceDate, orderNumber.
const documentFields = {
  projectId,
  documentId: documentId.describe('Identifiant (uuid v4) du document à émettre ; le générer une fois et le réutiliser pour un nouvel essai.'),
  docType: z.enum(['quote', 'spec', 'contract', 'acceptance', 'invoice']),
  lines: z
    .array(z.object({ designation: z.string(), quantity: z.number(), unitPriceCents: z.number() }))
    .max(30)
    .optional()
    .describe('quote : lignes (prix unitaire en centimes)'),
  depositPercent: z.number().optional().describe('quote : acompte en %'),
  validityDays: z.number().optional().describe('quote : durée de validité en jours'),
  leadTime: z.string().max(200).optional().describe('quote : délai'),
  context: z.string().max(4100).optional(),
  scope: z.string().max(4100).optional(),
  deliverables: z.string().max(4100).optional(),
  outOfScope: z.string().max(4100).optional(),
  planning: z.string().max(4100).optional(),
  acceptanceCriteria: z.string().max(4100).optional().describe('spec : un critère par ligne'),
  startDate: z.string().max(10).optional().describe('contract : AAAA-MM-JJ'),
  deliveryDate: z.string().max(10).optional().describe('acceptance : AAAA-MM-JJ'),
  reservations: z.string().max(2100).optional(),
  kind: z.enum(['deposit', 'balance']).optional().describe('invoice (aperçu) : acompte ou solde'),
  serviceDate: z.string().max(10).optional().describe('invoice (aperçu) : AAAA-MM-JJ'),
  orderNumber: z.string().max(40).optional(),
};

type DocInput = { [K in keyof typeof documentFields]?: unknown } & { includePdf?: boolean };

// Retire les champs propres à l'outil et les clés absentes : le core reçoit ce que recevait l'action web.
function coreInput(input: Record<string, unknown>): Record<string, unknown> {
  const { includePdf: _includePdf, ...rest } = input;
  void _includePdf;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

/** Montants et parties de l'instantané, lisibles dans la transcription. Aucune identité vendeur ni IBAN. */
function summarize(snapshot: DocumentSnapshot) {
  const base = {
    docType: snapshot.docType,
    reference: snapshot.reference,
    revision: snapshot.revision,
    issuedOn: snapshot.issuedOn,
    client: snapshot.client.name,
    project: snapshot.project.title,
  };
  switch (snapshot.docType) {
    case 'quote':
      return {
        ...base,
        lines: snapshot.lines,
        totalCents: snapshot.totalCents,
        depositPercent: snapshot.depositPercent,
        depositCents: snapshot.depositCents,
        balanceCents: snapshot.balanceCents,
        validUntil: snapshot.validUntil,
        leadTime: snapshot.leadTime,
      };
    case 'contract':
      return {
        ...base,
        quoteReference: snapshot.quote.reference,
        totalCents: snapshot.quote.totalCents,
        depositCents: snapshot.quote.depositCents,
        balanceCents: snapshot.quote.balanceCents,
        startDate: snapshot.startDate,
      };
    case 'spec':
      return { ...base, sections: Object.keys(snapshot.sections), acceptanceCriteria: snapshot.acceptanceCriteria };
    case 'acceptance':
      return {
        ...base,
        specReference: snapshot.spec.reference,
        deliveryDate: snapshot.deliveryDate,
        acceptanceCriteria: snapshot.acceptanceCriteria,
        reservations: snapshot.reservations,
      };
    case 'invoice':
      return {
        ...base,
        kind: snapshot.kind,
        totalCents: snapshot.totalCents,
        alreadyPaidCents: snapshot.alreadyPaidCents,
        netToPayCents: snapshot.netToPayCents,
        serviceDate: snapshot.serviceDate,
        dueDate: snapshot.dueDate,
      };
  }
}

function withoutSeller<T extends object>(snapshot: T): Omit<T, 'seller'> {
  const { seller: _seller, ...rest } = snapshot as T & { seller?: unknown };
  void _seller;
  return rest;
}

const previewDocument = defineTool({
  name: 'preview_document',
  description:
    "Aperçu d'un document (devis, cahier des charges, contrat, PV de recette, facture proforma) sans rien émettre : applique les mêmes contrôles que l'aperçu web et renvoie un résumé (montants, référence, révision). includePdf: true ajoute le PDF en base64.",
  covers: ['previewDocumentAction'],
  input: z.object({ ...documentFields, includePdf: z.boolean().default(false) }),
  run: async (ctx, input) => {
    const res = await previewDocumentCore(ctx, coreInput(input as Record<string, unknown>));
    if (!res.ok) return res;
    return {
      summary: summarize(res.snapshot),
      replacesPreviousRevision: res.replaces !== null,
      ...((input as DocInput).includePdf ? { pdfBase64: res.pdfBase64 } : {}),
    };
  },
});

// Destructif : l'émission fige un document juridique (PDF, empreinte, instantané), peut remplacer la révision
// précédente et envoie les e-mails de notification au client. Rien ne la défait.
const issueDocument = defineTool({
  name: 'issue_document',
  description:
    "Émet un document (devis, cahier des charges, contrat ou PV de recette ; pas les factures) : fige le PDF, remplace la révision précédente le cas échéant et peut prévenir le client par e-mail. Mêmes champs que preview_document. Sans confirm, renvoie ce qui serait émis ; avec confirm: true, refait tous les contrôles puis émet et renvoie documentId et référence. documentId sert de clé d'idempotence : le réutiliser pour un nouvel essai.",
  covers: ['issueDocumentAction'],
  destructive: true,
  input: z.object(documentFields),
  preview: async (ctx, input) => {
    // Mêmes contrôles que l'émission confirmée (mode 'issue').
    const prep = await prepareDocumentCore(ctx, coreInput(input as Record<string, unknown>), 'issue');
    if (!prep.ok) {
      return { wouldIssue: false, message: prep.message, ...(prep.fieldErrors ? { fieldErrors: prep.fieldErrors } : {}) };
    }
    return {
      action: "Émission d'un document juridique figé ; le client peut être prévenu par e-mail",
      wouldIssue: true,
      documentId: prep.input.documentId,
      summary: summarize(prep.snapshot),
      replacesPreviousRevision: prep.replaces !== null,
      mail: "Des e-mails de notification peuvent être envoyés aux membres du client à l'émission.",
    };
  },
  run: async (ctx, input) => {
    const res = await issueDocumentCore(ctx, coreInput(input as Record<string, unknown>));
    if (!res.ok) return res;
    return { issued: res.data.outcome === 'issued', ...res.data };
  },
});

const getDocumentUrl = defineTool({
  name: 'get_document_url',
  description: "Renvoie une URL signée de courte durée pour télécharger le PDF émis d'un document (le contenu n'est pas renvoyé).",
  covers: ['adminDocumentDownloadAction'],
  input: z.object({ documentId }),
  run: (ctx, input) => downloadDocumentCore(ctx, input),
});

const verifyDocumentHash = defineTool({
  name: 'verify_document_hash',
  description: "Vérifie que le PDF stocké d'un document correspond à l'empreinte enregistrée (match: true/false).",
  covers: ['verifyDocumentHashAction'],
  input: z.object({ documentId }),
  run: (ctx, input) => verifyDocumentHashCore(ctx, input),
});

// L'export est la pièce d'audit signée (chaîne de hachage) : renvoyé tel quel, sinon il ne se vérifie plus.
// Il contient des adresses IP et des identifiants d'acteurs, pas d'e-mail ni de téléphone.
const exportSignatureTrail = defineTool({
  name: 'export_signature_trail',
  description:
    "Exporte la piste d'audit de signature d'un document (JSON auto-vérifié, tel que remis par l'admin web : adresses IP incluses, aucun e-mail).",
  covers: ['exportSignatureTrailAction'],
  input: z.object({ documentId }),
  run: (ctx, input) => exportSignatureTrailCore(ctx, input),
});

const verifySignatureChain = defineTool({
  name: 'verify_signature_chain',
  description: "Vérifie l'intégrité de la chaîne de hachage de signature d'un document (intact, nombre d'évènements, rupture éventuelle).",
  covers: ['verifySignatureChainAction'],
  input: z.object({ documentId }),
  run: (ctx, input) => verifySignatureChainCore(ctx, input),
});

const getSealedDocumentUrl = defineTool({
  name: 'get_sealed_document_url',
  description:
    "Renvoie une URL signée de courte durée pour le PDF scellé (signé) d'un document ; le téléchargement est tracé dans la piste d'audit (sans adresse IP pour un client MCP).",
  covers: ['adminSealedDownloadAction'],
  input: z.object({ documentId }),
  run: (ctx, input) => sealedDownloadCore(ctx, { documentId: input.documentId, ip: null }),
});

// Destructif : scelle le PDF signé, enregistre le fait de signature, envoie les e-mails de notification et,
// pour un contrat ou un PV de recette, peut émettre automatiquement la facture d'acompte ou finale.
const resumeSignatureFinalization = defineTool({
  name: 'resume_signature_finalization',
  description:
    "Reprend la finalisation d'une signature restée en attente (scellement du PDF, fait de projet, e-mails, et facture automatique pour un contrat ou un PV de recette). À utiliser quand list_project_documents indique pendingFinalization.",
  covers: ['adminResumeFinalizationAction'],
  destructive: true,
  input: z.object({ documentId }),
  preview: async (ctx, input) => {
    const doc = await ctx.supabase
      .from('sv_project_documents')
      .select('project_id, doc_type, reference, revision')
      .eq('id', input.documentId)
      .maybeSingle();
    const row = doc.data as { project_id?: string; doc_type?: string; reference?: string; revision?: number } | null;
    let view: SignatureView | undefined;
    if (row?.project_id) view = (await loadSignatureViews(ctx.supabase, row.project_id)).get(input.documentId);
    return {
      action:
        "Finalisation de la signature : scellement du PDF, fait de projet, e-mails de notification et, pour un contrat ou un PV de recette, émission automatique de la facture d'acompte ou finale",
      documentId: input.documentId,
      found: Boolean(row),
      reference: row?.reference ?? null,
      docType: row?.doc_type ?? null,
      revision: row?.revision ?? null,
      pendingFinalization: view?.pendingFinalization ?? null,
      signer: view?.signature
        ? {
            name: view.signature.signerName,
            role: view.signature.signerRole,
            email: maskEmail(view.signature.signerEmail),
            signedAtUtc: view.signature.signedAtUtc,
          }
        : null,
    };
  },
  run: async (ctx, input) => {
    const res = await resumeFinalizationCore(ctx, input);
    if (!res.ok) return res;
    return { resumed: true };
  },
});

const getDocumentSnapshot = defineTool({
  name: 'get_document_snapshot',
  description: "Lit l'instantané figé d'un document émis (lignes, montants, parties) ; l'identité du vendeur est retirée.",
  covers: ['loadSnapshotAction'],
  input: z.object({ documentId }),
  run: async (ctx, input) => {
    const res = await loadSnapshotCore(ctx, input);
    if (!res.ok) return res;
    return { snapshot: withoutSeller(res.data!.snapshot) };
  },
});

// Reprend la section « Documents » de la fiche projet : documents attendus et émis, devis et cahier des charges
// actifs, et par document le dossier de signature (e-mail du signataire masqué, empreintes affichées par la page :
// empreinte du PDF et du scellé ; l'empreinte du dernier lien de signature n'est pas renvoyée).
const listProjectDocuments = defineTool({
  name: 'list_project_documents',
  description:
    "Liste les documents d'un projet : documents attendus (et pourquoi un document est bloqué), documents émis avec statut, signature et scellé.",
  covers: [],
  input: z.object({ projectId }),
  run: async (ctx, input) => {
    const bundle = await loadProjectBundle(ctx.supabase, input.projectId, new Date());
    if (!bundle) return { ok: false, message: 'Projet introuvable.' };
    const [view, signatures] = await Promise.all([
      loadAdminDocumentsView(ctx.supabase, bundle),
      loadSignatureViews(ctx.supabase, input.projectId),
    ]);
    return {
      parties: view.parties,
      expected: view.expected,
      activeQuote: view.activeQuote,
      activeSpec: view.activeSpec,
      documents: view.issued.map((d) => {
        const s = signatures.get(d.id);
        return {
          ...d,
          signature: s?.signature
            ? {
                signerName: s.signature.signerName,
                signerRole: s.signature.signerRole,
                signerEmail: maskEmail(s.signature.signerEmail),
                signedAtUtc: s.signature.signedAtUtc,
                ip: s.signature.ip,
                consentVersion: s.signature.consentVersion,
              }
            : null,
          seal: s?.seal ?? null,
          pendingFinalization: s?.pendingFinalization ?? false,
          eventCount: s?.eventCount ?? 0,
          events: s?.events ?? [],
          reserves: s?.reserves ?? [],
          refusal: s?.refusal ?? null,
        };
      }),
    };
  },
});

export const documentTools: ToolDef[] = [
  previewDocument,
  issueDocument,
  getDocumentUrl,
  verifyDocumentHash,
  exportSignatureTrail,
  verifySignatureChain,
  getSealedDocumentUrl,
  resumeSignatureFinalization,
  getDocumentSnapshot,
  listProjectDocuments,
];
