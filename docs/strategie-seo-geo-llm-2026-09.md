# Stratégie SEO + GEO + LLM/AEO — Sèvalys (Tours)

**Date** : 2026-09-20
**Domaine** : sevalys.com
**Périmètre** : agence web & IA à Tours, cible PME locales (restaurants, commerces, écoles, professions de service)

---

## 0. Résumé exécutif

**Positionnement à jouer : Sèvalys est la seule agence à Tours qui combine site web + agent vocal IA + SEO/GEO en une offre unique.** Chaque brique existe séparément chez les concurrents (agences web généralistes locales *ou* spécialistes IA vocale nationaux/un freelance local). Le second angle fort : **le GEO/AEO local (visibilité dans ChatGPT/Perplexity/AI Overviews) est un territoire quasiment vierge** pour les PME de Tours — aucun concurrent identifié ne le travaille.

Base technique déjà solide et rare : `llms.txt` existant, `robots.ts` autorisant explicitement GPTBot/ClaudeBot/PerplexityBot/Google-Extended, JSON-LD `Organization` + `ProfessionalService` + `FAQPage` déjà en place avec géolocalisation Tours/Indre-et-Loire.

**Point faible immédiat identifié en direct via l'API Search Console** : la propriété `sevalys.com` est vérifiée mais **aucun sitemap n'est soumis** et il n'y a **aucune donnée de recherche encore enregistrée** (site trop récent). Action à faire dans la semaine.

---

## 1. Constat technique (audit direct du code + Search Console)

- **Domaine confirmé** : `sevalys.com` (`src/app/layout.tsx`), marque **Sèvalys**.
- **Pages existantes** (`src/app/sitemap.ts`) : `/`, `/services`, `/calculateur-roi`, `/demo` (+ `/demo/feuillette`), `/mentions-legales`. **Aucun blog, aucune page sectorielle, aucune page ville.**
- **Contenu i18n** : tout vit dans `src/lib/translations.ts` (fr/en/th). Toute nouvelle page de contenu long (blog, secteurs) devrait vivre **hors** de ce système pour ne pas devoir tout traduire en 3 langues.
- **Déjà solide pour le GEO/AEO** : `public/llms.txt`, `robots.ts` autorise les crawlers IA, JSON-LD `Organization`/`ProfessionalService`/`WebSite`/`FAQPage` avec adresse Tours/Indre-et-Loire, `GeoCircle` 50 km, `areaServed`.
- **Preuves clients réelles disponibles** (`translations.ts`, `Realisations.tsx`) : **Feuillette** (boulangerie, agent vocal + CRM), **Gecko Cabane** (restaurant, réservation), **Les Folies Temps Danse** (école de danse, inscriptions), Ghjulianu Codani, Selenium Studio. Couvre 3 des 4 verticaux ciblés — **il manque un cas "artisan/profession de service"**.
- **Offres réelles** (pour caler les mots-clés commerciaux) : Landing Page (1200–2000€), Rebranding + Site Premium (2500–4400€), Projet sur-mesure (devis), **Agent Vocal IA dès 990€** (VAPI + Twilio + ElevenLabs + CRM via MCP), Maintenance (49/79/129€+ /mois).
- **Google Search Console** : propriété `sc-domain:sevalys.com` vérifiée (siteOwner). **Sitemap non soumis** (`/sites/.../sitemaps` renvoie vide). **Zéro donnée de recherche** sur juin–sept. 2026 (site trop récent, normal).
- **Ahrefs** : compte connecté mais **plan sans accès API** (même l'endpoint gratuit `domain-rating-free` renvoie "Insufficient plan") — pas de volumes de recherche mesurés disponibles pour cette mission. À réévaluer si l'add-on API est activé plus tard.

---

## 2. Paysage concurrentiel (synthèse)

### Concurrents locaux généralistes (Tours/37)
KBCOM, Youlead Tours, Creatisweb, Addictic, Tribu & Co, Linkeo Tours, MGS Informatique, WEBUZ, ConvertiLab, MS France Concept — offres site+SEO classiques, **aucun ne propose d'agent vocal IA**. KBCOM et ConvertiLab affichent des prix publics et convertissent bien (avis Google) — la transparence tarifaire est un facteur de confiance prouvé localement.

**Vistalid** (national, basé à Bordeaux) déploie des pages programmatiques par ville (`/agence-web/tours`) — contenu générique, vulnérable à du vrai contenu local.

### Concurrent local direct sur l'IA vocale
**Olivier Arnold** (Aigues-Vives, 37) — positionnement "IA et automatisation pour PME", livraison rapide, mais **pas de site web/e-commerce, pas de tarifs publics, pas de contenu SEO**. C'est le concurrent le plus proche sur l'angle vocal, mais sans l'écosystème complet de Sèvalys.

### Concurrents nationaux IA vocale
Nerolia (blog SEO très actif, 150–800€/mois), AirAgent (dès 49€/mois, self-serve), TALKR.ai, VOKAI, Quadia, JUWA, Eliocall — **forts en contenu générique, absents localement** (pas de fiche GBP Tours, pas de preuve client Indre-et-Loire).

### Angle réglementaire à exploiter
Depuis le 2 août 2026, l'**article 50 de l'AI Act** impose d'informer l'appelant qu'il parle à une IA (+ sanctions pénales via la loi SREN en cas de voix IA non signalée). **Aucun concurrent local ne communique sur la conformité** — angle de confiance quasi inexploité, sujet neuf donc fort potentiel de citation par les moteurs IA génératifs.

### Lacunes exploitables
1. Site + IA vocale + SEO/GEO en une offre unique → personne d'autre à Tours.
2. GEO/AEO local → blue ocean total.
3. Contenu éditorial des concurrents locaux très faible (pages statiques, peu/pas de blog) → dominer la longue traîne locale à faible coût.
4. Transparence tarifaire → facteur de conversion prouvé, peu pratiqué par la majorité.
5. Gestion active GMB/avis packagée dans la maintenance → différenciant, prouvé efficace localement (cas MS France Concept).
6. Fenêtre de tir 12-18 mois avant que Nerolia/AirAgent ne déclinent localement.

---

## 3. Clusters de mots-clés

*Méthodologie : aucune donnée de volume mesurée (Ahrefs API et GSC indisponibles pour ce site) — priorité qualitative basée sur spécificité, intention commerciale locale et concurrence observée.*

### a) Locaux génériques

| Cluster | Exemples | Concurrence | Priorité |
|---|---|---|---|
| Tête de mât | "agence web tours", "création site internet tours" | Forte (6+ agences + agrégateurs) | Long terme |
| Web + IA (niche) | "agence web tours intelligence artificielle", "agence site internet et IA tours" | Quasi nulle | **Quick win** |
| Refonte/rebranding | "refonte site internet tours", "moderniser mon site tours" | Moyenne | Moyen terme |
| Devis/tarifs | "prix création site internet tours", "combien coûte un site internet pme" | Faible-moyenne | **Quick win** (grille de prix publique) |
| Villes satellites | "création site internet Joué-lès-Tours / Saint-Cyr-sur-Loire / Fondettes / Chambray-lès-Tours" | Très faible | **Quick win** |

### b) Par offre

| Cluster | Exemples | Priorité |
|---|---|---|
| Agent vocal IA (offre phare) | "agent vocal IA tours", "IA qui répond au téléphone" | **Quick win** local / moyen terme national |
| Secrétaire/répondeur IA | "secrétaire téléphonique IA", "ne plus rater d'appels client" | **Quick win** — angle douleur concret |
| Conformité agent vocal IA | "IA Act article 50 voix synthétique", "dois-je informer client IA au téléphone" | **Quick win** — contenu quasi inexistant en FR |
| Chatbot/automatisation PME | "chatbot IA pme", "automatiser prise de rdv" | Moyen terme |
| Site vitrine/landing page | "site vitrine pme tarif" | Moyen terme |

### c) Par vertical × Tours/Indre-et-Loire

| Vertical | Exemples | Priorité | Preuve client |
|---|---|---|---|
| Restaurant | "site internet restaurant tours", "agent vocal IA restaurant" | **Quick win** | Oui (Gecko Cabane) |
| Boulangerie/commerce | "agent téléphonique IA boulangerie tours" | **Quick win** — proof point le plus fort | Oui (Feuillette) |
| École/formation | "plateforme inscription en ligne école tours" | Moyen terme | Oui (Les Folies Temps Danse) |
| Artisan/service | "agent vocal IA artisan (plombier, coiffeur, garage)" | Moyen terme — **gap de preuve, à combler** | Non |

### d) Longue traîne conversationnelle

"comment ne plus rater d'appels clients dans mon restaurant", "l'IA au téléphone fait-elle peur aux clients ?", "combien coûte un agent vocal IA pour une petite entreprise" (→ lien `/calculateur-roi`), "dois-je prévenir mes clients qu'ils parlent à une IA au téléphone" — toutes **quick win**, quasi aucune concurrence FR.

---

## 4. Stratégie de contenu

### Pages piliers à créer
1. **`/agent-vocal-ia`** — priorité n°1, aucune page dédiée aujourd'hui (juste une section sur `/services`).
2. **`/secteurs/restaurants`**, **`/secteurs/boulangeries-commerces`**, **`/secteurs/ecoles-associations`**, **`/secteurs/artisans-services`** — chacune avec cas client réel + FAQ sectorielle.
3. **`/tours`** + variantes courtes (`/joue-les-tours`, `/saint-cyr-sur-loire`, `/chambray-les-tours`, `/fondettes`) — pages courtes, uniques, pas dupliquées.
4. **`/realisations`** en page indexable propre (actuellement section home seulement) avec étude de cas détaillée par client.
5. **`/blog`** — nouvelle arborescence, **hors** du système i18n `translations.ts`.

### Idées d'articles prioritaires
- "Agent vocal IA : ce que dit la loi en France en 2026 (AI Act, loi SREN)"
- "Ne plus rater un appel client : le vrai coût pour un restaurant/commerce à Tours"
- "Combien coûte un site internet professionnel à Tours en 2026 ?"
- Études de cas Feuillette et Gecko Cabane, chiffrées.

### Maillage interne
Home → `/services` → `/agent-vocal-ia` + `/secteurs/*` → `/realisations` → CTA offre. Blog → pages piliers correspondantes. `/calculateur-roi` et `/demo` liés depuis `/agent-vocal-ia` (vérifier qu'ils ne le sont pas déjà).

---

## 5. Stratégie GEO (local)

- **Google Business Profile** : créer/optimiser (catégorie *Agence de conception de sites Web*), zone Indre-et-Loire, publier régulièrement, **collecter des avis clients** (aucun avis visible actuellement — point faible à corriger en priorité).
- **Citations locales** : CCI Touraine, Annuaire des Entreprises (data.gouv.fr), PagesJaunes/Google Maps (cohérence NAP stricte avec le JSON-LD), figurer dans les comparatifs déjà bien classés (Sortlist, Digital Unicorn, Findly) et dans les comparatifs nationaux IA vocale (Koino, Nerolia).
- **Schema.org à renforcer** : `AggregateRating`/`Review` (dès avis réels), `Service` par offre avec `priceRange`, `BreadcrumbList` sur les nouvelles pages, FAQ étendue par page secteur.
- **Title/H1** : pattern `[Offre] à Tours · [bénéfice]` sur chaque nouvelle page.

---

## 6. Stratégie LLM/AEO

- **Enrichir `llms.txt`** à chaque nouvelle page publiée + section "Différenciation" explicite et factuelle.
- **Bloc réponse directe** (2-3 phrases) sous chaque H1/H2 de blog/secteur — format citable par ChatGPT/Perplexity/AI Overviews.
- **FAQPage schema étendu** avec les questions exactes du cluster (d).
- **Sources tierces prioritaires** : avis Google → comparatifs agences (Sortlist/Findly) et IA vocale (Koino/Nerolia) → presse locale (La Nouvelle République, Tours Métropole Éco) → LinkedIn/CCI Touraine.
- **Cohérence NAP stricte** partout (site, GBP, annuaires, réseaux).

---

## 7. Priorisation

### Quick wins (30 jours)
1. **Soumettre le sitemap à Search Console** (`https://sevalys.com/sitemap.xml`) — constaté manquant, aucune action de crawl demandée pour l'instant.
2. Créer `/agent-vocal-ia` avec title/H1/FAQ ciblés "Tours".
3. Publier l'étude de cas Feuillette sur une page `/realisations` indexable.
4. Publier l'article conformité "Agent vocal IA : ce que dit la loi en 2026".
5. Lancer la collecte d'avis Google (clients existants).
6. Créer/optimiser la fiche Google Business Profile.
7. Mettre à jour `llms.txt` à chaque nouvelle page.
8. S'inscrire CCI Touraine + vérifier fiche Annuaire des Entreprises.

### Moyen terme (3-6 mois)
Pages sectorielles restantes, lancement du blog (1-2 articles/mois), pages villes satellites, visibilité dans les comparatifs (Sortlist/Koino/Nerolia), extension du schema.org, premier article presse locale.

### Long terme (6-12 mois+)
Étude de cas "artisan/profession de service" (gap de preuve à combler), montée en autorité sur "agence web tours", section ressources/outils pour backlinks naturels, extension géographique (Loches, Amboise, Chinon) si demande justifiée.

---

## 8. Outillage mis en place pendant cette mission

- **Ahrefs** : connecté en OAuth mais **plan sans accès API** — pas de données de volume/backlinks disponibles. À réactiver si l'add-on API Ahrefs est souscrit.
- **Google Search Console** : accès API en place via Application Default Credentials (gcloud), projet GCP dédié `sevalys-search-console`, scope lecture (`webmasters.readonly`). Un serveur MCP local (`gsc`, enregistré en config utilisateur Claude Code) expose `list_sites`, `list_sitemaps`, `search_analytics_query`, `submit_sitemap` — **nécessite un redémarrage de session Claude Code pour apparaître comme outil**. `submit_sitemap` échouera tant que l'auth n'est pas refaite avec le scope d'écriture (`webmasters`, pas seulement `webmasters.readonly`) — en attendant, soumettre le sitemap manuellement dans l'interface Search Console (30 secondes).
- **searchfit-seo** (competitor-analyzer, content-strategist) : utilisé pour produire les sections 2 à 6 de ce document via recherche web réelle.

---

*Document généré par recherche web réelle (agents competitor-analyzer et content-strategist) + audit direct du code source + requêtes API Search Console. Aucune donnée de volume de recherche mesurée (Ahrefs/GSC) n'était disponible au moment de la rédaction — les priorités sont qualitatives et devront être recalibrées une fois du trafic accumulé dans Search Console.*

---

## 9. Addendum 2026-09-20 — Extension de l'offre (Community Management, Branding, Meta Ads, Google Ads)

Décision produit actée : Sèvalys étend son catalogue à 4 nouveaux services, **sans jamais afficher de prix sur le site**. Chaque service aura sa propre page.

**Mise à jour 2026-09-20** : cette règle "jamais de prix" a été étendue à **toutes** les offres, y compris les 5 offres existantes qui affichent aujourd'hui un prix sur `/services` (Landing Page, Rebranding+Premium, Projet sur-mesure, Agent Vocal IA, Maintenance). **Ceci inverse la recommandation de la section 2** qui citait la transparence tarifaire (KBCOM, ConvertiLab) comme facteur de conversion et de différenciation prouvé localement. Ce choix reste valide comme décision produit, mais les pages `/services/*` ne pourront plus capitaliser sur cet avantage concurrentiel identifié — à compenser par la preuve sociale (réalisations, témoignages) et le simulateur de diagnostic comme nouveaux facteurs de confiance/conversion. La landing reste volontairement simple (problèmes résolus, présentation des services, fonctionnement, enjeux, preuve sociale/témoignages) et pousse systématiquement vers un **simulateur de diagnostic** (qualification des besoins → services recommandés → CTA appel/email) plutôt que vers un tunnel de prix. Ce chantier est traité comme un **nouveau milestone** (voir `/gsd:new-milestone`), incluant l'intégration de cette stratégie SEO/GEO/AEO.

### Nouveaux clusters de mots-clés

| Service | Exemples de requêtes | Intention | Priorité |
|---|---|---|---|
| Community Management | "community manager tours", "gestion réseaux sociaux pme tours", "community manager freelance vs agence" | Commerciale | Moyen terme |
| Branding | "agence branding tours", "création logo identité visuelle pme", "refonte identité de marque commerce" | Commerciale | Moyen terme (chevauche déjà l'offre "Rebranding + Site Premium") |
| Meta Ads | "publicité facebook instagram pme tours", "agence meta ads tours", "campagne pub réseaux sociaux commerce local" | Commerciale | **Quick win** — peu de concurrents locaux dédiés |
| Google Ads | "agence google ads tours", "campagne google ads pme", "publicité google restaurant tours" | Commerciale | Moyen terme — déjà en option chez Sèvalys, à faire monter en page pilier |
| Transverse (diagnostic) | "quels outils digitaux pour mon commerce", "par où commencer ma stratégie digitale pme", "audit digital gratuit pme tours" | Informationnelle → conversion | **Quick win** — alimente directement le simulateur |

### Implication SEO du choix "pas de prix affiché"

- Les CTA et les title/meta ne doivent **jamais** cibler des requêtes de type "prix X" / "tarif X" de façon frontale (ces requêtes existent mais renverraient vers une page sans réponse claire) — les rediriger plutôt vers "audit gratuit", "diagnostic gratuit", "simulateur".
- Le **simulateur devient lui-même un atout SEO/GEO/AEO** : une page `/simulateur` (ou `/diagnostic`) formulée comme un outil interactif + contenu explicatif est hautement citable par les moteurs IA ("comment savoir quels services digitaux me conviennent") et constitue une page pilier transverse au-dessus des 4+ pages de service.
- Chaque nouvelle page de service doit avoir son propre bloc FAQ + bloc réponse directe, et se terminer par un double CTA : "Faire le diagnostic" (simulateur) / "Appeler" / "Écrire un email" — jamais de mention de prix, jamais de comparateur tarifaire.

### Pages piliers à ajouter à la section 4

- `/services/community-management`
- `/services/branding` (à articuler avec l'offre existante "Rebranding + Site Premium" — clarifier la frontière dans le milestone)
- `/services/meta-ads`
- `/services/google-ads`
- `/simulateur` (page pilier transverse — qualification + recommandation de services + capture prospect)

### Stockage des prospects (CRM)

Le simulateur doit écrire chaque réponse/prospect dans la base existante (le projet a déjà un CRM Supabase pour l'agent vocal — réutiliser ce même stockage plutôt que créer un système parallèle, à confirmer dans le milestone).
