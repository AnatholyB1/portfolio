import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const NAME = '20261010000000_sv_reviews.sql';
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

const TABLES = ['sv_review_links', 'sv_reviews', 'sv_review_moderation_log', 'sv_review_link_events'];
const PUBLIC_RPCS: [string, string][] = [
  ['public.sv_ensure_review_link', 'uuid, uuid, text'],
  ['public.sv_review_link_state', 'text'],
  ['public.sv_submit_review', 'text, int, text, text, text, text, text, boolean, text'],
  ['public.sv_public_reviews', 'int, int'],
  ['public.sv_moderate_review', 'uuid, text, text, text, uuid'],
  ['public.sv_reissue_review_link', 'uuid, uuid, text, uuid, text'],
];
const PRIVATE_FNS: [string, string][] = [
  ['sv_private.review_signed_at', 'uuid'],
  ['sv_private.review_link_guard', ''],
];
const REASONS = ['defamation_or_insult', 'third_party_personal_data', 'illegal_content', 'inauthentic'];

function esc(s: string): string {
  return s.replace(/[.()[\]]/g, '\\$&');
}

describe('phase 18 reviews migration static checks', () => {
  it('both outbox lists hold 19 values including the two new ones', () => {
    for (const col of ['event_type', 'template']) {
      const m = sql.match(new RegExp(`sv_mail_outbox_${col}_check check \\(${col} in \\(([^)]*)\\)`, 'i'));
      expect(m).not.toBeNull();
      const values = quoted((m as RegExpMatchArray)[1]);
      expect(values).toHaveLength(19);
      for (const v of ['review_request', 'mail_suppression_admin', 'review_published_admin', 'review_hidden']) {
        expect(values).toContain(v);
      }
    }
    expect(sql).not.toMatch(/drop\s+constraint\s+sv_mail_outbox/i);
    expect(sql).toMatch(/pg_get_constraintdef/i);
    expect(sql).toContain('%mail_suppression_admin%');
  });

  it('every new table has RLS and a revoke, with no write grant', () => {
    for (const t of TABLES) {
      expect(sql).toMatch(new RegExp(`alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`, 'i'));
      expect(sql).toMatch(
        new RegExp(`revoke\\s+all\\s+on\\s+public\\.${t}\\s+from\\s+anon\\s*,\\s*authenticated\\s*,\\s*service_role`, 'i'),
      );
    }
    expect((sql.match(/create\s+table\s+if\s+not\s+exists\s+public\.sv_/gi) ?? []).length).toBe(4);
    expect(sql).not.toMatch(/grant\s+(insert|update|delete)/i);
    for (const g of sql.matchAll(/grant\s+([^;]*?)\s+on\s+([^;]*?)\s+to\s+([^;]*);/gi)) {
      expect(g[1]).not.toMatch(/\b(insert|update|delete|all|truncate)\b/i);
    }
  });

  it('reviews, moderation log and link events are append-only (update, delete, truncate)', () => {
    for (const t of ['sv_reviews', 'sv_review_moderation_log', 'sv_review_link_events']) {
      expect(sql).toMatch(new RegExp(`before\\s+update\\s+or\\s+delete\\s+on\\s+public\\.${t}\\b[^;]*deny_mutation`, 'i'));
      expect(sql).toMatch(new RegExp(`before\\s+truncate\\s+on\\s+public\\.${t}\\b[^;]*deny_mutation`, 'i'));
    }
    expect(sql).toMatch(/before\s+delete\s+on\s+public\.sv_review_links\b[^;]*deny_mutation/i);
    expect(sql).toMatch(/before\s+truncate\s+on\s+public\.sv_review_links\b[^;]*deny_mutation/i);
    expect(sql).toMatch(/before\s+update\s+on\s+public\.sv_review_links\b[^;]*review_link_guard/i);
    expect(sql).toContain('sv_link_immutable');
  });

  it('the 6 public RPCs are security definer, pin search_path and are service_role only', () => {
    const publicFns = [...sql.matchAll(/create\s+or\s+replace\s+function\s+(public\.sv_\w+)\s*\(/gi)].map((m) => m[1]);
    expect(publicFns).toHaveLength(6);
    for (const [name, args] of PUBLIC_RPCS) {
      const body = fnBody(name);
      expect(body).toMatch(/security\s+definer/i);
      expect(body).toMatch(/set\s+search_path\s*=\s*''/i);
      const sig = esc(`${name}(${args})`);
      expect(sql).toMatch(new RegExp(`revoke\\s+all\\s+on\\s+function\\s+${sig}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, 'i'));
      expect(sql).toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+${sig}\\s+to\\s+service_role;`, 'i'));
    }
  });

  it('private helper and trigger function are revoked and granted to nobody', () => {
    for (const [name, args] of PRIVATE_FNS) {
      const body = fnBody(name);
      expect(body).toMatch(/set\s+search_path\s*=\s*''/i);
      const sig = esc(`${name}(${args})`);
      expect(sql).toMatch(new RegExp(`revoke\\s+all\\s+on\\s+function\\s+${sig}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, 'i'));
      expect(sql).not.toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+${sig}`, 'i'));
    }
    expect(sql).not.toMatch(/grant\s+execute[^;]*\bto\s+[^;]*\b(anon|authenticated)\b/i);
  });

  it('sv_submit_review locks the link row and skips pending review requests', () => {
    const body = fnBody('public.sv_submit_review');
    expect(body).toMatch(/for update/i);
    expect(body).toContain("'review_filed'");
    expect(body).toContain("'review_published_admin'");
    expect(body).toContain("'Europe/Paris'");
    expect(body).toContain('sv_consent_required');
  });

  it('the moderation reason list is exactly the four legal reasons', () => {
    const m = sql.match(/reason in \(([^)]*)\)/i);
    expect(m).not.toBeNull();
    expect(quoted((m as RegExpMatchArray)[1])).toEqual(REASONS);
    const fn = fnBody('public.sv_moderate_review').match(/p_reason not in \(([^)]*)\)/i);
    expect(fn).not.toBeNull();
    expect(quoted((fn as RegExpMatchArray)[1])).toEqual(REASONS);
    expect(sql).not.toMatch(/'(negative|opinion)'/i);
    expect(fnBody('public.sv_moderate_review')).toContain('sv_not_admin');
  });

  it('the reissue skips review requests and 60 day expiry is applied twice', () => {
    const body = fnBody('public.sv_reissue_review_link');
    expect(body).toContain("'link_reissued'");
    expect(body).toContain('sv_not_admin');
    expect((sql.match(/interval '60 days'/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('the link state returns a single generic invalid payload', () => {
    expect(fnBody('public.sv_review_link_state')).toMatch(/jsonb_build_object\('state',\s*'invalid'\)/);
  });

  it('public reads are paginated with clamped limit and offset', () => {
    const body = fnBody('public.sv_public_reviews');
    expect(body).toMatch(/greatest\(1, least\(coalesce\(p_limit, 50\), 100\)\)/);
    expect(body).toMatch(/greatest\(0, coalesce\(p_offset, 0\)\)/);
    expect(body).not.toMatch(/project_id|link_id|company_name_snapshot/);
  });

  it('has no begin or commit lines', () => {
    expect(sql).not.toMatch(/^\s*(begin|commit)\s*;/im);
  });
});
