import type { FileKind } from '@/lib/projects/fileRules';

export type UploadRequestResult =
  | { ok: true; fileId: string; signedUrl: string }
  | { ok: false; message: string };

export type SimpleResult = { ok: true } | { ok: false; message: string };

export type DownloadResult = { ok: true; url: string } | { ok: false; message: string };

export type FileRowView = {
  id: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
  uploadedByKind: 'client' | 'admin';
  kind: FileKind;
};

export type FileActionsProps = {
  requestUpload: (input: {
    projectId: string;
    filename: string;
    size: number;
    mime: string;
  }) => Promise<UploadRequestResult>;
  confirmUpload: (fileId: string) => Promise<SimpleResult>;
  getDownloadUrl: (fileId: string) => Promise<DownloadResult>;
};

export type FilesPanelProps = FileActionsProps & {
  projectId: string;
  files: FileRowView[];
  viewer: 'client' | 'admin';
};

/** Vue facture côté client (structurellement compatible avec InvoiceView du lecteur serveur). */
export type PortalInvoiceView = {
  id: string;
  kind: 'deposit' | 'period' | 'final' | 'credit_note';
  number: string;
  isTest: boolean;
  issuedOn: string;
  dueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  totalInclTaxCents: number;
  amountDueCents: number;
  status: 'to_pay' | 'processing' | 'paid' | 'credited' | 'refunded';
  paidAt: string | null;
  partialCreditCents: number;
  lastFailedAt: string | null;
  hasPdf: boolean;
  creditNotes: PortalInvoiceView[];
};
