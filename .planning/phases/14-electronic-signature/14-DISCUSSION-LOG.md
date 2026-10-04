# Phase 14: Electronic signature - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-04
**Phase:** 14-electronic-signature
**Areas discussed:** Parcours de signature, Scellement du PDF, Piste d'audit et export, PV de recette et déblocage

---

## Parcours de signature

| Question | Options (✓ = choix) |
|---|---|
| Documents signables | Devis+contrat+PV ✓ / Contrat+PV / Tous |
| Lecture avant signature | Page dédiée + PDF intégré ✓ / Téléchargement / Lecture obligatoire |
| Adresse du code | E-mail de connexion ✓ / E-mail signataire onboarding / Au choix |
| Échecs OTP | Nouveau code + plafond ✓ / Verrouillage admin / Sans plafond |

## Scellement du PDF

| Question | Options (✓ = choix) |
|---|---|
| Relation à l'original | Nouveau fichier original + certificat ✓ / Certificat séparé / Re-rendu |
| Contenu du certificat | Preuve complète lisible ✓ / Minimal / Avec user-agent et géoloc |
| Contre-signature vendeur | Non, émission vaut engagement ✓ / OTP admin / Mention pré-apposée |
| Stockage | Même bucket écriture unique ✓ / Plus pièce jointe e-mail |

## Piste d'audit et export

| Question | Options (✓ = choix) |
|---|---|
| Portée de la chaîne | Par document ✓ / Globale / Par projet |
| Événements | Parcours complet ✓ / Signature seule / Consentement+signature+échecs |
| Export | JSON vérifiable + contrôle ✓ / JSON+CSV / PDF |
| Ajout seul | Triggers + RPC ✓ / Hachage applicatif |

## PV de recette et déblocage

| Question | Options (✓ = choix) |
|---|---|
| Validation | Critère par critère puis signature ✓ / Une signature par livrable / Globale |
| Réserves/refus | Réserves signables, refus bloque ✓ / Toute réserve bloque / Hors PV |
| Faits | Producteur automatique ✓ / Asynchrone / Admin confirme |
| Après signature | Gelé, e-mails client+admin ✓ / Remplaçable |

## Claude's Discretion

Structure des tables, bibliothèque PDF, atomicité DB/stockage/fait, libellés, durée des liens signés.

## Deferred Ideas

SIGN-06, avenants, export CSV/PDF de la piste, contre-signature vendeur, RGPD de la piste.
