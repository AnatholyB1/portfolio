// Decision d'envoi par flux (D-06, D-07, D-13). Deux choix assumes :
// - les destinataires admin contournent la garde (Pitfall 7) : les alertes doivent toujours arriver ;
// - echec de la consultation : fail-closed pour le marketing (echec reessayable
//   'suppression_unavailable'), fail-open pour le transactionnel (jamais de facture ni de
//   signature bloquee sur une erreur de lookup).
import 'server-only';
import { callRpc } from '@/lib/server/rpc';
import type { MailClass, MailTemplate } from './rules';

export type BlockScope = 'all' | 'marketing' | 'none';
export type SendVerdict = 'ok' | 'suppressed' | 'flag_off' | 'suppression_unavailable';

export async function blockScope(email: string): Promise<BlockScope | 'error'> {
  const res = await callRpc<unknown>('mail/suppression', 'sv_mail_block_scope', {
    p_email: email.trim().toLowerCase(),
  });
  if (res.ok && (res.data === 'all' || res.data === 'marketing' || res.data === 'none')) {
    return res.data;
  }
  console.error('[mail/suppression] lookup_failed');
  return 'error';
}

export function decideSend(i: {
  mailClass: MailClass;
  recipientKind: 'client' | 'admin';
  template: MailTemplate;
  scope: BlockScope | 'error';
  reviewEnabled: boolean;
}): SendVerdict {
  if (i.template === 'review_request' && !i.reviewEnabled) return 'flag_off';
  if (i.recipientKind === 'admin') return 'ok';
  if (i.mailClass === 'marketing') {
    if (i.scope === 'error') return 'suppression_unavailable';
    return i.scope === 'none' ? 'ok' : 'suppressed';
  }
  return i.scope === 'all' ? 'suppressed' : 'ok';
}
