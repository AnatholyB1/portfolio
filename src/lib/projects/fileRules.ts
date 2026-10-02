// Règles de fichiers projet : module sûr côté client, revalidé côté serveur.
// La liste des MIME reflète la whitelist du bucket sv-project-files (migration 12-01).
export const MAX_FILE_BYTES = 26214400;
export const SIGNED_DOWNLOAD_SECONDS = 120;
export const PENDING_UPLOAD_HIDE_HOURS = 24;

export type FileKind = 'pdf' | 'image' | 'office' | 'archive' | 'vector' | 'text';

export const ALLOWED_FILE_TYPES: readonly { ext: string; mimes: readonly string[]; kind: FileKind }[] = [
  { ext: 'pdf', mimes: ['application/pdf'], kind: 'pdf' },
  { ext: 'png', mimes: ['image/png'], kind: 'image' },
  { ext: 'jpg', mimes: ['image/jpeg'], kind: 'image' },
  { ext: 'jpeg', mimes: ['image/jpeg'], kind: 'image' },
  { ext: 'webp', mimes: ['image/webp'], kind: 'image' },
  { ext: 'gif', mimes: ['image/gif'], kind: 'image' },
  { ext: 'svg', mimes: ['image/svg+xml'], kind: 'vector' },
  { ext: 'zip', mimes: ['application/zip', 'application/x-zip-compressed'], kind: 'archive' },
  { ext: 'doc', mimes: ['application/msword'], kind: 'office' },
  {
    ext: 'docx',
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    kind: 'office',
  },
  { ext: 'xls', mimes: ['application/vnd.ms-excel'], kind: 'office' },
  {
    ext: 'xlsx',
    mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    kind: 'office',
  },
  { ext: 'ppt', mimes: ['application/vnd.ms-powerpoint'], kind: 'office' },
  {
    ext: 'pptx',
    mimes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    kind: 'office',
  },
  { ext: 'ai', mimes: ['application/illustrator', 'application/postscript'], kind: 'vector' },
  { ext: 'eps', mimes: ['application/postscript'], kind: 'vector' },
  { ext: 'txt', mimes: ['text/plain'], kind: 'text' },
  { ext: 'csv', mimes: ['text/csv'], kind: 'text' },
];

export function sanitizeFilename(name: string): string {
  const base = (name ?? '').split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  let s = base.replace(/[\x00-\x1f\x7f]/g, '');
  s = s.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-{2,}/g, '-').replace(/\.{2,}/g, '.');
  s = s.replace(/^[.-]+/, '');
  if (s.length > 120) {
    const dot = s.lastIndexOf('.');
    const ext = dot > 0 && s.length - dot <= 10 ? s.slice(dot) : '';
    s = s.slice(0, 120 - ext.length) + ext;
  }
  return s.replace(/^[.-]+/, '') || 'fichier';
}

export type UploadCheck =
  | { ok: true; ext: string; kind: FileKind }
  | { ok: false; code: 'too_large' | 'bad_type' | 'invalid' };

export function validateUpload(input: { filename: string; size: number; mime: string }): UploadCheck {
  const { filename, size, mime } = input;
  if (!Number.isInteger(size) || size < 1 || !filename || !mime) return { ok: false, code: 'invalid' };
  if (size > MAX_FILE_BYTES) return { ok: false, code: 'too_large' };
  const dot = filename.lastIndexOf('.');
  const ext = dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
  const entry = ALLOWED_FILE_TYPES.find((t) => t.ext === ext && t.mimes.includes(mime.toLowerCase()));
  if (!entry) return { ok: false, code: 'bad_type' };
  return { ok: true, ext, kind: entry.kind };
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}
