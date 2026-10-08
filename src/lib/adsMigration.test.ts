import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NONCONFORMITY_CODES } from '@/lib/attribution/utm';

const NAME = '20261011000000_sv_ads_conversions.sql';
const FILE = new URL(`../../supabase/migrations/${NAME}`, import.meta.url);

const raw = readFileSync(FILE, 'utf8');

function stripComments(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

const sql = stripComments(raw);

function quoted(list: string): string[] {
  return [...list.matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/** Body of one function, from its create statement to the next create function or end of file. */
function fnBody(name: string): string {
  const starts = [...sql.matchAll(/create\s+or\s+replace\s+function\s+([\w.]+)\s*\(/gi)];
  const i = starts.findIndex((m) => m[1] === name);
  expect(i).toBeGreaterThanOrEqual(0);
  const from = starts[i].index ?? 0;
  const to = i + 1 < starts.length ? (starts[i + 1].index ?? sql.length) : sql.length;
  return sql.slice(from, to);
}

describe('phase 19 ads migration: UTM flag storage and capture', () => {
  it('sorts after the reviews migration and has no transaction statements', () => {
    const files = readdirSync(new URL('../../supabase/migrations/', import.meta.url))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    expect(files.indexOf(NAME)).toBeGreaterThan(-1);
    expect(files.indexOf(NAME)).toBeGreaterThan(files.indexOf('20261010000000_sv_reviews.sql'));
    expect(sql).not.toMatch(/^\s*(begin|commit)\s*;/im);
  });

  it('does not touch the mail outbox nor sv_set_lead_status', () => {
    expect(sql).not.toMatch(/sv_mail_outbox/);
    expect(sql).not.toMatch(/create\s+or\s+replace\s+function\s+public\.sv_set_lead_status/i);
  });

  it('checks source_nonconformity against exactly NONCONFORMITY_CODES', () => {
    const m = sql.match(
      /add\s+constraint\s+sv_leads_source_nonconformity_check\s+check\s*\(([\s\S]*?)\)\s*;\s*\n\s*\nalter/i,
    );
    expect(m).not.toBeNull();
    const codes = quoted(m?.[1] ?? '');
    expect(new Set(codes)).toEqual(new Set(NONCONFORMITY_CODES));
    expect(codes).toHaveLength(NONCONFORMITY_CODES.length);
    expect(sql).toMatch(/sv_leads_source_raw_check[\s\S]*jsonb_typeof\(source_raw\)\s*=\s*'object'/i);
  });

  it('sv_ingest_lead keeps its signature and writes the flag columns', () => {
    const body = fnBody('public.sv_ingest_lead');
    expect(body).toMatch(/source_nonconformity/);
    expect(body).toMatch(/source_raw/);
    const codes = quoted((body.match(/where\s+e\.code\s+in\s*\(([\s\S]*?)\)\s*;/i) ?? [])[1] ?? '');
    expect(new Set(codes)).toEqual(new Set(NONCONFORMITY_CODES));
    const sig = 'text, text, text, text, text, text, jsonb, boolean, jsonb, jsonb, jsonb, text, jsonb';
    expect(sql).toContain(`revoke all on function public.sv_ingest_lead(${sig}) from public, anon, authenticated;`);
    expect(sql).toContain(`grant execute on function public.sv_ingest_lead(${sig}) to service_role;`);
  });

  it('protect_lead_source covers both new columns', () => {
    const body = fnBody('sv_private.protect_lead_source');
    expect(body).toContain('source_nonconformity is distinct from');
    expect(body).toContain('source_raw is distinct from');
  });

  it('sv_correct_lead_source clears the flag and journals it', () => {
    const body = fnBody('public.sv_correct_lead_source');
    const window = body.slice(body.indexOf("'sv.allow_source_change', 'on'"), body.indexOf("'sv.allow_source_change', 'off'"));
    expect(window).toMatch(/source_nonconformity\s*=\s*null/);
    expect(body).toContain("'cleared_nonconformity'");
    expect(body).toMatch(/'from',\s*jsonb_build_object/);
    expect(body).toMatch(/'to',\s*jsonb_build_object/);
  });

  it('recreates the admin view as security invoker', () => {
    expect(sql).toMatch(/drop\s+view\s+if\s+exists\s+public\.sv_leads_admin_v\s*;/i);
    expect(sql).toMatch(/create\s+view\s+public\.sv_leads_admin_v\s+with\s*\(\s*security_invoker\s*=\s*true\s*\)/i);
    expect(sql).toMatch(/revoke\s+all\s+on\s+public\.sv_leads_admin_v\s+from\s+anon\s*;/i);
    expect(sql).toMatch(/grant\s+select\s+on\s+public\.sv_leads_admin_v\s+to\s+authenticated\s*;/i);
  });
});
