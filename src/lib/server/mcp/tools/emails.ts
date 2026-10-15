import 'server-only';
import { z } from 'zod';
import { liftSuppressionCore } from '@/lib/server/admin/core/emails';
import { loadSuppressions } from '@/lib/server/mail/suppressionAdmin';
import { maskEmail } from '../mask';
import { defineTool, type ToolDef } from '../registry';

// Classe d'adresse touchée par la réactivation (même lecture que la page admin des e-mails).
function scopeLabel(scope: unknown): string {
  if (scope === 'all') return 'Tous les e-mails vers cette adresse (rebond définitif)';
  if (scope === 'marketing') return "E-mails d'information uniquement (avis, actualités)";
  return 'Portée inconnue';
}

const listEmailSuppressions = defineTool({
  name: 'list_email_suppressions',
  description:
    "Liste la liste de suppression d'e-mails (plus récentes d'abord), adresses masquées. L'identifiant sert à lift_email_suppression.",
  covers: [],
  input: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  run: async (ctx, input) => {
    const from = (input.page - 1) * input.limit;
    // Une ligne de plus que la page pour savoir s'il y a une suite (comme la page admin).
    const fetched = await loadSuppressions(ctx.supabase, { from, to: from + input.limit });
    if (fetched === null) throw new Error('list_email_suppressions_failed');
    return {
      page: input.page,
      hasNext: fetched.length > input.limit,
      suppressions: fetched
        .slice(0, input.limit)
        .map(({ email, ...rest }) => ({ ...rest, email: maskEmail(email) })),
    };
  },
});

// Destructif : réactiver une adresse rouvre l'envoi vers un destinataire qui s'était plaint, désinscrit
// ou dont l'adresse rebondit ; la décision ne se reprend pas silencieusement.
const liftEmailSuppression = defineTool({
  name: 'lift_email_suppression',
  description:
    "Réactive une adresse de la liste de suppression d'e-mails (motif de 3 à 300 caractères, tracé). Utiliser list_email_suppressions pour l'identifiant.",
  covers: ['liftSuppressionAction'],
  destructive: true,
  input: z.object({
    suppressionId: z.number().int().positive(),
    reason: z.string().trim().min(3).max(300),
  }),
  preview: async (ctx, input) => {
    const { data } = await ctx.supabase
      .from('sv_mail_suppressions')
      .select('email_norm, scope, cause')
      .eq('id', input.suppressionId)
      .maybeSingle();
    return {
      action: "Réactivation de l'envoi d'e-mails vers cette adresse",
      suppressionId: input.suppressionId,
      reason: input.reason,
      address: data ? maskEmail(data.email_norm) : null,
      cause: data ? (data.cause as string) : null,
      affected: data ? scopeLabel(data.scope) : 'Suppression introuvable',
    };
  },
  run: (ctx, input) => liftSuppressionCore(ctx, input),
});

export const emailTools: ToolDef[] = [listEmailSuppressions, liftEmailSuppression];
