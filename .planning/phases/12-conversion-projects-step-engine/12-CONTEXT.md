# Phase 12: Conversion, projects & step engine - Context

**Gathered:** 2026-10-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Un lead devient client en un clic et suit son projet étape par étape dans son espace, pendant que l'admin voit tous les projets. Livre : conversion lead → client (invitation incluse), projet et frise d'étapes calculée à partir de faits enregistrés, onboarding guidé, fichiers privés et liens utiles, accord de présentation du projet, moteur de mails minimal (règles en code, journal idempotent), vue admin des projets et de leurs blocages. Requirements : PORTAL-01 à PORTAL-06, MAIL-01, MAIL-02, ADM-01.

Hors périmètre : génération de documents (phase 13), signature (14), paiements et factures (15), relances automatiques, rebonds/plaintes, désinscription (16).

</domain>

<decisions>
## Implementation Decisions

### Conversion lead → client (PORTAL-01)
- **D-01:** Le clic « Convertir en client » ouvre le **formulaire d'invitation existant** (SIRET + recherche entreprise + nom), pré-rempli avec le nom et l'e-mail du lead. Un clic, puis confirmation. `sv_clients.siret` reste obligatoire (les phases 13/15 le supposent rempli) ; aucune migration pour le rendre nullable.
- **D-02:** Le premier membre invité est le **contact le plus récent** du lead, modifiable avant envoi. Un e-mail déjà admin ou déjà membre client est refusé (rôles exclusifs, D-04 de la phase 10 ; la règle « plus-address » de PROJECT.md reste vraie).
- **D-03:** Après conversion, le lead **reste lié** (`converted_client_id` renseigné), garde sa source figée pour l'entonnoir et **ne change pas de statut**. « Signé » reste un geste admin tant que la signature n'existe pas (phase 14).
- **D-04:** Conversion autorisée **seulement à partir de « Qualifié »** (Qualifié, RDV, Devis envoyé, Signé). « Nouveau » et « Perdu » ne sont pas convertibles (un lead Perdu se rouvre d'abord via l'action existante).
- **D-05:** La conversion **crée un premier projet** (voir D-10) dans la même opération que le client et l'invitation.

### Frise d'étapes et déblocage (PORTAL-03, PORTAL-04)
- **D-06:** **Une frise commune** à tous les projets ; l'offre est une métadonnée du projet (champ), sans effet sur les étapes. Des modèles par offre pourront suivre dans une phase ultérieure.
- **D-07:** **6 étapes** : 1 Onboarding → 2 Cadrage & devis → 3 Contrat & acompte → 4 Production → 5 Recette → 6 Livraison & solde. Elles correspondent aux faits des phases 13-15 (devis, contrat signé, acompte, PV de recette, facture).
- **D-08:** Le déblocage repose sur une **table de faits typés** (ex. `onboarding_completed`, `quote_accepted`, `deposit_received`, `acceptance_signed`…) avec date, auteur et motif, en **ajout seul**. L'étape courante est **calculée** à partir des faits, jamais stockée ni saisie. En phase 12 l'admin pose certains faits à la main ; les phases 13-15 ajoutent des producteurs automatiques des mêmes faits (signature, paiement) sans changer le modèle. `onboarding_completed` est posé automatiquement par le système.
- **D-09:** Retour arrière par **fait correctif journalisé** (avec motif) : l'étape courante est recalculée, l'historique est conservé, rien n'est supprimé ni modifié.

### Projets (ADM-01, base de PORTAL-03)
- **D-10:** **Modèle multi-projets** : table `sv_projects` rattachée au client (offre, titre, dates). La conversion crée le premier. Le portail affiche le projet actif ; un sélecteur n'apparaît que s'il y en a plusieurs.

### Onboarding (PORTAL-02)
- **D-11:** Parcours « **confirmer + compléter** » : le client vérifie les données société pré-remplies depuis `sv_clients.company` (SIRET, raison sociale, adresse, forme juridique), puis ajoute : **signataire** (nom, fonction), **contact projet**, **adresse de facturation** si différente, **TVA** (numéro ou non assujetti), **site/réseaux existants**, **objectif du projet**. Sauvegarde au fil de l'eau.
- **D-12:** La **frise est visible dès la première connexion** ; l'étape 1 reste en cours tant que les données exigées pour les documents (signataire, TVA, adresse de facturation) ne sont pas complètes. L'onboarding n'est pas un mur : il ne masque pas le reste du portail.
- **D-13:** Les données d'onboarding sont stockées de façon structurée (réutilisées par les modèles de documents de la phase 13), non en texte libre.

### Fichiers et liens (PORTAL-05)
- **D-14:** **Client et admin** déposent. Bucket Supabase **privé**, dépôt direct par URL signée, **25 Mo maximum**, liste blanche de types (PDF, images, Office, zip, logos vectoriels), téléchargement par **lien signé de quelques minutes**. Chaque fichier est rattaché au projet et indique qui l'a déposé. Le bucket vit sur le projet Supabase partagé avec Gecko : préfixer le nom (`sv-…`) et ne jamais toucher aux politiques `storage.objects` de Gecko.
- **D-15:** Les **liens utiles** sont saisis par l'**admin** (titre + URL, par projet) ; le client les consulte seulement.

### Accord de présentation du projet (PORTAL-06)
- **D-16:** **Interrupteur dans le projet**, case explicite non précochée affichant le **texte exact** accepté. On conserve date, version du texte et utilisateur. Révocable à tout moment ; chaque changement est une **ligne en ajout seul**, l'état courant se déduit de la dernière ligne. Une seule portée (portfolio, réseaux, cas client) — pas de choix par usage. Le texte est à faire relire (blocker juridique existant).

### Moteur de mails (MAIL-01, MAIL-02)
- **D-17:** **Règles en code** (table typée : événement → modèle, délai, destinataire), versionnée et testée avec le dépôt. **Aucun éditeur de règles** dans l'admin. Une table `sv_mail_outbox` journalise chaque envoi avec une **clé d'unicité (événement + destinataire)** pour garantir l'absence de doublon.
- **D-18:** **Envoi immédiat** pour les événements de la phase 12 ; la colonne `send_after` existe dès maintenant et un **traitement quotidien (cron)** enverra les mails dus. Les relances elles-mêmes sont la phase 16. Plan Vercel Hobby/Pro toujours à confirmer (blocker STATE.md) : ne pas supposer une fréquence de cron plus fine que quotidienne.
- **D-19:** Événements couverts en phase 12 : **client invité → le client** (l'invitation actuelle passe dans le moteur et son journal), **changement d'étape → le client** (ce qui est attendu de lui), **onboarding terminé → l'admin**. Les e-mails vers un prospect sur changement de statut du lead sont **hors phase 12** (e-mail marketing soumis au consentement et à la désinscription, phase 16).

### Vue admin des projets (ADM-01)
- **D-20:** **Tableau triable + fiche projet**. Colonnes : client, offre, étape, qui attend, depuis combien de jours. Filtres par étape et par blocage. La fiche projet sert à poser les faits, voir fichiers et liens. Cohérent avec la liste des leads (phase 11).
- **D-21:** Un **blocage** est l'un de : **attend le client** (onboarding incomplet, fichier demandé non fourni…), **attend l'admin** (fait à poser, devis à émettre…), **projet dormant** (aucune activité — fait, fichier, connexion — depuis 14 jours, tous camps confondus). Le seuil de 14 jours est un défaut modifiable par constante.

### Hérité des phases précédentes (rappel)
- **D-22:** Portail et admin en **français uniquement**, `noindex`, hors sitemap/`llms.txt`, sans cinéma/curseur/GSAP. RLS dans la même migration que chaque table ; `service_role` uniquement dans des modules `server-only` ; vues en `security_invoker` ; tests RLS sur branche Supabase dédiée (client A vs B, anonyme, utilisateur Gecko) ; rôles en tables, jamais en métadonnées. Prix autorisés dans portail/admin/modèles, jamais sur le public. Client de test permanent « Test E2E Sèvalys » (PROJECT.md) à réutiliser pour les tests de bout en bout, sans le supprimer.

### Claude's Discretion
- Structure exacte des tables et colonnes, noms des faits et de leur enum, découpage des plans.
- Libellés et textes de la frise, des e-mails et de l'onboarding (en français, sans prix).
- Liste exacte des types de fichiers autorisés et durée du lien signé.
- Disposition de la fiche projet et du portail (tokens du design system, sobre back-office).
- Détection technique de l'« activité » pour le projet dormant.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & requirements
- `.planning/ROADMAP.md` § Phase 12 — objectif et 5 critères de succès
- `.planning/REQUIREMENTS.md` — PORTAL-01 à PORTAL-06, MAIL-01/02, ADM-01 ; DOC-01 à DOC-04 et SIGN/PAY (producteurs de faits futurs)
- `.planning/PROJECT.md` — cadrage v2.0, politique « aucun prix », « Permanent test fixtures »
- `.planning/STATE.md` — blockers : plan Vercel (crons), relecture juridique, politiques `gecko_*`

### Phases précédentes
- `.planning/phases/10-foundation-auth-isolation/10-CONTEXT.md` — rôles en tables, invitation par SIRET, login par code, coquilles portail/admin
- `.planning/phases/11-lead-attribution-pipeline-consent/11-CONTEXT.md` — modèle `sv_leads`, statuts, liste admin, journal immuable

### Recherche v2.0
- `.planning/research/SUMMARY.md`, `ARCHITECTURE.md`, `PITFALLS.md`, `STACK.md` — frise calculée depuis des faits, outbox idempotente, stockage privé, fuites RLS

### Code existant
- `supabase/migrations/20261002000000_sv_foundation.sql` — `sv_clients` (SIRET obligatoire, `company` jsonb), `sv_client_members`, helpers RLS
- `supabase/migrations/20261003000000_sv_leads_core.sql` — `sv_leads` (`converted_client_id`, statuts), `sv_lead_events`
- `src/lib/server/clients/invite.ts`, `siret.ts`, `status.ts` — orchestration d'invitation à réutiliser pour la conversion
- `src/lib/server/mail/inviteEmail.ts`, `loginCodeEmail.ts`, `fromHeader.ts` — e-mails existants à faire passer par le moteur
- `src/lib/server/leads/admin.ts`, `src/app/admin/leads/`, `src/app/admin/actions.ts` — liste/fiche des leads, patron des actions admin
- `src/app/espace-client/`, `src/app/admin/layout.tsx`, `src/lib/server/auth/dal.ts` — coquilles et accès aux données
- `src/lib/privateRoutes.ts` — routes privées, à garder cohérent avec le proxy

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Flux d'invitation (`invite.ts`, `siret.ts`, `inviteEmail.ts`) : base de la conversion, à appeler depuis une action de lead plutôt qu'à dupliquer.
- Fiche lead `/admin/leads/[id]` et ses actions : emplacement du bouton « Convertir en client ».
- Coquilles `/espace-client` (navigation squelette Projet, Documents, Paiements désactivés « bientôt ») : l'onglet Projet s'active ici.
- Suite RLS sur branche Supabase (phases 10-11) : à étendre aux nouvelles tables `sv_*`.

### Established Patterns
- Migrations dans `supabase/migrations/`, RLS activée dans le même fichier, tables nommées `sv_*`.
- Tests Vitest colocalisés ; gardes qui encodent la politique (aucun prix, imports server-only).
- Actions serveur admin (`actions.ts`) avec tests, `service_role` confiné aux modules `server-only`.

### Integration Points
- Fiche lead → action de conversion → `sv_clients` + membre invité + `sv_projects` + moteur de mails.
- `/espace-client` : frise, onboarding, fichiers, liens, accord de présentation.
- `/admin` : nouvelle page liste projets + fiche projet.
- Bucket Storage privé `sv-…` sur le projet Supabase partagé ; cron quotidien pour l'outbox (selon plan Vercel).

</code_context>

<specifics>
## Specific Ideas

- La frise et ses 6 étapes doivent rester lisibles par un patron de PME : l'étape en cours, ce qui est attendu de lui et de qui on attend quelque chose.
- Aucun fait de déblocage n'est « avancer l'étape » : l'étape se déduit toujours des faits.

</specifics>

<deferred>
## Deferred Ideas

- Modèles d'étapes propres à chaque offre (9 offres) — après la phase 12, quand les premiers projets réels auront révélé les différences.
- E-mail vers le prospect sur changement de statut du lead — phase 16 (consentement, désinscription, flux marketing séparé).
- Éditeur de règles de mail dans l'admin — non retenu ; règles en code.
- Ajout d'un membre client par le client lui-même — déjà différé en phase 10.
- Accord de présentation par usage (site, réseaux, cas d'étude) — non retenu ; une seule portée.
- « Fichier demandé non fourni » comme cas de blocage « attend le client » (exemple de D-21) — aucune demande de fichier n'est modélisée en phase 12 ; à reconsidérer avec une fonction de demande de documents.

</deferred>

---

*Phase: 12-Conversion, projects & step engine*
*Context gathered: 2026-10-02*
