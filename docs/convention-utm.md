# Convention UTM — Sèvalys

**Source de vérité** : `src/lib/attribution/utm.ts`. Ce document en est le reflet ; un test échoue s'il diverge du module. Les liens se génèrent dans `/admin/liens`.

## Objectif

Tous les liens publicitaires et de fiche Google portent des paramètres UTM homogènes, pour que l'entonnoir et la fiche de chaque lead attribuent correctement la source, le support et la campagne.

## Sources autorisées (`utm_source`)

| Valeur | Plateforme | Support par défaut |
|--------|------------|--------------------|
| `meta` | Meta Ads | `paid_social` |
| `google` | Google Ads | `cpc` |
| `gbp` | Fiche Google Business | `organic` |

Google Ads et Google Business sont deux sources distinctes.

## Supports autorisés (`utm_medium`)

| Valeur | Libellé |
|--------|---------|
| `paid_social` | Réseaux sociaux payants |
| `cpc` | Recherche payante |
| `organic` | Organique |
| `referral` | Site référent |

## Campagne (`utm_campaign`)

Format : `offre_cible_aaaamm`

- minuscules, sans accents ni espaces ;
- tirets `-` à l'intérieur d'un bloc, `_` entre les trois blocs ;
- le dernier bloc est l'année et le mois (`202611` pour novembre 2026) ;
- 60 caractères maximum.

Exemples :

- `agent-vocal_restaurants_202611`
- `fiche-google_local_202611` (lien du profil Google Business : source `gbp`, support `organic`)

## Variante de création (`utm_content`)

Optionnelle. Minuscules, chiffres et tirets uniquement. Exemples : `video-a`, `carrousel-1`.

## Mot-clé (`utm_term`)

Libre, réservé au mot-clé Google Ads. Jamais contrôlé.

## Alias reconnus

Les valeurs ci-dessous sont normalisées à l'enregistrement ; la valeur reçue est conservée pour audit.

### Sources

| Valeur reçue | Valeur enregistrée |
|--------------|--------------------|
| `facebook` | `meta` |
| `fb` | `meta` |
| `instagram` | `meta` |
| `ig` | `meta` |
| `facebook-ads` | `meta` |
| `meta_ads` | `meta` |
| `meta-ads` | `meta` |
| `adwords` | `google` |
| `googleads` | `google` |
| `google-ads` | `google` |
| `google_ads` | `google` |
| `gmb` | `gbp` |
| `google-business` | `gbp` |
| `googlebusiness` | `gbp` |
| `google_business` | `gbp` |
| `gmaps` | `gbp` |

### Supports

| Valeur reçue | Valeur enregistrée |
|--------------|--------------------|
| `paid` | `paid_social` |
| `paidsocial` | `paid_social` |
| `paid-social` | `paid_social` |
| `social_paid` | `paid_social` |
| `social-paid` | `paid_social` |
| `ppc` | `cpc` |
| `paid_search` | `cpc` |
| `paid-search` | `cpc` |
| `seo` | `organic` |
| `local` | `organic` |

## Lien hors convention

Un lien non conforme n'est jamais rejeté : le lead est conservé et signalé **Hors convention** avec la raison, dans l'entonnoir et sur la fiche du lead. La source se corrige depuis la fiche du lead ; la valeur brute reste conservée pour audit. Les campagnes et variantes ne sont jamais réécrites automatiquement.

Les six raisons possibles :

| Code | Libellé |
|------|---------|
| `source_missing` | Source (utm_source) absente alors que d'autres paramètres UTM sont présents. |
| `source_unknown` | Source inconnue : valeurs attendues meta, google ou gbp. |
| `medium_missing` | Support (utm_medium) absent alors que d'autres paramètres UTM sont présents. |
| `medium_unknown` | Support inconnu : valeurs attendues paid_social, cpc, organic ou referral. |
| `campaign_malformed` | Campagne mal formée : format attendu offre_cible_aaaamm (60 caractères maximum). |
| `content_malformed` | Variante de création mal formée : minuscules, chiffres et tirets uniquement. |

Une arrivée sans aucun paramètre `utm_*` (clic `gclid` seul, référent) n'est jamais signalée.
