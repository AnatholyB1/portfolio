// Primitives PDF partagées (UI-SPEC Surface C). Pures : aucune lecture DB, aucun new Date().
import { Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { formatAddress, formatSiretPrint } from "../addressFormat";
import { formatDateLongFr } from "../dates";
import { formatEuros } from "../money";
import {
  DISCOUNT_TEXT,
  RECOVERY_INDEMNITY_TEXT,
  VAT_FRANCHISE_MENTION,
  latePenaltyText,
} from "../seller";
import type {
  ClientParty,
  PostalAddress,
  QuoteLine,
  SellerIdentity,
  TemplateVersion,
} from "../types";
import { BULLET_GLYPH, PDF_FONT_FAMILY, setupPdf } from "./setup";

setupPdf();

export const PDF_COLORS = {
  paper: "#FFFFFF",
  ink: "#111111",
  muted: "#5A5A5A",
  rule: "#D4D4D4",
  band: "#F4F4F2",
} as const;

const s = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    fontWeight: 400,
    lineHeight: 1.5,
    color: PDF_COLORS.ink,
    backgroundColor: PDF_COLORS.paper,
    paddingTop: 48,
    paddingRight: 48,
    paddingBottom: 64,
    paddingLeft: 48,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: PDF_COLORS.muted,
    lineHeight: 1.5,
  },
  footerRight: { flexDirection: "row", gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    minHeight: 64,
    paddingBottom: 12,
    borderBottomWidth: 0.75,
    borderBottomColor: PDF_COLORS.rule,
    borderBottomStyle: "solid",
    marginBottom: 24,
  },
  brand: { fontSize: 12, fontWeight: 700, lineHeight: 1.2 },
  fine: { fontSize: 8, color: PDF_COLORS.muted, lineHeight: 1.5 },
  fineInk: { fontSize: 8, lineHeight: 1.5 },
  title: { fontSize: 24, fontWeight: 700, lineHeight: 1.2, textAlign: "right" },
  headerRight: { alignItems: "flex-end", maxWidth: 300 },
  right: { textAlign: "right" },
  parties: { flexDirection: "row", gap: 24, marginBottom: 24 },
  party: { flex: 1 },
  partyName: { fontSize: 10, fontWeight: 700 },
  heading: { fontSize: 12, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 },
  paragraph: { marginBottom: 8 },
  bulletRow: { flexDirection: "row", marginBottom: 4, paddingLeft: 16 },
  bulletMark: { width: 12 },
  bulletText: { flex: 1 },
  table: { marginBottom: 24 },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: PDF_COLORS.rule,
    borderBottomStyle: "solid",
  },
  th: {
    flexDirection: "row",
    backgroundColor: PDF_COLORS.band,
  },
  cell: { paddingVertical: 8, paddingHorizontal: 8 },
  thText: { fontSize: 8, fontWeight: 700, lineHeight: 1.5 },
  colDesignation: { flex: 1 },
  colQty: { width: 48, textAlign: "right" },
  colUnit: { width: 96, textAlign: "right" },
  colTotal: { width: 96, textAlign: "right" },
  totals: {
    width: 220,
    alignSelf: "flex-end",
    backgroundColor: PDF_COLORS.band,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  bold: { fontWeight: 700 },
  signature: {
    backgroundColor: PDF_COLORS.band,
    height: 96,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    gap: 24,
  },
  signatureCol: { flex: 1 },
  block: { marginBottom: 24 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 24 },
  metaItem: { width: "50%", marginBottom: 8 },
});

export const pdfStyles = s;

export { formatAddress, formatSiretPrint };

export function DocPage({
  reference,
  seller,
  templateVersion,
  showModel,
  children,
}: {
  reference: string;
  seller: SellerIdentity;
  templateVersion: TemplateVersion;
  showModel: boolean;
  children?: ReactNode;
}) {
  return (
    <Page size="A4" style={s.page}>
      {children}
      <View style={s.footer} fixed>
        <Text>{`Sèvalys · SIRET ${formatSiretPrint(seller.siret)} · ${reference}`}</Text>
        <View style={s.footerRight}>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
          {showModel ? <Text>{`Modèle ${templateVersion}`}</Text> : null}
        </View>
      </View>
    </Page>
  );
}

export function HeaderBand({
  seller,
  title,
  reference,
  issuedOn,
  extra,
}: {
  seller: SellerIdentity;
  title: string;
  reference: string;
  issuedOn: string;
  extra?: string;
}) {
  return (
    <View style={s.header}>
      <View>
        <Text style={s.brand}>{seller.tradeName}</Text>
        <Text style={s.fine}>{seller.legalForm}</Text>
      </View>
      <View style={s.headerRight}>
        <Text style={s.title}>{title}</Text>
        <Text style={[s.fine, s.right]}>{`Réf. ${reference}`}</Text>
        <Text style={[s.fine, s.right]}>{`Émis le ${formatDateLongFr(issuedOn)}`}</Text>
        {extra ? <Text style={[s.fineInk, s.bold, s.right]}>{extra}</Text> : null}
      </View>
    </View>
  );
}

export function Parties({
  seller,
  client,
  showSignatory,
  deliveryAddress,
}: {
  seller: SellerIdentity;
  client: ClientParty;
  showSignatory: boolean;
  deliveryAddress?: PostalAddress | null;
}) {
  const sellerName = seller.showEiMention ? `EI ${seller.legalName}` : seller.legalName;
  return (
    <View style={s.parties}>
      <View style={s.party}>
        <Text style={s.fine}>Vendeur</Text>
        <Text style={s.partyName}>{sellerName}</Text>
        <Text>{seller.legalForm}</Text>
        <Text>{`SIRET ${formatSiretPrint(seller.siret)}`}</Text>
        <Text>{formatAddress(seller.address)}</Text>
        <Text>{seller.registration}</Text>
        {seller.capital ? <Text>{`Capital : ${seller.capital}`}</Text> : null}
        {seller.vatRegime === "franchise" ? <Text>{VAT_FRANCHISE_MENTION}</Text> : null}
      </View>
      <View style={s.party}>
        <Text style={s.fine}>Client</Text>
        <Text style={s.partyName}>{client.name}</Text>
        <Text>{`SIREN ${client.siren}`}</Text>
        {client.address ? <Text>{formatAddress(client.address)}</Text> : null}
        {client.billingDiffers && client.billingAddress ? (
          <Text>{`Adresse de facturation : ${formatAddress(client.billingAddress)}`}</Text>
        ) : null}
        {client.vatStatus === "number" && client.vatNumber ? (
          <Text>{`TVA intracommunautaire : ${client.vatNumber}`}</Text>
        ) : null}
        {showSignatory && client.signatoryName ? (
          <Text>
            {`Signataire : ${client.signatoryName}${client.signatoryRole ? `, ${client.signatoryRole}` : ""}`}
          </Text>
        ) : null}
        {deliveryAddress ? (
          <Text>{`Adresse de livraison : ${formatAddress(deliveryAddress)}`}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function MetaGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={s.metaGrid}>
      {items.map((it) => (
        <View key={it.label} style={s.metaItem}>
          <Text style={s.fine}>{it.label}</Text>
          <Text>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function LinesTable({ lines }: { lines: QuoteLine[] }) {
  return (
    <View style={s.table}>
      <View style={s.th} wrap={false}>
        <Text style={[s.cell, s.thText, s.colDesignation]}>Désignation</Text>
        <Text style={[s.cell, s.thText, s.colQty]}>Qté</Text>
        <Text style={[s.cell, s.thText, s.colUnit]}>Prix unitaire HT</Text>
        <Text style={[s.cell, s.thText, s.colTotal]}>Total HT</Text>
      </View>
      {lines.map((l, i) => (
        <View key={i} style={s.tr} wrap={false}>
          <Text style={[s.cell, s.colDesignation]}>{l.designation}</Text>
          <Text style={[s.cell, s.colQty]}>{String(l.quantity)}</Text>
          <Text style={[s.cell, s.colUnit]}>{formatEuros(l.unitPriceCents)}</Text>
          <Text style={[s.cell, s.colTotal]}>{formatEuros(l.totalCents)}</Text>
        </View>
      ))}
    </View>
  );
}

export function TotalsBlock({
  rows,
}: {
  rows: { label: string; value?: string; fine?: boolean; bold?: boolean }[];
}) {
  return (
    <View style={s.totals} wrap={false}>
      {rows.map((r, i) => (
        <View key={i} style={s.totalsRow}>
          <Text style={[r.fine ? s.fineInk : {}, r.bold ? s.bold : {}]}>{r.label}</Text>
          {r.value !== undefined ? (
            <Text style={r.bold ? s.bold : {}}>{r.value}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function SectionHeading({ children }: { children: string }) {
  return (
    <Text style={s.heading} minPresenceAhead={48}>
      {children}
    </Text>
  );
}

export function Paragraphs({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b !== "");
  return (
    <View>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <View key={i} style={s.paragraph}>
              {lines.map((l, j) => (
                <View key={j} style={s.bulletRow}>
                  <Text style={s.bulletMark}>{BULLET_GLYPH}</Text>
                  <Text style={s.bulletText}>{l.slice(2)}</Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={i} style={s.paragraph}>
            {block}
          </Text>
        );
      })}
    </View>
  );
}

export function NumberedList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((it, i) => (
        <View key={i} style={s.bulletRow} wrap={false}>
          <Text style={s.bulletMark}>{`${i + 1}.`}</Text>
          <Text style={s.bulletText}>{it}</Text>
        </View>
      ))}
    </View>
  );
}

export function PaymentConditions({
  seller,
  includeBank,
}: {
  seller: SellerIdentity;
  includeBank: boolean;
}) {
  return (
    <View style={s.block} wrap={false}>
      <Text>{seller.paymentTermsText}</Text>
      <Text>{latePenaltyText(seller)}</Text>
      <Text>{RECOVERY_INDEMNITY_TEXT}</Text>
      <Text>{DISCOUNT_TEXT}</Text>
      {includeBank ? <Text>{`IBAN : ${seller.iban}`}</Text> : null}
      {includeBank ? <Text>{`BIC : ${seller.bic}`}</Text> : null}
    </View>
  );
}

export function SignatureBox({ columns, title }: { columns: string[]; title?: string }) {
  return (
    <View wrap={false}>
      {title ? <Text style={s.heading}>{title}</Text> : null}
      <View style={s.signature}>
        {columns.map((c) => (
          <View key={c} style={s.signatureCol}>
            <Text style={s.fine}>{c}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
