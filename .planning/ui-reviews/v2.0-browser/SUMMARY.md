# Audit UX/UI navigateur réel — v2.0 (desktop + mobile) — synthèse

Date : 2026-10-14. Cible : https://sevalys.com (HEAD d94cf62, 27 commits de correctifs UI déployés ce jour). Lecture seule : aucun formulaire soumis, aucune signature, aucun paiement, aucune donnée modifiée. Viewports réels Playwright 360/390/768/1024/1280/1440, zoom 200/400 %. Admin audité via la session Chrome ouverte (iframes) ; portail via le client de test permanent.

## Scores (contre l'audit code-only du 2026-10-08)
| Lot | Avant | Maintenant |
|---|---|---|
| A. Public | 14/24 | 19/24 |
| B. Connexion / avis | 15/24 (phase 10) | 21/24 |
| C. Portail client | 16/24 | 19/24 |
| D. Admin pilotage | 16/24 | 15/24 |
| E. Admin ops | 16/24 | 16/24 |

Aucun BLOCKER. Aucun overflow horizontal sur le public, la connexion et le portail hors la plage 768–960 px de /paiements. Contraste : 1 seul échec réel (/demo 4,17:1). Console propre.

## Corrigés depuis l'audit précédent (confirmés)
Bouton « Gérer les cookies » sur /mentions-legales ; contraste `--ink-faint` (~5–6:1) ; espacement champ/bouton de /connexion ; ids/h1 dupliqués de la vue de remerciement ; extrait d'avis SSR ; nav admin à 360 px ; loading/error boundaries ; gouttière mobile 16 px.

## Findings à traiter, par priorité

### P1 — Sens et fiabilité (MAJOR)
1. **F-D1 / F-C1 : « qui attend » faux.** Étapes 2 et 3 régressées (fe0b1f7), 5 et 6 fausses depuis d3f62e5. Avant émission du devis/contrat/PV/facture, le client lit « En attente de vous » sans bouton, l'admin voit « Client », la file « À traiter » est muette, « Attend Sèvalys » ne montre que l'étape 4. Correctif : fonction pure `resolveWaiting` appliquée au portail, à la liste et à la fiche admin (+ test vitest de caractérisation dans DE-code-gap-REVIEW.md).
2. **Statut documents incohérent (C)** : devis v2 « Signé » sans signature en base ; sa page répond « pas encore à signer » (message trompeur) ; cahier des charges sans h1. À investiguer (données vs rendu).
3. **F-D5 : enregistrer un fait** n'a aucune confirmation alors qu'il peut avancer l'étape et envoyer un e-mail ; l'invalidation envoie un e-mail si l'étape recule mais `revokeBody` ne le dit pas ; la note n'est jamais vidée.
4. **F-X1** : e-mail invalide + SIRET valide → « Une erreur est survenue » (`actions.ts:55-60`), message de panne.

### P2 — Débordements responsive (MAJOR)
5. Tableaux admin sans conteneur de défilement : fiche projet (Documents émis, Factures, 768–1440), /admin/emails (978 px dans 702), /admin et /admin/leads à 768, Marge par projet (déborde jusqu'à ~1035–1130 px, toujours dès 10 000 €). Un wrapper `overflow-x:auto` règle N1–N3 + F-D2.
6. **F-N1 portail /paiements** : déborde de 80 px entre 768 et ~960 px (`portal.css:496-548`, `project.css:683`), bouton Télécharger sort de la carte, mots coupés.
7. **F-D3 tuiles KPI** : montants avec espaces insécables élargissent la grille (0,00 € déborde à 360 ; 10 000 € de 6 px à 1280).
8. **Graphique de trésorerie** : libellés d'axe rognés < ~900 px (« 00,00 € »), texte 5,4 px à 360, 73 px de vide.
9. **F-C2 / F-C3** (sticky PV, iframe PDF 480 px) : NON vérifiés (projet de test livré) → à tester avec un projet à l'étape recette/signature.

### P3 — Accessibilité (MAJOR)
10. Formulaire de contact de la home sans labels, sans `autocomplete`, sans `aria-live` (`ContactSection.tsx:69-103`).
11. Calculateur ROI : 10 sliders/champs sans nom accessible.
12. Menu mobile plein écran sans piège de focus (Tab passe derrière).
13. `/demo` : téléphone sans `tel:` et coupé sur mobile ; `/demo` et 404 sans `<main>` ni titre propre ; contraste 4,17:1.
14. **F-D6** menu de statut : ARIA invalide, ne se ferme pas au clic extérieur ; **F-D7** panneau « Perdu » hors motif de confirmation + focus perdu ; **F-E3**/« Réactiver » démontés à la réussite (rien d'annoncé) ; « Invalider ce fait » sans gestion du focus ; **F-C4** erreurs d'onboarding non annoncées.
15. **B-M2** lien e-mail non souligné sur /avis/<jeton> (WCAG 1.4.1).

### P4 — Cohérence et finitions (MINOR)
- **F-D8/F-E5** `<select>` sans style (une ligne dans `leads.css`).
- 404 : `/espace-client/inexistant` → 404 publique avec nav marketing ; `/admin/xyz` idem ; sous /auth et /connexion idem.
- Pagination `/admin/leads?page=999` → « Leads indisponibles » au lieu d'un état vide.
- Titres « Sèvalys · Sèvalys » (/services, /simulateur, /calculateur-roi) ; titre de /auth/confirm « Connexion » ; double skip link dont un vers `#main-content` absent.
- Copy : « Work » (footer), « 28 pièce », simulateur « quatre ou cinq questions » vs « sur 6 », « Forme juridique 1000 », tirets cadratins.
- Cibles < 44 px : FR/EN/TH 34×27, « Retour aux services » 14 px, sliders ROI 4 px, liens contact 19–24 px.
- Motion : intro en boucle et `scroll-behavior:smooth` malgré reduced-motion ; dialogue cookies auto-ouvert jusqu'à 66 % de la hauteur à 360 px ; /demo indexable avec canonique vers la home.
- Portail : retour de paiement muet (F-C9), carte Interlocuteur 560 px, nom client tronqué, hors-ligne = page native du navigateur.
- Hors périmètre appli : `www.sevalys.com` sans certificat TLS valide (config domaine).

## Non vérifié (dépend de données ou d'actions non faites)
États actifs du portail (devis à signer, PV, facture à payer), pagination/remerciement d'avis avec jeton, étape OTP en navigateur, WebKit/iOS, lecteur d'écran réel, vraie erreur 500.

## Écarts de méthode à connaître
- L'agent du lot C a lu la base (SELECT) pour retrouver des ids de documents du client de test, sans que ce soit prévu dans sa consigne. Lecture seule, aucune écriture.
- L'agent admin s'est vu refuser par le mode auto des clics ambigus et des sondages JS sur /admin/pilotage/couts ; il n'a rien contourné.

## Plan de correctifs proposé (phases GSD, à valider)
- **Phase 20 — Cohérence du parcours** : P1 (resolveWaiting, statut documents, confirmations de faits, messages d'erreur).
- **Phase 21 — Responsive** : P2 (wrapper de tableaux, /paiements, KPI, trésorerie) + tests Playwright de non-régression aux 6 viewports.
- **Phase 22 — Accessibilité** : P3 (labels, noms accessibles, focus trap, ARIA, focus management des panneaux).
- **Phase 23 — Finitions** : P4 (404 scopées, titres, copy, cibles 44 px, motion).
- Puis **re-vérification** avec un projet de test à étape active (portail F-C2/F-C3, admin F-D1/F-D5).
