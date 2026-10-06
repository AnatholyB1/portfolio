import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isPrivatePath } from '@/lib/privateRoutes';

const processMock = vi.hoisted(() => vi.fn());
const sweepMock = vi.hoisted(() => vi.fn());
const remindersMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/mail/outbox', () => ({ processDueMail: processMock }));
vi.mock('@/lib/server/invoices/autoIssue', () => ({ sweepInvoices: sweepMock }));
vi.mock('@/lib/server/reminders/sweep', () => ({ sweepReminders: remindersMock }));

import { GET } from './route';

const req = (auth?: string) =>
  new Request('https://sevalys.com/api/cron/mail', {
    headers: auth === undefined ? {} : { authorization: auth },
  });

describe('GET /api/cron/mail', () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    processMock.mockReset();
    sweepMock.mockReset();
    remindersMock.mockReset();
    remindersMock.mockResolvedValue({ queued: 2, duplicates: 0, stale: 0, failed: 0 });
    sweepMock.mockResolvedValue({ deposits: 1, finals: 0, skipped: 0, pdfs: { attached: 0, failed: 0 }, failed: 0 });
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
    expect(sweepMock).not.toHaveBeenCalled();
    expect(remindersMock).not.toHaveBeenCalled();
  });

  it('401 with wrong secret and with a different length', async () => {
    expect((await GET(req('Bearer nope!!'))).status).toBe(401);
    expect((await GET(req('Bearer x'))).status).toBe(401);
    expect(processMock).not.toHaveBeenCalled();
    expect(sweepMock).not.toHaveBeenCalled();
    expect(remindersMock).not.toHaveBeenCalled();
  });

  it('401 when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req('Bearer undefined'))).status).toBe(401);
    expect((await GET(req('Bearer '))).status).toBe(401);
    expect(processMock).not.toHaveBeenCalled();
    expect(sweepMock).not.toHaveBeenCalled();
    expect(remindersMock).not.toHaveBeenCalled();
  });

  it('200 with the correct secret', async () => {
    const res = await GET(req('Bearer s3cret'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      claimed: 2,
      sent: 1,
      failed: 1,
      reminders: { queued: 2, duplicates: 0, stale: 0, failed: 0 },
      invoices: { deposits: 1, finals: 0, skipped: 0, pdfs: { attached: 0, failed: 0 }, failed: 0 },
    });
    expect(processMock).toHaveBeenCalledWith(25);
    expect(sweepMock).toHaveBeenCalledWith(10);
    expect(remindersMock.mock.invocationCallOrder[0]).toBeLessThan(processMock.mock.invocationCallOrder[0]);
    expect(processMock.mock.invocationCallOrder[0]).toBeLessThan(sweepMock.mock.invocationCallOrder[0]);
  });

  it('reminders throwing still runs the outbox and invoices with status 200', async () => {
    remindersMock.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(req('Bearer s3cret'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reminders).toEqual({ error: 'reminders_failed' });
    expect(processMock).toHaveBeenCalledWith(25);
    expect(sweepMock).toHaveBeenCalledWith(10);
    spy.mockRestore();
  });

  it('sweep throwing still returns 200 with the mail result and an error marker', async () => {
    sweepMock.mockRejectedValue(new Error('boom'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await GET(req('Bearer s3cret'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      claimed: 2,
      sent: 1,
      failed: 1,
      reminders: { queued: 2, duplicates: 0, stale: 0, failed: 0 },
      invoices: { error: 'invoices_failed' },
    });
    spy.mockRestore();
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
