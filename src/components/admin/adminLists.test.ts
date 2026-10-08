import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const leadsPage = read('../../app/admin/leads/page.tsx');
const leadPage = read('../../app/admin/leads/[id]/page.tsx');
const funnelPage = read('../../app/admin/entonnoir/page.tsx');
const leadsCss = read('./leads/leads.css');
const funnelCss = read('./funnel/funnel.css');
const adminCss = read('./admin.css');
const pill = read('./leads/StatusPill.tsx');

describe('leads list', () => {
  it('uses the shared pager and no longer loads 1000 rows for the source dropdown', () => {
    expect(leadsPage).toContain('<Pager');
    expect(leadsPage).not.toContain('limit(1000)');
    expect(leadsPage).toContain('SOURCE_SAMPLE');
    expect(leadsPage).toContain('UTM_SOURCES');
    expect(leadsPage).not.toContain('pt-lead-pager');
  });

  it('shows an explicit unavailable state when the query fails, with a retry action', () => {
    expect(leadsPage).toContain('Leads indisponibles');
    expect(leadsPage).toContain('Recharger');
  });

  it('has no inline layout styles', () => {
    expect(leadsPage).not.toContain('style={{');
    expect(leadPage).not.toContain('style={{');
  });
});

describe('lead detail convert action', () => {
  it('renders the inactive convert button for new and lost leads without the primary style', () => {
    expect(leadPage).toContain('disabled');
    expect(leadPage).toContain('aria-disabled="true"');
    expect(leadPage).toContain('aria-describedby="convert-reason"');
    expect(leadPage).toContain('PROJECT_COPY.conversion.notYetConvertible');
    expect(leadPage).toContain('PROJECT_COPY.conversion.reopenFirst');
    expect(leadPage).not.toMatch(/className="pt-btn-primary"\s+aria-disabled/);
  });

  it('keeps the live convert dialog for convertible leads', () => {
    expect(leadPage).toContain('<ConvertDialog');
    expect(leadPage).toContain("CONVERTIBLE = ['qualified', 'rdv', 'quote_sent', 'signed']");
  });
});

describe('funnel page', () => {
  it('reads the query error and shows the pilotage-style unavailable state', () => {
    expect(funnelPage).toContain('const { data, error }');
    expect(funnelPage).toContain('Chiffres indisponibles');
    expect(funnelPage.indexOf('Chiffres indisponibles')).toBeLessThan(funnelPage.indexOf('Pas encore de données'));
    expect(funnelPage).toContain('.limit(FUNNEL_ROW_CAP)');
  });

  it('uses plurals instead of lead(s)', () => {
    expect(funnelPage).not.toContain('lead(s)');
    expect(read('./funnel/FunnelTable.tsx')).not.toContain('lead(s)');
  });

  it('cost editor panel stays in the cell flow so the scroll container cannot clip it', () => {
    expect(funnelCss).toMatch(/\.pt-funnel-cost-editor \.pt-lead-panel \{[^}]*margin-top: 8px/);
    expect(funnelCss).not.toMatch(/\.pt-funnel-cost-editor \.pt-lead-panel \{[^}]*position: absolute/);
  });
});

describe('emails, avis and liens pages', () => {
  const emails = read('../../app/admin/emails/page.tsx');
  const avis = read('../../app/admin/avis/page.tsx');
  const liens = read('../../app/admin/liens/page.tsx');

  it('emails table has table roles, a caption and a data-label on every cell', () => {
    expect(emails).toContain('role="table"');
    expect(emails).toContain('<caption className="pt-sr-only">');
    const cells = emails.match(/<td role="cell"/g) ?? [];
    const labelled = emails.match(/<td role="cell" data-label=/g) ?? [];
    expect(cells.length).toBeGreaterThanOrEqual(6);
    expect(labelled.length).toBe(cells.length);
  });

  it('emails show the lifted reason in the Statut cell and paginate', () => {
    expect(emails).toContain('Motif : {r.liftReason}');
    expect(emails).toContain('<Pager');
    expect(emails).toContain('Liste indisponible');
  });

  it('avis is paginated, loads both lists in parallel and has explicit error states', () => {
    expect(avis).toContain('<Pager');
    expect(avis).toContain('Promise.all');
    expect(avis).toContain('Avis indisponibles');
    expect(avis).toContain('Liens d&apos;avis indisponibles');
  });

  it('none of the three pages uses inline styles', () => {
    for (const src of [emails, avis, liens]) expect(src).not.toContain('style={{');
  });

  it('liens tables are pt-table card tables with labelled cells', () => {
    expect((liens.match(/className="pt-table pt-admin-table"/g) ?? []).length).toBe(3);
    expect(liens).not.toMatch(/<table className="pt-admin-table"/);
    expect(liens).toContain('data-label="Valeur enregistrée"');
  });
});

describe('shared styles', () => {
  it('lead panel is static by default and floats only from the status pill', () => {
    expect(leadsCss).toMatch(/\.pt-admin \.pt-lead-panel \{\s*position: static/);
    expect(leadsCss).toMatch(/\.pt-lead-pill-wrap > \.pt-lead-panel \{\s*position: absolute/);
  });

  it('dialog uses defined tokens, not undefined --pt-surface / --pt-border', () => {
    expect(leadsCss).not.toContain('--pt-surface');
    expect(leadsCss).not.toMatch(/var\(--pt-border[,)]/);
    expect(leadsCss).toContain('var(--bg-2)');
    expect(leadsCss).toContain('100dvh');
  });

  it('inline links in admin tables reach 44px', () => {
    expect(adminCss).toMatch(/\.pt-admin \.pt-admin-table a \{[^}]*min-height: 44px/);
  });
});

describe('status pill live regions', () => {
  it('uses a real ellipsis and keeps the live and error regions mounted', () => {
    expect(pill).toContain('Enregistrement…');
    expect(pill).not.toContain('Enregistrement...');
    expect(pill).toContain('aria-live="polite"');
    expect(pill).not.toMatch(/\{state\.status === 'error' \? <p/);
  });
});
