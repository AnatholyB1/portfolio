import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { processDueMail } from '@/lib/server/mail/outbox';

export const dynamic = 'force-dynamic';

// Vercel Cron envoie `Authorization: Bearer ${CRON_SECRET}` (RESEARCH A1, à
// vérifier en preview dans 12-21). CRON_SECRET doit être défini dans Vercel.
// Fail-closed : sans secret configuré, toute requête est refusée (401).
function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const result = await processDueMail(25);
  return NextResponse.json(result);
}
