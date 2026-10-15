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
import { loadProjectBundle } from '@/lib/server/projects/read';
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

export const projectTools: ToolDef[] = [
  postProjectFact,
  revokeProjectFact,
  addProjectLink,
  requestProjectUpload,
  confirmProjectUpload,
  getProjectFileUrl,
  setReminderHold,
];
