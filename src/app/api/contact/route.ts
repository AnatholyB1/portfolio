import { NextResponse } from 'next/server';
import { Resend } from 'resend';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const name = body?.name;
  const email = body?.email;
  const projectType = body?.projectType;
  const message = body?.message;

  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(projectType) ||
    !isNonEmptyString(message) ||
    !email.includes('@')
  ) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const safeName = escapeHtml(name);
  const safeProjectType = escapeHtml(projectType);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');

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
      subject: `Nouveau contact — ${projectType}`,
      html: `
        <p><strong>Nom :</strong> ${safeName}</p>
        <p><strong>Email :</strong> ${escapeHtml(email)}</p>
        <p><strong>Type de projet :</strong> ${safeProjectType}</p>
        <p><strong>Message :</strong><br />${safeMessage}</p>
      `,
    }),
  ]);

  if (prospectResult.error || agencyResult.error) {
    console.error('[api/contact] Resend send failed', prospectResult.error, agencyResult.error);
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
