// Modèle Cahier des charges v1 : six sections dans un ordre fixe (D-08). Aucun montant.
import { Document, View } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { formatDateLongFr } from "../../../../dates";
import { DOC_TITLES, type SpecSnapshot } from "../../../../types";
import {
  DocPage,
  HeaderBand,
  MetaGrid,
  NumberedList,
  Paragraphs,
  SectionHeading,
  pdfStyles,
} from "../../../primitives";

const EMPTY = "Non renseigné.";

export default function SpecV1({ snapshot }: { snapshot: SpecSnapshot }): ReactElement {
  const s = snapshot;
  const sections: { title: string; text: string }[] = [
    { title: "Contexte et objectif", text: s.sections.context },
    { title: "Périmètre", text: s.sections.scope },
    { title: "Livrables", text: s.sections.deliverables },
    { title: "Hors périmètre", text: s.sections.outOfScope },
    { title: "Planning", text: s.sections.planning },
  ];
  return (
    <Document
      title={`Cahier des charges ${s.reference}`}
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
          title={DOC_TITLES.spec}
          reference={s.reference}
          issuedOn={s.issuedOn}
        />
        <MetaGrid
          items={[
            { label: "Projet", value: s.project.title },
            { label: "Date", value: formatDateLongFr(s.issuedOn) },
            { label: "Version", value: `Version ${s.revision}` },
            { label: "Client", value: s.client.name },
          ]}
        />
        {sections.map((sec) => (
          <View key={sec.title} style={pdfStyles.block}>
            <SectionHeading>{sec.title}</SectionHeading>
            <Paragraphs text={sec.text.trim() === "" ? EMPTY : sec.text} />
          </View>
        ))}
        <View style={pdfStyles.block}>
          <SectionHeading>Critères d'acceptation</SectionHeading>
          {s.acceptanceCriteria.length === 0 ? (
            <Paragraphs text={EMPTY} />
          ) : (
            <NumberedList items={s.acceptanceCriteria} />
          )}
        </View>
      </DocPage>
    </Document>
  );
}
