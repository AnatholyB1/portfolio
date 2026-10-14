// Noms accessibles des actions répétées d'une liste (« Télécharger » x 4) : le texte visible reste en tête
// (WCAG 2.5.3, étiquette dans le nom), le document concerné suit.
export function nameWithSubject(visible: string, subject: string): string {
  const v = visible.trim();
  const s = subject.trim();
  return s ? `${v} : ${s}` : v;
}

export function documentSubject(label: string, revision: number, issuedOn: string): string {
  return `${label}, version ${revision}, émis le ${issuedOn}`;
}
