import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { ingestLead } from '@/lib/leads/ingest';
import { getClientIp, hashIp } from '@/lib/leads/ipHash';
import { readAttribution } from '@/lib/leads/requestAttribution';
import { isSpamSubmission, prospectSchema } from '@/lib/prospects-schema';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);

  if (!raw) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  // Silent reject: honeypot filled, or submitted too fast to be human. This
  // check MUST run before validation and before any RPC/Resend call
  // (CRM-03) — the response is byte-identical to a real success (no distinct
  // status, no distinct error code) so a scripted bot gets no signal that it
  // was detected.
  if (isSpamSubmission(raw)) {
    return NextResponse.json({ ok: true });
  }

  const parsed = prospectSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const p = parsed.data;

  // Never store or log the raw IP - only an HMAC hash (D-04). Attribution and
  // consent come from httpOnly cookies only, never from the body (D-06).
  const ipHash = hashIp(getClientIp(request.headers));
  const attribution = readAttribution(request.headers.get('cookie'));

  const ingest = await ingestLead({
    channel: 'simulateur',
    nom: p.nom,
    email: p.email,
    telephone: p.telephone,
    payload: {
      reponsesDiagnostic: p.reponsesDiagnostic,
      servicesRecommandes: p.servicesRecommandes,
    },
    consentRgpd: p.consentementRgpd,
    attribution,
    ipHash,
  });

  if (!ingest.ok) {
    console.error('[api/simulateur] ingest failed');
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const servicesHtml = p.servicesRecommandes.map(escapeHtml).join(', ');
  const sourceLine = `${attribution.source.source} / ${attribution.source.medium}`;

  const result = await resend.emails.send({
    from: 'Sevalys <contact@sevalys.com>',
    to: 'contact@sevalys.com',
    subject: ingest.isReturn ? 'Lead revenu - simulateur' : 'Nouveau prospect - simulateur',
    html: `
      <p><strong>Nom :</strong> ${escapeHtml(p.nom)}</p>
      <p><strong>Email :</strong> ${escapeHtml(p.email)}</p>
      <p><strong>Telephone :</strong> ${escapeHtml(p.telephone)}</p>
      <p><strong>Services recommandes :</strong> ${servicesHtml}</p>
      <p><strong>Source :</strong> ${escapeHtml(sourceLine)}</p>
    `,
  });

  if (result.error) {
    // The lead was already persisted above, so it is not lost even
    // though the team wasn't notified - only the notification failed.
    console.error('[api/simulateur] Resend send failed', result.error);
    return NextResponse.json({ error: 'notification_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
