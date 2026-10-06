---
phase: 16
slug: mailing-automation-completion
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-06
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `16-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.11 |
| **Config file** | `vitest.config.*` (RLS : `vitest.rls.config.ts`) |
| **Quick run command** | `rtk vitest run src/lib/server/mail src/lib/server/reminders src/lib/server/resend` |
| **Full suite command** | `rtk vitest run` (RLS : `npm run test:rls`, branche dédiée uniquement) |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick run command
- **After every plan wave:** `rtk vitest run` + `rtk tsc`
- **Before `/gsd:verify-work`:** Full suite green + RLS on dedicated branch + preview webhook check
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists |
|--------|----------|-----------|-------------------|-------------|
| MAIL-03 | cadence pure d3/d7/d14, palier le plus élevé, arrêt | unit | `rtk vitest run src/lib/server/reminders/cadence.test.ts` | ❌ W0 |
| MAIL-03 | document non signé : 1 mail/palier/destinataire, 0 doublon, arrêt signé/remplacé/refusé/suspendu ; lectures paginées et fail-closed (1500 faits, garde de pages) | unit | `rtk vitest run src/lib/server/reminders/sweep.test.ts` | ❌ W0 |
| MAIL-03 | demande d'avis J+7/J+21 avec lien factice ; drapeau éteint = pas d'enfilage | unit | `rtk vitest run src/lib/server/mail/reminderEmails.test.ts src/lib/server/reminders/sweep.test.ts` | ❌ W0 |
| MAIL-04 | webhook Resend : signature valide/invalide/périmée, mappage Permanent/Transient/complained | unit | `rtk vitest run src/lib/server/resend/webhook.test.ts src/app/api/resend/webhook/route.test.ts` | ❌ W0 |
| MAIL-04 | garde `deliver()` : marketing bloqué, transactionnel passe sur plainte, rebond dur bloque tout, `skipped` | unit | `rtk vitest run src/lib/server/mail/outbox.test.ts` | étendre |
| MAIL-04 | jeton de désinscription HMAC | unit | `rtk vitest run src/lib/server/mail/unsubscribeToken.test.ts` | ❌ W0 |
| MAIL-04 | tout modèle marketing contient lien + en-têtes List-Unsubscribe | unit | `rtk vitest run src/lib/server/mail/marketingEmail.test.ts` | ❌ W0 |
| MAIL-04 | POST one-click désinscrit ; GET ne désinscrit pas | unit | `rtk vitest run src/app/api/unsubscribe/route.test.ts` | ❌ W0 |
| MAIL-04 | RLS tables suppression/événements/holds, ajout seul, unicité d'événement | RLS | `npm run test:rls` | ❌ W0 |
| MAIL-03/04 | parité SQL/TS des listes fermées | unit | `rtk vitest run src/lib/server/mail/paymentsMailParity.test.ts` | étendre |
| MAIL-04 | webhook joignable sans session, `/desinscription` noindex | unit + manuel | `rtk vitest run src/proxy.test.ts` | étendre |

---

## Wave 0 Requirements

- [ ] fichiers de test listés ci-dessus (❌ W0) ; helper de payload Svix signé pour le webhook
- [ ] aucun nouveau framework à installer

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Création du webhook dans le tableau de bord Resend et `RESEND_WEBHOOK_SECRET` dans Vercel (Production + Preview) | MAIL-04 | Action propriétaire hors dépôt | Créer le point d'accès, copier le secret, définir la variable |
| Webhook joignable en preview (jeton de contournement Vercel) | MAIL-04 | Dépend du déploiement | Envoyer un événement de test depuis Resend vers l'URL de preview |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
