// Modèle Facture v1, APERÇU PROFORMA uniquement (D-10) : jamais stocké, sans valeur légale.
import { Document, Text, View } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { formatDateLongFr } from "../../../../dates";
import { formatEuros } from "../../../../money";
import { VAT_FRANCHISE_MENTION } from "../../../../seller";
import { DOC_TITLES, type InvoiceSnapshot } from "../../../../types";
import {
  DocPage,
  HeaderBand,
  LinesTable,
  MetaGrid,
  PDF_COLORS,
  Parties,
  PaymentConditions,
  SectionHeading,
  TotalsBlock,
} from "../../../primitives";

export default function InvoiceV1({ snapshot }: { snapshot: InvoiceSnapshot }): ReactElement {
  const s = snapshot;
  const meta = [
    { label: "Date d'émission", value: formatDateLongFr(s.issuedOn) },
    { label: "Date de la prestation", value: formatDateLongFr(s.serviceDate) },
    { label: "Date d'échéance", value: formatDateLongFr(s.dueDate) },
    { label: "Nature de l'opération", value: s.operationNature },
    { label: "Référence du devis", value: s.quote.reference },
    ...(s.orderNumber ? [{ label: "N° de commande", value: s.orderNumber }] : []),
  ];
  const totals = [
    { label: "Total HT", value: formatEuros(s.totalCents) },
    { label: VAT_FRANCHISE_MENTION, fine: true },
    { label: "Total TTC", value: formatEuros(s.totalCents) },
    ...(s.alreadyPaidCents > 0
      ? [{ label: "Acompte déjà réglé", value: formatEuros(s.alreadyPaidCents) }]
      : []),
    { label: "Net à payer", value: formatEuros(s.netToPayCents), bold: true },
  ];
  return (
    <Document title="Facture PROFORMA" author={s.seller.legalName} language="fr-FR">
      <DocPage
        reference={s.reference}
        seller={s.seller}
        templateVersion={s.templateVersion}
        showModel
      >
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
        <HeaderBand
          seller={s.seller}
          title={DOC_TITLES.invoice}
          reference={s.reference}
          issuedOn={s.issuedOn}
          extra="Numéro : PROFORMA (aperçu, sans valeur légale)"
        />
        <Parties
          seller={s.seller}
          client={s.client}
          showSignatory={false}
          deliveryAddress={s.deliveryAddress}
        />
        <MetaGrid items={meta} />
        <LinesTable lines={s.lines} />
        <TotalsBlock rows={totals} />
        <SectionHeading>Règlement</SectionHeading>
        <PaymentConditions seller={s.seller} includeBank />
      </DocPage>
    </Document>
  );
}
