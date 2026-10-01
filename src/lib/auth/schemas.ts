// Schémas de connexion et textes d'interface. Module client-safe : importe
// uniquement `zod` (aucun next/server, Supabase, Resend ni node:crypto), comme
// src/lib/prospects-schema.ts, pour pouvoir être utilisé par des formulaires 'use client'.
import { z } from 'zod';

// Trim + minuscules AVANT la validation du format (ordre explicite via pipe).
const emailField = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const loginEmailSchema = z.object({ email: emailField });

export const otpCodeSchema = z.object({
  email: emailField,
  code: z.string().trim().regex(/^\d{6}$/),
});

export type LoginEmailInput = z.infer<typeof loginEmailSchema>;
export type OtpCodeInput = z.infer<typeof otpCodeSchema>;

// Textes exacts du Copywriting Contract (10-UI-SPEC).
export const LOGIN_COPY: Record<
  'identical' | 'invalidEmail' | 'wrongCode' | 'rateLimited' | 'generic' | 'sessionExpired',
  string
> = {
  identical: "Si cette adresse est invitée, un code vient d'être envoyé.",
  invalidEmail: "Cette adresse e-mail n'est pas valide. Vérifiez-la et réessayez.",
  wrongCode: 'Ce code est incorrect ou a expiré. Vérifiez-le ou demandez un nouveau code.',
  rateLimited: 'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
  generic: 'Une erreur est survenue. Réessayez dans un instant ou écrivez à contact@sevalys.com.',
  sessionExpired: 'Votre session a expiré. Reconnectez-vous pour continuer.',
};
