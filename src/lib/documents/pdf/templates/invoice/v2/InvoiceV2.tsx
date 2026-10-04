// Modèle Facture v2 : facture numérotée (acompte, période, finale). Les textes légaux sont lus
// dans le snapshot figé (Pitfall 11). Le tampon APERÇU / PROFORMA n'apparaît que sans numéro.
import { Document, Text, View } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { formatDateLongFr } from "../../../../dates";
import { formatEuros } from "../../../../money";
import { DISCOUNT_TEXT } from "../../../../seller";
import type { InvoiceSnapshotV2 } from "../../../../types";
import {
  DocPage,
  HeaderBand,
  LedgerLinesTable,
  MetaGrid,
  PDF_COLORS,
  Parties,
  SectionHeading,
  TotalsBlock,
} from "../../../primitives";

const TITLES: Record<InvoiceSnapshotV2["kind"], string> = {
  deposit: "Facture d'acompte",
  period: "Facture",
  final: "Facture finale",
};

export default function InvoiceV2({ snapshot }: { snapshot: InvoiceSnapshotV2 }): ReactElement {
  const s = snapshot;
  const preview = s.number === null;
  const meta = [
    { label: "Numéro", value: preview ? "PROFORMA" : (s.number as string) },
    { label: "Date d'émission", value: formatDateLongFr(s.issuedOn) },
    { label: "Date d'échéance", value: formatDateLongFr(s.dueDate) },
    ...(s.servicePeriod
      ? [
          {
            label: "Période",
            value: `Période du ${formatDateLongFr(s.servicePeriod.start)} au ${formatDateLongFr(s.servicePeriod.end)}`,
          },
        ]
      : []),
    ...(s.quote ? [{ label: "Devis", value: `Devis ${s.quote.reference}` }] : []),
    ...(s.orderNumber ? [{ label: "Commande", value: `Commande ${s.orderNumber}` }] : []),
    { label: "Nature de l'opération", value: "Prestation de services" },
  ];
  const totals = [
    { label: "Total HT", value: formatEuros(s.totalExclTaxCents) },
    { label: s.vatExemptionText, fine: true },
    { label: "Total TTC", value: formatEuros(s.totalInclTaxCents) },
    ...(s.prepaidCents > 0
      ? [
          { label: "Acompte déjà versé", value: formatEuros(s.prepaidCents) },
          { label: "Net à payer", value: formatEuros(s.netToPayCents), bold: true },
        ]
      : []),
  ];
  return (
    <Document
      title={preview ? "Facture PROFORMA" : `Facture ${s.number}`}
      author={s.seller.legalName}
      language="fr-FR"
    >
      <DocPage
        reference={s.number ?? "PROFORMA"}
        seller={s.seller}
        templateVersion={s.templateVersion}
        showModel
      >
        {preview ? (
          <View
            fixed
            style={{
              position: "absolute",
              top: 24,
              right: 48,
              borderWidth: 1,
              borderColor: PDF_COLORS.ink,
              borderStyle: "solid",
              paddingVertical: 4,
              paddingHorizontal: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: 700, color: PDF_COLORS.ink }}>APERÇU</Text>
          </View>
        ) : null}
        <HeaderBand
          seller={s.seller}
          title={TITLES[s.kind]}
          reference={s.number ?? "PROFORMA"}
          issuedOn={s.issuedOn}
          extra={preview ? "Numéro : PROFORMA (aperçu, sans valeur légale)" : `Numéro : ${s.number}`}
        />
        <Parties seller={s.seller} client={s.client} showSignatory={false} />
        <MetaGrid items={meta} />
        <LedgerLinesTable lines={s.lines} deductions={s.deductions} />
        <TotalsBlock rows={totals} />
        <SectionHeading>Règlement</SectionHeading>
        <View wrap={false}>
          <Text>{s.paymentTermsText}</Text>
          <Text>{s.latePenaltyText}</Text>
          <Text>{s.recoveryIndemnityText}</Text>
          <Text>{DISCOUNT_TEXT}</Text>
          <Text>{`IBAN : ${s.seller.iban}`}</Text>
          <Text>{`BIC : ${s.seller.bic}`}</Text>
        </View>
      </DocPage>
    </Document>
  );
}
