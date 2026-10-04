// Lectures documents : toujours via le client RLS de l'appelant, colonnes explicites, jamais storage_path (D-15, D-17).
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DOC_TYPES, type DocType, type DocumentSnapshot } from '@/lib/documents/types';
import { chainHeads, type ChainDoc } from '@/lib/documents/steps';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type DocumentRow = ChainDoc & {
  projectId: string;
  templateVersion: string;
  reference: string;
  filename: string;
  sha256: string;
  sizeBytes: number;
  issuedBy: string | null;
};

export const DOCUMENT_COLS =
  'id, project_id, doc_type, revision, template_version, reference, filename, sha256, size_bytes, replaces_document_id, issued_by, issued_at';

function toDocument(r: Row): DocumentRow {
  return {
    id: String(r.id),
    projectId: String(r.project_id),
    docType: r.doc_type as DocType,
    revision: Number(r.revision),
    templateVersion: String(r.template_version),
    reference: String(r.reference),
    filename: String(r.filename),
    sha256: String(r.sha256),
    sizeBytes: Number(r.size_bytes),
    replacesDocumentId: r.replaces_document_id ?? null,
    issuedBy: r.issued_by ?? null,
    issuedAt: String(r.issued_at),
  };
}

/** Échec de lecture de la liste des documents d'un projet : jamais confondu avec une liste vide (WR-06). */
export class DocumentsLoadError extends Error {
  constructor() {
    super('documents_load_failed');
    this.name = 'DocumentsLoadError';
  }
}

/** Lève DocumentsLoadError si la lecture échoue : l'appelant ne doit pas décider sur une liste vide. */
export async function loadProjectDocuments(rls: SupabaseClient, projectId: string): Promise<DocumentRow[]> {
  let res;
  try {
    res = await rls
      .from('sv_project_documents')
      .select(DOCUMENT_COLS)
      .eq('project_id', projectId)
      .order('issued_at', { ascending: true });
  } catch {
    console.error('[documents/read] list failed');
    throw new DocumentsLoadError();
  }
  if (res.error) {
    console.error('[documents/read] list failed');
    throw new DocumentsLoadError();
  }
  return ((res.data ?? []) as Row[]).map(toDocument);
}

export async function loadDocumentsForProjects(rls: SupabaseClient, projectIds: string[]): Promise<DocumentRow[]> {
  if (projectIds.length === 0) return [];
  try {
    const res = await rls
      .from('sv_project_documents')
      .select(DOCUMENT_COLS)
      .in('project_id', projectIds)
      .order('issued_at', { ascending: true });
    if (res.error) {
      console.error('[documents/read] list failed');
      return [];
    }
    return ((res.data ?? []) as Row[]).map(toDocument);
  } catch {
    console.error('[documents/read] list failed');
    return [];
  }
}

export async function loadDocumentSnapshot(rls: SupabaseClient, documentId: string): Promise<DocumentSnapshot | null> {
  try {
    const res = await rls
      .from('sv_document_snapshots')
      .select('document_id, data')
      .eq('document_id', documentId)
      .maybeSingle();
    if (res.error || !res.data) return null;
    const data = (res.data as Row).data as { docType?: string } | null;
    if (!data || !(DOC_TYPES as readonly string[]).includes(String(data.docType))) return null;
    return data as DocumentSnapshot;
  } catch {
    console.error('[documents/read] snapshot failed');
    return null;
  }
}

export async function loadActiveSnapshot(
  rls: SupabaseClient,
  projectId: string,
  docType: 'quote' | 'spec' | 'contract',
): Promise<{ doc: DocumentRow; snapshot: DocumentSnapshot } | null> {
  const docs = (await loadProjectDocuments(rls, projectId)).filter((d) => d.docType === docType);
  const head = chainHeads(docs).get(docType);
  if (!head) return null;
  const doc = docs.find((d) => d.id === head.id);
  if (!doc) return null;
  const snapshot = await loadDocumentSnapshot(rls, doc.id);
  return snapshot ? { doc, snapshot } : null;
}
