// Périmètre « prix » (D-17, FOUND-06).
// Le site public n'affiche AUCUN prix (garde-fous existants : layout, llms,
// serviceSchema, translations, services, page, simulateur, calculateur-roi).
// Les zones ci-dessous sont les seules où des prix/tarifs peuvent apparaître.
// priceScope.test.ts interdit au code public d'importer ces zones.
// Module pur, sans import.

export const PRICE_ALLOWED_ZONES: readonly { path: string; reason: string }[] = [
  { path: 'src/app/espace-client', reason: "Portail client : le client consulte ses contrats, devis et factures chiffrés." },
  { path: 'src/app/admin', reason: "Espace admin : l'administrateur gère clients, devis et montants." },
  { path: 'src/app/connexion', reason: "Page de connexion privée : même zone que le portail, hors site public." },
  { path: 'src/app/auth', reason: "Routes d'authentification (callback, confirmation) : zone privée, hors site public." },
  { path: 'src/app/api/cron', reason: "Tâches planifiées protégées par CRON_SECRET (envoi de la file de mails) : aucune page publique, importent du code serveur." },
  { path: 'src/components/portal', reason: "Composants du portail client, qui afficheront des montants contractuels." },
  { path: 'src/components/admin', reason: "Composants de l'espace admin (tarification, suivi financier)." },
  { path: 'src/lib/server', reason: "Code serveur uniquement : accès base de données et données chiffrées, jamais embarqué côté client." },
  { path: 'src/lib/documents', reason: "Modèles de documents (contrats, devis) des phases 13 et 15, qui contiennent des prix." },
] as const;

// Fichiers publics protégés par un test « pas de prix ». Ces tests restent
// limités aux chemins publics et ne doivent pas être affaiblis (D-17).
export const GUARDED_PUBLIC_FILES: readonly { file: string; guardedBy: string }[] = [
  { file: 'src/app/layout.test.ts', guardedBy: 'metadata et JSON-LD racine sans prix' },
  { file: 'src/app/llms.test.ts', guardedBy: "llms.txt sans mot « tarif »" },
  { file: 'src/lib/serviceSchema.test.ts', guardedBy: 'schema.org des services sans offre chiffrée' },
  { file: 'src/lib/translations.test.ts', guardedBy: 'traductions FR/EN sans motif de prix' },
  { file: 'src/data/services.test.ts', guardedBy: 'données services sans prix' },
  { file: 'src/app/page.test.ts', guardedBy: "page d'accueil sans prix" },
  { file: 'src/app/simulateur/layout.test.ts', guardedBy: 'layout simulateur sans prix' },
  { file: 'src/app/calculateur-roi/page.test.ts', guardedBy: 'page calculateur ROI sans prix' },
] as const;

export function isInPriceAllowedZone(repoRelativePath: string): boolean {
  const p = repoRelativePath.replace(/\\/g, '/');
  return PRICE_ALLOWED_ZONES.some((z) => p === z.path || p.startsWith(`${z.path}/`));
}
