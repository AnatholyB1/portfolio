// Utilitaire de test : n'importer que depuis des fichiers *.test.ts
import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { extractText, getDocumentProxy } from "unpdf";
import { normalizeText } from "../text";
import { setupPdf } from "./setup";

export async function renderBuffer(el: ReactElement): Promise<Buffer> {
  setupPdf();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(el as any);
}

export async function pdfText(el: ReactElement): Promise<string> {
  const buf = await renderBuffer(el);
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return normalizeText(text);
}
