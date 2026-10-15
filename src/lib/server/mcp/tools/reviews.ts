import 'server-only';
import { z } from 'zod';
import { hideReviewCore, reissueReviewLinkCore, unhideReviewCore } from '@/lib/server/admin/core/reviews';
import { REVIEW_HIDE_REASONS, loadAdminReviews } from '@/lib/server/reviews/admin';
import { loadOpenReviewLinks, loadReviewLinkStatus } from '@/lib/server/reviews/linksAdmin';
import { maskEmail } from '../mask';
import { defineTool, type ToolDef } from '../registry';

const MAX_OPEN_LINKS = 100;

const reviewId = z.string().uuid();
const detail = z.string().trim().min(3).max(500);
const hideReasons = REVIEW_HIDE_REASONS.map((r) => r.value) as [string, ...string[]];

function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : chars.slice(0, max - 1).join('') + '…';
}

const listReviews = defineTool({
  name: 'list_reviews',
  description:
    "Liste les avis clients (plus récents d'abord) avec leur statut (published/hidden) et l'historique de modération. Les e-mails des administrateurs sont masqués.",
  covers: [],
  input: z.object({
    page: z.number().int().min(1).max(100).default(1),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  run: async (ctx, input) => {
    const from = (input.page - 1) * input.limit;
    // Une ligne de plus que la page pour savoir s'il y a une suite (comme la page admin).
    const fetched = await loadAdminReviews(ctx.supabase, { from, to: from + input.limit });
    return {
      page: input.page,
      hasNext: fetched.length > input.limit,
      reviews: fetched.slice(0, input.limit).map((r) => ({
        ...r,
        // Un avis masqué l'a été pour illégalité (injure, données de tiers) : le corps est tronqué dans la liste.
        body: r.status === 'hidden' ? truncate(r.body, 80) : r.body,
        history: r.history.map(({ actorEmail, ...h }) => ({
          ...h,
          actorEmail: actorEmail === null ? null : maskEmail(actorEmail),
        })),
      })),
    };
  },
});

const listOpenReviewLinks = defineTool({
  name: 'list_open_review_links',
  description:
    "Liste les projets dont le lien d'avis n'a pas abouti à un avis (statut du dernier lien : active, expired, used, invalidated). Sert à choisir un projet pour reissue_review_link.",
  covers: [],
  input: z.object({}),
  run: async (ctx) => {
    const rows = await loadOpenReviewLinks(ctx.supabase);
    return {
      // Le nom du client n'est pas exposé : le titre du projet suffit.
      links: rows.slice(0, MAX_OPEN_LINKS).map((l) => ({ projectId: l.projectId, projectTitle: l.projectTitle, status: l.status })),
      truncated: rows.length > MAX_OPEN_LINKS,
    };
  },
});

// Destructif : le masquage retire un avis de l'affichage public et notifie son auteur par e-mail (envoi
// non rappelable). Il reste réversible par unhide_review, qui n'est donc pas soumis à confirmation.
const hideReview = defineTool({
  name: 'hide_review',
  description:
    "Masque un avis pour un motif légal (liste fermée) : il n'est plus affiché publiquement et son auteur est prévenu par e-mail. Réversible avec unhide_review.",
  covers: ['hideReviewAction'],
  destructive: true,
  input: z.object({ reviewId, reason: z.enum(hideReasons), detail }),
  preview: async (_ctx, input) => ({
    action: "Masquage de l'avis (retiré de l'affichage public) et e-mail de notification à son auteur",
    reviewId: input.reviewId,
    reason: input.reason,
    reasonLabel: REVIEW_HIDE_REASONS.find((r) => r.value === input.reason)?.label ?? input.reason,
    detail: input.detail,
  }),
  run: (ctx, input) => hideReviewCore(ctx, input),
});

// Non destructif : rétablit l'affichage d'un avis masqué ; tout est tracé dans le journal de modération.
const unhideReview = defineTool({
  name: 'unhide_review',
  description: "Lève le masquage d'un avis (détail de 3 à 500 caractères, tracé).",
  covers: ['unhideReviewAction'],
  input: z.object({ reviewId, detail }),
  run: (ctx, input) => unhideReviewCore(ctx, input),
});

// Destructif : l'ancien lien d'avis encore valable est invalidé (le client qui l'a reçu ne peut plus
// l'utiliser) et les e-mails de demande d'avis en attente sont abandonnés. Rien ne rétablit l'ancien lien.
const reissueReviewLink = defineTool({
  name: 'reissue_review_link',
  description:
    "Réémet le lien d'avis d'un projet : invalide le lien précédent et les demandes d'avis en attente, puis renvoie le nouveau lien (affiché une seule fois, non envoyé par e-mail). Attention : la réponse contient une URL à usage unique qui restera dans la transcription de la conversation du client MCP ; ne pas la partager ailleurs.",
  covers: ['reissueReviewLinkAction'],
  destructive: true,
  input: z.object({ projectId: z.string().uuid(), detail }),
  preview: async (ctx, input) => {
    // Une lecture en échec fait échouer l'aperçu (jamais de previewToken pour un aperçu aveugle).
    const current = await loadReviewLinkStatus(ctx.supabase, input.projectId);
    return {
      action: "Invalidation du lien d'avis en cours et des demandes d'avis en attente, puis création d'un nouveau lien (60 jours)",
      projectId: input.projectId,
      detail: input.detail,
      current,
    };
  },
  run: (ctx, input) => reissueReviewLinkCore(ctx, input),
});

export const reviewTools: ToolDef[] = [listReviews, listOpenReviewLinks, hideReview, unhideReview, reissueReviewLink];
