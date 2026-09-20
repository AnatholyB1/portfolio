import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isSpamSubmission, prospectSchema } from '@/lib/prospects-schema';
import { createServiceRoleClient } from '@/lib/supabase';

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
  // check MUST run before validation and before any Supabase/Resend call
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

  // Never store or log the raw IP - only a sha256 hash, for abuse
  // correlation only. Storing the raw address would add unnecessary PII to
  // a table governed by a 12-month consent window (D-04).
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || null;
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null;

  const supabase = createServiceRoleClient();
  const { error: insertError } = await supabase.from('prospects').insert({
    nom: p.nom,
    email: p.email,
    telephone: p.telephone,
    reponses_diagnostic: p.reponsesDiagnostic,
    services_recommandes: p.servicesRecommandes,
    consentement_rgpd: p.consentementRgpd,
    ip_hash: ipHash,
  });

  if (insertError) {
    console.error('[api/simulateur] insert failed', insertError);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const servicesHtml = p.servicesRecommandes.map(escapeHtml).join(', ');

  const result = await resend.emails.send({
    from: 'Sevalys <contact@sevalys.com>',
    to: 'contact@sevalys.com',
    subject: 'Nouveau prospect - simulateur',
    html: `
      <p><strong>Nom :</strong> ${escapeHtml(p.nom)}</p>
      <p><strong>Email :</strong> ${escapeHtml(p.email)}</p>
      <p><strong>Telephone :</strong> ${escapeHtml(p.telephone)}</p>
      <p><strong>Services recommandes :</strong> ${servicesHtml}</p>
    `,
  });

  if (result.error) {
    // The row was already persisted above, so the prospect is not lost even
    // though the team wasn't notified - only the notification failed.
    console.error('[api/simulateur] Resend send failed', result.error);
    return NextResponse.json({ error: 'notification_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
