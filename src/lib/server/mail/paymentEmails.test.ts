import { describe, expect, it } from 'vitest';
import { formatEuros } from '@/lib/documents/money';
import { escapeHtml } from './inviteEmail';
import {
  creditNoteIssuedEmail,
  paymentAnomalyAdminEmail,
  paymentReceivedEmail,
  paymentReminderAdminEmail,
  paymentReminderEmail,
  paymentRequestEmail,
} from './paymentEmails';

const PAY_URL = 'https://sevalys.com/espace-client/paiements';
const both = (m: { html: string; text: string }) => [m.html, m.text];
// Html escapes apostrophes: compare html against its escaped form.
const has = (m: { html: string; text: string }, s: string) => {
  expect(m.text).toContain(s);
  expect(m.html).toContain(escapeHtml(s));
};

describe('paymentRequestEmail', () => {
  const base = { invoiceNumber: 'FA-2026-0001', amountCents: 123400, projectTitle: 'Projet X' };

  it('deposit', () => {
    const m = paymentRequestEmail({ ...base, kind: 'deposit' });
    expect(m.subject).toBe("Facture d'acompte FA-2026-0001 — Projet X");
    for (const o of both(m)) {
      expect(o).toContain(formatEuros(123400));
      expect(o).toContain(PAY_URL);
    }
    has(m, "Payer l'acompte");
  });

  it('period', () => {
    const m = paymentRequestEmail({
      ...base,
      kind: 'period',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
    });
    expect(m.subject).toBe('Nouvelle facture FA-2026-0001 — Projet X');
    for (const o of both(m)) {
      expect(o).toContain('pour la période du 01/10/2026 au 31/10/2026');
      expect(o).toContain('Voir mes factures');
    }
  });

  it('final', () => {
    const m = paymentRequestEmail({ ...base, kind: 'final' });
    expect(m.subject).toBe('Facture finale FA-2026-0001 — Projet X');
    for (const o of both(m)) expect(o).toContain('Payer le solde');
  });

  it('escapes html in project title and has no pixel or attachment', () => {
    const m = paymentRequestEmail({ ...base, kind: 'deposit', projectTitle: '<script>x</script>' });
    expect(m.html).not.toContain('<script>');
    expect(m.html).not.toContain('<img');
  });
});

describe('paymentReceivedEmail', () => {
  it('renders subject and button', () => {
    const m = paymentReceivedEmail({
      invoiceNumber: 'FA-2026-0001',
      amountCents: 5000,
      projectTitle: 'P',
    });
    expect(m.subject).toBe('Paiement reçu : facture FA-2026-0001');
    for (const o of both(m)) {
      expect(o).toContain('Ouvrir mon espace client');
      expect(o).toContain(formatEuros(5000));
    }
  });
});

describe('paymentReminderEmail', () => {
  const base = { invoiceNumber: 'FA-2026-0001', amountCents: 5000, projectTitle: 'P' };
  it('d3', () => {
    const m = paymentReminderEmail({ ...base, stage: 'd3' });
    expect(m.subject).toBe("Rappel : facture d'acompte FA-2026-0001");
    has(m, 'Si vous avez déjà payé, ignorez ce message.');
    for (const o of both(m)) expect(o).not.toContain('ne peut pas avoir lieu');
  });
  it('d7', () => {
    const m = paymentReminderEmail({ ...base, stage: 'd7' });
    expect(m.subject).toBe("Dernier rappel : facture d'acompte FA-2026-0001");
    has(m, 'Sans règlement, le démarrage de votre projet ne peut pas avoir lieu.');
    has(m, 'Si vous avez déjà payé, ignorez ce message.');
  });
});

describe('admin emails', () => {
  it('reminder admin links to the project sheet', () => {
    const m = paymentReminderAdminEmail({
      invoiceNumber: 'FA-2026-0001',
      amountCents: 5000,
      projectTitle: 'Projet X',
      clientName: 'Acme',
      issuedOn: '2026-10-01',
      projectId: 'proj-1',
    });
    expect(m.subject).toBe('Acompte impayé depuis 14 jours — Projet X');
    for (const o of both(m)) {
      expect(o).toContain('Ouvrir la fiche projet');
      expect(o).toContain('https://sevalys.com/admin/projets/proj-1');
      expect(o).toContain('Acme');
    }
  });

  it('anomaly shows the gap', () => {
    const m = paymentAnomalyAdminEmail({
      invoiceNumber: 'FA-2026-0001',
      amountCents: 5000,
      expectedCents: 6000,
      projectTitle: 'Projet X',
      projectId: 'proj-1',
    });
    expect(m.subject).toBe('Paiement à rapprocher — Projet X');
    for (const o of both(m)) expect(o).toContain(`écart : ${formatEuros(1000)}`);
  });

  it('anomaly without invoice', () => {
    const m = paymentAnomalyAdminEmail({
      invoiceNumber: null,
      amountCents: 5000,
      expectedCents: 0,
      projectTitle: 'P',
      projectId: 'p',
    });
    expect(m.text).toContain('aucune facture');
  });
});

describe('creditNoteIssuedEmail', () => {
  const base = {
    creditNoteNumber: 'AV-2026-0001',
    invoiceNumber: 'FA-2026-0001',
    amountCents: 5000,
    projectTitle: 'P',
  };
  it('mentions refund only when requested', () => {
    const yes = creditNoteIssuedEmail({ ...base, refundRequested: true });
    const no = creditNoteIssuedEmail({ ...base, refundRequested: false });
    expect(yes.subject).toBe('Avoir AV-2026-0001 — P');
    for (const o of both(yes)) expect(o).toContain('sera crédité sous 1 à 3 jours');
    for (const o of both(no)) expect(o).not.toContain('crédité');
  });
});
