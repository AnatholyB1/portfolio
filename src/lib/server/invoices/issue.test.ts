/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const S = vi.hoisted(() => ({
  upload: vi.fn(),
  download: vi.fn(),
  render: vi.fn(),
  rpc: vi.fn(),
  send: vi.fn(),
  tables: {} as Record<string, { data: any; error: any }>,
  sweepRows: { data: [] as any, error: null as any },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    storage: { from: () => ({ upload: S.upload, download: S.download }) },
    from: (table: string) => {
      const b: any = {};
      b.select = () => b;
      b.eq = () => b;
      b.is = () => b;
      b.order = () => b;
      b.limit = async () => S.sweepRows;
      b.maybeSingle = async () => S.tables[table] ?? { data: null, error: null };
      return b;
    },
  }),
}));
vi.mock('./render', () => ({ renderLedgerPdf: S.render }));
vi.mock('@/lib/server/rpc', () => ({ callRpc: S.rpc }));
vi.mock('@/lib/server/mail/outbox', () => ({ sendOutboxRow: S.send }));

import { sampleCreditNote, sampleDepositInvoiceV2 } from '@/lib/documents/invoiceFixtures';
import { ADMIN_NOTIFY_EMAIL } from '@/lib/server/mail/rules';
import { attachInvoicePdf, issueCreditNote, issueInvoice, sweepMissingPdfs } from './issue';

const PID = '11111111-1111-4111-8111-111111111111';
const IID = '22222222-2222-4222-8222-222222222222';
const BUF = Buffer.from('%PDF-new-render');
const HASH = createHash('sha256').update(BUF).digest('hex');

const INPUT = {
  id: IID,
  issueKey: 'deposit:' + PID,
  projectId: PID,
  kind: 'deposit' as const,
  header: { a: 1 },
  lines: [],
  deductions: [],
};

function rpcRouter(map: Record<string, any>) {
  S.rpc.mockImplementation(async (_scope: string, fn: string) => map[fn] ?? { ok: true, data: {} });
}

beforeEach(() => {
  vi.clearAllMocks();
  S.tables = {
    sv_invoice_pdfs: { data: null, error: null },
    sv_invoices: {
      data: { id: IID, project_id: PID, snapshot: sampleDepositInvoiceV2() },
      error: null,
    },
  };
  S.sweepRows = { data: [], error: null };
  S.render.mockResolvedValue({ buffer: BUF, sha256: HASH, size: BUF.length });
  S.upload.mockResolvedValue({ error: null });
  S.send.mockResolvedValue('sent');
  rpcRouter({
    sv_issue_invoice: { ok: true, data: { invoice_id: IID, number: 'FA-2026-0001', already: false, outbox_ids: ['o1'] } },
    sv_attach_invoice_pdf: { ok: true, data: { attached: true } },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('issueInvoice', () => {
  it('allocates, attaches the pdf then sends the mail', async () => {
    const r = await issueInvoice(INPUT);
    expect(r).toEqual({
      ok: true,
      outcome: 'issued',
      invoiceId: IID,
      number: 'FA-2026-0001',
      mail: 'sent',
      pdf: 'attached',
    });
    const issueCall = S.rpc.mock.calls.find((c) => c[1] === 'sv_issue_invoice')!;
    expect(issueCall[2].p_admin_email).toBe(ADMIN_NOTIFY_EMAIL);
    expect(issueCall[2].p_issue_key).toBe('deposit:' + PID);
    const up = S.upload.mock.calls[0];
    expect(up[0]).toBe(`${PID}/invoices/${IID}.pdf`);
    expect(up[2]).toMatchObject({ upsert: false, contentType: 'application/pdf', cacheControl: '31536000' });
    const att = S.rpc.mock.calls.find((c) => c[1] === 'sv_attach_invoice_pdf')!;
    expect(att[2]).toMatchObject({ p_invoice_id: IID, p_sha256: HASH, p_size: BUF.length, p_template_version: 'v2' });
    expect(S.send).toHaveBeenCalledWith('o1');
  });

  it('on replay returns already_issued, sends no mail and skips render when the pdf row exists', async () => {
    rpcRouter({
      sv_issue_invoice: { ok: true, data: { invoice_id: IID, number: 'FA-2026-0001', already: true, outbox_ids: [] } },
    });
    S.tables.sv_invoice_pdfs = { data: { invoice_id: IID }, error: null };
    const r = await issueInvoice(INPUT);
    expect(r).toMatchObject({ ok: true, outcome: 'already_issued', mail: 'none', pdf: 'attached' });
    expect(S.render).not.toHaveBeenCalled();
    expect(S.send).not.toHaveBeenCalled();
  });

  it('still attaches on replay when no pdf row exists', async () => {
    rpcRouter({
      sv_issue_invoice: { ok: true, data: { invoice_id: IID, number: 'FA-2026-0001', already: true, outbox_ids: [] } },
      sv_attach_invoice_pdf: { ok: true, data: { attached: true } },
    });
    const r = await issueInvoice(INPUT);
    expect(r).toMatchObject({ ok: true, outcome: 'already_issued', pdf: 'attached', mail: 'none' });
    expect(S.upload).toHaveBeenCalledTimes(1);
  });

  it('returns the sv_ code and uploads nothing on RPC error', async () => {
    rpcRouter({ sv_issue_invoice: { ok: false, code: 'sv_invoice_contract_not_signed' } });
    const r = await issueInvoice(INPUT);
    expect(r).toEqual({ ok: false, code: 'sv_invoice_contract_not_signed' });
    expect(S.upload).not.toHaveBeenCalled();
  });

  it('keeps the number with pdf pending when the render fails', async () => {
    S.render.mockRejectedValue(new Error('boom'));
    const r = await issueInvoice(INPUT);
    expect(r).toMatchObject({ ok: true, outcome: 'issued', number: 'FA-2026-0001', pdf: 'pending' });
  });

  it('keeps the number with pdf pending when the upload fails', async () => {
    S.upload.mockResolvedValue({ error: { message: 'network' } });
    const r = await issueInvoice(INPUT);
    expect(r).toMatchObject({ ok: true, pdf: 'pending' });
    expect(S.rpc.mock.calls.some((c) => c[1] === 'sv_attach_invoice_pdf')).toBe(false);
  });

  it('never cancels the issuance on a mail failure', async () => {
    S.send.mockResolvedValue('failed');
    expect(await issueInvoice(INPUT)).toMatchObject({ ok: true, mail: 'failed', pdf: 'attached' });
    S.send.mockRejectedValue(new Error('smtp'));
    expect(await issueInvoice(INPUT)).toMatchObject({ ok: true, mail: 'failed' });
  });
});

describe('attachInvoicePdf', () => {
  it('returns already without rendering when a pdf row exists', async () => {
    S.tables.sv_invoice_pdfs = { data: { invoice_id: IID }, error: null };
    expect(await attachInvoicePdf(IID)).toBe('already');
    expect(S.render).not.toHaveBeenCalled();
    expect(S.upload).not.toHaveBeenCalled();
  });

  it('attaches the hash of the stored bytes when the object already exists', async () => {
    const stored = Buffer.from('%PDF-stored-bytes');
    S.upload.mockResolvedValue({ error: { message: 'The resource already exists', statusCode: '409' } });
    S.download.mockResolvedValue({
      data: { arrayBuffer: async () => stored.buffer.slice(stored.byteOffset, stored.byteOffset + stored.length) },
      error: null,
    });
    expect(await attachInvoicePdf(IID)).toBe('attached');
    const att = S.rpc.mock.calls.find((c) => c[1] === 'sv_attach_invoice_pdf')!;
    expect(att[2].p_sha256).toBe(createHash('sha256').update(stored).digest('hex'));
    expect(att[2].p_sha256).not.toBe(HASH);
    expect(att[2].p_size).toBe(stored.length);
  });

  it('reports already when the attach is a same-hash replay', async () => {
    rpcRouter({ sv_attach_invoice_pdf: { ok: true, data: { attached: false } } });
    expect(await attachInvoicePdf(IID)).toBe('already');
  });

  it('fails when the invoice is missing or the attach is refused', async () => {
    S.tables.sv_invoices = { data: null, error: null };
    expect(await attachInvoicePdf(IID)).toBe('failed');
    S.tables.sv_invoices = { data: { id: IID, project_id: PID, snapshot: sampleDepositInvoiceV2() }, error: null };
    rpcRouter({ sv_attach_invoice_pdf: { ok: false, code: 'sv_pdf_already_attached' } });
    expect(await attachInvoicePdf(IID)).toBe('failed');
  });
});

describe('issueCreditNote', () => {
  const CN = {
    id: IID,
    issueKey: 'credit:' + IID,
    originInvoiceId: PID,
    scope: 'total' as const,
    amountCents: 100,
    reason: 'Annulation',
    refundRequested: true,
    createdBy: 'u1',
    lines: [],
    snapshot: sampleCreditNote(),
  };

  it('mirrors the invoice flow and returns fullyCredited', async () => {
    S.tables.sv_invoices = { data: { id: IID, project_id: PID, snapshot: sampleCreditNote() }, error: null };
    rpcRouter({
      sv_issue_credit_note: {
        ok: true,
        data: { credit_note_id: IID, number: 'AV-2026-0001', already: false, outbox_ids: ['o2'], fully_credited: true },
      },
      sv_attach_invoice_pdf: { ok: true, data: { attached: true } },
    });
    const r = await issueCreditNote(CN);
    expect(r).toEqual({
      ok: true,
      outcome: 'issued',
      creditNoteId: IID,
      number: 'AV-2026-0001',
      fullyCredited: true,
      mail: 'sent',
      pdf: 'attached',
    });
    const att = S.rpc.mock.calls.find((c) => c[1] === 'sv_attach_invoice_pdf')!;
    expect(att[2].p_template_version).toBe('v1');
  });

  it('returns the sv_ code on RPC error', async () => {
    rpcRouter({ sv_issue_credit_note: { ok: false, code: 'sv_credit_exceeds_invoice' } });
    expect(await issueCreditNote(CN)).toEqual({ ok: false, code: 'sv_credit_exceeds_invoice' });
  });
});

describe('sweepMissingPdfs', () => {
  it('attaches each invoice without a pdf and counts results', async () => {
    S.sweepRows = { data: [{ id: IID }, { id: 'other' }], error: null };
    S.tables.sv_invoices = { data: { id: IID, project_id: PID, snapshot: sampleDepositInvoiceV2() }, error: null };
    const r = await sweepMissingPdfs(10);
    expect(r).toEqual({ attached: 2, failed: 0 });
  });

  it('counts failures and survives a list error', async () => {
    S.sweepRows = { data: [{ id: IID }], error: null };
    S.render.mockRejectedValue(new Error('boom'));
    expect(await sweepMissingPdfs(10)).toEqual({ attached: 0, failed: 1 });
    S.sweepRows = { data: null, error: { message: 'x' } };
    expect(await sweepMissingPdfs(10)).toEqual({ attached: 0, failed: 0 });
  });
});
