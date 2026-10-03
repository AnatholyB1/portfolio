// Module pur, sûr côté client. Mise en forme des identifiants et adresses imprimés.
import type { PostalAddress } from "./types";

/** "123 456 789 00012" ; renvoie l'entrée telle quelle si ce n'est pas 14 chiffres. */
export function formatSiretPrint(siret: string): string {
  if (!/^\d{14}$/.test(siret)) return siret;
  return `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9)}`;
}

/** Évite de répéter la ville quand `line` finit déjà par "{codePostal} {ville}". */
export function formatAddress(a: PostalAddress | null): string {
  if (!a) return "";
  const tail = `${a.postalCode} ${a.city}`.trim();
  const line = a.line.trim();
  if (line === "") return tail;
  if (tail !== "" && line.endsWith(tail)) return line;
  return tail === "" ? line : `${line}, ${tail}`;
}
