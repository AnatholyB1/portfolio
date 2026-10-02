# Phase 11: Lead attribution, pipeline & consent - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-02
**Phase:** 11-lead-attribution-pipeline-consent
**Areas discussed:** Bandeau et PostHog, Capture de la source, Leads/doublons/effacement, Pipeline et entonnoir admin

---

## Bandeau et PostHog

| Question | Options | Selected |
|----------|---------|----------|
| PostHog avant choix | Rien avant accord (reco) / Mode sans cookie avant accord / Laisser tel quel | Mode sans cookie avant accord |
| Apparence | Bandeau bas 2 boutons égaux (reco) / Modale centrée bloquante / Bandeau + catégories | Modale centrée bloquante |
| Durée et réouverture | 6 mois + pied de page (reco) / 13 mois + pied de page / Tu décides | 13 mois + pied de page |
| Journal | Date/choix/version/id anonyme (reco) / Idem + lien au lead / Tu décides | Idem + lien au lead à la soumission |

**Notes:** Deux choix s'écartent de la recommandation (mode sans cookie, modale bloquante) ; points à vérifier notés dans CONTEXT.md.

---

## Capture de la source

| Question | Options | Selected |
|----------|---------|----------|
| Transport | Cookie proxy.ts (reco) / sessionStorage + payload / Les deux | Cookie first-party par proxy.ts |
| Avant accord | UTM seuls, ids de clic après accord (reco) / Tout attend / Cookie après accord + URL | UTM seuls avant accord |
| Dernier contact | Toute arrivée avec UTM ou référent externe (reco) / Seulement UTM | Toute arrivée avec UTM ou référent externe |
| Validation | Liste blanche + 200 car. + minuscules (reco) / Tout brut en jsonb | Liste blanche |

---

## Leads, doublons, effacement

| Question | Options | Selected |
|----------|---------|----------|
| Modèle | sv_leads + sv_lead_contacts (reco) / Lead unique + events | sv_leads + sv_lead_contacts |
| Retour dans 9 mois | Contact ajouté, source inchangée (reco) / Idem + notification admin | Idem + notification admin « lead revenu » |
| Après 9 mois | Nouveau lead lié (reco) / Nouveau lead sans lien | Nouveau lead lié à l'ancien |
| Effacement | Tombstone (reco) / Suppression complète | Tombstone |

---

## Pipeline et entonnoir admin

| Question | Options | Selected |
|----------|---------|----------|
| Statuts | Nouveau→Qualifié→RDV→Devis envoyé→Signé + Perdu (reco) / Sans Devis envoyé | Avec « Devis envoyé » |
| Vue | Tableau filtrable (reco) / Kanban / Liste + kanban | Tableau filtrable + pastille |
| Motif de perte | Liste fermée + note (reco) / Texte libre | Liste fermée + note optionnelle |
| Entonnoir | Visites serveur par source+campagne+mois (reco) / Depuis PostHog / Sans visites | Visites serveur par source+campagne+mois |

---

## Claude's Discretion

Structure des tables, format de la notification « lead revenu », texte du bandeau, hachage du journal, liste exacte des motifs de perte.

## Deferred Ideas

Meta CAPI / Google (ADS-04/05), kanban, convention UTM et `event_id` (phase 19).
