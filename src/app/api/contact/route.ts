import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { contactSchema } from '@/lib/contact-schema';
import { ingestLead } from '@/lib/leads/ingest';
import { getClientIp, hashIp } from '@/lib/leads/ipHash';
import { readAttribution } from '@/lib/leads/requestAttribution';
import { isSpamSubmission } from '@/lib/prospects-schema';
import { hashKey, hitThrottle } from '@/lib/throttle';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);

  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  // Silent reject (honeypot / too fast) before throttle, validation and any write.
  if (isSpamSubmission(raw)) {
    return NextResponse.json({ ok: true });
  }

  const ip = getClientIp(request.headers);
  const allowed = await hitThrottle(hashKey('contact-ip', ip ?? 'unknown'), 600, 5);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }
  const { name, email, projectType, message } = parsed.data;

  // Attribution and consent from httpOnly cookies only (D-06). Best-effort:
  // the e-mail stays the source of truth if ingest fails.
  const attribution = readAttribution(request.headers.get('cookie'));
  const ingest = await ingestLead({
    channel: 'contact',
    nom: name,
    email,
    telephone: null,
    payload: { projectType, message },
    consentRgpd: null,
    attribution,
    ipHash: hashIp(ip),
  });
  if (!ingest.ok) {
    console.error('[api/contact] ingest failed, continuing with e-mails');
  }
  const isReturn = ingest.ok && ingest.isReturn;

  const resend = new Resend(process.env.RESEND_API_KEY);

  const safeName = escapeHtml(name);
  const safeProjectType = escapeHtml(projectType);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');
  const sourceLine = escapeHtml(`${attribution.source.source} / ${attribution.source.medium}`);

  const [prospectResult, agencyResult] = await Promise.all([
    resend.emails.send({
      from: 'Sèvalys <contact@sevalys.com>',
      to: email,
      subject: 'On a bien reçu votre message',
      html: `
        <p>Bonjour ${safeName},</p>
        <p>Merci pour votre message concernant « ${safeProjectType} ». On l'a bien reçu.</p>
        <p>On répond sous 24h ouvrées.</p>
        <p>À très vite,<br />L'équipe Sèvalys</p>
      `,
    }),
    resend.emails.send({
      from: 'Sèvalys <contact@sevalys.com>',
      to: 'contact@sevalys.com',
      subject: isReturn ? `Lead revenu — ${projectType}` : `Nouveau contact — ${projectType}`,
      html: `
        <p><strong>Nom :</strong> ${safeName}</p>
        <p><strong>Email :</strong> ${escapeHtml(email)}</p>
        <p><strong>Type de projet :</strong> ${safeProjectType}</p>
        <p><strong>Message :</strong><br />${safeMessage}</p>
        <p><strong>Source :</strong> ${sourceLine}</p>
      `,
    }),
  ]);

  if (prospectResult.error || agencyResult.error) {
    console.error('[api/contact] Resend send failed', prospectResult.error, agencyResult.error);
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
