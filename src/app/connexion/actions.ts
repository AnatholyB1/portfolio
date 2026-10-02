'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { LOGIN_COPY, otpCodeSchema } from '@/lib/auth/schemas';
import { safeNext } from '@/lib/auth/safeNext';
import { getRoleDestination } from '@/lib/server/auth/dal';
import {
  LOGIN_VERIFY_TYPES,
  checkVerifyThrottle,
  requestLoginCode,
} from '@/lib/server/auth/login';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type LoginState = {
  step: 'email' | 'code';
  email?: string;
  message?: string;
  error?: string;
  resendAt?: number;
};

const RESEND_DELAY_MS = 60_000;

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
}

function text(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
}

export async function requestCodeAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = text(formData, 'email');
  const result = await requestLoginCode({ email, ip: await clientIp() }, (task) => after(task));
  if (result.status === 'invalid') return { step: 'email', error: LOGIN_COPY.invalidEmail };
  if (result.status === 'rate_limited') return { step: 'email', error: LOGIN_COPY.rateLimited };
  return {
    step: 'code',
    email: email.trim().toLowerCase(),
    message: LOGIN_COPY.identical,
    resendAt: Date.now() + RESEND_DELAY_MS,
  };
}

export async function verifyCodeAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const base: LoginState = { step: 'code', email: text(formData, 'email').trim().toLowerCase() };
  const parsed = otpCodeSchema.safeParse({
    email: text(formData, 'email'),
    code: text(formData, 'code'),
  });
  if (!parsed.success) return { ...base, error: LOGIN_COPY.wrongCode };
  const { email, code } = parsed.data;

  if (!(await checkVerifyThrottle(email, await clientIp()))) {
    return { ...base, error: LOGIN_COPY.rateLimited };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: LOGIN_VERIFY_TYPES.code,
  });
  if (error || !data?.user) return { ...base, error: LOGIN_COPY.wrongCode };

  const destination = await getRoleDestination(supabase, data.user.id);
  if (!destination) {
    await supabase.auth.signOut({ scope: 'local' });
    return { ...base, error: LOGIN_COPY.generic };
  }
  redirect(safeNext(text(formData, 'next') || null, destination));
}
