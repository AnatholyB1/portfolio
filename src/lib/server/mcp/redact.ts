/** Retire la clé `seller` (identité et coordonnées bancaires du vendeur) à toute profondeur. */
export function stripSeller<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => stripSeller(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'seller') continue;
      out[k] = stripSeller(v);
    }
    return out as T;
  }
  return value;
}
