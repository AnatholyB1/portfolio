# Phase 16: Mailing automation completion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-06
**Phase:** 16-Mailing automation completion
**Areas discussed:** Relance document non signé, Demande d'avis sans le lien, Rebonds/plaintes/suppression, Flux marketing et désinscription

---

## Relance document non signé

| Option | Description | Selected |
|--------|-------------|----------|
| J+3, J+7, alerte admin J+14 | Même cadence que l'acompte (phase 15 D-17) | ✓ |
| J+2, J+5, J+10, alerte admin J+14 | Plus insistant | |
| Une seule relance J+5, alerte admin J+10 | Discret | |

| Option | Description | Selected |
|--------|-------------|----------|
| Membres du client ; stop signé/refusé/remplacé | Suspension possible par l'admin | ✓ |
| Idem sans suspension admin | Plus simple | |
| Membres du client + copie à l'admin | Plus de bruit | |

| Option | Description | Selected |
|--------|-------------|----------|
| Étendre le balayage quotidien existant | Même cron, idempotence par clé | ✓ |
| Planifier à l'émission via send_after | Risque de relances fantômes | |

**User's choice:** Recommended options for all three.

---

## Demande d'avis sans le lien

| Option | Description | Selected |
|--------|-------------|----------|
| Règle + modèle prêts, envoi activé en phase 18 | Drapeau, lien factice en test | ✓ |
| Envoyer dès maintenant vers Google Business | Avis non vérifié | |
| Reporter toute la demande en phase 18 | MAIL-03 partiel | |

| Option | Description | Selected |
|--------|-------------|----------|
| J+7 après le PV, relance J+21, puis stop | Deux mails max | ✓ |
| J+3, J+14, J+30 | Trois mails | |
| J+14, aucune relance | Un seul mail | |

**User's choice:** Recommended options for both.

---

## Rebonds, plaintes et suppression

| Option | Description | Selected |
|--------|-------------|----------|
| Plainte : marketing ; rebond définitif : tout | Transactionnel préservé après une plainte | ✓ |
| Tout bloquer pour plainte et rebond | Prudent mais coupe factures et codes | |
| Marketing uniquement | Risque de réputation | |

| Option | Description | Selected |
|--------|-------------|----------|
| Vue admin minimale + réactivation journalisée | Alerte, motif, ajout seul | ✓ |
| Lecture seule | Correction en base | |
| Aucune vue, alerte seulement | Peu auditable | |

| Option | Description | Selected |
|--------|-------------|----------|
| Webhook Resend signé (Svix), idempotent | Patron Stripe | ✓ |
| Interrogation de l'API par le cron | Délai d'un jour | |

**User's choice:** Recommended options for all three.

---

## Flux marketing et désinscription

| Option | Description | Selected |
|--------|-------------|----------|
| Aucun envoi réel, infrastructure + classe de flux | Modèle d'exemple testé | ✓ |
| Suivi automatique du prospect | Base légale à définir | |
| Les deux | Périmètre élargi | |

| Option | Description | Selected |
|--------|-------------|----------|
| Lien signé + page publique + List-Unsubscribe one-click | Exigé Gmail/Yahoo | ✓ |
| Lien signé + page seulement | Risque de délivrabilité | |

| Option | Description | Selected |
|--------|-------------|----------|
| Classe de message en code + expéditeur distinct | Même domaine | ✓ |
| Sous-domaine d'envoi marketing dédié | SPF/DKIM/DMARC en plus | |

**User's choice:** Recommended options for all three.

---

## Claude's Discretion

- Structure des tables, format du jeton de désinscription, libellés, expéditeur marketing, drapeau de la demande d'avis, événements Resend ignorés, emplacement des vues admin.

## Deferred Ideas

- Suivi automatique du prospect (phase ultérieure, base légale requise)
- Sous-domaine d'envoi marketing dédié
- Demande d'avis vers Google Business avant le lien unique (écarté)
- Réinscription en libre-service (écartée)
- Éditeur de règles de mail dans l'admin (non retenu)
