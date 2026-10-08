import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADMIN_PAGE_SIZE, parsePage } from './Pager';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const page = read('../../app/admin/page.tsx');
const pager = read('./Pager.tsx');
const queue = read('./WorkQueue.tsx');
const loader = read('../../lib/server/admin/workQueue.ts');

describe('Pager', () => {
  it('parses the page number defensively', () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage('3')).toBe(3);
    expect(parsePage(['4', '5'])).toBe(4);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('-2')).toBe(1);
    expect(parsePage('abc')).toBe(1);
    expect(ADMIN_PAGE_SIZE).toBe(25);
  });

  it('uses one wording and the ghost button style', () => {
    expect(pager).toContain('Précédent');
    expect(pager).toContain('Suivant');
    expect(pager).toContain('pt-btn-ghost');
    expect(pager).toContain("from 'next/link'");
    expect(pager).not.toContain('<a href');
  });
});

describe('admin landing source guards', () => {
  it('h1 is the page title and the invite form is an h2', () => {
    expect(page).toContain('<h1 className="pt-heading">Clients</h1>');
    expect(page).toMatch(/<h2 id="invite-title"/);
    expect(page).not.toMatch(/<h1[^>]*id="invite-title"/);
  });

  it('shows the work queue first and reads it in parallel with the list under requireAdmin', () => {
    expect(page.indexOf('<WorkQueue')).toBeLessThan(page.indexOf('<InviteForm'));
    expect(page.indexOf('requireAdmin()')).toBeLessThan(page.indexOf('loadWorkQueue(supabase)'));
    expect(page).toContain('Promise.all');
    expect(page).toContain('.range(from, from + ADMIN_PAGE_SIZE)');
    expect(page).not.toContain('@/lib/supabase/admin');
  });

  it('keeps an explicit error state for the list and uses the shared pager', () => {
    expect(page).toContain('Clients indisponibles');
    expect(page).toContain('<Pager');
    expect(page).not.toContain('style={{');
  });

  it('work queue has the empty state and links to existing admin pages', () => {
    expect(queue).toContain('Rien à traiter');
    expect(queue).toContain('À traiter');
    expect(queue).toContain("from 'next/link'");
  });

  it('loader reads through the RLS client only and never service_role', () => {
    expect(loader).not.toContain('@/lib/supabase/admin');
    expect(loader).not.toContain('createSupabaseAdminClient');
    expect(loader).toContain('PRÉCONDITION');
  });
});
