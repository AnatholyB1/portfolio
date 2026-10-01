// Spike: records auth facts (A1, A2) consumed by plans 10-05 and 10-10.
// Output lines are tagged [spike] so they can be copied into the SUMMARY.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { addMember, anonClient, cleanup, makeClient, makeUser, svc, type TestUser } from './helpers';

let member: TestUser;

beforeAll(async () => {
  member = await makeUser('authspike', { password: false });
  const c = await makeClient('RLS Auth Spike Client');
  await addMember(c.id, member);
});

afterAll(cleanup);

type OtpType = 'email' | 'magiclink';

async function tryVerify(
  params: { token?: string; token_hash?: string },
  email: string,
): Promise<{ type: OtpType | null; client: ReturnType<typeof anonClient> }> {
  for (const type of ['email', 'magiclink'] as OtpType[]) {
    const client = anonClient();
    const args =
      params.token !== undefined
        ? { email, token: params.token, type }
        : { token_hash: params.token_hash as string, type };
    const { data, error } = await client.auth.verifyOtp(args);
    if (!error && data.session) return { type, client };
  }
  return { type: null, client: anonClient() };
}

describe('auth spike (A1, A2)', () => {
  it('generateLink returns a 6-digit email_otp and verifyOtp works for code and token_hash', async () => {
    const first = await svc().auth.admin.generateLink({ type: 'magiclink', email: member.email });
    expect(first.error).toBeNull();
    const props = first.data.properties;
    // Spike finding (plan 10-07): the OTP length is a project auth setting (6 historically, 8 on
    // the fresh branch). Accept 6-10 digits and record the observed length below.
    expect(props?.email_otp).toMatch(/^\d{6,10}$/);
    expect(props?.hashed_token).toBeTruthy();
    console.info(`[spike] email_otp length=${props?.email_otp.length}`);

    const code = await tryVerify({ token: props!.email_otp }, member.email);
    console.info(`[spike] verifyOtp code type=${code.type}`);
    expect(code.type).not.toBeNull();

    const second = await svc().auth.admin.generateLink({ type: 'magiclink', email: member.email });
    const link = await tryVerify({ token_hash: second.data.properties!.hashed_token }, member.email);
    console.info(`[spike] verifyOtp token_hash type=${link.type}`);
    expect(link.type).not.toBeNull();
    console.info(`A1: code=${code.type} link=${link.type}`);
  });

  it('session_id claim is present, stable across refresh, and sv_session_age_ok behaves', async () => {
    const gen = await svc().auth.admin.generateLink({ type: 'magiclink', email: member.email });
    const verified = await tryVerify({ token: gen.data.properties!.email_otp }, member.email);
    expect(verified.type).not.toBeNull();
    const client = verified.client;

    const before = await client.auth.getClaims();
    const sid = before.data?.claims.session_id as string | undefined;
    console.info(`[spike] session_id present=${Boolean(sid)}`);
    expect(sid).toBeTruthy();

    const ok = await svc().rpc('sv_session_age_ok', { p_session_id: sid, p_max_days: 30 });
    expect(ok.error).toBeNull();
    expect(ok.data).toBe(true);
    const expired = await svc().rpc('sv_session_age_ok', { p_session_id: sid, p_max_days: 0 });
    expect(expired.error).toBeNull();
    expect(expired.data).toBe(false);

    const refreshed = await client.auth.refreshSession();
    expect(refreshed.error).toBeNull();
    const after = await client.auth.getClaims();
    const stable = after.data?.claims.session_id === sid;
    console.info(`[spike] A2 session_id stable across refresh=${stable ? 'yes' : 'no'}`);
    expect(stable).toBe(true);
  });
});
