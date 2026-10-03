// Modèle Devis v1 : fonction pure d'un snapshot figé (D-02, D-06).
import { Document } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { formatDateLongFr } from "../../../../dates";
import { formatEuros, formatPercent } from "../../../../money";
import { VAT_FRANCHISE_MENTION } from "../../../../seller";
import { DOC_TITLES, type QuoteSnapshot } from "../../../../types";
import {
  DocPage,
  HeaderBand,
  LinesTable,
  MetaGrid,
  Parties,
  PaymentConditions,
  SectionHeading,
  SignatureBox,
  TotalsBlock,
} from "../../../primitives";

export default function QuoteV1({ snapshot }: { snapshot: QuoteSnapshot }): ReactElement {
  const s = snapshot;
  return (
    <Document title={`Devis ${s.reference}`} author={s.seller.legalName} language="fr-FR">
      <DocPage
        reference={s.reference}
        seller={s.seller}
        templateVersion={s.templateVersion}
        showModel
      >
        <HeaderBand
          seller={s.seller}
          title={DOC_TITLES.quote}
          reference={s.reference}
          issuedOn={s.issuedOn}
        />
        <Parties seller={s.seller} client={s.client} showSignatory={false} />
        <MetaGrid
          items={[
            { label: "Date du devis", value: formatDateLongFr(s.issuedOn) },
            {
              label: "Valable jusqu'au",
              value: `${formatDateLongFr(s.validUntil)} (${s.validityDays} jours)`,
            },
            { label: "Délai de réalisation", value: s.leadTime },
            { label: "Projet", value: s.project.title },
          ]}
        />
        <LinesTable lines={s.lines} />
        <TotalsBlock
          rows={[
            { label: "Total HT", value: formatEuros(s.totalCents) },
            { label: VAT_FRANCHISE_MENTION, fine: true },
            { label: "Total TTC", value: formatEuros(s.totalCents), bold: true },
            {
              label: `Acompte à la commande (${formatPercent(s.depositPercent)})`,
              value: formatEuros(s.depositCents),
            },
            { label: "Solde à la livraison", value: formatEuros(s.balanceCents) },
          ]}
        />
        <SectionHeading>Conditions</SectionHeading>
        <PaymentConditions seller={s.seller} includeBank={false} />
        <SignatureBox
          title="Bon pour accord"
          columns={[
            "Date et signature du client",
            "Mention manuscrite « Bon pour accord »",
          ]}
        />
      </DocPage>
    </Document>
  );
}
