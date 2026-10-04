import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  sampleAcceptanceSnapshot,
  sampleContractSnapshot,
  sampleInvoiceSnapshot,
  sampleQuoteSnapshot,
  sampleSpecSnapshot,
} from "./fixtures";
import { PROOF_CLAUSE } from "../signature/consentText";
import { formatEuros } from "./money";
import { pdfText, renderBuffer } from "./pdf/testText";
import { documentElement, TEMPLATES } from "./registry";
import { normalizeText } from "./text";
import {
  CURRENT_TEMPLATE_VERSION,
  DOC_TITLES,
  DOC_TYPES,
  type DocumentSnapshot,
} from "./types";

const snapshots: DocumentSnapshot[] = [
  sampleQuoteSnapshot(),
  sampleSpecSnapshot(),
  sampleContractSnapshot(),
  sampleAcceptanceSnapshot(),
  sampleInvoiceSnapshot(),
];

const texts = new Map<string, string>();
const buffers = new Map<string, Buffer>();
const RESERVATIONS = "Le bandeau de la page d'accueil est à ajuster.";
let acceptanceWithReservations = "";

beforeAll(async () => {
  for (const snap of snapshots) {
    const el = documentElement(snap);
    buffers.set(snap.docType, await renderBuffer(el));
    texts.set(snap.docType, await pdfText(el));
  }
  acceptanceWithReservations = await pdfText(
    documentElement(sampleAcceptanceSnapshot({ reservations: RESERVATIONS })),
  );
}, 120_000);

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listSourceFiles(full));
    else if (name !== "testText.ts" && /\.(ts|tsx)$/.test(name) &&!/\.test\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("registre et rendu des cinq documents", () => {
  for (const snap of snapshots) {
    it(`rend un PDF valide pour ${snap.docType}`, () => {
      expect(buffers.get(snap.docType)!.subarray(0, 5).toString("latin1")).toBe("%PDF-");
      const text = texts.get(snap.docType)!;
      expect(text).toContain(normalizeText(DOC_TITLES[snap.docType]));
      expect(text).toContain(snap.reference);
    }, 30_000);
  }

  it("lève unknown_template pour une version inconnue", () => {
    expect(() =>
      documentElement({ ...sampleQuoteSnapshot(), templateVersion: "v99" }),
    ).toThrow("unknown_template");
  });

  it("chaque type a un modèle pour sa version courante", () => {
    for (const t of DOC_TYPES) {
      expect(TEMPLATES[t][CURRENT_TEMPLATE_VERSION[t]]).toBeDefined();
    }
  });

  it("le contrat reprend la référence, le total du devis et la mention TVA", () => {
    const c = sampleContractSnapshot();
    const text = texts.get("contract")!;
    expect(text).toContain(c.quote.reference);
    expect(text).toContain(normalizeText(formatEuros(c.quote.totalCents)));
    expect(text).toContain("TVA non applicable, art. 293 B du CGI");
  }, 30_000);

  it("le contrat v2 porte la clause de preuve et la mention de non contre-signature, pas le v1", async () => {
    expect(CURRENT_TEMPLATE_VERSION.contract).toBe("v2");
    const base = sampleContractSnapshot();
    const v2 = await pdfText(documentElement({ ...base, templateVersion: "v2" }));
    expect(v2).toContain(normalizeText(PROOF_CLAUSE.v1.title));
    expect(v2).toContain("ne contre-signe pas");
    const v1 = await pdfText(documentElement({ ...base, templateVersion: "v1" }));
    expect(v1).not.toContain(normalizeText(PROOF_CLAUSE.v1.title));
    expect(v1).toContain(base.reference);
  }, 60_000);

  it("le cahier des charges numérote les critères", () => {
    const spec = sampleSpecSnapshot();
    const text = texts.get("spec")!;
    expect(text).toContain(`1. ${normalizeText(spec.acceptanceCriteria[0])}`);
  }, 30_000);

  it("le PV reprend les critères et indique les réserves", () => {
    const spec = sampleSpecSnapshot();
    const text = texts.get("acceptance")!;
    for (const crit of spec.acceptanceCriteria) {
      expect(text).toContain(normalizeText(crit));
    }
    expect(text).toContain("Aucune réserve.");
    expect(acceptanceWithReservations).toContain(normalizeText(RESERVATIONS));
    expect(acceptanceWithReservations).not.toContain("Aucune réserve.");
  }, 30_000);

  it("le cahier des charges et le PV ne contiennent aucun montant", () => {
    expect(texts.get("spec")).not.toContain("€");
    expect(texts.get("acceptance")).not.toContain("€");
  });

  it("aucun fichier hors test n'importe unpdf ou testText", () => {
    const offenders = listSourceFiles(join(process.cwd(), "src")).filter((f) => {
      const src = readFileSync(f, "utf8");
      return /from\s+["']unpdf["']|pdf\/testText|\.\/testText/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});
