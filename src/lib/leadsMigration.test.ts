import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONSENT_TEXT } from '@/lib/consent/text';
import { CONSENT_VERSION } from '@/lib/consent/constants';

const dir = new URL('../../supabase/migrations/', import.meta.url);

function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

const funnelRaw = readFileSync(new URL('20261003010000_sv_consent_funnel.sql', dir), 'utf8');
const purgeRaw = readFileSync(new URL('20261003020000_sv_leads_backfill_purge.sql', dir), 'utf8');
const funnel = stripComments(funnelRaw);
const purge = stripComments(purgeRaw);

function fnBody(sql: string, name: string): string {
  const start = sql.indexOf(`function ${name}`);
  expect(start).toBeGreaterThan(-1);
  const end = sql.indexOf('revoke all on function', start);
  return sql.slice(start, end);
}

describe('leads migrations static checks (LEAD-06, LEAD-08, LEAD-09)', () => {
  it('seeds the exact consent text of every locale (LEAD-09)', () => {
    expect(funnel).toContain(CONSENT_VERSION);
    for (const locale of ['fr', 'en', 'th'] as const) {
      expect(funnel).toContain(`$c$${CONSENT_TEXT[locale].heading}$c$`);
      expect(funnel).toContain(`$c$${CONSENT_TEXT[locale].body}$c$`);
    }
  });

  it('purge spares converted and signed leads and never touches accounting', () => {
    const body = fnBody(purge, 'sv_private.purge_leads');
    expect(body).toContain('converted_client_id is null');
    expect(body).toContain("status <> 'signed'");
    expect(body).toContain("interval '12 months'");
    expect(body).toContain('sv_erase_lead');
    expect(body).not.toMatch(/invoice|facture/i);
  });

  it('backfill is idempotent and re-runnable (LEAD-06)', () => {
    const body = fnBody(purge, 'sv_private.backfill_legacy_prospects');
    expect(body).toContain('on conflict (legacy_prospect_id) do nothing');
    expect(body).toContain('not exists');
    expect(purge).toContain('select sv_private.backfill_legacy_prospects()');
    expect(purge).not.toMatch(/drop\s+table/i);
  });

  it('swaps the cron job', () => {
    expect(purge).toContain("cron.unschedule(jobid) from cron.job where jobname = 'purge-prospects-12mo'");
    expect(purge).toContain("'sv-purge-leads'");
  });

  it('funnel never reads contacts nor derives stages from current status (LEAD-08)', () => {
    const start = funnel.indexOf('create or replace view public.sv_funnel_v');
    expect(start).toBeGreaterThan(-1);
    const view = funnel.slice(start);
    expect(view).toContain('security_invoker = true');
    expect(view).not.toContain('sv_lead_contacts');
    expect(view).not.toMatch(/status\s*=/);
  });
});
