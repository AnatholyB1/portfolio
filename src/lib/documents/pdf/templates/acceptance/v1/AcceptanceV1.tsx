// Modèle PV de recette v1 (D-09) : critères repris du cahier des charges, aucun montant, pas de flux de signature.
import { Document, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { formatDateLongFr } from "../../../../dates";
import { DOC_TITLES, type AcceptanceSnapshot } from "../../../../types";
import {
  DocPage,
  HeaderBand,
  MetaGrid,
  PDF_COLORS,
  Paragraphs,
  SectionHeading,
  pdfStyles,
} from "../../../primitives";

const a = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 0.75,
    borderBottomColor: PDF_COLORS.rule,
    borderBottomStyle: "solid",
  },
  head: { flexDirection: "row", backgroundColor: PDF_COLORS.band },
  colNum: { width: 36 },
  colCrit: { flex: 1 },
  colOk: { width: 72 },
  cell: { paddingVertical: 8, paddingHorizontal: 8 },
  headText: { fontSize: 8, fontWeight: 700 },
  box: {
    width: 10,
    height: 10,
    borderWidth: 0.75,
    borderColor: PDF_COLORS.ink,
    borderStyle: "solid",
  },
  zone: {
    backgroundColor: PDF_COLORS.band,
    height: 96,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
});

export default function AcceptanceV1({
  snapshot,
}: {
  snapshot: AcceptanceSnapshot;
}): ReactElement {
  const s = snapshot;
  const reservations = s.reservations && s.reservations.trim() !== "" ? s.reservations : null;
  return (
    <Document
      title={`${DOC_TITLES.acceptance} ${s.reference}`}
      author={s.seller.legalName}
      language="fr-FR"
    >
      <DocPage
        reference={s.reference}
        seller={s.seller}
        templateVersion={s.templateVersion}
        showModel
      >
        <HeaderBand
          seller={s.seller}
          title={DOC_TITLES.acceptance}
          reference={s.reference}
          issuedOn={s.issuedOn}
        />
        <MetaGrid
          items={[
            { label: "Projet", value: s.project.title },
            { label: "Date de livraison", value: formatDateLongFr(s.deliveryDate) },
            {
              label: "Document de référence",
              value: `Cahier des charges de référence : ${s.spec.reference} (version ${s.spec.revision})`,
            },
            { label: "Client", value: s.client.name },
          ]}
        />
        <View style={pdfStyles.table}>
          <View style={a.head} wrap={false}>
            <Text style={[a.cell, a.headText, a.colNum]}>N°</Text>
            <Text style={[a.cell, a.headText, a.colCrit]}>Critère</Text>
            <Text style={[a.cell, a.headText, a.colOk]}>Conforme</Text>
          </View>
          {s.acceptanceCriteria.map((c, i) => (
            <View key={i} style={a.row} wrap={false}>
              <Text style={[a.cell, a.colNum]}>{String(i + 1)}</Text>
              <Text style={[a.cell, a.colCrit]}>{c}</Text>
              <View style={[a.cell, a.colOk]}>
                <View style={a.box} />
              </View>
            </View>
          ))}
        </View>
        <View style={pdfStyles.block}>
          <SectionHeading>Réserves</SectionHeading>
          <Paragraphs text={reservations ?? "Aucune réserve."} />
        </View>
        <View wrap={false}>
          <View style={a.zone}>
            <Text>Le client déclare accepter la livraison</Text>
            <Text style={pdfStyles.fine}>Date et signature</Text>
          </View>
        </View>
      </DocPage>
    </Document>
  );
}
