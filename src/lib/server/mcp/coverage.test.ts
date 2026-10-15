import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_TOOLS } from './index';

const ADMIN_DIR = join(process.cwd(), 'src', 'app', 'admin');

function actionFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return actionFiles(p);
    return /(^|\.)actions?\.ts$/.test(e.name) && !e.name.endsWith('.test.ts') ? [p] : [];
  });
}

// Exclusions MOTIVÉES uniquement. Ajouter une action admin sans outil MCP casse ce test.
// Phase B vide cette liste domaine par domaine.
const EXCLUDED: Record<string, string> = {
  addLinkAction: 'phase B : à migrer',
  addProjectCostAction: 'phase B : à migrer',
  addRecurringCostAction: 'phase B : à migrer',
  adminConfirmUploadAction: 'phase B : à migrer',
  adminDocumentDownloadAction: 'phase B : à migrer',
  adminDownloadAction: 'phase B : à migrer',
  adminInvoiceDownloadAction: 'phase B : à migrer',
  adminRequestUploadAction: 'phase B : à migrer',
  adminResumeFinalizationAction: 'phase B : à migrer',
  adminSealedDownloadAction: 'phase B : à migrer',
  exportSignatureTrailAction: 'phase B : à migrer',
  hideReviewAction: 'phase B : à migrer',
  issueCreditNoteAction: 'phase B : à migrer',
  issueDocumentAction: 'phase B : à migrer',
  issuePeriodInvoiceAction: 'phase B : à migrer',
  liftSuppressionAction: 'phase B : à migrer',
  loadInvoiceDataAction: 'phase B : à migrer',
  loadSnapshotAction: 'phase B : à migrer',
  postFactAction: 'phase B : à migrer',
  previewCreditNoteAction: 'phase B : à migrer',
  previewDocumentAction: 'phase B : à migrer',
  previewPeriodInvoiceAction: 'phase B : à migrer',
  reissueReviewLinkAction: 'phase B : à migrer',
  resendInvitationAction: 'phase B : à migrer',
  revokeFactAction: 'phase B : à migrer',
  saveBalanceAction: 'phase B : à migrer',
  saveCostAction: 'phase B : à migrer',
  setReminderHoldAction: 'phase B : à migrer',
  stopRecurringAction: 'phase B : à migrer',
  unhideReviewAction: 'phase B : à migrer',
  verifyDocumentHashAction: 'phase B : à migrer',
  verifyInvoiceHashAction: 'phase B : à migrer',
  verifySignatureChainAction: 'phase B : à migrer',
  voidProjectCostAction: 'phase B : à migrer',
};

describe('MCP tool registry', () => {
  it('has unique snake_case tool names', () => {
    const names = ALL_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n, n).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});

describe('MCP couvre toutes les server actions admin', () => {
  const exported = actionFiles(ADMIN_DIR).flatMap((f) =>
    [...readFileSync(f, 'utf8').matchAll(/export async function (\w+Action)\b/g)].map((m) => m[1]),
  );
  const covered = new Set(ALL_TOOLS.flatMap((t) => t.covers));

  it('trouve des actions (le scan ne doit pas être vide)', () => {
    expect(exported.length).toBeGreaterThan(30);
  });
  it.each([...new Set(exported)])('%s a un outil MCP ou une exclusion motivée', (name) => {
    expect(covered.has(name) || name in EXCLUDED, `${name} : ajouter un outil dans src/lib/server/mcp/tools/ ou une exclusion motivée`).toBe(true);
  });
  it('les exclusions et `covers` ne référencent que des actions existantes', () => {
    for (const n of [...covered, ...Object.keys(EXCLUDED)]) expect(exported, n).toContain(n);
  });
  it('une action couverte n\'est pas aussi exclue', () => {
    for (const n of Object.keys(EXCLUDED)) expect(covered.has(n), n).toBe(false);
  });
});
