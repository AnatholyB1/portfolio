import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Static lint of supabase/migrations/*.sql for the sv_* hardening rules
// (D-06 roles never from metadata, D-18 deny-by-default privileges + RLS).
// The Supabase project is shared with Ziko/Gecko where anon/authenticated get
// ALL privileges by default, so every sv_* object must revoke explicitly.

const MIGRATIONS_DIR = new URL('../../supabase/migrations/', import.meta.url);

function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

/** Returns the list of rule violations for one migration (comments stripped here). */
export function lintMigration(file: string, rawSql: string): string[] {
  const sql = stripComments(rawSql);
  const violations: string[] = [];

  // Rule 1: every sv_ table has RLS enabled + revoke all from anon, authenticated.
  const tableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(sv_\w+)/gi;
  for (const m of sql.matchAll(tableRe)) {
    const t = m[1];
    const rlsRe = new RegExp(
      `alter\\s+table\\s+(?:if\\s+exists\\s+)?public\\.${t}\\s+enable\\s+row\\s+level\\s+security`,
      'i',
    );
    if (!rlsRe.test(sql)) violations.push(`${file}: public.${t} lacks enable row level security`);
    const revokeRe = /revoke\s+all\s+on\s+(?:table\s+)?([^;]*?)\s+from\s+anon\s*,\s*authenticated/gi;
    let revoked = false;
    for (const r of sql.matchAll(revokeRe)) {
      if (new RegExp(`public\\.${t}\\b`, 'i').test(r[1])) revoked = true;
    }
    if (!revoked) violations.push(`${file}: public.${t} lacks revoke all ... from anon, authenticated`);
  }

  // Rule 2: every sv_private.* / public.sv_* function is revoked and pins search_path.
  const fnRe =
    /create\s+(?:or\s+replace\s+)?function\s+((?:sv_private\.\w+)|(?:public\.sv_\w+))\s*\(/gi;
  const fnMatches = [...sql.matchAll(fnRe)];
  for (let i = 0; i < fnMatches.length; i++) {
    const m = fnMatches[i];
    const name = m[1];
    const isPublic = name.toLowerCase().startsWith('public.');
    const start = m.index ?? 0;
    const end = i + 1 < fnMatches.length ? (fnMatches[i + 1].index ?? sql.length) : sql.length;
    const body = sql.slice(start, end);
    if (!/set\s+search_path\s*=\s*''/i.test(body)) {
      violations.push(`${file}: function ${name} lacks set search_path = ''`);
    }
    const esc = name.replace('.', '\\.');
    const revokeFnRe = new RegExp(
      `revoke\\s+all\\s+on\\s+function\\s+${esc}\\s*\\([^)]*\\)\\s+from\\s+public\\s*,\\s*anon${isPublic ? '\\s*,\\s*authenticated' : ''}`,
      'i',
    );
    if (!revokeFnRe.test(sql)) {
      violations.push(
        `${file}: function ${name} lacks revoke all on function from public, anon${isPublic ? ', authenticated' : ''}`,
      );
    }
  }

  // Rule 3: policies / sv_ objects never read user-editable metadata.
  const policyRe = /create\s+policy[\s\S]*?;/gi;
  for (const p of sql.matchAll(policyRe)) {
    if (/public\.sv_|sv_private/i.test(p[0]) && /user_metadata|app_metadata|raw_user_meta_data/i.test(p[0])) {
      violations.push(`${file}: sv_ policy references user_metadata/app_metadata`);
    }
  }
  for (const m of fnMatches) {
    const idx = m.index ?? 0;
    const chunk = sql.slice(idx, idx + 4000);
    const bodyEnd = chunk.search(/revoke\s+all|create\s+(?:or\s+replace\s+)?function/i);
    const body = bodyEnd > 0 ? chunk.slice(0, bodyEnd) : chunk;
    if (/user_metadata|app_metadata|raw_user_meta_data/i.test(body)) {
      violations.push(`${file}: function ${m[1]} references user_metadata/app_metadata`);
    }
  }

  // Rule 4: views in a file mentioning sv_ must be security_invoker.
  if (/sv_/i.test(sql)) {
    for (const v of sql.matchAll(/create\s+(?:or\s+replace\s+)?view[\s\S]*?;/gi)) {
      if (!/security_invoker/i.test(v[0])) violations.push(`${file}: view without security_invoker`);
    }
  }

  // Rule 5: no write grants on sv_ tables to anon/authenticated.
  for (const g of sql.matchAll(/grant\s+([^;]*?)\s+on\s+(?:table\s+)?([^;]*?)\s+to\s+([^;]*);/gi)) {
    const [, privs, targets, roles] = g;
    if (/\bpublic\.sv_/i.test(targets) && /\b(anon|authenticated)\b/i.test(roles)) {
      if (/\b(insert|update|delete|all|truncate)\b/i.test(privs)) {
        violations.push(`${file}: write grant on sv_ table to anon/authenticated`);
      }
    }
  }

  return violations;
}

function loadMigrations(): { file: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => ({ file, sql: readFileSync(new URL(file, MIGRATIONS_DIR), 'utf8') }));
}

describe('migration lint: sv_* hardening (FOUND-02, FOUND-03, D-06, D-18)', () => {
  const migrations = loadMigrations();

  it('every migration satisfies all sv_* rules (RLS, revoke, search_path, no user_metadata, no write grants)', () => {
    const all = migrations.flatMap((m) => lintMigration(m.file, m.sql));
    expect(all).toEqual([]);
  });

  it('no policy or function on sv_* reads user_metadata / app_metadata', () => {
    const bad = migrations.flatMap((m) =>
      lintMigration(m.file, m.sql).filter((v) => /user_metadata/.test(v)),
    );
    expect(bad).toEqual([]);
  });

  it('the rules are not vacuous: a non-compliant fixture is reported', () => {
    const fixture = `
      create table public.sv_demo (id uuid primary key);
      create or replace function public.sv_demo_fn() returns boolean language sql as $$ select true $$;
      create policy p on public.sv_demo for select using ((auth.jwt() -> 'user_metadata') is not null);
      grant insert on public.sv_demo to authenticated;
      create view public.sv_demo_v as select * from public.sv_demo;
    `;
    const v = lintMigration('fixture.sql', fixture);
    expect(v.some((x) => /lacks enable row level security/.test(x))).toBe(true);
    expect(v.some((x) => /lacks revoke all \.\.\. from anon, authenticated/.test(x))).toBe(true);
    expect(v.some((x) => /lacks set search_path/.test(x))).toBe(true);
    expect(v.some((x) => /user_metadata/.test(x))).toBe(true);
    expect(v.some((x) => /view without security_invoker/.test(x))).toBe(true);
    expect(v.some((x) => /write grant/.test(x))).toBe(true);
  });

  it('a compliant fixture passes', () => {
    const fixture = `
      create table if not exists public.sv_ok (id uuid primary key);
      alter table public.sv_ok enable row level security;
      revoke all on public.sv_ok from anon, authenticated;
      grant select on public.sv_ok to authenticated;
    `;
    expect(lintMigration('ok.sql', fixture)).toEqual([]);
  });

  it('finds at least 4 sv_ tables', () => {
    const tables = new Set<string>();
    for (const m of migrations) {
      for (const t of stripComments(m.sql).matchAll(
        /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(sv_\w+)/gi,
      )) {
        tables.add(t[1].toLowerCase());
      }
    }
    expect(tables.size).toBeGreaterThanOrEqual(4);
  });
});
