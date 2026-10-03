// Génère src/lib/documents/fontData.ts à partir des WOFF Manrope committés.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const b64 = (name) =>
  readFileSync(join(root, "assets", "fonts", name)).toString("base64");

const out = `// Fichier généré par scripts/gen-pdf-fonts.mjs, ne pas modifier.
// Manrope (OFL 1.1), sous-ensemble latin.
export const MANROPE_400 = 'data:font/woff;base64,${b64("manrope-latin-400-normal.woff")}';
export const MANROPE_700 = 'data:font/woff;base64,${b64("manrope-latin-700-normal.woff")}';
`;

writeFileSync(join(root, "src", "lib", "documents", "fontData.ts"), out);
