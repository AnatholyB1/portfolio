// Modèle Avoir v1 (D-14). Montants positifs, texte d'exemption lu dans le snapshot.
import { Document, Text, View } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { formatDateLongFr } from "../../../../dates";
import { formatEuros } from "../../../../money";
import type { CreditNoteSnapshot } from "../../../../types";
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

export default function CreditNoteV1({
  snapshot,
}: {
  snapshot: CreditNoteSnapshot;
}): ReactElement {
  const s = snapshot;
  const preview = s.number === null;
  const meta = [
    { label: "Numéro", value: preview ? "PROFORMA" : (s.number as string) },
    { label: "Date d'émission", value: formatDateLongFr(s.issuedOn) },
    {
      label: "Facture d'origine",
      value: `Avoir sur la facture ${s.origin.number} du ${formatDateLongFr(s.origin.issuedOn)}`,
    },
  ];
  const totals = [
    { label: "Total HT crédité", value: formatEuros(s.totalExclTaxCents) },
    { label: s.vatExemptionText, fine: true },
    { label: "Total TTC crédité", value: formatEuros(s.totalInclTaxCents), bold: true },
  ];
  return (
    <Document
      title={preview ? "Avoir PROFORMA" : `Avoir ${s.number}`}
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
          title="Avoir"
          reference={s.number ?? "PROFORMA"}
          issuedOn={s.issuedOn}
          extra={preview ? "Numéro : PROFORMA (aperçu, sans valeur légale)" : `Numéro : ${s.number}`}
        />
        <Parties seller={s.seller} client={s.client} showSignatory={false} />
        <MetaGrid items={meta} />
        <SectionHeading>Motif</SectionHeading>
        <Text style={{ marginBottom: 24 }}>{s.reason}</Text>
        <LedgerLinesTable lines={s.lines} />
        <TotalsBlock rows={totals} />
        <Text>{`Remboursement par Stripe : ${s.refundRequested ? "oui" : "non"}`}</Text>
      </DocPage>
    </Document>
  );
}
