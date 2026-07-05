// Génère les assets bitmap de marque Sèvalys.
// Icônes : à partir du symbole sève vectoriel (favicon / app).
// OG image : emblème Higgsfield validé (public/emblem.png, job 87af4ed3)
//            composité à droite + wordmark vectoriel net à gauche.
// Sorties : public/icon-192.png, icon-512.png, icon-maskable.png, og-image.png
// Usage : node scripts/gen-brand-assets.mjs
import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = resolve(__dirname, "../public");

const BG = "#0A0B0C";
const ACID = "#C4F542";
const INK = "#ECEAE3";
const INK_DIM = "#9A9690";
const LINE = "#1F1F1F";

// Tracé figé du symbole sève (viewBox 0 0 120 120)
const SEVE = `
  <path d="M84 40 C84 26 64 22 50 28 C36 34 34 50 52 56 C70 62 86 66 84 82 C82 98 60 102 44 94"
    fill="none" stroke="{c}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="97" cy="29" rx="11" ry="5" transform="rotate(-38 97 29)" fill="{c}"/>`;
const seve = (color) => SEVE.replaceAll("{c}", color);

// ── Icônes « app » : fond near-black arrondi, symbole acide ──────────────
function iconSvg(size, { maskable = false } = {}) {
  const rx = maskable ? 0 : Math.round(size * 0.22);
  const inset = maskable ? size * 0.28 : size * 0.2; // marge de sécurité maskable
  const inner = size - inset * 2;
  const scale = inner / 120;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${rx}" fill="${BG}"/>
    <g transform="translate(${inset} ${inset}) scale(${scale})">${seve(ACID)}</g>
  </svg>`;
}

// ── OG image 1200×630 — carte de partage premium ────────────────────────
const W = 1200, H = 630;

// Couche 1 : fond near-black + grille + lueur + barre d'accent
const ogBase = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  ${Array.from({ length: 19 }, (_, i) => `<line x1="${i * 64}" y1="0" x2="${i * 64}" y2="${H}" stroke="${LINE}" stroke-width="1" opacity="0.45"/>`).join("")}
  ${Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="${i * 64}" x2="${W}" y2="${i * 64}" stroke="${LINE}" stroke-width="1" opacity="0.45"/>`).join("")}
  <rect x="80" y="96" width="3" height="${H - 192}" fill="${ACID}" rx="1.5"/>
</svg>`;

// Couche 3 : texte net (fond transparent) — à gauche
const ogText = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <text x="108" y="308" font-family="'Space Grotesk','Arial Black',Arial,sans-serif" font-size="120" font-weight="700" letter-spacing="-5" fill="${INK}">Sèval<tspan fill="${ACID}">ys</tspan></text>
  <text x="112" y="372" font-family="Arial,Helvetica,sans-serif" font-size="31" font-weight="400" fill="${INK}" opacity="0.82">Agence IA · agents vocaux téléphoniques,</text>
  <text x="112" y="412" font-family="Arial,Helvetica,sans-serif" font-size="31" font-weight="400" fill="${INK}" opacity="0.82">automatisations &amp; sites qui convertissent</text>
  ${[["Agent vocal IA 24/7", 232], ["Automatisations", 210], ["Sites", 120]].reduce((acc, [label, w]) => {
    const x = 112 + acc.x;
    acc.svg += `<rect x="${x}" y="452" width="${w}" height="42" rx="21" fill="none" stroke="${LINE}" stroke-width="1.5"/><text x="${x + w / 2}" y="479" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="500" fill="${ACID}">${label}</text>`;
    acc.x += w + 16;
    return acc;
  }, { svg: "", x: 0 }).svg}
  <text x="112" y="${H - 52}" font-family="Arial,sans-serif" font-size="19" fill="${INK_DIM}" letter-spacing="2">TOURS, FRANCE · À DISTANCE PARTOUT</text>
  <text x="${W - 72}" y="${H - 52}" text-anchor="end" font-family="'Space Grotesk',Arial,sans-serif" font-size="25" font-weight="600" fill="${ACID}">sevalys.com</text>
</svg>`;

async function buildOg() {
  // Couche 2 : emblème validé, redimensionné, bleed léger à droite
  const embSize = 600;
  const emblem = await sharp(resolve(pub, "emblem.png"))
    .resize(embSize, embSize)
    .toBuffer();
  return sharp(Buffer.from(ogBase))
    .composite([
      { input: emblem, left: W - embSize - 8, top: Math.round((H - embSize) / 2) },
      { input: Buffer.from(ogText), left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(resolve(pub, "og-image.png"));
}

// Icônes
for (const { svg, out } of [
  { svg: iconSvg(192), out: "icon-192.png" },
  { svg: iconSvg(512), out: "icon-512.png" },
  { svg: iconSvg(512, { maskable: true }), out: "icon-maskable.png" },
]) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(resolve(pub, out));
  console.log(`✓ ${out}`);
}
await buildOg();
console.log("✓ og-image.png (emblème composité)");
console.log("Assets de marque Sèvalys générés.");
