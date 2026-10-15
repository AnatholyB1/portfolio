# Audit navigateur admin, lots D et E (lecture seule)

Site : https://sevalys.com/admin, session admin existante, aucune écriture. Méthode : navigation réelle à 1360 px, mesures à 360 / 768 / 1024 / 1440 dans une iframe `srcdoc` clonée depuis le DOM hydraté (les media queries réagissent à la largeur de l'iframe). Barre de défilement vertical d'environ 6 px incluse (largeur utile 354 / 762 / 1018 / 1434).
Anonymisation : aucun e-mail, jeton ou nom réel n'est consigné. Les données de prod sont peu nombreuses : 1 client, 3 leads (fixtures de test), 1 projet terminé, 13 lignes d'entonnoir, 0 donnée de pilotage, 0 avis.

## Limites de la vérification

- `/admin/pilotage` est en état vide ("Rien à piloter pour l'instant") : `ProjectMarginTable`, `DetailPanel`, graphique de trésorerie et KPI de pilotage **non vérifiables** (F-D2 partiel, F-D3 pilotage).
- `/admin/pilotage/couts` : seules la capture et l'arborescence d'accessibilité ont été lues. Une mesure JavaScript a été refusée par le garde-fou ; je n'ai pas contourné. Tableau des charges récurrentes non mesuré.
- Refusés par le garde-fou (donc non ouverts) : panneau « Invalider ce fait », « Réémettre le lien d'avis », « Réactiver cette adresse ». Leur DOM n'est pas audité ici (à lire dans le code).
- Le projet de test est « Terminé » : `PostFactForm` (select « Fait à enregistrer », avertissement « en avance ») n'est pas affiché. F-D5 et F-D8 non vérifiables.
- Ouverture sans effet du menu de statut d'un lead : effectuée (aucun choix).
- Console : aucune erreur de l'application (seul un avertissement d'extension navigateur). Réseau : 25 requêtes, toutes 200.

## Scores 6 piliers

| Pilier | Lot D (admin pilotage) | Lot E (admin ops) |
|---|---|---|
| Copywriting | 3 | 3 |
| Visuals | 2 | 3 |
| Color | 3 | 3 |
| Typography | 3 | 2 |
| Spacing | 2 | 2 |
| Experience design | 2 | 3 |
| **Total /24** | **15** | **16** |

Justification courte. D : tableaux clients, leads, factures et documents qui débordent leur carte ou la fenêtre (Visuals, Spacing, Experience) ; copie correcte mais tirets cadratins en valeur vide et boutons répétés sans contexte. E : `/admin/liens` et `/admin/avis` propres à toutes les largeurs (pas de débordement, cartes mobiles correctes, cibles de 44 px) ; points faibles : h1/h2 identiques (Typography), tableau e-mails qui déborde de 768 à 1024 px, champs aux angles droits à côté de boutons arrondis.

## Confirmation des findings du pré-audit

| Finding | Verdict | Preuve |
|---|---|---|
| F-D1 vue devis/contrat à émettre | Non vérifiable | Logique de filtre, pas de données `blocage` exploitables en prod (1 projet terminé). |
| F-D2 marge par projet 768-1200 | Non vérifiable (données vides), mais risque **confirmé ailleurs** | Même défaut sur 3 autres tableaux sans conteneur de défilement : voir N1, N2, N3. |
| F-D3 KPI gros montants | Confirmé, atténué (pas de coupe, retour à la ligne) | Entonnoir, valeur simulée « 12 345,67 € » en 32 px mono : largeur naturelle 230 px. À 360 px la tuile fait 115 px de contenu : 3 lignes (hauteur 115 px au lieu de 38). À 1024 px : 2 lignes (contenu 163 px). Aucun `overflow`. |
| F-D4 colonne collante entonnoir 360 | Confirmé | `th[scope=row]` sticky de 191 px dans un conteneur de 272 px : il reste 81 px pour faire défiler 10 colonnes (tableau 1276 px). Conteneur `role=region`, `tabindex=0`, `overflow-x:auto` : correct. |
| F-D5 enregistrer un fait sans confirmation | Non vérifiable | Formulaire absent (projet terminé). |
| F-D6 menu de statut | Confirmé en partie | Menu `position:absolute` : recouvre le statut de la ligne suivante, déborde sous le tableau. OK : focus sur le 1er item à l'ouverture, flèches bas, Échap ferme et rend le focus à la pastille. KO : clic extérieur **ne ferme pas**. `role=menu` a des enfants `FORM` (display contents) autour des `menuitem`. Tous les `menuitem` ont `tabindex=0` (pas de roving). Le statut courant n'est pas repéré dans le menu. |
| F-D7 LostPanel | Non vérifiable | Panneau non ouvert (écriture possible). |
| F-D8 select « Fait à enregistrer » | Non vérifiable | Absent. |
| F-D9 tri mobile | Confirmé | À 360 px `thead` fait 1 px de haut : les 5 liens de tri existent mais sont invisibles, et restent focalisables sans indicateur visible. Aucune alternative (le seul select est le filtre). |
| F-D10 destinations de la file « À traiter » | Confirmé | « document en attente de signature » mène à `/admin/projets` sans filtre. |
| F-D13 puces de filtre | Non vérifiable | Aucun filtre actif dans les états testés (`statut=xxx` est ignoré, voir N5). |
| F-D14 `input[type=month]` | Partiel | Chrome affiche un sélecteur natif. Aucun `placeholder` ni aide (`aria-describedby` absent) pour Firefox/Safari. |
| F-E1 h1 et h2 identiques | Confirmé | `/admin/liens` et `/admin/avis` : H1, H2 (et le H2 « Lien d'avis » sous « Liens d'avis ») tous à 24 px. |
| F-E2 cartes imbriquées | Confirmé | `/admin/avis` : `.pt-card .pt-card` = 1 occurrence (carte de réémission dans « Liens d'avis »). |
| F-E3 URL réémise non annoncée | Non vérifiable (panneau non ouvert) | À lire dans le code. |
| F-E4 chemin `docs/convention-utm.md` | Confirmé | Texte présent sur `/admin/liens`. |
| F-E5 champs à angles droits | Confirmé | `/admin/liens` : select et input `border-radius: 0` (hauteur 44 px), boutons `100px`. Les champs des autres pages admin : 4 px (select des leads). |
| F-E6 e-mails nowrap | Confirmé, aggravé | Voir N2. |
| F-X1 liaison d'erreur des champs | Non vérifiable | Pas de soumission. |
| F-X3 sélecteur segmenté | Infirmé en grande partie | L'option choisie porte une bordure gauche acide de 2 px (rgb 196,245,66) et un fond plus sombre ; visible sur capture. Reste sans coche ni icône. Sévérité MINOR au plus. |
| F-X4 chiffres non alignés | Non vérifiable | Pas de données de pilotage. |
| Thème 2 nav à 360 | Confirmé corrigé | 2 rangées, 88 px de haut, aucun débordement, 8 liens à 44 px, ancre « Aller au contenu principal » visible au premier Tab (capture `skip-link-focus.jpg`). |
| Thème 1 loading/not-found | Confirmé | `/admin/projets/abc` : « Élément introuvable » avec la nav admin (capture). `/admin/xyz` : 404 racine **publique** (Navbar du site, titre de la page d'accueil, aucun lien admin). `loading` : « Chargement… » + squelette sur toutes les pages. |
| Tirets cadratins (F-C6 côté admin) | Confirmé | `/admin/leads` : 3 (colonne « Retour »), `/admin/emails` : 2, fiche projet : 2. Zéro sur `/admin`, projets, liens, avis. |
| Forme juridique en code INSEE | Non vérifiable côté admin | Absent des écrans admin testés. |
| Régression de sens étapes 2,3,5,6 | Non vérifiable en prod | Le seul projet est terminé. La fiche admin réutilise toutefois des textes à la 2e personne côté client (« Vous confirmez vos informations », « vous signez le devis ») dans la frise admin : voir N6. |

## Nouveaux findings

### MAJOR

**N1. Fiche projet : tableaux « Documents émis » (6 col.) et « Factures du projet » (7 col.) débordent leur carte, de 768 à 1440 px.**
Route `/admin/projets/<id>`. Mesures (largeur du tableau / largeur du conteneur) : 768 px : 805 / 648 et 922 / 648, la page atteint 979 px de large (le `body` masque le surplus, colonnes « Empreinte », « Actions » coupées) ; 1024 px : 805 / 565 et 922 / 565 ; 1440 px : 805 / 633 et 922 / 633. À 1360 px (capture `shots/DE/projet-detail-factures-overflow-1360.jpg`) le tableau sort de la carte (bord droit à 832 px, tableau jusqu'à 1096 px) et recouvre la colonne latérale ; le numéro de facture se casse (« TFA-2026-0 / 002 »). À 360 px les tableaux passent en cartes : correct.
Fichier probable : `src/components/admin/projects/InvoiceList.tsx` et `DocumentsList`/`SignaturePanel` (colonnes), `projects.css` (`.pt-table` sans conteneur), grille 2fr/1fr de `leads.css:230-240`.
Correctif : conteneur `overflow-x:auto` + `role=region` + `tabindex=0` (modèle `FunnelTable.tsx:63`) ou cartes sous 1280 px ; retirer « Empreinte » de la vue par défaut (déjà derrière « Voir l'empreinte ») ; `min-width` sur la colonne numéro avec `white-space: nowrap`.

**N2. `/admin/emails` : tableau de 978 px dans un conteneur de 702 / 958 px.**
768 px : page de 1035 px, colonnes Statut / Action coupées ; 1024 px : page de 1035 px (11 px de coupe en bureau). Correct à 1440 px et à 360 px (cartes).
Fichier probable : `admin.css:405-415` (nowrap), `emails/page.tsx`. Correctif : conteneur à défilement ou passage en cartes sous 1100 px, retirer `nowrap` sur « Action ».

**N3. `/admin` (Clients) et `/admin/leads` : tableaux trop larges à 768 px.**
`/admin` : 953 / 696 px, page de 1010 px (colonne Action coupée). `/admin/leads` : 836 / 648 px, page de 893 px (colonne « Retour » coupée). Conformes à 1024 px et plus (953 / 952 : au ras sur `/admin`, risque dès que la fenêtre perd quelques pixels). Le même schéma que F-D2, sur des pages que le pré-audit disait saines.
Correctif commun avec N1 : bascule en cartes sous 1024 px au lieu de 768 px, ou conteneur défilant.

**N4. `/admin/leads?page=999` affiche « Leads indisponibles » (erreur de lecture) au lieu d'un état vide.**
L'erreur suggère une panne de base de données et invite à vérifier la connexion alors que la page est seulement hors plage. `/admin/emails?page=999` gère bien le cas (« Revenir à la première page »), mais son titre « Aucune adresse bloquée » est trompeur (il existe des adresses, la page est hors plage).
Fichier probable : `leads/page.tsx` (requête `range` hors limites traitée comme erreur). Correctif : borner la page à `ceil(total/size)` ou traiter l'erreur de plage en état vide avec lien « première page ».

### MINOR

- **N5.** `?statut=xxx` sur les leads est ignoré en silence : aucun message ni puce.
- **N6.** La frise de la fiche projet admin reprend le texte client (« Vous confirmez vos informations. », « vous signez le devis. ») au lieu d'un libellé de suivi interne. `projets/[id]/page.tsx`, `lib/projects/steps.ts`.
- **N7.** Boutons répétés sans contexte accessible : 6 « Invalider ce fait », 12 « Saisir » (entonnoir, sans `aria-label` ni `aria-controls`), plusieurs « Télécharger », « Voir l'empreinte », « Voir les données ». Ajouter `aria-label` avec la ligne concernée.
- **N8.** Fiche projet, cibles tactiles sous 44 px : `summary` « Historique » 24 px de haut, lien « Vérification p… » 37 px, champ URL en lecture seule 24 px ; « Voir l'empreinte » / « Voir les données » font 66 px (retour à la ligne) dans la colonne Actions.
- **N9.** Le menu de statut ne marque pas le statut courant (`aria-current` ou coche) et les `menuitem` ne gèrent pas le roving tabindex (`StatusPill.tsx`).
- **N10.** Titre de document « Fiche projet » sur la 404 admin et titre « Sèvalys, Agence digitale à Tours » sur `/admin/xyz` : prévoir `not-found` admin pour les URL inconnues sous `/admin/*` (`app/admin/[...slug]/page.tsx` appelant `notFound()`).
- **N11.** Un `dialog.consent-dialog` fermé est présent dans le DOM des pages admin (invisible, aucun effet utilisateur).
- **N12.** Fixtures de test : le nom affiché « Test E2E S�valys » contient un caractère de remplacement (U+FFFD) dans la liste et le détail des leads. Donnée corrompue à l'insertion, pas un défaut d'affichage ; à corriger dans la fixture.
- **N13.** `/admin/leads` : l'étiquette « Retours uniquement » est plus petite que « Statut » / « Source » ; les tailles d'étiquette de filtre sont incohérentes.

## Points qui passent

Pas de débordement de page à 360 px sur toutes les pages mesurées (`/admin`, leads, fiche lead, projets, fiche projet, entonnoir, liens, avis, e-mails). Nav sur 2 rangées lisible. Cibles de 44 px pour boutons, champs, pastilles, liens de nav. Lien d'évitement fonctionnel. Menu de statut : focus à l'ouverture, flèches, Échap avec retour du focus. Tableau d'entonnoir : conteneur défilant `role=region` focalisable. Cartes mobiles de `/admin/liens` (`data-label`, rôles, légendes cachées). 404 admin pour UUID invalide. Aucune erreur console ni requête en échec.

## Résumé

1. Aucun BLOCKER ; 4 MAJOR nouveaux, tous confirmés à l'écran ou par mesure : N1 à N4.
2. Défaut dominant : les tableaux admin à 5-7 colonnes n'ont pas de conteneur défilant ; entre 768 et 1440 px ils sortent de leur carte (fiche projet) ou sont coupés (clients, leads, e-mails). F-D2 est donc confirmé comme famille, pas sur la marge (données vides).
3. Fiche projet : la table des factures recouvre la colonne latérale à 1360 px (capture fournie).
4. F-D3 confirmé mais sans coupe (retour à la ligne, tuile triplée à 360 px) ; F-D4 confirmé (colonne collante de 191 px sur 272).
5. F-D6 confirmé en partie : clic extérieur ne ferme pas, `role=menu` bancal ; clavier correct.
6. F-D9 confirmé : tri invisible à 360 px.
7. F-X3 infirmé en grande partie (bordure acide visible).
8. F-D1, F-D5, F-D7, F-D8, F-E3, X1 non vérifiables (données ou panneaux d'écriture refusés).
9. `?page=999` : erreur trompeuse sur les leads (N4).
10. Scores : D 15/24, E 16/24.
11. Captures : `...\v2.0-browser\shots\DE\` (3 fichiers).
