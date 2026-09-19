---
phase: quick-260919-wig
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/contact/route.ts
  - package.json
  - .env.example
  - src/components/sections/ContactSection.tsx
  - src/app/globals.css
autonomous: true
requirements: []
user_setup:
  - service: resend
    why: "Sending the contact form's confirmation email (to the prospect) and notification email (to contact@sevalys.com) requires a real Resend account and API key. Claude cannot create the account or generate a valid key."
    env_vars:
      - name: RESEND_API_KEY
        source: "Resend Dashboard -> API Keys -> Create API Key"
    dashboard_config:
      - task: "Verify the sevalys.com sending domain (Resend Dashboard -> Domains -> Add Domain -> add the DNS records Resend provides)"
        location: "Resend Dashboard -> Domains"
        note: "Until sevalys.com is verified, Resend will reject sends from 'contact@sevalys.com'. Use the sandbox sender onboarding@resend.dev for local testing until verification completes."
      - task: "Add RESEND_API_KEY to .env.local (local dev) and to the Vercel project's Environment Variables (production)"
        location: ".env.local + Vercel Dashboard -> Project -> Settings -> Environment Variables"

must_haves:
  truths:
    - "Submitting the contact form no longer calls the old n8n/Railway webhook (NEXT_PUBLIC_FORM_URL)"
    - "Submitting the form sends a confirmation ('accusé de réception') email to the prospect's own address"
    - "Submitting the form sends a notification email to contact@sevalys.com with the lead's name, email, project type, and message"
    - "Submitting with missing/invalid fields returns 400 and never calls Resend"
    - "The project-type dropdown's open list is legible against the site's dark theme (matches rest of design), not just the closed trigger"
    - "RESEND_API_KEY is documented as a required env var (placeholder only, no real key) rather than hardcoded"
  artifacts:
    - path: "src/app/api/contact/route.ts"
      provides: "POST handler validating the payload and sending both emails via Resend"
      exports: ["POST"]
    - path: ".env.example"
      provides: "RESEND_API_KEY placeholder with setup instructions"
      contains: "RESEND_API_KEY"
    - path: "src/components/sections/ContactSection.tsx"
      provides: "Form POSTs to internal /api/contact instead of NEXT_PUBLIC_FORM_URL"
    - path: "src/app/globals.css"
      provides: ".field select option has an explicit text color matching the dark theme"
      contains: "color: var(--ink)"
  key_links:
    - from: "src/components/sections/ContactSection.tsx"
      to: "src/app/api/contact/route.ts"
      via: "fetch('/api/contact', { method: 'POST' })"
      pattern: "fetch\\(['\"]/api/contact"
    - from: "src/app/api/contact/route.ts"
      to: "Resend API"
      via: "resend.emails.send() called twice (prospect + contact@sevalys.com)"
      pattern: "resend\\.emails\\.send"
    - from: "src/app/globals.css .field select option"
      to: "rendered dropdown list"
      via: "explicit color declaration overriding browser default"
      pattern: "\\.field select option[^}]*color:\\s*var\\(--ink\\)"
---

<objective>
Replace the n8n/Railway webhook behind the Sèvalys contact form with a Resend-backed Next.js Route Handler that sends both a confirmation email to the prospect and a lead-notification email to contact@sevalys.com, then restyle the project-type dropdown so its open list matches the site's dark design (it currently only styles the closed trigger).

Purpose: n8n is no longer used for this workflow; Resend is the new email provider. The form must keep working end-to-end (submit -> two emails sent) without any external webhook dependency, and the dropdown must look intentional rather than like a stock browser control.

Output: `src/app/api/contact/route.ts` (new Route Handler), updated `package.json`/`.env.example`, `ContactSection.tsx` posting to the new route, and a small CSS fix in `globals.css`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<interfaces>
<!-- Current client code this plan replaces (src/components/sections/ContactSection.tsx, lines 1-44) -->
```tsx
'use client';
import { useState, FormEvent } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const FORM_URL = process.env.NEXT_PUBLIC_FORM_URL || 'https://example.com/api/contact';

if (!process.env.NEXT_PUBLIC_FORM_URL && typeof window !== 'undefined') {
  console.warn('[ContactSection] NEXT_PUBLIC_FORM_URL is not set — using fallback URL');
}

export default function ContactSection() {
  // ...
  const [formData, setFormData] = useState({ name: '', email: '', projectType: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    const fullMessage = formData.projectType
      ? `[${formData.projectType}]\n\n${formData.message}`
      : formData.message;
    try {
      const response = await fetch(FORM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, message: fullMessage }),
      });
      setStatus(response.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };
  // ... renders <select value={formData.projectType} ...> with f.type_o options
}
```

<!-- Existing Route Handler pattern to follow (src/app/api/crm/products/route.ts, full file) -->
```ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase.from('products').select('id, name, category, unit, price, stock_qty').gt('stock_qty', 0).order('category')
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ products: data })
}
```

<!-- Existing select styling to extend, NOT replace (src/app/globals.css, lines 348-356) -->
```css
.form { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--line); border-radius: 16px; padding: 8px; background: var(--bg-2); }
.field { padding: 14px 20px; border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 6px; }
.field:last-of-type { border-bottom: none; }
.field label { font-family: var(--font-mono), monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-faint); }
.field input, .field select, .field textarea { font-size: 16px; color: var(--ink); padding: 4px 0; width: 100%; background: transparent; border: none; outline: none; font-family: var(--font-body), sans-serif; }
.field textarea { min-height: 80px; resize: vertical; line-height: 1.5; }
.field select { appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--ink) 50%), linear-gradient(135deg, var(--ink) 50%, transparent 50%); background-position: calc(100% - 14px) center, calc(100% - 8px) center; background-size: 6px 6px; background-repeat: no-repeat; padding-right: 24px; cursor: pointer; }
.field select option { background: var(--bg); }
```

<!-- Design tokens available (src/app/globals.css, lines 1-17) -->
```css
:root {
  --bg: #0A0B0C; --bg-2: #111213; --bg-3: #16181a;
  --acid: #C4F542; --acid-soft: rgba(196,245,66,0.12);
  --ink: #ECEAE3; --ink-dim: #9A9690; --ink-faint: #5A5751;
  --line: #1F1F1F; --line-strong: #2a2a2a; --warm: #E07856;
}
```
</interfaces>

**Confirmed before planning (do not re-derive):**
- No Radix/Headless UI/other listbox library exists anywhere in `src/` — the native `<select>` + `appearance: none` + custom chevron IS the established pattern here (this is the only `<select>` in the codebase). Do not introduce a new dependency for this.
- `.field select` already has the custom chevron and matches the input/textarea typography — the trigger is already correctly styled. The gap is `.field select option`, which sets `background: var(--bg)` but no `color`, so the open dropdown list can render with default (often black) text against the dark background.
- `package.json` uses `npm` (only `package-lock.json` present — no pnpm/yarn lockfile).
- `.env`, `.env.local` are gitignored (`.env*` with `!.env.example` exception in `.gitignore`) — only `.env.example` is ever committed, so it is safe to edit.
- `contact@sevalys.com` is the agency's real published contact address (already shown in the site's "Contact" section copy), matching the sender/notification address required by this task.
- French copy tone reference from `src/lib/translations.ts` (fr strings): "On répond sous 24h ouvrées." / form success message "Reçu — réponse sous 24h." — reuse this tone in the confirmation email.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Resend-backed /api/contact Route Handler</name>
  <files>src/app/api/contact/route.ts, package.json, .env.example</files>
  <action>
Run `npm install resend` to add the official `resend` package as a dependency (already-known, official npm package published by Resend Inc — no additional legitimacy check needed for this well-established vendor SDK explicitly requested by the user).

Create `src/app/api/contact/route.ts` as a Next.js Route Handler exporting `async function POST(request: Request)`. Inside:
- Parse the JSON body and validate that `name`, `email`, `projectType`, and `message` are all non-empty strings and that `email` contains an `@`. On failure, return `NextResponse.json({ error: 'invalid_payload' }, { status: 400 })` immediately, before touching Resend.
- Import `Resend` from `resend` and instantiate it lazily inside the handler as `const resend = new Resend(process.env.RESEND_API_KEY)` (not at module top-level) so a missing key surfaces as a request-time 500, not a build-time crash.
- Write a small inline HTML-escape helper (replace `&`, `<`, `>`, `"`) and apply it to `name`, `projectType`, and `message` before interpolating them into either email's HTML body — the message field is untrusted free text from the public form and must not be able to inject markup into the agency's notification email (STRIDE Tampering).
- Send two emails via `resend.emails.send()`, awaited together with `Promise.all`:
  1. **To the prospect** (`to: email`) — `from: 'Sèvalys <contact@sevalys.com>'` — subject along the lines of "On a bien reçu votre message" — French body thanking them by name, echoing their project type, and repeating the site's existing promise "On répond sous 24h ouvrées" (match tone from `src/lib/translations.ts` fr copy).
  2. **To the agency** (`to: 'contact@sevalys.com'`) — `from: 'Sèvalys <contact@sevalys.com>'` — subject `` `Nouveau contact — ${projectType}` `` — body listing name, email, project type, and message (all escaped) so the agency can read the full lead.
- If either `resend.emails.send()` result has a truthy `error`, log it server-side (`console.error`) and return `NextResponse.json({ error: 'send_failed' }, { status: 502 })`. Otherwise return `NextResponse.json({ ok: true })`.

Add a new line to `.env.example` (French comment, matching the file's existing style) introducing `RESEND_API_KEY=` under a new `# ─── Resend (emails du formulaire de contact) ───` section: note that the key comes from the Resend dashboard, must be duplicated into `.env.local` and into Vercel's project environment variables, and that the `sevalys.com` sending domain must be verified in Resend (Dashboard -> Domains) before `contact@sevalys.com` can be used as a From address — until then, sends from that domain will be rejected; use the sandbox sender `onboarding@resend.dev` for local testing in the meantime. Do NOT invent or insert a real API key anywhere.
  </action>
  <verify>
    <automated>rtk npx tsc --noEmit</automated>
  </verify>
  <done>
`src/app/api/contact/route.ts` exists and exports `POST`; it returns 400 for missing/invalid fields without calling Resend; on valid input it calls `resend.emails.send()` twice (prospect + contact@sevalys.com) with escaped user input in the HTML bodies; `resend` is listed in `package.json` dependencies; `.env.example` documents `RESEND_API_KEY` with setup/domain-verification notes and no real key; `npx tsc --noEmit` reports no errors in the new file.
  </done>
</task>

<task type="auto">
  <name>Task 2: Point the contact form at /api/contact and fix the dropdown's open-list styling</name>
  <files>src/components/sections/ContactSection.tsx, src/app/globals.css</files>
  <action>
In `src/components/sections/ContactSection.tsx`:
- Remove the `FORM_URL` constant (`process.env.NEXT_PUBLIC_FORM_URL` fallback) and the `console.warn` block that references it — the n8n/Railway webhook is no longer used.
- In `handleSubmit`, remove the `fullMessage` string-concatenation (`[${projectType}]\n\n${message}`) — it is no longer needed since the new API route receives `projectType` and `message` as separate fields.
- Change the `fetch` call to `POST '/api/contact'` with JSON body `{ name: formData.name, email: formData.email, projectType: formData.projectType, message: formData.message }`. Keep the existing `setStatus(response.ok ? 'sent' : 'error')` logic and the `catch` block exactly as they are — only the URL and body change.

In `src/app/globals.css`, extend the existing `.field select option { background: var(--bg); }` rule to also set `color: var(--ink);` — this is the only change needed. The rule currently sets only `background`, so browsers fall back to a default (often black) text color for the open dropdown list, which clashes with the dark theme even though the closed trigger (`.field select`) is already correctly styled with the custom chevron. Do not touch `.field select`'s existing `appearance: none` / chevron background-image rules — they already match the site's design language and are out of scope for this fix. Do not introduce any new component or dependency for this — per the user's own preference for the simplest fix, and confirmed no Radix/Headless UI listbox pattern exists elsewhere in the codebase to reuse.
  </action>
  <verify>
    <automated>rtk npm run build</automated>
  </verify>
  <done>
`ContactSection.tsx` no longer references `NEXT_PUBLIC_FORM_URL` and its submit handler POSTs to `/api/contact` with `{ name, email, projectType, message }`; `.field select option` in `globals.css` includes `color: var(--ink)` alongside its existing `background: var(--bg)`; `npm run build` completes successfully. (Manual note for the human: after `npm run dev`, open the contact form's project-type dropdown and confirm the option list text is now legible against the dark background — this specific visual can't be asserted by a CLI command.)
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Browser -> `/api/contact` | Untrusted public input (name, email, projectType, free-text message) crosses into a server-side Route Handler |
| `/api/contact` -> Resend API | Server-side outbound call carrying user-supplied content into email bodies, authenticated with `RESEND_API_KEY` |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering | `src/app/api/contact/route.ts` (message/name/projectType interpolated into HTML email) | mitigate | HTML-escape `name`, `projectType`, `message` before interpolating into either email's HTML body |
| T-quick-02 | Information Disclosure | `RESEND_API_KEY` | mitigate | Key is read server-side only via `process.env.RESEND_API_KEY` inside the Route Handler; never prefixed `NEXT_PUBLIC_` or sent to the client |
| T-quick-03 | Denial of Service (endpoint spam / Resend quota abuse) | `/api/contact` (unauthenticated public endpoint) | accept | Low-traffic marketing site; rate limiting is out of scope for this quick task — acceptable given current traffic volume |
| T-quick-04 | Tampering (malformed request crashing the handler) | `/api/contact` | mitigate | Explicit field validation returns 400 before any Resend call |
| T-quick-SC | Tampering (supply chain) | `resend` npm package | accept | Official package published and maintained by Resend Inc, widely used, explicitly requested by the user for this task — no blocking legitimacy checkpoint required for this well-established vendor SDK |
</threat_model>

<verification>
- `npx tsc --noEmit` passes (no type errors in the new route or the modified component)
- `npm run build` completes successfully
- Manual smoke test (documented, not automatable without a real Resend key): after adding a real `RESEND_API_KEY` to `.env.local` and running `npm run dev`, submit the contact form and confirm (a) the prospect's inbox receives a confirmation email, (b) contact@sevalys.com receives a notification email with the submitted details, (c) the project-type dropdown's open list is legible against the dark background
</verification>

<success_criteria>
- Contact form submission no longer touches `NEXT_PUBLIC_FORM_URL` / the n8n webhook
- `/api/contact` validates input, sends both emails via Resend, and returns clear error codes on failure
- `.env.example` documents `RESEND_API_KEY` and the domain-verification requirement without a fabricated key
- The project-type dropdown's open list matches the site's dark visual language
</success_criteria>

<output>
Create `.planning/quick/260919-wig-n8n-resend-pour-le-formulaire-de-contact/260919-wig-SUMMARY.md` when done
</output>
