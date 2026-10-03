// Registre des modèles versionnés. Une correction de modèle = nouvelle version (v2),
// jamais une modification de v1 utilisée par des documents émis.
import { createElement, type ReactElement } from "react";
import AcceptanceV1 from "./pdf/templates/acceptance/v1/AcceptanceV1";
import ContractV1 from "./pdf/templates/contract/v1/ContractV1";
import InvoiceV1 from "./pdf/templates/invoice/v1/InvoiceV1";
import QuoteV1 from "./pdf/templates/quote/v1/QuoteV1";
import SpecV1 from "./pdf/templates/spec/v1/SpecV1";
import type { DocType, DocumentSnapshot } from "./types";

export const TEMPLATES: {
  [K in DocType]: Record<
    string,
    (p: { snapshot: Extract<DocumentSnapshot, { docType: K }> }) => ReactElement
  >;
} = {
  quote: { v1: QuoteV1 },
  spec: { v1: SpecV1 },
  contract: { v1: ContractV1 },
  acceptance: { v1: AcceptanceV1 },
  invoice: { v1: InvoiceV1 },
};

export function documentElement(snapshot: DocumentSnapshot): ReactElement {
  const byVersion = TEMPLATES[snapshot.docType] as
    | Record<string, (p: { snapshot: DocumentSnapshot }) => ReactElement>
    | undefined;
  const template = byVersion?.[snapshot.templateVersion];
  if (!template) throw new Error("unknown_template");
  return createElement(template, { snapshot });
}
