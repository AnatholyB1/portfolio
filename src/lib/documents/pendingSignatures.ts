// Module pur, sûr côté client. Nombre de documents « à signer » sur plusieurs projets.
//
// Source de vérité : le statut dérivé des faits (documentStatus), le même que celui du portail client et de la
// fiche projet. Un devis, un contrat ou un PV est « signé » dès que le fait de signature correspondant est en
// vigueur, qu'il vienne d'une signature électronique OU d'une saisie manuelle de l'admin (aucune ligne dans
// sv_document_signatures dans ce second cas). Compter les lignes de signature surcomptait les documents dont le
// fait avait été posé à la main : ils restaient « en attente de signature » indéfiniment.
import { effectiveFacts, type Fact } from '@/lib/projects/steps';
import { withStatuses } from './status';
import type { ChainDoc } from './steps';

export type PendingDoc = ChainDoc & { projectId: string };
export type ProjectFact = Fact & { projectId: string };

export function countDocumentsToSign(docs: PendingDoc[], facts: ProjectFact[]): number {
  const docsBy = new Map<string, PendingDoc[]>();
  for (const d of docs) docsBy.set(d.projectId, [...(docsBy.get(d.projectId) ?? []), d]);
  const factsBy = new Map<string, Fact[]>();
  for (const f of facts) factsBy.set(f.projectId, [...(factsBy.get(f.projectId) ?? []), f]);

  let total = 0;
  for (const [projectId, projectDocs] of docsBy) {
    const projectFacts = effectiveFacts(factsBy.get(projectId) ?? []);
    total += withStatuses(projectDocs, projectFacts).filter((d) => d.status === 'to_sign').length;
  }
  return total;
}
