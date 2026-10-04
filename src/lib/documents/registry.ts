// Registre des modèles versionnés. Une correction de modèle = nouvelle version (v2),
// jamais une modification de v1 utilisée par des documents émis.
import { createElement, type ReactElement } from "react";
import AcceptanceV1 from "./pdf/templates/acceptance/v1/AcceptanceV1";
import ContractV1 from "./pdf/templates/contract/v1/ContractV1";
import ContractV2 from "./pdf/templates/contract/v2/ContractV2";
import InvoiceV1 from "./pdf/templates/invoice/v1/InvoiceV1";
import QuoteV1 from "./pdf/templates/quote/v1/QuoteV1";
import SpecV1 from "./pdf/templates/spec/v1/SpecV1";
import CreditNoteV1 from "./pdf/templates/credit-note/v1/CreditNoteV1";
import InvoiceV2 from "./pdf/templates/invoice/v2/InvoiceV2";
import type { DocType, DocumentSnapshot, LedgerSnapshot } from "./types";

export const TEMPLATES: {
  [K in DocType]: Record<
    string,
    (p: { snapshot: Extract<DocumentSnapshot, { docType: K }> }) => ReactElement
  >;
} = {
  quote: { v1: QuoteV1 },
  spec: { v1: SpecV1 },
  contract: { v1: ContractV1, v2: ContractV2 },
  acceptance: { v1: AcceptanceV1 },
  invoice: { v1: InvoiceV1 },
};

export const LEDGER_TEMPLATES = {
  invoice: { v2: InvoiceV2 },
  credit_note: { v1: CreditNoteV1 },
} as const;

export function ledgerDocumentElement(snapshot: LedgerSnapshot): ReactElement {
  const byVersion = (LEDGER_TEMPLATES as Record<string, Record<string, unknown> | undefined>)[
    snapshot.docType
  ];
  const template = byVersion?.[snapshot.templateVersion] as
    | ((p: { snapshot: LedgerSnapshot }) => ReactElement)
    | undefined;
  if (!template) throw new Error("unknown_template");
  return createElement(template, { snapshot });
}

export function documentElement(snapshot: DocumentSnapshot): ReactElement {
  const byVersion = TEMPLATES[snapshot.docType] as
    | Record<string, (p: { snapshot: DocumentSnapshot }) => ReactElement>
    | undefined;
  const template = byVersion?.[snapshot.templateVersion];
  if (!template) throw new Error("unknown_template");
  return createElement(template, { snapshot });
}
