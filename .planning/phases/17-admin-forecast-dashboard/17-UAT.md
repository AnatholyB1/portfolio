---
status: complete
phase: 17-admin-forecast-dashboard
source: [17-01-SUMMARY.md, 17-02-SUMMARY.md, 17-03-SUMMARY.md, 17-04-SUMMARY.md, 17-05-SUMMARY.md, 17-06-SUMMARY.md, 17-07-SUMMARY.md, 17-08-SUMMARY.md, 17-09-SUMMARY.md, 17-10-SUMMARY.md, 17-11-SUMMARY.md, 17-12-SUMMARY.md, 17-13-SUMMARY.md, 17-14-SUMMARY.md]
started: 2026-10-08T00:00:00Z
updated: 2026-10-08T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Chiffres CA concordants avec factures et paiements (HT/TTC, tests inclus)
expected: Facturé 1 600,00 € = 160000 centimes en SQL ; encaissé 1 600,00 € = 180000 payé − 20000 remboursé ; signé 1 600,00 € ; pipeline 0,00 € ; bandeau « Sans TVA (art. 293 B) », HT = TTC.
result: pass
note: contrôlé par Claude dans Chrome (session admin) et par SQL en lecture seule sur la production, 2026-10-08.

### 2. CA signé ventilé par source du lead d'origine
expected: Colonne « Source figée du lead », ligne « direct » 1 600,00 € (100 %), total 1 600,00 € = tuile CA signé.
result: pass
note: contrôlé par Claude dans Chrome, 2026-10-08.

### 3. Données de test masquées par défaut
expected: Sans « Inclure les données de test », la page affiche « Rien à piloter pour l'instant ».
result: pass
note: contrôlé par Claude dans Chrome, 2026-10-08.

### 4. Saisie et annulation d'un coût de projet
expected: Coût 1,00 € ajouté sur le projet du client de test (Valide) ; coûts du projet 1,00 € et marge 1 599,00 € avec tests ; après « Annuler ce coût » statut Annulé et chiffres revenus à 0,00 € / 1 600,00 €.
result: pass
note: contrôlé par Claude dans Chrome, 2026-10-08 (deux défauts d'affichage trouvés puis corrigés et redéployés : formulaires invisibles, panneau débordant).

### 5. Courbe de trésorerie sur 6 mois (bureau)
expected: Six mois à partir d'octobre 2026, avertissement « Aucun solde de départ saisi… », axe avec seulement « 0 € », tableau équivalent visible sous le graphique, lisible.
result: pass

### 6. Affichage sur téléphone (largeur mobile)
expected: Les pages /admin/pilotage et /admin/pilotage/couts s'affichent sans défilement horizontal de la page ; tuiles, tableaux (source, projets, coûts) et formulaires restent lisibles et utilisables ; les panneaux de confirmation ne débordent pas.
result: pass

### 7. Chiffres cliquables et rapprochement (D-12)
expected: Cliquer « Voir les factures », « Voir les paiements », « Voir les devis signés » et les cellules Signé / Facturé / Encaissé du tableau par projet ouvre la liste qui compose le chiffre, avec un total égal à la tuile. C'est l'ensemble des chiffres cliquables que vous acceptez (Coûts, Marge, Reste à facturer, lignes de source et courbe restent en lecture seule).
result: pass
note: l'owner accepte l'ensemble des chiffres cliquables (confirmation D-12 donnée le 2026-10-08).

### 8. Saisie du solde de départ et d'une charge récurrente (données réelles)
expected: Sur /admin/pilotage/couts, vous pouvez enregistrer un solde bancaire de départ et une charge récurrente (libellé, catégorie, montant, fréquence, début) ; la ligne apparaît dans la liste et la trésorerie de /admin/pilotage s'en trouve modifiée. Ces lignes sont en ajout seul : ne les saisissez que si ce sont de vraies données.
result: skipped
reason: "l'owner n'a rien saisi : ce seraient des données réelles en ajout seul (confirmé par lecture seule : 0 solde, 0 charge récurrente en production, 2026-10-08). Les actions sont couvertes par les tests unitaires et RLS (17-05, 17-10) ; formulaires affichés et utilisables vérifiés dans Chrome."

## Summary

total: 8
passed: 7
issues: 0
pending: 0
skipped: 1

## Gaps

[none yet]
