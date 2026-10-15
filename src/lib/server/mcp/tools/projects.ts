import 'server-only';
import { z } from 'zod';
import {
  addProjectLinkCore,
  confirmProjectUploadCore,
  downloadProjectFileCore,
  postProjectFactCore,
  requestProjectUploadCore,
  revokeProjectFactCore,
  setReminderHoldCore,
} from '@/lib/server/admin/core/projects';
import { MAX_FILE_BYTES } from '@/lib/projects/fileRules';
import { postFactSchema } from '@/lib/projects/schemas';
import { BLOCAGE_FILTERS, ETAPE_FILTERS, classifyProject, filterProjects, sortProjects } from '@/lib/projects/blocking';
import { blockCompletion } from '@/lib/projects/onboardingSchema';
import { STEPS, resolveWaiting, type ProjectState } from '@/lib/projects/steps';
import { loadAdminProjects, loadPendingClientWork, loadProjectBundle } from '@/lib/server/projects/read';
import { loadReminderHold } from '@/lib/server/reminders/holds';
import { maskEmail, maskPhone } from '../mask';
import { defineTool, type ToolDef } from '../registry';
import type { AdminCtx } from '../session';

const projectId = z.string().uuid();
const fileId = z.string().uuid();
const t = (max: number, min = 1) => z.string().trim().min(min).max(max);

// Lecture du projet pour les aperçus (client RLS) ; null si illisible : l'aperçu reste affiché, sans détail.
async function bundleOf(ctx: AdminCtx, id: string) {
  try {
    return await loadProjectBundle(ctx.supabase, id, new Date());
  } catch {
    return null;
  }
}

// Destructif : enregistrer un fait fait avancer l'étape du projet et envoie un e-mail de changement
// d'étape aux membres du client (envoi non rappelable). Le fait lui-même se corrige par revoke_project_fact.
const postProjectFact = defineTool({
  name: 'post_project_fact',
  description:
    "Enregistre un fait de projet (devis accepté, contrat signé, acompte reçu, production terminée, recette signée, solde reçu), ce qui peut faire avancer l'étape et prévenir le client par e-mail.",
  covers: ['postFactAction'],
  destructive: true,
  input: z.object({
    projectId,
    type: postFactSchema.shape.type,
    note: t(500, 0).optional(),
  }),
  preview: async (ctx, input) => {
    const b = await bundleOf(ctx, input.projectId);
    return {
      action: "Enregistrement d'un fait de projet ; si l'étape change, e-mail de notification aux membres du client",
      projectId: input.projectId,
      projectTitle: b?.project.title ?? null,
      currentStep: b?.state.currentStep ?? null,
      factType: input.type,
      note: input.note ?? null,
    };
  },
  run: (ctx, input) => postProjectFactCore(ctx, input),
});

// Destructif : annule un fait (la ligne de révocation est définitive) et recalcule l'étape, avec notification
// éventuelle du client.
const revokeProjectFact = defineTool({
  name: 'revoke_project_fact',
  description:
    "Révoque un fait de projet (motif de 10 à 500 caractères, tracé). L'étape est recalculée. L'identifiant du fait vient de get_project.",
  covers: ['revokeFactAction'],
  destructive: true,
  input: z.object({
    projectId,
    factId: z.number().int().positive(),
    reason: t(500, 10),
  }),
  preview: async (ctx, input) => {
    const b = await bundleOf(ctx, input.projectId);
    const fact = b?.facts.find((f) => f.id === input.factId);
    return {
      action: "Révocation d'un fait de projet et recalcul de l'étape",
      projectId: input.projectId,
      projectTitle: b?.project.title ?? null,
      factId: input.factId,
      factType: fact?.type ?? null,
      factDate: fact?.createdAt ?? null,
      reason: input.reason,
    };
  },
  run: (ctx, input) => revokeProjectFactCore(ctx, input),
});

// Non destructif : ajout d'un lien utile affiché sur la fiche, sans effet de bord (pas d'e-mail).
const addProjectLink = defineTool({
  name: 'add_project_link',
  description: "Ajoute un lien utile (https uniquement) à la fiche d'un projet.",
  covers: ['addLinkAction'],
  input: z.object({ projectId, title: t(80), url: t(2000) }),
  run: (ctx, input) => addProjectLinkCore(ctx, input),
});

// Non destructif : crée une ligne « pending » invisible tant qu'elle n'est pas confirmée.
const requestProjectUpload = defineTool({
  name: 'request_project_upload',
  description:
    "Étape 1 du dépôt d'un fichier sur un projet : valide le nom, la taille (25 Mo max) et le type MIME, puis renvoie fileId et signedUrl. Envoyer ensuite le fichier avec une requête HTTP PUT sur signedUrl, en multipart/form-data, avec l'en-tête x-upsert: false, le champ cacheControl=3600 et le fichier dans une partie dont le nom de champ est vide (curl : curl -X PUT -H 'x-upsert: false' -F 'cacheControl=3600' -F '=@fichier.pdf' \"<signedUrl>\"). Puis appeler confirm_project_upload avec fileId.",
  covers: ['adminRequestUploadAction'],
  input: z.object({
    projectId,
    filename: z.string().min(1).max(200),
    size: z.number().int().min(1).max(MAX_FILE_BYTES),
    mime: z.string().min(1).max(150),
  }),
  run: (ctx, input) => requestProjectUploadCore(ctx, input),
});

// Non destructif : vérifie la présence du fichier dans le stockage puis le publie sur la fiche.
const confirmProjectUpload = defineTool({
  name: 'confirm_project_upload',
  description:
    "Étape 2 du dépôt : confirme qu'un fichier a bien été envoyé sur signedUrl (voir request_project_upload) et le rend disponible. Échoue si le fichier n'est pas dans le stockage.",
  covers: ['adminConfirmUploadAction'],
  input: z.object({ fileId }),
  run: (ctx, input) => confirmProjectUploadCore(ctx, input),
});

// Lecture : l'URL signée est de courte durée (120 s) ; le contenu du fichier n'est jamais renvoyé.
const getProjectFileUrl = defineTool({
  name: 'get_project_file_url',
  description:
    "Renvoie une URL signée de téléchargement (valable 120 secondes) pour un fichier prêt d'un projet. Le contenu du fichier n'est pas renvoyé : télécharger l'URL (GET).",
  covers: ['adminDownloadAction'],
  input: z.object({ fileId }),
  run: (ctx, input) => downloadProjectFileCore(ctx, input),
});

// Non destructif : suspendre ou reprendre les relances est réversible et n'envoie rien immédiatement.
const setReminderHold = defineTool({
  name: 'set_reminder_hold',
  description: "Suspend (suspend) ou reprend (resume) les relances automatiques d'un projet.",
  covers: ['setReminderHoldAction'],
  input: z.object({ projectId, action: z.enum(['suspend', 'resume']) }),
  run: (ctx, input) => setReminderHoldCore(ctx, input),
});

function stateView(state: ProjectState) {
  const step = state.currentStep ? STEPS.find((x) => x.index === state.currentStep) : undefined;
  return {
    done: state.done,
    currentStep: state.currentStep,
    stepName: step?.name ?? null,
    waitingOn: state.waitingOn,
    expectedAction: state.expectedAction,
  };
}

function companyName(c: { name: string; company: unknown }): string {
  const nom = (c.company as { nom?: unknown } | null)?.nom;
  return typeof nom === 'string' && nom.trim() ? nom : c.name;
}

const listProjects = defineTool({
  name: 'list_projects',
  description:
    "Liste les projets (ceux qui attendent Sèvalys d'abord), avec étape, qui attend, jours d'attente et blocages. Filtres : etape (1 à 6 ou done) et blocage (client, admin, dormant).",
  covers: [],
  input: z.object({
    etape: z.enum(ETAPE_FILTERS).optional(),
    blocage: z.enum(BLOCAGE_FILTERS).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(25),
  }),
  run: async (ctx, input) => {
    const all = await loadAdminProjects(ctx.supabase, new Date());
    const sorted = sortProjects(filterProjects(all, { etape: input.etape, blocage: input.blocage }), undefined, 'desc');
    const from = (input.page - 1) * input.limit;
    return {
      total: sorted.length,
      page: input.page,
      hasNext: from + input.limit < sorted.length,
      projects: sorted.slice(from, from + input.limit).map((p) => ({
        projectId: p.projectId,
        clientName: p.clientName,
        title: p.title,
        offer: p.offer,
        ...stateView(p.state),
        daysWaiting: p.daysWaiting,
        isDormant: p.isDormant,
        blockers: p.blockers,
        lastActivityAt: p.lastActivityAt,
      })),
    };
  },
});

// Reprend la fiche admin hors documents et facturation : étape et faits, fichiers (sans chemin de stockage),
// liens, accord de présentation, onboarding (contact masqué, sans adresse de facturation), relances.
const getProject = defineTool({
  name: 'get_project',
  description:
    "Lit la fiche d'un projet : étape et qui attend, journal des faits (avec leurs notes et identifiants pour revoke_project_fact), fichiers (identifiants pour get_project_file_url), liens, accord de présentation, onboarding et relances. E-mails et téléphones sont masqués.",
  covers: [],
  input: z.object({ projectId }),
  run: async (ctx, input) => {
    const now = new Date();
    const bundle = await loadProjectBundle(ctx.supabase, input.projectId, now);
    if (!bundle) return { ok: false, message: 'Projet introuvable.' };

    // Qui attend vraiment (documents à signer, factures à payer) ; valeur statique si illisible.
    const pending = await loadPendingClientWork(ctx.supabase, [bundle.project.id], new Map([[bundle.project.id, bundle.facts]]));
    const pendingWork = pending?.get(bundle.project.id);
    const state = pendingWork ? resolveWaiting(bundle.state, pendingWork) : bundle.state;
    const { isDormant, daysWaiting } = classifyProject(state, bundle.lastActivityAt, now);

    let reminderHold = null;
    try {
      reminderHold = await loadReminderHold(ctx.supabase, bundle.project.id);
    } catch {
      reminderHold = null;
    }

    const o = bundle.onboarding;
    const latestConsent = bundle.consents[0];
    return {
      project: { id: bundle.project.id, title: bundle.project.title, offer: bundle.project.offer, startedAt: bundle.project.startedAt },
      client: { name: companyName(bundle.client), siret: bundle.client.siret },
      state: { ...stateView(state), daysWaiting, isDormant, lastActivityAt: bundle.lastActivityAt },
      facts: bundle.facts.map((f) => ({ ...f, note: bundle.notes[f.id] ?? null })),
      files: bundle.files.map((f) => ({
        id: f.id,
        filename: f.filename,
        mime: f.mime,
        sizeBytes: f.sizeBytes,
        uploadedByKind: f.uploadedByKind,
        status: f.status,
        createdAt: f.createdAt,
      })),
      links: bundle.links.map((l) => ({ id: l.id, title: l.title, url: l.url, createdAt: l.createdAt })),
      consent: latestConsent
        ? { granted: latestConsent.granted, version: latestConsent.textVersion, at: latestConsent.createdAt }
        : null,
      onboarding: o
        ? {
            completion: blockCompletion(o),
            companyConfirmedAt: o.companyConfirmedAt,
            signatory: { name: o.signatoryName, role: o.signatoryRole },
            contact: {
              name: o.projectContactName,
              email: o.projectContactEmail ? maskEmail(o.projectContactEmail) : null,
              phone: o.projectContactPhone ? maskPhone(o.projectContactPhone) : null,
            },
            vatStatus: o.vatStatus,
            billingSameAsCompany: o.billingSameAsCompany,
            projectGoal: o.projectGoal,
          }
        : null,
      reminderHold,
    };
  },
});

export const projectTools: ToolDef[] = [
  listProjects,
  getProject,
  postProjectFact,
  revokeProjectFact,
  addProjectLink,
  requestProjectUpload,
  confirmProjectUpload,
  getProjectFileUrl,
  setReminderHold,
];
