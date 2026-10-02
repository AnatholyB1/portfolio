// Normaliseurs de clé de dédoublonnage (pures). Doivent rester alignées sur les
// colonnes email_norm / phone_norm de sv_ingest_lead.

/** trim + minuscules uniquement : pas de canonicalisation Gmail (points / plus). */
export function normaliseEmail(e: string): string {
  return e.trim().toLowerCase();
}

/** Chiffres de type E.164 ; numéros nationaux FR (0X XX XX XX XX) mappés sur +33. */
export function normalisePhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const trimmed = p.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  let out: string;
  if (hasPlus) out = `+${digits}`;
  else if (digits.startsWith('00')) out = `+${digits.slice(2)}`;
  else if (digits.startsWith('0') && digits.length === 10) out = `+33${digits.slice(1)}`;
  else return null;

  const n = out.length - 1;
  return n >= 8 && n <= 15 ? out : null;
}
