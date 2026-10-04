// Vérifie hors ligne l'export JSON de la piste d'audit d'un document (D-13).
// Usage : node scripts/verify-trail.mjs <export.json | ->   ("-" lit l'export sur l'entrée standard)
// Prérequis : Node >= 23.6 (chargement natif de .ts). Aucun réseau, aucune dépendance.
// Codes de sortie : 0 = chaîne valide, 1 = chaîne rompue ou format invalide, 2 = entrée illisible.
import { readFileSync } from 'node:fs';
import { verifyChainExport } from '../src/lib/signature/verifyChain.ts';

const arg = process.argv[2];
if (!arg) {
  console.error('Usage : node scripts/verify-trail.mjs <export.json | ->');
  process.exit(2);
}

let data;
try {
  const raw = readFileSync(arg === '-' ? 0 : arg, 'utf8');
  data = JSON.parse(raw);
} catch (err) {
  console.error(`Entrée illisible ou JSON invalide : ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
}

const result = verifyChainExport(data);
if (result.ok) {
  console.log(`OK - ${result.count} événement(s), empreinte de tête ${result.headHash ?? '-'}`);
  process.exit(0);
}
console.log(`ÉCHEC - seq ${result.brokenAtSeq ?? '-'} : ${result.reason}`);
process.exit(1);
