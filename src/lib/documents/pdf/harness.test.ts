import { Document, Page, Text, View } from "@react-pdf/renderer";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { formatEuros } from "../money";
import { BULLET_GLYPH, PDF_FONT_FAMILY, setupPdf } from "./setup";
import { pdfText, renderBuffer } from "./testText";

function doc(...children: ReturnType<typeof createElement>[]) {
  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: "A4", style: { fontFamily: PDF_FONT_FAMILY, padding: 40 } },
      ...children,
    ),
  );
}

describe("harness React-PDF", () => {
  it("rend un PDF valide", async () => {
    const buf = await renderBuffer(doc(createElement(Text, null, "Bonjour")));
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 20_000);

  it("extrait le texte français et les montants", async () => {
    const amount = formatEuros(123450);
    const text = await pdfText(
      doc(
        createElement(
          Text,
          null,
          "Indemnité forfaitaire pour frais de recouvrement : 40 €",
        ),
        createElement(Text, null, "œuvre"),
        createElement(Text, null, `Total HT ${amount}`),
      ),
    );
    expect(text).toContain(
      "Indemnité forfaitaire pour frais de recouvrement : 40 €",
    );
    expect(text).toContain("œuvre");
    expect(text).toContain("Total HT 1 234,50 €");
    expect(text).not.toMatch(/\d\/\d/);
  }, 20_000);

  it("ne coupe jamais un mot (césure désactivée)", async () => {
    const word = "indemnisation";
    const text = await pdfText(
      doc(
        createElement(
          View,
          { style: { width: 60 } },
          createElement(Text, null, `${word} ${word} ${word}`),
        ),
      ),
    );
    expect(text).not.toMatch(/\w-\s?\w/);
    expect(text.replace(/\s/g, "")).toContain(word.repeat(3));
  }, 20_000);

  it("produit des octets différents à chaque rendu", async () => {
    const el = doc(createElement(Text, null, "Identique"));
    const h = async () =>
      createHash("sha256")
        .update(await renderBuffer(el))
        .digest("hex");
    expect(await h()).not.toBe(await h());
  }, 20_000);

  it("setupPdf est idempotent", () => {
    expect(() => {
      setupPdf();
      setupPdf();
    }).not.toThrow();
  });

  it("le glyphe puce est extractible", async () => {
    const text = await pdfText(
      doc(createElement(Text, null, `${BULLET_GLYPH} Premier point`)),
    );
    expect(text).toContain(`${BULLET_GLYPH} Premier point`);
  }, 20_000);
});
