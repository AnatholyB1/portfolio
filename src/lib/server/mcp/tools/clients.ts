import 'server-only';
import { z } from 'zod';
import { INVITE_COPY, companySnapshotSchema } from '@/lib/admin/inviteSchema';
import { inviteClientCore, lookupSiretCore, resendInvitationCore } from '@/lib/server/admin/core/clients';
import { maskEmail } from '../mask';
import { defineTool, type ToolDef } from '../registry';
import { t } from '../schema';
import { cleanCompany } from './leads';

const lookupSiret = defineTool({
  name: 'lookup_siret',
  description: 'Recherche une entreprise par SIRET (14 chiffres) dans l\'annuaire public des entreprises.',
  covers: ['lookupSiretAction'],
  input: z.object({ siret: z.string().max(40) }),
  run: async (ctx, input) => {
    const res = await lookupSiretCore(ctx, input);
    if (res.ok) return res;
    // Sans `message`, un refus de l'annuaire serait audité comme un succès : même libellés que le formulaire web.
    return { ok: false, message: res.reason === 'invalid' ? INVITE_COPY.siretInvalid : INVITE_COPY.siretNotFound, reason: res.reason };
  },
});

const inviteClient = defineTool({
  name: 'invite_client',
  description:
    'Invite un client : crée son compte et sa fiche client (par SIRET) puis lui envoie l\'invitation par e-mail.',
  covers: ['inviteClientAction'],
  destructive: true,
  input: z.object({
    name: t(200),
    email: t(254),
    siret: t(40),
    company: z.preprocess(cleanCompany, companySnapshotSchema.nullable().optional()),
    // 'manual' : l'objet company est fourni par l'appelant, pas issu de l'annuaire (lookup_siret).
    companySource: z.enum(['api', 'manual']).default('manual'),
  }),
  preview: async (ctx, input) => {
    // Client déjà connu pour ce SIRET (lecture RLS) : un nouvel accès s'ajoute, rien n'est créé de neuf.
    const digits = input.siret.replace(/\s/g, '');
    let clientStatus: string;
    if (!/^\d{14}$/.test(digits)) {
      clientStatus = INVITE_COPY.siretInvalid;
    } else {
      const { data } = await ctx.supabase.from('sv_clients').select('id, name').eq('siret', digits).maybeSingle();
      const name = (data as { name?: string } | null)?.name ?? '';
      clientStatus = data ? `client existant ${name}: un nouvel accès sera ajouté pour ${maskEmail(input.email)}` : 'nouveau client';
    }
    return {
      action: "Création du compte client (ou ajout d'un accès) et envoi de l'invitation par e-mail",
      clientStatus,
      client: {
        name: input.name,
        email: maskEmail(input.email),
        siret: input.siret,
        company: input.company?.nom ?? null,
      },
      mail: `Invitation envoyée à ${maskEmail(input.email)}`,
    };
  },
  run: async (ctx, input) => {
    const res = await inviteClientCore(ctx, {
      name: input.name,
      email: input.email,
      siret: input.siret,
      company: input.company ?? null,
      companySource: input.companySource,
    });
    // Succès partiel : client et compte créés, e-mail non parti. Ce n'est ni un succès complet ni un refus :
    // l'appelant doit le savoir (renvoyer l'invitation avec resend_invitation).
    if (!res.ok && res.data?.mailSent === false) {
      return {
        invited: false,
        partial: true,
        clientCreated: true,
        mailSent: false,
        clientId: res.data.clientId ?? null,
        email: maskEmail(res.data.email),
        message: res.message,
        next: "Le client existe mais l'e-mail n'est pas parti : utiliser resend_invitation avec son identifiant.",
      };
    }
    // Refus : renvoyé tel quel (le registre l'audite en erreur). Succès : e-mail masqué.
    if (!res.ok) return res;
    return { invited: true, email: maskEmail(res.data?.email) };
  },
});

const resendInvitation = defineTool({
  name: 'resend_invitation',
  description:
    "Renvoie par e-mail l'invitation existante d'un client (identifiant uuid). Ne crée ni client ni compte ; limité à 3 renvois par client et 20 par administrateur sur 10 minutes.",
  covers: ['resendInvitationAction'],
  destructive: true,
  input: z.object({ clientId: z.string().uuid() }),
  preview: async (ctx, input) => {
    const member = await ctx.supabase
      .from('sv_client_members')
      .select('invited_email')
      .eq('client_id', input.clientId)
      .order('created_at', { ascending: true })
      .limit(1);
    const client = await ctx.supabase.from('sv_clients').select('name').eq('id', input.clientId).maybeSingle();
    const email = (member.data?.[0] as { invited_email?: string | null } | undefined)?.invited_email;
    return {
      action: "Renvoi de l'e-mail d'invitation au client",
      clientId: input.clientId,
      clientName: (client.data as { name?: string } | null)?.name ?? null,
      mail: email ? `Invitation renvoyée à ${maskEmail(email)}` : 'Aucune invitation trouvée pour ce client',
    };
  },
  run: async (ctx, input) => {
    const res = await resendInvitationCore(ctx, input);
    if (!res.ok) return res;
    return { resent: true, email: maskEmail(res.data?.email) };
  },
});

export const clientTools: ToolDef[] = [lookupSiret, inviteClient, resendInvitation];
