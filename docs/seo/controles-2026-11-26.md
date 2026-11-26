# Contrôles avant livraison : textes FR du 26/11/2026

Méthode : skill `seo-client`, `references/contenu.md` section 3 et `outils.md`. Lecture seule : aucun fichier du repo modifié (extraction par scripts dans le scratchpad). Textes contrôlés : `/services/site-vitrine`, `/services/rebranding-site-premium` (Refonte), `/services/seo-referencement` (`translations.fr.services.pages.items[0|1|9]`), guides `/guides/prix-site-vitrine` et `/guides/seo-local` (`src/data/guides.ts`), accueil (`translations.fr.landing` + sections de `src/components/sections`).

## 1. Synthèse par texte

| Contrôle | site-vitrine | refonte | seo-referencement | guide prix | guide seo-local | accueil |
|---|---|---|---|---|---|---|
| 1. Plagiat externe (8 phrases, SERP entre guillemets) | OK : 0 reprise | OK : 0 reprise | OK : 0 reprise | OK, 1 point à surveiller (phrase Fenxi : même fourchette 800-3 000 € chez payton-site.com, texte différent) | OK : 0 reprise | OK : 0 reprise |
| 2. IA (GPTZero / ZeroGPT, ~1 000 car.) | GPTZero : IA 1 %, humain 69 % ; ZeroGPT 0 % | GPTZero : IA 63 % (« généré par IA ») ; ZeroGPT 0 % | GPTZero : IA 11 %, mixte 88 % ; ZeroGPT 0 % | GPTZero : IA 100 % ; ZeroGPT 0 % | GPTZero : IA 100 % ; ZeroGPT 0 % | GPTZero : IA 100 % ; ZeroGPT 0 %. L'extrait était tronqué |
| 3. Duplication interne (n-grammes de 8 mots) | 3 blocs (voir §3) | 1 bloc (mention légale) | 1 bloc légal, 1 question de FAQ | 3 blocs | 0 | 2 blocs |
| 4. Cannibalisation | Léger (voir §4) | Léger | Léger | À surveiller | À surveiller | Léger |
| 5. Technique | OK | OK, 2 formulations « garanti » à nuancer | À corriger : « garantir la première place » et « Ce qu'on garantit » | OK, 1 point sur « les vrais tarifs » | OK (exemple d'adresse fictif) | OK |
| 6. Faits | 1 à retirer, 1 citation à sourcer | OK | OK (à croiser avec l'offre) | 3 à retirer, 5 à corriger | Aucune source : à ajouter | OK, 2 non vérifiables |

Les détecteurs IA divergent fortement (ZeroGPT 0 % partout, GPTZero 100 % sur 3 textes). Ce sont des indicateurs, pas des preuves. Scribbr n'a pas été mesuré : la page `scribbr.fr/ai-detector/` renvoie « Page non trouvée ». Les détecteurs ont été utilisés sans compte, sans captcha. Pour le seuil du skill (« si score IA élevé, réécrire »), les 3 textes à 100 % chez GPTZero (guides, accueil) et la Refonte (63 %) sont à retravailler : exemples concrets, vécu client, rythme de phrase plus varié.

## 2. Plagiat externe (contrôle 1) : détail

Requête : `POST /v3/serp/google/organic/live/advanced`, `location_code` 2250, `language_code` fr, `depth` 5, phrase entre guillemets. Le endpoint `/regular` répond systématiquement `40101`. Des erreurs `40101` ponctuelles ont aussi touché l'endpoint advanced ; elles ont été relancées avec succès (une phrase d'accueil raccourcie). Le champ `domain` renvoie `google.com` (liens de redirection) : le domaine réel est lu dans `breadcrumb` / `website_name`.

- 6 textes x 8 phrases = 48 phrases contrôlées (en dessous des 8 à 10 demandées si l'on compte `depth` 5 au lieu de 10, voir §8). Aucune phrase retrouvée chez un autre domaine. sevalys.com n'apparaît pas dans les SERP (pages vraisemblablement pas encore indexées) : le contrôle « site:domaine » reste à refaire après indexation.
- Phrase la plus proche d'un texte d'agence concurrente : `seo-referencement`, « Une agence SEO à Tours travaille votre référencement naturel pour que les clients qui cherchent votre métier tombent sur vous. » Les snippets de agence-digitale-tours.fr, synapze.fr et architexte.fr ne la reprennent pas.
- À surveiller : « Selon Fenxi (décembre 2025), un freelance facture 800 à 3 000 € HT. » Le chiffre est confirmé chez Fenxi (voir §6), pas de copie de texte.

## 3. Duplication interne (contrôle 3)

Script : n-grammes de 8 mots entre les 6 textes, les 7 autres services et le reste du site (nav, simulateur, index des services). Blocs identiques de 8 mots ou plus :

| Bloc | Pages | Action |
|---|---|---|
| « TVA non applicable, art. 293 B du CGI » (8 mots) | site-vitrine (`pricing.note`, `faq[0].a`), refonte (`sections[3].paragraphs[1]`, `faq[1].a`), seo (`pricing.note`, `faq[0].a`), guide prix (`faq[3].a`, section « Où se situe Sèvalys »), accueil (`servicesPreview.vat`) | Mention légale obligatoire : à conserver. Pas une duplication de contenu |
| « vous parlez directement à Anatholy Bricon, entrepreneur individuel » (8 mots) | site-vitrine `longIntro[1]` et `sections[5].paragraphs[0]` / accueil `faq.items[0].a` et `why.items[0].d` | Reformuler un des deux côtés (par exemple sur l'accueil) |
| « textes et photos si vous ne les fournissez pas (et la maintenance) » (9 à 10 mots) | site-vitrine `pricing.notIncluded[1]` et `faq[1].a` / guide prix `faq[4].a` | Reformuler dans le guide ou dans la page service |
| « En combien de temps voit-on des résultats » (8 mots, question de FAQ) | seo-referencement `faq[1].q` / Meta Ads `faq[1].q` | Différencier la question (par exemple « Quand voit-on les premiers résultats du SEO local ? ») |

Aucun bloc repris entre guide seo-local et les autres textes. Aucun bloc entre refonte et les autres hors mention légale.

## 4. Cannibalisation (contrôle 4)

| Page | Mot-clé principal (brief) | Dans title / H1 | Chevauchement |
|---|---|---|---|
| Accueil | agence digitale tours (40) ; secondaire agence web tours (210) | title « Agence digitale à Tours : site internet, SEO, IA », H1 « Agence digitale à Tours » | Le title cite aussi « site internet » et « SEO » : léger recouvrement avec site-vitrine et seo. Acceptable tant que l'accueil reste générique |
| /services/site-vitrine | création site internet tours (90) | title « Création site internet à Tours dès 500 € » ; H1 « Créez votre site internet à Tours, simple et clair » | Le mot-clé exact n'est pas dans le H1 (verbe « Créez » à la place) : voulu par le brief. Chevauche l'accueil sur « site internet Tours » (secondaire) |
| /services/rebranding-site-premium | refonte site internet tours | title « Refonte site internet à Tours · sans tout perdre », H1 « Refonte de site internet à Tours : refaites votre site… » | Chevauchement « site internet à Tours » avec site-vitrine, mais l'axe « refonte » est propre à la page |
| /services/seo-referencement | agence seo tours (170) | title « Agence SEO Tours : faites-vous trouver, dès 300 € » ; H1 « Agence SEO à Tours · soyez trouvé… » | Le bloc « SEO local » de la page chevauche le guide `/guides/seo-local` sur « référencement local ». À différencier : la page vend, le guide explique |
| /guides/prix-site-vitrine | prix site vitrine (390) | title « Prix d'un site vitrine en 2026 : tarifs et budget » ; H1 « Combien coûte un site vitrine en 2026 ? Les vrais tarifs » | Le mot-clé exact « prix site vitrine » n'est ni dans le title (« Prix d'un site vitrine ») ni dans le H1. Risque de cannibalisation avec la FAQ « Combien coûte la création d'un site internet à Tours ? » de site-vitrine et son bloc tarifs : la page service doit viser la création locale, le guide les prix de marché |
| /guides/seo-local | référencement local (590) | title « Référencement local : être trouvé près de vous » ; H1 « SEO local : le guide pour être trouvé près de chez vous » | Le mot-clé principal est dans le title mais pas dans le H1 (qui dit « SEO local »). Recouvrement avec le bloc SEO local de la page seo-referencement |

Aucune page ne vise exactement le même mot-clé principal qu'une autre. Le contrôle `site:sevalys.com <mot-clé>` n'a pas pu être fait utilement : les pages ne sont pas encore dans l'index (aucune apparition dans les SERP).

## 5. Technique (contrôle 5)

Le rendu des `<title>` : les pages service et les guides passent un titre en chaîne au layout racine, qui ajoute « · Sèvalys » (`template: "%s · Sèvalys"`). L'accueil utilise `title.absolute`.

| Page | Title rendu (car.) | Meta (car.) | H1 | JSON-LD FAQ = FAQ visible | Liens internes | Adresse de rue | « garanti / 1re place » |
|---|---|---|---|---|---|---|---|
| site-vitrine | 50 | 143 | 1 | Oui (même source `copy.faq`, 8 q/r) | 5 | Non | Non |
| refonte | 58 | 148 | 1 | Oui (8 q/r) | 6 | Non | « Aucune position n'est garantie » x2 (négation, acceptable) |
| seo-referencement | 59 | 149 | 1 | Oui (8 q/r) | 4 | Non | Question « Pouvez-vous garantir la première place sur Google ? » ; « Ce qu'on garantit : le travail décrit ici » |
| guide prix | 59 | 151 | 1 | Oui (`buildGuideFaqJsonLd(g.faq)`, 7 q/r) | 5 | Non | Non |
| guide seo-local | 56 | 155 (limite) | 1 | Oui (7 q/r) | 7 | « 12 rue de la Paix » : exemple d'écriture d'adresse, fictif | « personne ne peut la garantir » (négation) |
| accueil | 58 (absolute) | 129 | 1 | Oui (`buildFaqJsonLd(landing.faq.items)`, 8 q/r) | liens dans les composants (/simulateur, #contact) | Non | « Aucune position garantie » (négation) |

Aucun superlatif prouvé n'a été relevé comme excessif. Deux formulations sont à nuancer : « Sèvalys est l'agence SEO de Tours pour les artisans, les commerçants et les restaurants » (`seo-referencement.longIntro[0]`) et « Les vrais tarifs » (H1 du guide prix). Les « la plus courante / la plus fréquente » du guide prix sont des synthèses non sourcées (voir §6).

Points techniques mineurs : la meta du guide seo-local est à 155 caractères pile ; le title de la Refonte contient deux « · » (« … · sans tout perdre · Sèvalys »).

## 6. Vérification des faits (contrôle 6)

Sources scrapées via Bright Data le 26/11/2026. Les six URL du tableau `sources` du guide prix répondent.

### 6.1 Guide `prix-site-vitrine`

| Affirmation | Source | Verdict | Commentaire |
|---|---|---|---|
| Freelance 800 à 3 000 € HT ; agence 2 000 à 6 000 € HT | Fenxi (déc. 2025, mis à jour 01/11/2026) | Confirmée | |
| Créateur de site « 0 à 50 € par mois », plan payant ~6 €/mois | iPaoo | Confirmée | |
| « 100 à 500 € par an, domaine compris » | Trend Design | Confirmée | La page est maintenant titrée « 2027 » |
| Freelance 300 à 3 000 € chez iPaoo | iPaoo | Confirmée | |
| Dilo 1 500 à 3 000 € (3-5 pages), 3 000 à 6 000 € (5-15 pages) | Dilo (7 mars 2024) | Confirmée | La date « mars 2024 » est une date de publication |
| Tableau voies : « 1 500 à 6 000 € chez Dilo » | Dilo | À corriger | Somme exacte, mais Dilo donne deux tranches par nombre de pages |
| Trend Design : 800-2 800 € (3 p.), 1 500-5 000 € (5 p.) freelance ; 3 000-6 000 € et 5 000-10 000 € agence | Trend Design | Confirmée | |
| Codeur.com 1 200-3 000 € et 1 500-4 000 € | Codeur | Confirmée | Page titrée « 2025 » |
| AmphiBee dès 5 000 € (5 p., thème) et dès 13 500 € (sur mesure) | AmphiBee | Confirmée | Page mise à jour le 18/11/2026 |
| Rédaction « ~0,10 € le mot » ; visuels « 500 à 1 000 € » | « Codeur.com, AmphiBee » | À corriger | AmphiBee seul ; « 500 à 1 000 € pour 10 images » |
| « Dès 400 € chez ybdev » (guides.ts lignes 134, 203 et tableau) | ybdev | **À retirer** | Aucun « ybdev » trouvé ; bydev.fr affiche « sur devis » ; aucune URL dans `sources`. Le plancher « 400 € » en dépend |
| « Dès 490 € chez ConvertiLab » | ConvertiLab | À corriger | 490 € = landing page ; site vitrine dès 890 € |
| « 500 € pour une page chez La Weberie » | La Weberie | Confirmée | Site vitrine 1 800 € / 2 500 € / 5 000 € |
| « Dès 690 € HT (comparatif) » (ligne 228) | non nommée | **À retirer ou nommer** | 690 € existe chez Neodigit (HT non précisé) |
| « Zone la plus courante 1 500 à 5 000 € » | synthèse non sourcée | Non attribuable | Proche de Trend (1 500-5 000 €), Dilo, Neodigit : à présenter comme « ordre de grandeur relevé » |
| Hébergement « 2 à 30 € par mois » (lignes 332, 444) | non attribuée | **Non retrouvée** | Codeur : mutualisé 20-50 €/an, VPS ~100 €/an ; Neodigit : 50-150 €/an. Convertir en annuel et attribuer |
| Domaine « 10 à 70 € par an », .fr 10-15 € | Codeur | Confirmée | |
| FAQ « créateur de site 15 à 50 € par mois » (ligne 452) | iPaoo | **Non retrouvée** | iPaoo : 6 à 50 € ; incohérent avec le tableau (« 0 à 50 € ») |
| FAQ « ConvertiLab, formule à 39 € par mois » | ConvertiLab | À corriger | C'est un paiement étalé 24 mois (890 €), pas un abonnement |
| E-commerce « dès 2 000 à 3 000 € » | non sourcée | À corriger | Fenxi : Shopify 2 000-8 000 € ; Dilo dès 5 000 € |
| « Relevés en novembre 2026 » | | Confirmée comme date de consultation | |

### 6.2 Guide `seo-local`

`sources: []` : aucune source pour des règles Google affirmées (vérification de la fiche par courrier, téléphone ou vidéo, pertinence / distance / notoriété, interdiction des mots-clés dans le nom, faux avis). La page d'aide Google n'a pas pu être scrapée. Verdict : non vérifié ; ajouter au moins « Conseils pour améliorer votre classement local » (Google Business Profile) dans `sources`. Les durées (45 min, 1 h, 15 min par client, 30 min/mois, plan en 7 jours) sont des estimations éditoriales, signalées « indicatives » : acceptable.

### 6.3 Pages service et accueil

| Affirmation | Verdict | Commentaire |
|---|---|---|
| « Les prestataires de Tours vont d'environ 700 à 3 000 € (relevé de novembre 2026) » (`site-vitrine.faq[0].a`, `translations.ts` ligne 575) | **À retirer** | Aucune source ne donne « 700 » ni une fourchette propre à Tours ; les relevés du guide sont nationaux |
| `site-vitrine.caseQuote` (« Depuis notre nouveau site, les clients nous trouvent facilement et réservent une table… », attribuée à Gecko Cabane) | **À sourcer ou retirer** | Absente du site de Gecko ; il faut l'accord écrit du client |
| Site dès 500 € (accueil + 2 pages), SEO dès 300 €/mois, +100 €/page, engagement 3 mois, délai 2 à 4 semaines | Confirmée (cohérente) | Même chiffre sur toutes les pages |
| Résultats SEO visibles après 3 à 6 mois | Confirmée | Ordre de grandeur courant, sans promesse |
| Accueil « Ils nous font confiance, depuis 2023 » (`landing.partners.title`) | Non vérifiable | Aucun projet affiché antérieur à 2024 |
| Gecko Cabane : « Charte sur-mesure, hébergement managé » (`landing.work.items[2].desc`) | Non vérifiable | Interne |
| Partenaires (Selenium Studio, Victor Verissimo, AJMG-EXP) | Selenium Studio confirmé (co-créateur de 2 sites), les 2 autres non vérifiés | |

### 6.4 Les 4 projets (sites scrapés le 26/11/2026)

| Projet | Description | Verdict |
|---|---|---|
| grandouesthabitat.com | Rénovation du bâtiment à Tours ; téléphone, zone d'intervention (17 départements), six métiers, avant/après, avis Google ; demande de projet en ligne, visite technique puis devis sous 48 h | Confirmée. À noter : la zone couvre 17 départements, pas seulement Tours |
| sellerieduchet.com | Équipement équestre à Chambray-lès-Tours ; rayons, produits en vedette, présentation de la gérante, livraison, paiement en plusieurs fois (Klarna) | Confirmée |
| geckocabanerestaurant.com | Restaurant franco-thaï à Krabi ; carte, horaires, réservation, 4 langues | Confirmée |
| ghjulianu-codani.com | Photographe ; portfolio, albums, tarifs, contact | Confirmée |

## 7. Corrections à faire (texte exact + fichier + suggestion)

Fichiers : `C:\portfolio\src\lib\translations.ts` (services, accueil) et `C:\portfolio\src\data\guides.ts` (guides).

**À retirer ou corriger (faits)**
1. `translations.ts` ligne 575, `services.site-vitrine.faq[0].a` : « Les prestataires de Tours vont d'environ 700 à 3 000 € (relevé de novembre 2026) » → « En France, un freelance annonce en général 800 à 3 000 € HT et une agence 2 000 à 6 000 € HT (relevés de novembre 2026) ».
2. `translations.ts`, `services.site-vitrine.caseQuote` : citation de Gecko Cabane sans source. La sourcer (accord écrit) ou la remplacer par un fait vérifiable (« Réservation en ligne en 4 langues, ouvert 7j/7 »). Attention : le test impose `caseQuote` non nul pour cet index.
3. `guides.ts` lignes 134, 203 et tableau forfait : « Dès 400 € chez ybdev » → retirer ; reformuler « les prix annoncés vont de 400 € à plus de 10 000 € » en « de 300 € à plus de 10 000 € » (iPaoo / Trend Design).
4. `guides.ts` ligne 228 : « dès 690 € HT (comparatif) » → nommer la source ou supprimer « HT ».
5. `guides.ts` lignes 332 et 444 : « Hébergement : 2 à 30 € par mois » → « 20 à 150 € par an en mutualisé, 100 à 500 € par an en VPS (relevés Codeur et Neodigit) ».
6. `guides.ts` ligne 452 : « comptez 15 à 50 € par mois » → « 6 à 50 € par mois » ; et « ConvertiLab affiche une formule à 39 € par mois » → « ConvertiLab étale son site vitrine à 890 € sur 24 mois (39 € par mois), sans abonnement ».
7. `guides.ts` : ConvertiLab « dès 490 € » → « landing page dès 490 €, site vitrine dès 890 € » ; AmphiBee seul pour « 0,10 € le mot » et « 500 à 1 000 € pour 10 images » ; ligne agence du tableau voies : « 1 500 à 6 000 € selon le nombre de pages (Dilo) » ; e-commerce « dès 2 000 à 3 000 € » → « de 2 000 à plus de 5 000 € » ; Codeur daté « 2025 ».
8. `guides.ts`, guide `seo-local` : `sources: []` → ajouter la page d'aide Google « Conseils pour améliorer votre classement local ».
9. `guides.ts` : ajouter dans `sources` les URL de La Weberie (laweberie.fr/service/creation-de-sites-web/) et ConvertiLab (convertilab.com/prix) citées dans le texte.

**À reformuler (garanties, superlatifs)**
10. `services.seo-referencement.faq[2].q` : « Pouvez-vous garantir la première place sur Google ? » → « Promettez-vous une position sur Google ? ».
11. `services.seo-referencement.sections[4].paragraphs[1]` et `faq[2].a` : « Ce qu'on garantit : le travail décrit ici… » → « Ce que nous nous engageons à faire : le travail décrit ici et un suivi que vous pouvez vérifier ».
12. `services.seo-referencement.longIntro[0]` : « Sèvalys est l'agence SEO de Tours pour… » → « Sèvalys est une agence SEO à Tours pour… ».
13. `guides.ts`, H1 du guide prix : « Les vrais tarifs » → « tarifs et budget » (ou retirer).
14. « zone la plus courante / la plus fréquente » (guide prix, `answer`, section tableau, `faq[0].a`) → « ordre de grandeur relevé le plus souvent » avec renvoi aux sources.

**À reformuler (duplication interne)**
15. « Vous parlez directement à Anatholy Bricon, entrepreneur individuel » : varier entre `landing.why.items[0].d` / `landing.faq.items[0].a` et `site-vitrine.longIntro[1]` / `sections[5].paragraphs[0]`.
16. « textes et photos si vous ne les fournissez pas et la maintenance » : varier entre `site-vitrine.pricing.notIncluded[1]` / `faq[1].a` et `guides.ts` `faq[4].a`.
17. `seo-referencement.faq[1].q` « En combien de temps voit-on des résultats ? » : différencier de Meta Ads.

**À réécrire (IA)**
18. Passages à retravailler en priorité (GPTZero 100 % / 63 %) : introductions des deux guides, texte de l'accueil, introduction de la Refonte. Ajouter un cas vécu (Grand Ouest Habitat, Sellerie Duchet), varier la longueur des phrases, remplacer les enchaînements trop réguliers.

**Cannibalisation (suggestions)**
19. Guide prix : placer l'expression « prix site vitrine » dans le title ou le H1 (« Prix d'un site vitrine… » est déjà proche). Faire pointer la FAQ prix de la page site-vitrine vers le guide plutôt que de répéter les fourchettes.
20. Guide seo-local : ajouter « référencement local » dans le H1 (« SEO local » seul actuellement).

## 8. Limites et coût DataForSEO

- Plagiat : 8 phrases par texte (48 au total), `depth` 5 au lieu de 10 pour limiter la taille des réponses. Le critère « phrase retrouvée » repose sur les snippets (description) de chaque résultat, pas sur la lecture des pages.
- IA : GPTZero et ZeroGPT uniquement (Scribbr indisponible), un extrait de ~1 000 caractères par texte (celui de l'accueil tronqué).
- Faits : la page d'aide Google Business Profile n'a pas pu être scrapée ; les offres Sèvalys (500 €, 300 €/mois, +100 €/page, 2 à 4 semaines) sont vérifiées par cohérence interne, pas contre une source externe.
- Coût DataForSEO : l'API ne renvoie pas le champ `cost` dans le mode compact. Estimation à 0,002 USD par appel `live/advanced` : environ 64 appels (dont quelques erreurs 40101 et relances), soit environ 0,13 USD. Bright Data utilisé pour les pages de sources et les 4 sites projets (facturation propre au compte).
