# Lot B - Auth et avis (états déconnectés) - audit navigateur v2.0

Date: 2026-10-14. Cible: https://sevalys.com. Lecture seule, rien soumis, aucun e-mail ni code envoyé.

## Méthode et limites (à lire d'abord)

- Le profil Chrome partagé est connecté en admin: `/connexion` y redirige vers `/admin`. Je n'ai pas déconnecté la session (elle est partagée avec l'autre agent).
- Contournement: `fetch(path, {credentials:'omit'})` donne le vrai HTML serveur déconnecté. Je l'ai rendu dans un iframe `srcdoc` de largeur exacte (360/390/768/1280/1440), scripts retirés (l'hydratation échoue dans srcdoc). Les mesures de mise en page, les contrastes calculés et le DOM sont donc réels. Clavier, focus réel, validation au submit et console ne sont pas vérifiables: marqués "non vérifié navigateur".
- Les redirections ont été vérifiées avec fetch sans cookies (statut final et URL).
- Captures: `shots/B/` (connexion-360, connexion-1280, confirm-notoken-360, avis-invalid-390, 404-auth-1280).

## Scores 6 piliers /24

| Pilier | /4 | Note |
|---|---|---|
| Copywriting | 3.5 | Wording cohérent, non trompeur. Le jeton absent de /auth/confirm dit "n'est plus valide". |
| Visuels | 3.5 | Hiérarchie claire, un seul bouton acide. Deux liens de contact sans affordance suffisante. |
| Couleur | 4 | `--ink-dim` 6.38:1 partout, erreur 6.24:1, bouton 16.49:1. |
| Typographie | 3.5 | Échelle 14/16/24 respectée. |
| Espacement | 3.5 | Bug champ/bouton corrigé. Liens de pied de carte à 19-22px de haut. |
| Expérience | 3 | Deux liens d'évitement dont un mort, titre de page /auth/confirm, 404 marketing. |
| **Total** | **21/24** | (10-UI-REVIEW: 15/24) |

## Vérification des thèmes précédents

| Thème | Statut | Preuve |
|---|---|---|
| Champ et bouton collés (10-UI-REVIEW #1) | Corrigé | `form` en `display:flex; gap:16px`. 360px: input y308-352, bouton y384 (32px d'écart). |
| `--ink-faint` ~2.6:1 sur "Retour au site", labels, notes | Corrigé | Ces textes sont en `rgb(154,150,144)`, 6.38:1 sur la carte. `.pt-back` fait 44px de haut. |
| Bouton d'e-mail 1072px (admin) | Hors périmètre | Non vérifié (admin). |
| Confirm: bouton resté actif après erreur (D8) | Corrigé | Sans `token_hash`, `ConfirmForm.tsx:33` affiche l'état d'erreur directement, sans bouton "Me connecter". |
| OTP remonté pendant l'attente | Corrigé (code) | `key={attempt}` avec champ en lecture seule pendant `pending` (`LoginForm.tsx:143`, `OtpInput.tsx:91`). Non vérifié navigateur. |
| Avis: `id="pt-auth-title"` dupliqué, deux h1, focus perdu | Corrigé (code) | `ReviewThankYou.tsx:19` utilise `rv-heading` en h1 unique, avec focus sur le titre. Un seul h1 sur toutes les pages mesurées. |
| Avis: jeton limité par débit dit "n'est plus valide" | Corrigé | `page.tsx:50` a une vue "Trop de tentatives" distincte. |
| Overflow mobile 390px (artefact de capture de la 1re revue) | Confirmé inexistant | scrollWidth = viewport à 360, 390, 768, 1280, 1440 sur /connexion, /auth/confirm, /avis/[token]. |
| Skip link absent | Partiellement corrigé | Voir M1. |

## Mesures

- Overflow horizontal: aucun (sw = vw sur 5 viewports).
- Cartes: 328px à 360, 358px à 390, 440px à 768+. Le champ et le bouton font 44px de haut, `h1` unique, aucun id dupliqué.
- Champ e-mail (code): `type=email`, `autocomplete=email`, `inputmode=email`, `autocapitalize=off`, `spellcheck=false`, label lié par `for`. `aria-describedby` pointe vers la zone `aria-live`. Étape code (code): `inputmode=numeric`, `autocomplete=one-time-code`, `pattern`, `maxLength`.
- Métadonnées: `noindex,nofollow,nocache`, `lang=fr`, pas de canonique. Titre "Connexion · Sèvalys".
- Redirections déconnectées: `/admin`, `/admin/xyz`, `/espace-client`, `/espace-client/xyz` donnent `/connexion?next=%2F...` (200), avec le chemin d'origine conservé.
- Ancien `/avis/bidon` : "Ce lien n'est plus valide / Le lien a peut-être déjà été utilisé ou a expiré. Écrivez-nous à contact@sevalys.com et nous vous en renverrons un." Même texte pour inconnu, utilisé ou expiré (pas d'oracle). Statut HTTP 200 mais `noindex`. Wording non trompeur.
- `/auth/confirm` sans jeton: h1 "Confirmer la connexion", `role=alert` "Ce lien n'est plus valide.", lien "Demander un nouveau code" (44px). Pas de h1 dupliqué.
- 404 sous `/auth/xyz`: vraie 404 (`noindex`), page 404 publique avec nav marketing et footer.

## Findings

### MAJOR

**M1. Deux liens d'évitement sur /connexion et /auth/confirm, dont un cible un id inexistant.** Pages: /connexion, /auth/confirm, tous viewports. Preuve: DOM contient `<a class="skip-link" href="#main-content">` (global, `fixed`, `SkipLink.tsx:22`) et `<a class="pt-skip" href="#contenu">`. `#main-content` n'existe pas (id du main = `contenu`). Le premier Tab tombe sur un lien qui ne mène nulle part. Correctif: ne pas rendre le lien global sous `/connexion` et `/auth` (ou donner `id="main-content"` au main d'`AuthCard.tsx:16` et retirer `SkipLink` des layouts `connexion/layout.tsx` et `auth/layout.tsx`). À confirmer au clavier.

**M2. Lien e-mail non distinguable du texte sur /avis/[token] invalide.** Preuve: `contact@sevalys.com` calculé `text-decoration: none`, même couleur `rgb(154,150,144)` que le paragraphe (`.pt-helper`), contraste lien/texte 1:1 (WCAG 1.4.1). Hauteur 22px. Sur /connexion le même lien est souligné (`.pt-auth-notes a`). Même cause dans `ReviewForm`/`page.tsx:42,58`. Correctif: `.pt-helper a { text-decoration: underline; text-underline-offset: 2px; color: var(--ink); }` dans `portal.css:60-66`.

### MINOR

**m1. Titre de page /auth/confirm = "Connexion · Sèvalys"** (`auth/layout.tsx:10` titre générique). Ajouter `metadata.title = "Confirmer la connexion"` dans `auth/confirm/page.tsx`.

**m2. Lien de contact des notes sous la carte: 19px de haut** (`.pt-auth-notes a`, `portal.css:93`), sous 44px et sans marge de sécurité de 24px (WCAG 2.5.8 AAA, conforme AA). Ajouter `display:inline-block; padding-block:12px`.

**m3. /auth/confirm sans jeton dit "Ce lien n'est plus valide."** Une personne qui tape l'URL à la main reçoit le même message qu'un lien expiré. Acceptable (pas d'oracle), mais un libellé "Ce lien est incomplet ou a expiré" serait plus exact. Le CTA "Demander un nouveau code" est un lien stylé en bouton primaire, ce qui est correct.

**m4. 404 sous `/auth/*`, `/connexion/*`, `/avis/*/x`: page publique avec nav marketing et formulaire de cookies** (`not-found.tsx` racine). Aucune 404 privée dédiée. Incohérent avec l'espace privé noindex. Thème "pas de not-found privé" de SUMMARY: toujours présent. Seul `/avis/<jeton>` (jeton quelconque) ne rend pas de 404, par choix.

**m5. Le dialogue de consentement cookies est présent dans le DOM des pages privées** (`#consent-title`, `#consent-body`, zone `aria-live`). Non vérifié s'il s'ouvre sur /connexion; à confirmer car une modale devant un formulaire de connexion serait gênante.

**m6. HTTP 200 pour un lien d'avis invalide.** Choix défendable (`noindex`), mais une 410 serait plus propre pour les moniteurs. Aucun impact utilisateur.

## Audit code, non vérifié navigateur

Étape code OTP (`LoginForm.tsx:127-181`, `OtpInput.tsx`, `portal.css:187-236`):
- Un vrai input sous 8 cellules. `inputMode=numeric`, `one-time-code`, collage OK, soumission auto. Anneau de focus sur le wrapper (`:has(:focus-visible)`).
- `Renvoyer le code` en `aria-disabled` avec texte visible masqué `aria-hidden` et libellé SR stable. Bon. Annonce via `role=status` (région déjà montée: bon).
- Risque: cellules d'environ 29px de large à 360px (flex:1, gap 4, marge 12) sous 44px, mais la cible tactile est l'input plein champ, donc OK.
- Le compte à rebours met à jour le DOM toutes les 500 ms uniquement sur le texte `aria-hidden`: pas de bavardage SR. Bon.
- À vérifier avec un envoi réel: espacement vertical des 3 boutons de l'étape code (le `form` est en flex, devrait être résolu), mise au point initiale (`autoFocus`).

ReviewForm (`ReviewForm.tsx`, `ReviewRatingInput.tsx`, `reviewForm.css`):
- Points forts: `radiogroup` avec tabindex itinérant et flèches/Home/End, étoiles 44px, `role=alert` focalisé sur l'erreur, `aria-describedby` par champ, astérisque `aria-hidden` plus note texte, `fieldset/legend` pour l'affichage du nom, aperçu public du nom, case de consentement à 44px, lien politique 44px, carte à 640px avec `overflow-wrap:anywhere`.
- Compteur `n / 2000` non annoncé (seuils seulement via `role=status`): acceptable.
- Messages d'erreur de champ (`p.pt-error`) sans icône, contrairement à `LoginForm`. Incohérence mineure (le texte porte l'info, pas de dépendance à la couleur).
- Étoile vide: contour `--pt-border-strong` (#6f6b64) sur fond carte, environ 3:1: limite acceptable pour un composant non textuel.
- Le résumé `role=alert` est monté vide puis rempli: annoncé correctement dans ce cas (contenu injecté dans une région existante).
- `ReviewThankYou`: h1 `pt-display` (32px) focalisé, bouton Google identique pour toute note (conforme). `rel=noopener noreferrer` et mention "s'ouvre dans un nouvel onglet". Cas `googleUrl` null géré.
- `.rv-star:focus-visible` ok. Reflux à 360px non mesuré (ligne note + "n sur 5" en `flex`, 5x44 + 4x4 = 236px, tient dans 278px).

## Reste à vérifier avec session ou jeton

1. Clavier réel sur /connexion: ordre de Tab, effet du double lien d'évitement (M1), anneau de focus, Entrée.
2. Validation à vide et e-mail invalide (message, `aria-invalid`, annonce `aria-live`), sans envoyer.
3. Console sur les pages déconnectées (impossible ici: session admin partagée dans le navigateur).
4. Étape code OTP complète, minuterie de renvoi, remise à zéro après erreur.
5. Formulaire d'avis avec un vrai jeton: erreurs, mobile 360px, remerciement, focus.
6. Ouverture du dialogue cookies sur /connexion (m5).
7. 404 depuis une session connectée client et admin (hors parcours déconnecté).
