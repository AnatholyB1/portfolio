// Module pur, sûr côté client. Données du certificat de signature (D-08), tirées des seules lignes stockées.
import { DOC_LABELS, type DocType } from '@/lib/documents/types';
import { CERTIFICATE_MENTIONS, CERTIFICATE_METHOD } from './consentText';

export type CertificateData = {
  docTypeLabel: string;
  reference: string;
  revision: number;
  templateVersion: string;
  issuedAtParis: string;
  originalSha256Lines: [string, string];
  signerName: string;
  signerRole: string;
  signerEmail: string;
  signedAtParis: string;
  signedAtUtc: string;
  ip: string;
  method: string;
  chainLength: number;
  lastLinkHashLines: [string, string];
  consentVersion: string;
  acceptance: null | { allDelivered: boolean; reserved: { index: number; note: string }[] };
  mentions: readonly string[];
  footerLeft: string;
};

export type CertificateInput = {
  document: {
    docType: DocType;
    reference: string;
    revision: number;
    templateVersion: string;
    issuedAt: string;
    sha256: string;
  };
  signature: {
    signerName: string;
    signerRole: string;
    signerEmail: string;
    signedAt: string;
    signedAtUtc: string;
    ip: string | null;
    consentVersion: string;
    signedEventSeq: number;
    signedLinkHash: string;
  };
  acceptance: { index: number; status: 'delivered' | 'reserved' | 'refused'; note: string | null }[] | null;
};

/** Remplace les espaces fines par U+00A0 et retire ce que la police embarquée ne couvre pas. */
export function pdfSafe(s: string): string {
  return s
    .replace(/[  ]/g, ' ')
    .replace(/[^ -~ -ÿ«»·—–’…€]/g, '');
}

const parisFmt = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function parisDateTime(iso: string): string {
  const p = parisFmt.formatToParts(new Date(iso));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return pdfSafe(`${get('day')} ${get('month')} ${get('year')} à ${get('hour')}:${get('minute')}`);
}

const parisDay = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function parisDate(iso: string): string {
  return pdfSafe(parisDay.format(new Date(iso)));
}

function split64(h: string): [string, string] {
  return [pdfSafe(h.slice(0, 32)), pdfSafe(h.slice(32))];
}

export function buildCertificateData(input: CertificateInput): CertificateData {
  const { document: d, signature: s, acceptance } = input;
  return {
    docTypeLabel: pdfSafe(DOC_LABELS[d.docType]),
    reference: pdfSafe(d.reference),
    revision: d.revision,
    templateVersion: pdfSafe(d.templateVersion),
    issuedAtParis: parisDate(d.issuedAt),
    originalSha256Lines: split64(d.sha256),
    signerName: pdfSafe(s.signerName),
    signerRole: pdfSafe(s.signerRole),
    signerEmail: pdfSafe(s.signerEmail),
    signedAtParis: parisDateTime(s.signedAt),
    signedAtUtc: pdfSafe(s.signedAtUtc),
    ip: s.ip ? pdfSafe(s.ip) : '—',
    method: pdfSafe(CERTIFICATE_METHOD),
    chainLength: s.signedEventSeq,
    lastLinkHashLines: split64(s.signedLinkHash),
    consentVersion: pdfSafe(s.consentVersion),
    acceptance: acceptance
      ? {
          allDelivered: !acceptance.some((a) => a.status === 'reserved'),
          reserved: acceptance
            .filter((a) => a.status === 'reserved')
            .map((a) => ({ index: a.index, note: pdfSafe(a.note ?? '') })),
        }
      : null,
    mentions: CERTIFICATE_MENTIONS.v1.map(pdfSafe),
    footerLeft: pdfSafe(`Sèvalys · ${d.reference}`),
  };
}
