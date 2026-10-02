import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isPrivatePath } from '@/lib/privateRoutes';

const processMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/mail/outbox', () => ({ processDueMail: processMock }));

import { GET } from './route';

const req = (auth?: string) =>
  new Request('https://sevalys.com/api/cron/mail', {
    headers: auth === undefined ? {} : { authorization: auth },
  });

describe('GET /api/cron/mail', () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    processMock.mockReset();
    processMock.mockResolvedValue({ claimed: 2, sent: 1, failed: 1 });
    process.env.CRON_SECRET = 's3cret';
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it('401 without header', async () => {
    expect((await GET(req())).status).toBe(401);
    expect(processMock).not.toHaveBeenCalled();
  });

  it('401 with wrong secret and with a different length', async () => {
    expect((await GET(req('Bearer nope!!'))).status).toBe(401);
    expect((await GET(req('Bearer x'))).status).toBe(401);
    expect(processMock).not.toHaveBeenCalled();
  });

  it('401 when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req('Bearer undefined'))).status).toBe(401);
    expect((await GET(req('Bearer '))).status).toBe(401);
    expect(processMock).not.toHaveBeenCalled();
  });

  it('200 with the correct secret', async () => {
    const res = await GET(req('Bearer s3cret'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: 2, sent: 1, failed: 1 });
    expect(processMock).toHaveBeenCalledWith(25);
  });

  it('is not a private route', () => {
    expect(isPrivatePath('/api/cron/mail')).toBe(false);
  });

  it('vercel.json declares a single daily cron', async () => {
    const j = (await import('../../../../../vercel.json')).default as {
      crons: { path: string; schedule: string }[];
    };
    expect(j.crons).toHaveLength(1);
    expect(j.crons[0].schedule).toBe('0 6 * * *');
  });
});
