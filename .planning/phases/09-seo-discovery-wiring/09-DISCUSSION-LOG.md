# Phase 9: SEO & Discovery Wiring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-01
**Phase:** 9-SEO & Discovery Wiring
**Areas discussed:** Service schema.org placement, llms.txt rewrite scope, SEO strategy doc update, Link audit method & GSC submission

---

## Service schema.org placement

| Option | Description | Selected |
|--------|-------------|----------|
| Global only | OfferCatalog with 9 Service objects in root layout.tsx @graph; one source of truth | ✓ |
| Global + per-page duplicate | Also emit Service JSON-LD on each /services/[slug] page | |

**User's choice:** Global only
**Notes:** Matches ROADMAP's literal wording.

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse existing name/tagline | Pull from translations.fr.services.pages.items[i] | ✓ |
| Write new schema-specific copy | Separate SEO-optimized descriptions | |

**User's choice:** Reuse existing name/tagline

---

## llms.txt rewrite scope

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal fix | Fix "tarifs" wording, add 9 service + /simulateur links | ✓ |
| Minimal fix + Différenciation section | Also add SEO doc §6 differentiation section | |

**User's choice:** Minimal fix

| Option | Description | Selected |
|--------|-------------|----------|
| List individually | One link per service plus /simulateur | ✓ |
| Single grouped link | Link only /services index and /simulateur | |

**User's choice:** List individually

---

## SEO strategy doc update

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, annotate in place | "Superseded by §9" notes, keep original text | ✓ |
| Yes, rewrite the stale points | Rewrite passages to match no-price policy | |
| No, leave the doc alone | §9 addendum already documents reversal | |

**User's choice:** Yes, annotate in place

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, annotate those too | Also cover §1 price list and §3d cost query | ✓ |
| No, only the 3 explicit conflicts | §2 lacune #4, §3a, §5 only | |

**User's choice:** Yes, annotate those too

---

## Link audit method & GSC submission

| Option | Description | Selected |
|--------|-------------|----------|
| Automated test | Vitest regression guard scanning internal hrefs/anchors | ✓ |
| One-off audit script | Throwaway script, results in a doc | |
| Manual browser click-through | Human-verify checkpoint | |

**User's choice:** Automated test

| Option | Description | Selected |
|--------|-------------|----------|
| Out of scope | Post-deploy manual step | |
| Include as a manual checkpoint | Submit in GSC UI after deploy | |
| Include, via MCP | Re-auth gcloud write scope, call submit_sitemap | ✓ |

**User's choice:** Include, via MCP
**Notes:** Deviated from the recommended option; user wants submission automated through the gsc MCP tool.

| Option | Description | Selected |
|--------|-------------|----------|
| Final step after deploy | Human-gated: confirm sitemap is live, re-auth, submit | ✓ |
| Prepare now, submit later | Document a runbook but don't execute | |

**User's choice:** Final step after deploy

---

## Claude's Discretion

- Service object shape beyond name/description/url; sitemap lastModified/changeFrequency/priority values; wording of llms.txt labels and doc annotations; link-audit scan mechanics.

## Deferred Ideas

- llms.txt "Différenciation" section (SEO doc §6)
- Per-page Service JSON-LD on /services/[slug]
