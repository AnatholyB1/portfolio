// Helpers communs aux cores documents et facturation (et aux wrappers qui n'ont pas encore migré).

export const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FieldErrors = Record<string, string>;

export function fieldErrorsOf(error: { issues: { path: PropertyKey[]; message: string }[] }): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.');
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}

export function rec(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
}

/** Texte ou chaîne vide : une valeur absente ou non textuelle devient '' (comme FormData.get côté web). */
export function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
