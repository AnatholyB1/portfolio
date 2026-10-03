// Modèle de contrat v1, clauses fixes (D-07).
// Texte juridique à faire relire avant mise en production (blocker STATE.md).
// Convention de preuve ajoutée en phase 14 (nouvelle version de modèle).
import { Document, Text, View } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { formatDateLongFr } from "../../../../dates";
import { formatEuros, formatPercent } from "../../../../money";
import { VAT_FRANCHISE_MENTION } from "../../../../seller";
import { DOC_TITLES, type ContractSnapshot } from "../../../../types";
import {
  DocPage,
  HeaderBand,
  LinesTable,
  Parties,
  PaymentConditions,
  SectionHeading,
  SignatureBox,
  TotalsBlock,
  pdfStyles,
} from "../../../primitives";

const CLAUSE_DELIVERABLES =
  "Les livrables, leur périmètre et les critères d'acceptation sont décrits dans le cahier des charges remis au client. La livraison donne lieu à un procès-verbal de recette : le client dispose de ses critères d'acceptation pour vérifier la conformité et formuler, le cas échéant, ses réserves par écrit.";

const CLAUSE_IP =
  "Sous réserve du paiement intégral du prix, le vendeur cède au client les droits d'exploitation sur les livrables spécifiquement réalisés pour lui, pour la durée de protection légale et pour le monde entier. Les outils, composants et méthodes préexistants du vendeur restent sa propriété ; le client reçoit un droit d'usage non exclusif sur ceux qui sont intégrés aux livrables.";

const CLAUSE_LIABILITY =
  "Le vendeur est tenu d'une obligation de moyens. Sa responsabilité est limitée aux dommages directs et prévisibles et ne peut excéder le montant total du prix hors taxes du présent contrat. Elle ne couvre pas les dommages indirects, notamment la perte d'exploitation, de données ou de clientèle.";

const CLAUSE_CONFIDENTIALITY =
  "Chaque partie s'engage à garder confidentielles les informations non publiques reçues de l'autre partie dans le cadre du contrat, pendant sa durée et pendant trois ans après son terme, sauf obligation légale de communication.";

const CLAUSE_TERMINATION =
  "En cas de manquement grave d'une partie à ses obligations, non réparé dans un délai de quinze jours après mise en demeure par lettre recommandée ou courrier électronique avec accusé de réception, l'autre partie peut résilier le contrat de plein droit. Les prestations réalisées jusqu'à la résiliation restent dues au prorata de leur avancement.";

const CLAUSE_LAW =
  "Le contrat est soumis au droit français. À défaut de résolution amiable, tout litige relève des tribunaux compétents du ressort du siège du vendeur.";

function Article({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactElement | string;
}): ReactElement {
  return (
    <View style={pdfStyles.block}>
      <SectionHeading>{`Article ${n} — ${title}`}</SectionHeading>
      {typeof children === "string" ? (
        <Text style={pdfStyles.paragraph}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export default function ContractV1({
  snapshot,
}: {
  snapshot: ContractSnapshot;
}): ReactElement {
  const s = snapshot;
  const q = s.quote;
  const sellerName = s.seller.showEiMention ? `EI ${s.seller.legalName}` : s.seller.legalName;
  return (
    <Document title={`Contrat ${s.reference}`} author={s.seller.legalName} language="fr-FR">
      <DocPage
        reference={s.reference}
        seller={s.seller}
        templateVersion={s.templateVersion}
        showModel
      >
        <HeaderBand
          seller={s.seller}
          title={DOC_TITLES.contract}
          reference={s.reference}
          issuedOn={s.issuedOn}
        />
        <Article n={1} title="Parties">
          <Parties seller={s.seller} client={s.client} showSignatory />
        </Article>
        <Article n={2} title="Objet">
          {`Le présent contrat a pour objet la réalisation par ${sellerName} (le vendeur) pour ${s.client.name} (le client) de l'offre « ${s.project.offerLabel} », projet « ${s.project.title} », dans les conditions du devis ${q.reference}.`}
        </Article>
        <Article n={3} title="Prix et modalités de paiement">
          <View>
            <Text style={pdfStyles.paragraph}>{`Devis ${q.reference} (révision ${q.revision}), émis le ${formatDateLongFr(q.issuedOn)}.`}</Text>
            <LinesTable lines={q.lines} />
            <TotalsBlock
              rows={[
                { label: "Total HT", value: formatEuros(q.totalCents) },
                { label: VAT_FRANCHISE_MENTION, fine: true },
                { label: "Total TTC", value: formatEuros(q.totalCents), bold: true },
                {
                  label: `Acompte à la commande (${formatPercent(q.depositPercent)})`,
                  value: formatEuros(q.depositCents),
                },
                { label: "Solde à la livraison", value: formatEuros(q.balanceCents) },
              ]}
            />
          </View>
        </Article>
        <Article n={4} title="Délais">
          {`Délai de réalisation : ${q.leadTime}.${s.startDate ? ` Date de démarrage : ${formatDateLongFr(s.startDate)}.` : ""}`}
        </Article>
        <Article n={5} title="Livrables et recette">
          {CLAUSE_DELIVERABLES}
        </Article>
        <Article n={6} title="Propriété intellectuelle">
          {CLAUSE_IP}
        </Article>
        <Article n={7} title="Responsabilité">
          {CLAUSE_LIABILITY}
        </Article>
        <Article n={8} title="Confidentialité">
          {CLAUSE_CONFIDENTIALITY}
        </Article>
        <Article n={9} title="Résiliation">
          {CLAUSE_TERMINATION}
        </Article>
        <Article n={10} title="Droit applicable">
          {CLAUSE_LAW}
        </Article>
        <PaymentConditions seller={s.seller} includeBank={false} />
        <View wrap={false}>
          <SignatureBox
            title="Signatures"
            columns={[
              `Pour Sèvalys : ${sellerName}`,
              `Pour le client : ${s.client.signatoryName ?? s.client.name}${s.client.signatoryRole ? `, ${s.client.signatoryRole}` : ""}`,
              "Date et signature",
            ]}
          />
        </View>
      </DocPage>
    </Document>
  );
}
