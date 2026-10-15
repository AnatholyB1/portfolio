import 'server-only';
import { z } from 'zod';
import { companySnapshotSchema } from '@/lib/admin/inviteSchema';
import { inviteClientCore, lookupSiretCore } from '@/lib/server/admin/core/clients';
import { maskEmail } from '../mask';
import { defineTool, type ToolDef } from '../registry';
import { cleanCompany } from './leads';

const t = (max: number, min = 1) => z.string().trim().min(min).max(max);

const lookupSiret = defineTool({
  name: 'lookup_siret',
  description: 'Recherche une entreprise par SIRET (14 chiffres) dans l\'annuaire public des entreprises.',
  covers: ['lookupSiretAction'],
  input: z.object({ siret: z.string().max(40) }),
  run: (ctx, input) => lookupSiretCore(ctx, input),
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
    companySource: z.enum(['api', 'manual']).default('api'),
  }),
  preview: async (_ctx, input) => ({
    action: 'Création du compte client et envoi de l\'invitation par e-mail',
    client: {
      name: input.name,
      email: maskEmail(input.email),
      siret: input.siret,
      company: input.company?.nom ?? null,
    },
    mail: `Invitation envoyée à ${maskEmail(input.email)}`,
  }),
  run: async (ctx, input) => {
    const res = await inviteClientCore(ctx, {
      name: input.name,
      email: input.email,
      siret: input.siret,
      company: input.company ?? null,
      companySource: input.companySource,
    });
    // Refus : renvoyé tel quel (le registre l'audite en erreur). Succès : e-mail masqué.
    if (!res.ok) return res;
    return { invited: true, email: maskEmail(res.data?.email) };
  },
});

export const clientTools: ToolDef[] = [lookupSiret, inviteClient];
