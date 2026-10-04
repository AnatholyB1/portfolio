// Module pur, sûr côté client. JSON canonique pour les payloads construits par l'app (D-10).
export const HASH_FORMAT_VERSION = 'v1';
export const LINK_SEPARATOR = '\u001f';

export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) throw new Error('canonical_unsupported');
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
      const obj = value as Record<string, unknown>;
      return (
        '{' +
        Object.keys(obj)
          .sort()
          .map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k]))
          .join(',') +
        '}'
      );
    }
    default:
      throw new Error('canonical_unsupported');
  }
}
