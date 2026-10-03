// Module pur, sûr côté client.
export function normalizeText(t: string): string {
  return t
    .normalize("NFC")
    .replace(/[  ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
