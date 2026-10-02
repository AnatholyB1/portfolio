import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type RpcResult = { data: unknown; error: { message: string } | null };

const rpcMock = vi.fn<(name: string, args: Record<string, unknown>) => Promise<RpcResult>>();
const generateLinkMock = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    rpc: rpcMock,
    auth: { admin: { generateLink: generateLinkMock } },
  }),
}));

const sendMock = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const { requestLoginCode, issueLoginCode, checkVerifyThrottle, normalizeEmail, LOGIN_VERIFY_TYPES } =
  await import('./login');
const { hitThrottle, hashKey } = await import('./throttle');
const { LOGIN_EMAIL_FROM, LOGIN_EMAIL_REPLY_TO } = await import('@/lib/server/mail/loginCodeEmail');

let invited = true;
let throttleAllowed: (key: string) => boolean = () => true;

function schedulerSpy() {
  const tasks: Array<() => Promise<void>> = [];
  const schedule = vi.fn((task: () => Promise<void>) => {
    tasks.push(task);
  });
  return { schedule, tasks };
}

beforeEach(() => {
  vi.clearAllMocks();
  invited = true;
  throttleAllowed = () => true;
  process.env.SV_LOGIN_ENABLED = 'true';
  process.env.SV_OTP_EXPIRY_MINUTES = '60';
  process.env.RESEND_API_KEY = 're_test';
  delete process.env.NEXT_PUBLIC_SITE_URL;
  rpcMock.mockImplementation(async (name, args) => {
    if (name === 'sv_login_allowed') return { data: invited, error: null };
    if (name === 'sv_throttle_hit') return { data: throttleAllowed(String(args.p_key)), error: null };
    return { data: null, error: { message: 'unknown rpc' } };
  });
  generateLinkMock.mockResolvedValue({
    data: { properties: { email_otp: '12345678', hashed_token: 'hash_abc' } },
    error: null,
  });
  sendMock.mockResolvedValue({ data: { id: 'x' }, error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function rpcNames() {
  return rpcMock.mock.calls.map((c) => c[0]);
}

describe('requestLoginCode', () => {
  it('rejects an invalid email without any RPC or scheduling', async () => {
    const { schedule } = schedulerSpy();
    const res = await requestLoginCode({ email: 'nope', ip: '1.2.3.4' }, schedule);
    expect(res).toEqual({ status: 'invalid' });
    expect(rpcMock).not.toHaveBeenCalled();
    expect(schedule).not.toHaveBeenCalled();
  });

  it('sends to an invited address through the gated pipeline', async () => {
    const { schedule, tasks } = schedulerSpy();
    const res = await requestLoginCode({ email: ' Jean@Example.com ', ip: '1.2.3.4' }, schedule);
    expect(res).toEqual({ status: 'sent' });
    expect(schedule).toHaveBeenCalledTimes(1);
    await tasks[0]();
    expect(rpcMock).toHaveBeenCalledWith('sv_login_allowed', { p_email: 'jean@example.com' });
    expect(generateLinkMock).toHaveBeenCalledWith({ type: 'magiclink', email: 'jean@example.com' });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const payload = sendMock.mock.calls[0][0];
    expect(payload.from).toBe(LOGIN_EMAIL_FROM);
    expect(payload.replyTo).toBe(LOGIN_EMAIL_REPLY_TO);
    expect(payload.to).toBe('jean@example.com');
    expect(payload.html).toContain('12345678');
    expect(payload.html).toContain(
      `https://sevalys.com/auth/confirm?token_hash=hash_abc&amp;type=${LOGIN_VERIFY_TYPES.link}`,
    );
    expect(payload.text).toContain(
      `https://sevalys.com/auth/confirm?token_hash=hash_abc&type=${LOGIN_VERIFY_TYPES.link}`,
    );
    expect(payload.html).toContain('valable 60 minutes');
  });

  it('returns the identical result for a non-invited address and sends nothing', async () => {
    invited = false;
    const { schedule, tasks } = schedulerSpy();
    const res = await requestLoginCode({ email: 'ghost@example.com', ip: '1.2.3.4' }, schedule);
    expect(res).toEqual({ status: 'sent' });
    await tasks[0]();
    expect(rpcNames()).toContain('sv_login_allowed');
    expect(generateLinkMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('does nothing while SV_LOGIN_ENABLED is not true, with the identical result', async () => {
    delete process.env.SV_LOGIN_ENABLED;
    const { schedule, tasks } = schedulerSpy();
    const res = await requestLoginCode({ email: 'jean@example.com', ip: '1.2.3.4' }, schedule);
    expect(res).toEqual({ status: 'sent' });
    await tasks[0]();
    expect(rpcNames()).not.toContain('sv_login_allowed');
    expect(generateLinkMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rate-limits on the email key', async () => {
    throttleAllowed = (key) => !key.startsWith('login-email:');
    const { schedule } = schedulerSpy();
    const res = await requestLoginCode({ email: 'jean@example.com', ip: '1.2.3.4' }, schedule);
    expect(res).toEqual({ status: 'rate_limited' });
    expect(schedule).not.toHaveBeenCalled();
  });

  it('rate-limits on the ip key, identically for unknown addresses', async () => {
    invited = false;
    throttleAllowed = (key) => !key.startsWith('login-ip:');
    const { schedule } = schedulerSpy();
    const res = await requestLoginCode({ email: 'ghost@example.com', ip: '1.2.3.4' }, schedule);
    expect(res).toEqual({ status: 'rate_limited' });
    expect(schedule).not.toHaveBeenCalled();
  });

  it('applies only the email throttle when ip is null', async () => {
    const { schedule } = schedulerSpy();
    await requestLoginCode({ email: 'jean@example.com', ip: null }, schedule);
    const keys = rpcMock.mock.calls
      .filter((c) => c[0] === 'sv_throttle_hit')
      .map((c) => String(c[1].p_key));
    expect(keys).toHaveLength(1);
    expect(keys[0].startsWith('login-email:')).toBe(true);
  });
});

describe('issueLoginCode resilience', () => {
  it('does not throw nor leak data when generateLink fails', async () => {
    generateLinkMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(issueLoginCode('jean@example.com')).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
    const logged = JSON.stringify((console.error as unknown as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).toContain('[auth/login]');
    expect(logged).not.toContain('jean@example.com');
  });

  it('does not throw nor log the code when Resend fails', async () => {
    sendMock.mockResolvedValue({ data: null, error: { message: 'resend down' } });
    await expect(issueLoginCode('jean@example.com')).resolves.toBeUndefined();
    const logged = JSON.stringify((console.error as unknown as ReturnType<typeof vi.fn>).mock.calls);
    expect(logged).toContain('[auth/login]');
    expect(logged).not.toContain('12345678');
    expect(logged).not.toContain('hash_abc');
    expect(logged).not.toContain('jean@example.com');
  });

  it('aborts silently when email_otp is not 8 digits', async () => {
    generateLinkMock.mockResolvedValue({
      data: { properties: { email_otp: 'abc', hashed_token: 'h' } },
      error: null,
    });
    await expect(issueLoginCode('jean@example.com')).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('throttle and helpers', () => {
  it('fails closed when the throttle RPC errors', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'db down' } });
    await expect(hitThrottle('k', 900, 5)).resolves.toBe(false);
  });

  it('hashKey never exposes the raw value', () => {
    const key = hashKey('login-email', 'jean@example.com');
    expect(key).toMatch(/^login-email:[0-9a-f]{64}$/);
    expect(key).not.toContain('jean');
  });

  it('checkVerifyThrottle uses verify keys and honours denial', async () => {
    expect(await checkVerifyThrottle('jean@example.com', '1.2.3.4')).toBe(true);
    throttleAllowed = (key) => !key.startsWith('verify-ip:');
    expect(await checkVerifyThrottle('jean@example.com', '1.2.3.4')).toBe(false);
  });

  it('normalizeEmail trims and lowercases', () => {
    expect(normalizeEmail(' A@B.CO ')).toBe('a@b.co');
  });
});

describe('D-06 static guard', () => {
  it('never uses signInWithOtp or auth.signUp in src', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.ts$/.test(entry)) {
          const src = readFileSync(full, 'utf8');
          if (src.includes('signInWithOtp(') || src.includes('auth.signUp(')) offenders.push(full);
        }
      }
    };
    walk(join(process.cwd(), 'src'));
    expect(offenders).toEqual([]);
  });
});
