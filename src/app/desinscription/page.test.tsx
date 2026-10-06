import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import DesinscriptionPage from './page';
import { metadata } from './layout';
import { signUnsubscribeToken } from '@/lib/server/mail/unsubscribeToken';

const SECRET = 'x'.repeat(40);
const EMAIL = 'jean.dupont@example.com';

async function render(sp: { t?: string; ok?: string }) {
  const el = await DesinscriptionPage({ searchParams: Promise.resolve(sp) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  vi.stubEnv('UNSUBSCRIBE_SECRET', SECRET);
});

describe('/desinscription page', () => {
  it('confirms the unsubscribe with ok=1', async () => {
    const html = await render({ ok: '1' });
    expect(html).toContain('Vous êtes désinscrit');
    expect(html).toMatch(/factures/);
    expect(html).toMatch(/codes de connexion/);
    expect(html).toMatch(/signature/);
  });

  it('shows masked address and a POST form for a valid token', async () => {
    const t = signUnsubscribeToken(EMAIL, SECRET);
    const html = await render({ t });
    expect(html).toContain('j***@example.com');
    expect(html).not.toContain(EMAIL);
    expect(html).toContain('method="post"');
    expect(html).toContain(`action="/api/unsubscribe?t=${encodeURIComponent(t)}"`);
    expect(html).toContain('name="source"');
    expect(html).toContain('value="link"');
    expect(html).toContain('Confirmer la désinscription');
  });

  it('shows the generic message for an invalid token, without a form', async () => {
    const html = await render({ t: 'garbage.token' });
    expect(html).toContain('Ce lien de désinscription est invalide ou incomplet.');
    expect(html).toContain('contact@sevalys.com');
    expect(html).not.toContain('<form');
  });

  it('shows the generic message when the token is missing', async () => {
    const html = await render({});
    expect(html).toContain('invalide ou incomplet');
    expect(html).not.toContain('<form');
  });

  it('shows the generic message when UNSUBSCRIBE_SECRET is unset', async () => {
    const t = signUnsubscribeToken(EMAIL, SECRET);
    vi.stubEnv('UNSUBSCRIBE_SECRET', '');
    const html = await render({ t });
    expect(html).toContain('invalide ou incomplet');
    expect(html).not.toContain('<form');
    expect(html).not.toContain(EMAIL);
  });
});

describe('/desinscription layout metadata', () => {
  it('is noindex and sends no referrer', () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.referrer).toBe('no-referrer');
  });
});
