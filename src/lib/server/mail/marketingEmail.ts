// E-mails marketing (D-11, D-12, D-13). Décision A2 : expéditeur bonjour@sevalys.com sur le
// domaine sevalys.com déjà vérifié (SPF/DKIM/DMARC de la phase 10), pas de sous-domaine d'envoi
// dédié (reporté). Un e-mail marketing ne peut pas être construit sans pied de page de
// désinscription ni en-têtes RFC 8058.
import 'server-only';
import { SELLER_V1 } from '@/lib/documents/seller';
import { buildFromHeader } from './fromHeader';
import { INVITE_EMAIL_REPLY_TO, escapeHtml } from './inviteEmail';
import { emailLayout, type BuiltBody } from './layout';

export const MARKETING_EMAIL_FROM = buildFromHeader('Sèvalys', 'bonjour@sevalys.com');
export const MARKETING_REPLY_TO = INVITE_EMAIL_REPLY_TO;

export type MarketingContent = {
  subject: string;
  heading: string;
  paragraphs: string[];
  button: string;
  url: string;
};

function isHttps(value: unknown): value is string {
  if (typeof value !== 'string' || value === '') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildMarketingEmail(
  content: MarketingContent,
  links: { pageUrl: string; oneClickUrl: string },
): BuiltBody & { from: string; replyTo: string; headers: Record<string, string> } {
  if (!isHttps(links.pageUrl) || !isHttps(links.oneClickUrl)) {
    throw new Error('missing_unsubscribe');
  }
  const identity = `${SELLER_V1.tradeName}, ${SELLER_V1.legalName}, ${SELLER_V1.address.line}, ${SELLER_V1.address.postalCode} ${SELLER_V1.address.city}`;
  const reason = 'Vous recevez cet e-mail car vous êtes client de Sèvalys.';
  const footer = {
    html: `${escapeHtml(identity)}<br>${escapeHtml(reason)} <a href="${escapeHtml(links.pageUrl)}" style="color:inherit;text-decoration:underline;">Se désinscrire</a>`,
    text: `${identity}\n${reason}\nSe désinscrire : ${links.pageUrl}`,
  };
  const body = emailLayout({ ...content, footer });
  return {
    ...body,
    from: MARKETING_EMAIL_FROM,
    replyTo: MARKETING_REPLY_TO,
    headers: {
      'List-Unsubscribe': `<${links.oneClickUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}
