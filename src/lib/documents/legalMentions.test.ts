// D-13 / DOC-04 : échoue si une mention obligatoire disparaît du modèle.
// Relecture comptable encore requise (STATE.md).
import { createElement } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { sampleClient, sampleInvoiceSnapshot, sampleQuoteSnapshot, sampleSeller } from "./fixtures";
import {
  findMissingMentions,
  invoiceMentions,
  quoteMentions,
  type Mention,
} from "./legalMentions";
import InvoiceV1 from "./pdf/templates/invoice/v1/InvoiceV1";
import QuoteV1 from "./pdf/templates/quote/v1/QuoteV1";
import { pdfText } from "./pdf/testText";
import { normalizeText } from "./text";
import { SELLER_V1 } from "./seller";
import type { InvoiceSnapshot, QuoteSnapshot } from "./types";

const sellers = [
  ["SELLER_V1", SELLER_V1],
  ["sampleSeller", sampleSeller],
] as const;

type Rendered<S> = { name: string; snapshot: S; text: string };

function assertNoVatRate(text: string) {
  expect(text).not.toMatch(/TVA\s*\(?\s*\d+([,.]\d+)?\s*%/);
  expect(text).not.toMatch(/\d\/\d/);
}

function assertNonVacuity(text: string, mentions: Mention[]) {
  for (const mention of mentions) {
    const stripped = mention.strip(normalizeText(text));
    const missing = findMissingMentions(stripped, mentions);
    expect(missing, `retirer « ${mention.id} » doit être détecté`).toContain(mention.id);
  }
}

describe("DOC-04 : devis", () => {
  const rendered: Rendered<QuoteSnapshot>[] = [];

  beforeAll(async () => {
    for (const [sellerName, seller] of sellers) {
      for (const billingDiffers of [false, true]) {
        const snapshot = sampleQuoteSnapshot({ seller, client: sampleClient({ billingDiffers }) });
        const text = await pdfText(createElement(QuoteV1, { snapshot }));
        rendered.push({ name: `${sellerName}, facturation ${billingDiffers ? "différente" : "identique"}`, snapshot, text });
      }
    }
  }, 120_000);

  it("contient toutes les mentions obligatoires", () => {
    expect(rendered.length).toBe(4);
    for (const r of rendered) {
      expect(findMissingMentions(r.text, quoteMentions(r.snapshot)), r.name).toEqual([]);
    }
  }, 30_000);

  it("liste les mentions attendues", () => {
    const ids = quoteMentions(rendered[0].snapshot).map((x) => x.id);
    for (const id of [
      "seller_siret",
      "vat_293b",
      "late_penalties",
      "recovery_40",
      "client_siren",
      "validity",
    ]) {
      expect(ids).toContain(id);
    }
  });

  it("n'imprime ni taux ni montant de TVA", () => {
    for (const r of rendered) assertNoVatRate(r.text);
  });

  it("non-vacuité : chaque mention retirée est détectée", () => {
    for (const r of rendered) assertNonVacuity(r.text, quoteMentions(r.snapshot));
  }, 30_000);
});

describe("DOC-04 : facture PROFORMA", () => {
  const rendered: (Rendered<InvoiceSnapshot> & { billingDiffers: boolean })[] = [];

  beforeAll(async () => {
    const variants = [
      { billingDiffers: false, vatStatus: "number" as const, kind: "deposit" as const },
      { billingDiffers: true, vatStatus: "not_subject" as const, kind: "balance" as const },
    ];
    for (const [sellerName, seller] of sellers) {
      for (const v of variants) {
        const snapshot = sampleInvoiceSnapshot({
          seller,
          kind: v.kind,
          client: sampleClient({ billingDiffers: v.billingDiffers, vatStatus: v.vatStatus }),
        });
        const text = await pdfText(createElement(InvoiceV1, { snapshot }));
        rendered.push({
          name: `${sellerName}, ${v.kind}, facturation ${v.billingDiffers ? "différente" : "identique"}`,
          snapshot,
          text,
          billingDiffers: v.billingDiffers,
        });
      }
    }
  }, 120_000);

  it("contient toutes les mentions obligatoires", () => {
    expect(rendered.length).toBe(4);
    for (const r of rendered) {
      expect(findMissingMentions(r.text, invoiceMentions(r.snapshot)), r.name).toEqual([]);
    }
  }, 30_000);

  it("porte la mention PROFORMA sans valeur légale", () => {
    for (const r of rendered) {
      expect(r.text).toContain("PROFORMA (aperçu, sans valeur légale)");
      expect(r.text).toContain("APERÇU");
    }
  });

  it("imprime l'adresse de livraison uniquement si elle diffère", () => {
    for (const r of rendered) {
      if (r.billingDiffers) {
        expect(r.text).toContain("Adresse de livraison");
        expect(r.text).toContain("8 avenue des Lilas");
      } else {
        expect(r.text).not.toContain("Adresse de livraison");
      }
    }
  });

  it("imprime le numéro de TVA du client seulement quand il en a un", () => {
    for (const r of rendered) {
      if (r.snapshot.client.vatStatus === "number") {
        expect(r.text).toContain("TVA intracommunautaire");
      } else {
        expect(r.text).not.toContain("TVA intracommunautaire");
      }
    }
  });

  it("n'imprime ni taux ni montant de TVA", () => {
    for (const r of rendered) assertNoVatRate(r.text);
  });

  it("non-vacuité : chaque mention retirée est détectée", () => {
    for (const r of rendered) assertNonVacuity(r.text, invoiceMentions(r.snapshot));
  }, 30_000);
});
