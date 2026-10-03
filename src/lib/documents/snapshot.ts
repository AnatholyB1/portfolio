// Assemblage de l'instantané figé (D-02). Totaux recalculés ici en centimes (D-06) ; ne jamais faire confiance aux totaux du formulaire.
// Module pur : pas de server-only, pas d'horloge, pas de fetch.
import type { OnboardingRow } from '@/lib/projects/onboardingSchema';
import { OFFER_LABELS } from '@/lib/projects/offers';
import { addDaysIso } from './dates';
import { lineTotalCents, quoteTotals } from './money';
import type { DocumentInput } from './schemas';
import {
  buildReference,
  CURRENT_TEMPLATE_VERSION,
  type ClientParty,
  type DocumentSnapshot,
  type PostalAddress,
  type QuoteSnapshot,
  type SellerIdentity,
  type SpecSnapshot,
} from './types';

export type SnapshotContext = {
  project: { id: string; title: string; offer: string };
  client: { name: string; siret: string | null; company: unknown };
  onboarding: OnboardingRow | null;
  seller: SellerIdentity;
  /** YYYY-MM-DD Paris, calculé par l'appelant avec parisDateOf(now). */
  issuedOn: string;
  /** Issu de checkIssuable / checkPreviewable. */
  revision: number;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function companyField(company: unknown, key: string): string {
  if (company && typeof company === 'object') return str((company as Record<string, unknown>)[key]);
  return '';
}

function offerLabelOf(offer: string): string {
  return (OFFER_LABELS as Record<string, string>)[offer] ?? offer;
}

export function clientPartyFrom(
  client: SnapshotContext['client'],
  onboarding: OnboardingRow | null,
): ClientParty {
  const nom = companyField(client.company, 'nom');
  const adresse = companyField(client.company, 'adresse');
  const address: PostalAddress | null = adresse
    ? {
        line: adresse,
        postalCode: companyField(client.company, 'code_postal'),
        city: companyField(client.company, 'commune'),
      }
    : null;
  const billingDiffers = onboarding?.billingSameAsCompany === false;
  const ba = onboarding?.billingAddress ?? null;
  // Facturation identique à l'entreprise : l'adresse de facturation est l'adresse de l'entreprise.
  const billingAddress: PostalAddress | null = billingDiffers
    ? ba
      ? { line: ba.adresse, postalCode: ba.code_postal, city: ba.commune }
      : null
    : address;
  const siret = client.siret ?? '';
  const vatStatus = onboarding?.vatStatus ?? null;
  return {
    name: nom || client.name,
    siret,
    siren: siret.replace(/\D/g, '').slice(0, 9),
    address,
    billingAddress,
    billingDiffers,
    vatStatus,
    vatNumber: vatStatus === 'not_subject' ? null : (onboarding?.vatNumber ?? null),
    signatoryName: onboarding?.signatoryName ?? null,
    signatoryRole: onboarding?.signatoryRole ?? null,
  };
}

export function buildSnapshot(
  input: DocumentInput,
  ctx: SnapshotContext,
  prereq: { quote?: QuoteSnapshot; spec?: SpecSnapshot },
): DocumentSnapshot {
  const docType = input.docType;
  const base = {
    schemaVersion: 1 as const,
    templateVersion: CURRENT_TEMPLATE_VERSION[docType],
    reference: buildReference(docType, ctx.project.id, ctx.issuedOn, ctx.revision),
    revision: ctx.revision,
    issuedOn: ctx.issuedOn,
    seller: structuredClone(ctx.seller),
    client: clientPartyFrom(ctx.client, ctx.onboarding),
    project: { id: ctx.project.id, title: ctx.project.title, offerLabel: offerLabelOf(ctx.project.offer) },
  };

  switch (input.docType) {
    case 'quote': {
      const lines = input.lines.map((l) => ({
        designation: l.designation,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        totalCents: lineTotalCents(l.quantity, l.unitPriceCents),
      }));
      const t = quoteTotals(lines, input.depositPercent);
      return {
        ...base,
        docType: 'quote',
        lines,
        ...t,
        depositPercent: input.depositPercent,
        validityDays: input.validityDays,
        validUntil: addDaysIso(ctx.issuedOn, input.validityDays),
        leadTime: input.leadTime,
      };
    }
    case 'spec':
      return {
        ...base,
        docType: 'spec',
        sections: {
          context: input.context,
          scope: input.scope,
          deliverables: input.deliverables,
          outOfScope: input.outOfScope,
          planning: input.planning,
        },
        acceptanceCriteria: [...input.acceptanceCriteriaList],
      };
    case 'contract': {
      const q = prereq.quote;
      if (!q) throw new Error('missing_prerequisite');
      return {
        ...base,
        docType: 'contract',
        quote: {
          reference: q.reference,
          revision: q.revision,
          issuedOn: q.issuedOn,
          lines: q.lines.map((l) => ({ ...l })),
          totalCents: q.totalCents,
          depositPercent: q.depositPercent,
          depositCents: q.depositCents,
          balanceCents: q.balanceCents,
          leadTime: q.leadTime,
        },
        startDate: input.startDate ?? null,
      };
    }
    case 'acceptance': {
      const s = prereq.spec;
      if (!s) throw new Error('missing_prerequisite');
      return {
        ...base,
        docType: 'acceptance',
        spec: { reference: s.reference, revision: s.revision, issuedOn: s.issuedOn },
        acceptanceCriteria: [...s.acceptanceCriteria],
        deliveryDate: input.deliveryDate,
        reservations: input.reservations ? input.reservations : null,
      };
    }
    case 'invoice': {
      const q = prereq.quote;
      if (!q) throw new Error('missing_prerequisite');
      const deposit = input.kind === 'deposit';
      const lines = deposit
        ? [
            {
              designation: `Acompte de ${q.depositPercent} % sur le devis ${q.reference}`,
              quantity: 1,
              unitPriceCents: q.depositCents,
              totalCents: q.depositCents,
            },
          ]
        : q.lines.map((l) => ({ ...l }));
      return {
        ...base,
        docType: 'invoice',
        number: 'PROFORMA',
        kind: input.kind,
        quote: { reference: q.reference, revision: q.revision },
        lines,
        totalCents: deposit ? q.depositCents : q.totalCents,
        depositPercent: q.depositPercent,
        depositCents: q.depositCents,
        balanceCents: q.balanceCents,
        alreadyPaidCents: deposit ? 0 : q.depositCents,
        netToPayCents: deposit ? q.depositCents : q.balanceCents,
        serviceDate: input.serviceDate,
        dueDate: addDaysIso(ctx.issuedOn, ctx.seller.paymentTermsDays),
        orderNumber: input.orderNumber ?? null,
        operationNature: 'Prestation de services',
        deliveryAddress: base.client.billingDiffers ? base.client.address : null,
      };
    }
  }
}
