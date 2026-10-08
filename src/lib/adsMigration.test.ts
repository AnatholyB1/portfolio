import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONVERSION_RANKS, EVENT_NAMES, EVENT_NAMESPACE, JOURNAL_EVENT_NAMES } from '@/lib/ads/events';
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

describe('phase 19 ads migration: conversion journal', () => {
  const create = (sql.match(/create\s+table\s+if\s+not\s+exists\s+public\.sv_conversion_events\s*\(([\s\S]*?)\n\);/i) ?? [])[1] ?? '';

  it('limits event_name to JOURNAL_EVENT_NAMES, a subset of EVENT_NAMES', () => {
    const m = create.match(/event_name\s+text\s+not\s+null\s+check\s*\(\s*event_name\s+in\s*\(([\s\S]*?)\)\s*\)/i);
    expect(m).not.toBeNull();
    const names = quoted(m?.[1] ?? '');
    expect(new Set(names)).toEqual(new Set(JOURNAL_EVENT_NAMES));
    for (const n of names) expect(EVENT_NAMES as readonly string[]).toContain(n);
  });

  it('pairs ranks as CONVERSION_RANKS and keeps quote_sent / lead_lost unranked', () => {
    for (const [name, rank] of Object.entries(CONVERSION_RANKS)) {
      expect(create).toMatch(new RegExp(String.raw`event_name\s*=\s*'${name}'\s+and\s+rank\s*=\s*${rank}\b`));
    }
    expect(create).toMatch(/event_name\s+in\s*\(\s*'quote_sent'\s*,\s*'lead_lost'\s*\)\s+and\s+rank\s+is\s+null/);
    expect(create).toMatch(/value_cents\s+is\s+null\s+or\s+event_name\s*=\s*'deal_signed'/);
    expect(create).toMatch(/\(value_cents\s+is\s+null\)\s*=\s*\(currency\s+is\s+null\)/);
  });

  it('uses the namespace only in conversion_event_id', () => {
    expect(sql.split(EVENT_NAMESPACE)).toHaveLength(2);
    expect(fnBody('sv_private.conversion_event_id')).toContain(EVENT_NAMESPACE);
    expect(fnBody('sv_private.conversion_event_id')).toMatch(/lower\(p_lead_id::text\)\s*\|\|\s*':'\s*\|\|\s*p_name/);
  });

  it('is append-only: RLS on, admin read only, no write grant, deny triggers', () => {
    const t = 'sv_conversion_events';
    expect(sql).toMatch(new RegExp(String.raw`alter\s+table\s+public\.${t}\s+enable\s+row\s+level\s+security`, 'i'));
    expect(sql).toMatch(new RegExp(String.raw`revoke\s+all\s+on\s+public\.${t}\s+from\s+anon\s*,\s*authenticated\s*,\s*service_role`, 'i'));
    expect(sql).toMatch(new RegExp(String.raw`grant\s+select\s+on\s+public\.${t}\s+to\s+authenticated`, 'i'));
    expect(sql).toMatch(new RegExp(String.raw`grant\s+select\s+on\s+public\.${t}\s+to\s+service_role`, 'i'));
    expect(sql).not.toMatch(new RegExp(String.raw`grant[^;]*\b(insert|update|delete|all)\b[^;]*public\.${t}`, 'i'));
    expect(sql).toMatch(
      new RegExp(String.raw`create\s+policy\s+\w+\s+on\s+public\.${t}\s+for\s+select\s+to\s+authenticated\s+using\s*\(\s*\(\s*select\s+sv_private\.is_admin\(\)\s*\)\s*\)`, 'i'),
    );
    expect(sql).toMatch(/before\s+update\s+or\s+delete\s+on\s+public\.sv_conversion_events[\s\S]*?deny_mutation\(\)/i);
    expect(sql).toMatch(/before\s+truncate\s+on\s+public\.sv_conversion_events[\s\S]*?deny_mutation\(\)/i);
  });

  it('holds no personal data columns', () => {
    expect(create.length).toBeGreaterThan(0);
    expect(create).not.toMatch(/email|phone|telephone|nom|ip_hash|payload/i);
  });

  it('has unique event_id and a partial unique index excluding lead_lost', () => {
    expect(create).toMatch(/event_id\s+uuid\s+not\s+null\s+unique/i);
    expect(sql).toMatch(
      /create\s+unique\s+index[^;]*on\s+public\.sv_conversion_events\s*\(\s*lead_id\s*,\s*event_name\s*\)\s*where\s+event_name\s*<>\s*'lead_lost'/i,
    );
  });

  it('emit_conversions is a replay-safe security definer emitter with the quote rule', () => {
    const body = fnBody('sv_private.emit_conversions');
    expect(body).toMatch(/security\s+definer/i);
    expect(body).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(body).toMatch(/on\s+conflict\s+do\s+nothing/i);
    expect(body).toContain('sv_document_snapshots');
    expect(body).toContain('replaces_document_id');
    expect(body).toMatch(/'EUR'/);
    for (const k of ["'lead_created'", "'status_changed'", "'lost'"]) expect(body).toContain(k);
  });

  it('wires the trigger and locks both private functions', () => {
    expect(sql).toMatch(
      /after\s+insert\s+on\s+public\.sv_lead_events\s+for\s+each\s+row\s+execute\s+function\s+sv_private\.emit_conversions\(\)/i,
    );
    expect(sql).toContain('revoke all on function sv_private.emit_conversions() from public, anon, authenticated;');
    expect(sql).toContain('revoke all on function sv_private.conversion_event_id(uuid, text) from public, anon, authenticated;');
    expect(sql).not.toMatch(/grant\s+execute\s+on\s+function\s+sv_private\./i);
  });
});
