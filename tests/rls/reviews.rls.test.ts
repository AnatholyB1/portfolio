import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  anonClient,
  cleanup,
  dbQuery,
  ensureReviewLinkForTest,
  makeAdmin,
  makeDeliveredProject,
  makeProject,
  makeClient,
  makeUser,
  moderateReview,
  publicReviews,
  reissueReviewLink,
  reviewLinkState,
  submitReview,
  svc,
  type TestUser,
} from './helpers';

const TABLES = ['sv_review_links', 'sv_reviews', 'sv_review_moderation_log', 'sv_review_link_events'] as const;

let admin: TestUser;
let plain: TestUser;

/** Parse the JSON printed by `supabase db query` (a banner line may surround it). */
function dbRows(sql: string): Array<Record<string, any>> {
  const out = dbQuery(sql);
  const parsed = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
  if (!parsed.rows) throw new Error(`dbQuery failed: ${out}`);
  return parsed.rows;
}

/** Branch only (dbQuery refuses the production ref): backdate the effective acceptance_signed fact. */
function backdateAcceptance(projectId: string, days: number) {
  dbQuery(
    `do $$ begin alter table public.sv_project_facts disable trigger sv_project_facts_no_upd_del; update public.sv_project_facts set created_at = now() - interval '${days} days' where project_id = '${projectId}' and type = 'acceptance_signed'; alter table public.sv_project_facts enable trigger sv_project_facts_no_upd_del; end $$`,
  );
  const trig = dbRows(
    `select tgenabled from pg_trigger where tgrelid = 'public.sv_project_facts'::regclass and tgname = 'sv_project_facts_no_upd_del'`,
  );
  expect(trig).toEqual([{ tgenabled: 'O' }]);
}

async function publishedReview(): Promise<{ projectId: string; clientId: string; memberEmail: string; reviewId: string; linkId: string; token: string }> {
  const p = await makeDeliveredProject();
  const ens = await ensureReviewLinkForTest(p.projectId);
  expect(ens.error).toBeNull();
  const sub = await submitReview(ens.token);
  expect(sub.error).toBeNull();
  expect(sub.data.outcome).toBe('published');
  return { ...p, reviewId: sub.data.review_id, linkId: ens.linkId, token: ens.token };
}

let seeded = false;
/** Seed at least one row in every review table once, so the row-level deny triggers fire. */
async function seedAllTables() {
  if (seeded) return;
  seeded = true;
  const rv = await publishedReview();
  await moderateReview(rv.reviewId, 'hide', 'illegal_content', 'Contenu illicite signale', admin.id);
  const other = await makeDeliveredProject();
  await ensureReviewLinkForTest(other.projectId);
  await reissueReviewLink(other.projectId, admin.id);
}

async function outbox(type: string, key: string) {
  const { data, error } = await svc().from('sv_mail_outbox').select('*').eq('event_type', type).eq('dedupe_key', key);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, any>[];
}

beforeAll(async () => {
  admin = await makeUser('revAdmin');
  await makeAdmin(admin);
  plain = await makeUser('revPlain');
});

afterAll(async () => {
  await cleanup();
});

describe('phase 18 reviews (REV-01..04)', () => {
  describe('link lifecycle', () => {
    it('refuses a link on a project without acceptance_signed', async () => {
      const client = await makeClient(`RLS Avis ${randomUUID().slice(0, 8)}`);
      const projectId = await makeProject(client.id);
      const r = await ensureReviewLinkForTest(projectId);
      expect(r.error).toBeNull();
      expect(r.data.outcome).toBe('not_signed');
    });

    it('creates a link once, reuses it (J+21) and expires 60 days after the PV', async () => {
      const p = await makeDeliveredProject();
      const first = await ensureReviewLinkForTest(p.projectId);
      expect(first.data).toMatchObject({ outcome: 'created', link_id: first.linkId });
      const second = await ensureReviewLinkForTest(p.projectId);
      expect(second.data).toMatchObject({ outcome: 'existing', link_id: first.linkId });

      const rows = dbRows(
        `select (l.expires_at = f.created_at + interval '60 days') as exact from public.sv_review_links l join public.sv_project_facts f on f.project_id = l.project_id and f.type = 'acceptance_signed' where l.id = '${first.linkId}'`,
      );
      expect(rows).toEqual([{ exact: true }]);
    });

    it('reports expired (and creates nothing) when the PV is 61 days old', async () => {
      const p = await makeDeliveredProject();
      backdateAcceptance(p.projectId, 61);
      const r = await ensureReviewLinkForTest(p.projectId);
      expect(r.data.outcome).toBe('expired');
      const { data } = await svc().from('sv_review_links').select('id').eq('project_id', p.projectId);
      expect(data).toHaveLength(0);
    });

    it('still creates a link when the PV is 59 days old, with a future expiry', async () => {
      const p = await makeDeliveredProject();
      backdateAcceptance(p.projectId, 59);
      const r = await ensureReviewLinkForTest(p.projectId);
      expect(r.data.outcome).toBe('created');
      const rows = dbRows(`select (expires_at > now()) as future from public.sv_review_links where id = '${r.linkId}'`);
      expect(rows).toEqual([{ future: true }]);
    });

    it('returns the project title for a valid token and a bare invalid state otherwise', async () => {
      const p = await makeDeliveredProject();
      const r = await ensureReviewLinkForTest(p.projectId);
      const ok = await reviewLinkState(r.token);
      expect(ok.data.state).toBe('valid');
      expect(ok.data).toHaveProperty('project_title');
      const unknown = await reviewLinkState('not-a-real-token-' + randomUUID());
      expect(unknown.data).toEqual({ state: 'invalid' });
    });
  });

  describe('single use', () => {
    it('two concurrent submissions yield exactly one review', async () => {
      const p = await makeDeliveredProject();
      const r = await ensureReviewLinkForTest(p.projectId);
      const pending = await svc()
        .from('sv_mail_outbox')
        .insert({
          event_type: 'review_request',
          template: 'review_request',
          recipient_email: p.memberEmail,
          recipient_kind: 'client',
          dedupe_key: `review_request:rls:${randomUUID()}`,
          client_id: p.clientId,
          project_id: p.projectId,
        })
        .select('id')
        .single();
      expect(pending.error).toBeNull();

      const results = await Promise.all([submitReview(r.token), submitReview(r.token)]);
      const outcomes = results.map((x) => x.data?.outcome).sort();
      expect(results.map((x) => x.error)).toEqual([null, null]);
      expect(outcomes).toEqual(['link_invalid', 'published']);

      const reviews = await svc().from('sv_reviews').select('id').eq('project_id', p.projectId);
      expect(reviews.data).toHaveLength(1);
      const link = await svc().from('sv_review_links').select('used_at').eq('id', r.linkId).single();
      expect(link.data?.used_at).not.toBeNull();
      expect((await reviewLinkState(r.token)).data).toEqual({ state: 'invalid' });
      expect((await submitReview(r.token)).data.outcome).toBe('link_invalid');

      const req = await svc().from('sv_mail_outbox').select('status,last_error').eq('id', pending.data!.id).single();
      expect(req.data).toMatchObject({ status: 'skipped', last_error: 'review_filed' });

      const reviewId = reviews.data![0].id;
      expect(await outbox('review_published_admin', `review_published_admin:${reviewId}`)).toHaveLength(1);
      expect((await ensureReviewLinkForTest(p.projectId)).data.outcome).toBe('reviewed');
    });

    it('rejects a missing consent and keeps the link valid', async () => {
      const p = await makeDeliveredProject();
      const r = await ensureReviewLinkForTest(p.projectId);
      const res = await submitReview(r.token, { consent: false });
      expect(res.error?.message ?? '').toMatch(/sv_consent_required/);
      expect((await reviewLinkState(r.token)).data.state).toBe('valid');
    });

    it.each([
      ['angle bracket', 'Un avis <b>trop</b> malicieux pour passer.'],
      ['19 characters', '1234567890123456789'],
    ])('rejects a %s body and keeps the link valid', async (_label, body) => {
      const p = await makeDeliveredProject();
      const r = await ensureReviewLinkForTest(p.projectId);
      const res = await submitReview(r.token, { body });
      expect(res.error).not.toBeNull();
      expect((await reviewLinkState(r.token)).data.state).toBe('valid');
    });
  });

  describe('reissue', () => {
    it('invalidates the old link, issues a new one and journals it', async () => {
      const p = await makeDeliveredProject();
      const old = await ensureReviewLinkForTest(p.projectId);
      const re = await reissueReviewLink(p.projectId, admin.id, 'Lien perdu par le client');
      expect(re.error).toBeNull();
      expect(re.data).toMatchObject({ outcome: 'reissued', link_id: re.linkId });
      expect(re.linkId).not.toBe(old.linkId);

      expect((await reviewLinkState(old.token)).data).toEqual({ state: 'invalid' });
      expect((await submitReview(old.token)).data.outcome).toBe('link_invalid');
      expect((await reviewLinkState(re.token)).data.state).toBe('valid');

      const ev = await svc().from('sv_review_link_events').select('*').eq('project_id', p.projectId);
      expect(ev.data).toHaveLength(1);
      expect(ev.data![0]).toMatchObject({
        actor_id: admin.id,
        detail: 'Lien perdu par le client',
        old_link_id: old.linkId,
        new_link_id: re.linkId,
      });
    });

    it('refuses a non-admin actor', async () => {
      const p = await makeDeliveredProject();
      await ensureReviewLinkForTest(p.projectId);
      const re = await reissueReviewLink(p.projectId, plain.id);
      expect(re.error?.message ?? '').toMatch(/sv_not_admin/);
    });
  });

  describe('isolation', () => {
    it.each(TABLES)('anon and non-admin read nothing on %s, admin can read', async (t) => {
      const a = await anonClient().from(t).select('*');
      expect(a.error !== null || (a.data ?? []).length === 0, `anon ${t}`).toBe(true);
      const u = await plain.client.from(t).select('*');
      expect((u.data ?? []).length, `plain ${t}`).toBe(0);
      const ad = await admin.client.from(t).select('*').limit(5);
      expect(ad.error, `admin ${t}`).toBeNull();
    });

    const calls: [string, Record<string, unknown>][] = [
      ['sv_submit_review', { p_token_hash: 'a'.repeat(64), p_rating: 5, p_title: null, p_body: 'x'.repeat(30), p_display_mode: 'company_only', p_first_name: null, p_last_initial: null, p_consent: true, p_admin_email: 'a@b.test' }],
      ['sv_public_reviews', { p_limit: 10, p_offset: 0 }],
      ['sv_review_link_state', { p_token_hash: 'a'.repeat(64) }],
      ['sv_ensure_review_link', { p_project_id: randomUUID(), p_link_id: randomUUID(), p_token_hash: 'a'.repeat(64) }],
      ['sv_moderate_review', { p_review_id: randomUUID(), p_action: 'unhide', p_reason: null, p_detail: 'abc', p_actor_id: randomUUID() }],
      ['sv_reissue_review_link', { p_project_id: randomUUID(), p_link_id: randomUUID(), p_token_hash: 'a'.repeat(64), p_actor_id: randomUUID(), p_detail: 'abc' }],
    ];
    it.each(calls)('anon and authenticated cannot execute %s', async (fn, args) => {
      for (const c of [anonClient(), plain.client, admin.client]) {
        const r = await c.rpc(fn, args);
        expect(r.error, fn).not.toBeNull();
        expect(r.error?.message ?? '', fn).toMatch(/permission denied|not authorized|denied/i);
      }
    });

    it('the private helper is not reachable through PostgREST, even for service_role', async () => {
      const r = await svc().schema('sv_private').rpc('review_signed_at', { p_project_id: randomUUID() });
      expect(r.error).not.toBeNull();
    });
  });

  describe('moderation', () => {
    it('hides, notifies members, unhides, and logs in order', async () => {
      const rv = await publishedReview();
      const pub = await publicReviews(100, 0);
      const mine = (pub.data as any[]).find((x) => x.id === rv.reviewId);
      expect(mine).toBeDefined();
      expect(mine).not.toHaveProperty('project_id');
      expect(mine).not.toHaveProperty('link_id');

      const hide = await moderateReview(rv.reviewId, 'hide', 'defamation_or_insult', 'Propos injurieux constates', admin.id);
      expect(hide.error).toBeNull();
      expect(hide.data.outcome).toBe('hidden');
      const modId = hide.data.moderation_id;
      expect(modId).toBeTruthy();

      const mails = await outbox('review_hidden', `review_hidden:${modId}:${rv.memberEmail.toLowerCase()}`);
      expect(mails).toHaveLength(1);
      expect(mails[0].recipient_kind).toBe('client');

      expect(((await publicReviews(100, 0)).data as any[]).some((x) => x.id === rv.reviewId)).toBe(false);
      const row = await svc().from('sv_reviews').select('id').eq('id', rv.reviewId);
      expect(row.data).toHaveLength(1);

      expect((await moderateReview(rv.reviewId, 'hide', 'defamation_or_insult', 'Encore', admin.id)).data.outcome).toBe('unchanged');
      expect((await moderateReview(rv.reviewId, 'unhide', null, 'Erreur de moderation', plain.id)).error?.message ?? '').toMatch(/sv_not_admin/);

      const un = await moderateReview(rv.reviewId, 'unhide', null, 'Restauration apres verification', admin.id);
      expect(un.data.outcome).toBe('unhidden');
      expect(((await publicReviews(100, 0)).data as any[]).some((x) => x.id === rv.reviewId)).toBe(true);

      const log = await svc().from('sv_review_moderation_log').select('id,action,actor_id').eq('review_id', rv.reviewId).order('id');
      expect(log.data!.map((l) => l.action)).toEqual(['hide', 'unhide']);
      expect(log.data!.every((l) => l.actor_id === admin.id)).toBe(true);
    });

    it('accepts only the four legal reasons and a 3..500 char detail', async () => {
      const rv = await publishedReview();
      for (const reason of ['low_rating', 'negative']) {
        const r = await moderateReview(rv.reviewId, 'hide', reason, 'Detail valable', admin.id);
        expect(r.error?.message ?? '', reason).toMatch(/sv_invalid_reason/);
      }
      for (const detail of ['', 'ab']) {
        const r = await moderateReview(rv.reviewId, 'hide', 'inauthentic', detail, admin.id);
        expect(r.error?.message ?? '', `detail "${detail}"`).toMatch(/sv_invalid_detail/);
      }
      expect((await moderateReview(randomUUID(), 'hide', 'inauthentic', 'Detail valable', admin.id)).data.outcome).toBe('not_found');
    });
  });

  describe('append-only guarantees', () => {
    it('service_role cannot insert into sv_reviews directly', async () => {
      const rv = await publishedReview();
      const r = await svc().from('sv_reviews').insert({
        project_id: rv.projectId,
        link_id: rv.linkId,
        rating: 5,
        body: 'x'.repeat(30),
        display_mode: 'company_only',
        display_name: 'X',
        author_kind: 'company',
        company_name_snapshot: 'X',
        publication_consent: true,
        experience_date: '2026-01-01',
      });
      expect(r.error).not.toBeNull();
    });

    it.each(['sv_reviews', 'sv_review_moderation_log', 'sv_review_link_events', 'sv_review_links'] as const)(
      'delete and truncate on %s raise for the owner',
      async (t) => {
        await seedAllTables();
        expect(dbQuery(`delete from public.${t};`), 'delete').toMatch(/sv_immutable_table/);
        expect(dbQuery(`truncate public.${t};`), 'truncate').toMatch(/sv_immutable_table|foreign key/);
      },
    );

    it.each(['sv_reviews', 'sv_review_moderation_log', 'sv_review_link_events'] as const)('update on %s raises', async (t) => {
      const col = t === 'sv_reviews' ? 'published_at' : 'created_at';
      expect(dbQuery(`update public.${t} set ${col} = now();`)).toMatch(/sv_immutable_table/);
    });

    it('service_role holds no write privilege on the review tables', async () => {
      for (const t of TABLES) {
        const out = dbQuery(`do $$ begin set local role service_role; delete from public.${t}; end $$;`);
        expect(out, t).toMatch(/permission denied for table/);
      }
    });

    it('a link is immutable except for a single used_at', async () => {
      const rv = await publishedReview();
      expect(dbQuery(`update public.sv_review_links set token_hash = '${'b'.repeat(64)}' where id = '${rv.linkId}';`)).toMatch(/sv_link_immutable/);
      expect(dbQuery(`update public.sv_review_links set expires_at = now() + interval '1 day' where id = '${rv.linkId}';`)).toMatch(/sv_link_immutable/);
      expect(dbQuery(`update public.sv_review_links set used_at = now() where id = '${rv.linkId}';`)).toMatch(/sv_link_immutable/);
      expect(dbQuery(`delete from public.sv_review_links where id = '${rv.linkId}';`)).toMatch(/sv_immutable_table/);
    });
  });

  describe('public filtering and pagination', () => {
    it('lists the visible reviews newest first, clamps the limit and the offset', async () => {
      const a = await publishedReview();
      const b = await publishedReview();
      const c = await publishedReview();
      await moderateReview(b.reviewId, 'hide', 'third_party_personal_data', 'Donnees personnelles de tiers', admin.id);

      const all = (await publicReviews(100, 0)).data as any[];
      const ids = all.map((x) => x.id);
      expect(ids).toContain(a.reviewId);
      expect(ids).toContain(c.reviewId);
      expect(ids).not.toContain(b.reviewId);
      expect(ids.indexOf(c.reviewId)).toBeLessThan(ids.indexOf(a.reviewId));
      for (let i = 1; i < all.length; i++) {
        expect(new Date(all[i - 1].published_at).getTime()).toBeGreaterThanOrEqual(new Date(all[i].published_at).getTime());
      }

      expect(((await publicReviews(500, 0)).data as any[]).length).toBeLessThanOrEqual(100);
      const skipped = (await publicReviews(100, 1)).data as any[];
      expect(skipped.map((x) => x.id)).toEqual(all.slice(1).map((x) => x.id));
      const neg = (await publicReviews(100, -5)).data as any[];
      expect(neg.map((x) => x.id)).toEqual(all.map((x) => x.id));
    });
  });
});
