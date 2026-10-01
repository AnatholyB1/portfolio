// Schéma d'invitation client : module sûr côté client (zod uniquement).
// Ne jamais importer de module serveur ici.
import { z } from 'zod';

export const companySnapshotSchema = z.object({
  nom: z.string().trim().min(1).max(200),
  adresse: z.string().max(300).optional(),
  code_postal: z.string().regex(/^\d{5}$/).optional(),
  commune: z.string().max(120).optional(),
  naf: z.string().max(10).optional(),
  siren: z.string().regex(/^\d{9}$/).optional(),
  forme_juridique_code: z.string().max(10).optional(),
  etat_administratif: z.string().max(2).optional(),
  categorie_entreprise: z.string().max(20).optional(),
  date_creation: z.string().max(10).optional(),
  tva_intracom: z.string().max(20).nullable().optional(),
});

export type CompanySnapshot = z.infer<typeof companySnapshotSchema>;

export const inviteSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().trim().toLowerCase().max(254),
  siret: z
    .string()
    .transform((s) => s.replace(/\s/g, ''))
    .pipe(z.string().regex(/^\d{14}$/)),
  company: companySnapshotSchema.nullable(),
  companySource: z.enum(['api', 'manual']),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export const INVITE_COPY = {
  siretInvalid: 'Le SIRET doit contenir 14 chiffres.',
  siretNotFound:
    'Entreprise introuvable ou service indisponible. Renseignez les informations manuellement.',
  siretInactive: 'Cet établissement est signalé comme fermé. Vérifiez le SIRET avant d\'inviter.',
  roleConflict:
    'Cette adresse est déjà utilisée comme administrateur. Utilisez une autre adresse pour le client.',
  alreadyMember: 'Cette adresse est déjà associée à un client.',
  existingAccount:
    "Cette adresse correspond déjà à un compte d'une autre application. Invitation bloquée par sécurité : utilisez une autre adresse.",
  success: (email: string) => `Invitation envoyée à ${email}.`,
  generic: 'Une erreur est survenue. Réessayez dans un instant ou écrivez à contact@sevalys.com.',
} as const;
