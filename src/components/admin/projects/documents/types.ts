import type { DownloadResult } from '@/components/portal/project/types';
import type { DocumentInput } from '@/lib/documents/schemas';
import type { DocType, DocumentSnapshot, DocumentStatus } from '@/lib/documents/types';

export type FieldErrors = Record<string, string>;

export type PreviewResult =
  | { ok: true; pdfBase64: string }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export type IssueResult =
  | { ok: true; outcome: 'issued' | 'already_issued'; mail: 'sent' | 'pending' | 'failed' | 'none' }
  | { ok: false; message: string; fieldErrors?: FieldErrors };

export type VerifyResult = { ok: true; match: boolean } | { ok: false; message: string };

export type SnapshotResult =
  | { ok: true; snapshot: DocumentSnapshot }
  | { ok: false; message: string };

export type DocumentActions = {
  preview: (input: DocumentInput) => Promise<PreviewResult>;
  issue: (input: DocumentInput) => Promise<IssueResult>;
  download: (documentId: string) => Promise<DownloadResult>;
  verify: (documentId: string) => Promise<VerifyResult>;
  loadSnapshot: (documentId: string) => Promise<SnapshotResult>;
};

export type IssuedDocView = {
  id: string;
  docType: DocType;
  revision: number;
  issuedAt: string;
  status: DocumentStatus;
  templateVersion: string;
  sha256: string;
  sizeBytes: number;
  replacedBy: { revision: number; issuedAt: string } | null;
};
