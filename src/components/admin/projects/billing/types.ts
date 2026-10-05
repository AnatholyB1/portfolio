import type { DownloadResult } from '@/components/portal/project/types';

export type { AdminBillingView } from '@/lib/server/invoices/adminView';
export type { VerifyResult } from '@/components/admin/projects/documents/types';
export type { DownloadResult };

export type FieldErrors = Record<string, string>;

export type PeriodInvoiceInput = {
  projectId: string;
  invoiceId?: string;
  periodStart: string;
  periodEnd: string;
  lines: { designation: string; days: string; dailyRate: string }[];
  orderNumber?: string;
  dueDate?: string;
};

export type CreditNoteInput = {
  originInvoiceId: string;
  creditNoteId?: string;
  scope: 'total' | 'partial';
  amount?: string;
  reason: string;
  refundRequested: boolean;
};

export type BillingPreviewResult =
  | { ok: true; pdfBase64: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export type BillingIssueResult =
  | { ok: true; tone: 'success' | 'warning'; message: string; number: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export type InvoiceDataResult =
  | { ok: true; snapshot: unknown; lines: Record<string, unknown>[] }
  | { ok: false; message: string };
