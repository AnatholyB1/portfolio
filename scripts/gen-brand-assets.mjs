// Génère les assets bitmap de marque Sèvalys à partir du symbole sève vectoriel.
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

// ── Icône « app » : fond near-black arrondi, symbole acide ──────────────
function iconSvg(size, { maskable = false } = {}) {
  const rx = maskable ? 0 : Math.round(size * 0.22);
  // maskable : marge de sécurité (~20%) → symbole plus petit et centré
  const inset = maskable ? size * 0.28 : size * 0.2;
  const inner = size - inset * 2;
  const scale = inner / 120;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${rx}" fill="${BG}"/>
    <g transform="translate(${inset} ${inset}) scale(${scale})">${seve(ACID)}</g>
  </svg>`;
}

// ── OG image 1200×630 — carte de partage ────────────────────────────────
const W = 1200, H = 630;
const badge = 120;            // taille du badge symbole
const bx = 80, by = 96;       // position badge
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <!-- grille discrète -->
  ${Array.from({ length: 19 }, (_, i) => `<line x1="${i * 64}" y1="0" x2="${i * 64}" y2="${H}" stroke="${LINE}" stroke-width="1" opacity="0.5"/>`).join("")}
  ${Array.from({ length: 10 }, (_, i) => `<line x1="0" y1="${i * 64}" x2="${W}" y2="${i * 64}" stroke="${LINE}" stroke-width="1" opacity="0.5"/>`).join("")}
  <!-- lueur acide -->
  <defs><radialGradient id="glow" cx="18%" cy="30%" r="60%">
    <stop offset="0%" stop-color="${ACID}" stop-opacity="0.10"/>
    <stop offset="100%" stop-color="${ACID}" stop-opacity="0"/>
  </radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <!-- barre d'accent -->
  <rect x="${bx}" y="${by}" width="3" height="${H - by * 2}" fill="${ACID}" rx="1.5"/>

  <!-- badge symbole (variante acide, symbole near-black) -->
  <g transform="translate(${bx + 28} ${by})">
    <rect width="${badge}" height="${badge}" rx="26" fill="${ACID}"/>
    <g transform="translate(${badge * 0.2} ${badge * 0.2}) scale(${(badge * 0.6) / 120})">${seve(BG)}</g>
  </g>

  <!-- wordmark -->
  <text x="${bx + 28}" y="360" font-family="'Space Grotesk','Arial Black',Arial,sans-serif" font-size="128" font-weight="700" letter-spacing="-5" fill="${INK}">Sèval<tspan fill="${ACID}">ys</tspan></text>

  <!-- tagline -->
  <text x="${bx + 32}" y="428" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="400" fill="${INK}" opacity="0.82">Agence IA · agents vocaux téléphoniques, automatisations &amp; sites</text>

  <!-- pills -->
  ${[["Agent vocal IA 24/7", 240], ["Automatisations", 235], ["Sites qui convertissent", 285]].reduce((acc, [label, w], i) => {
    const x = bx + 32 + acc.x;
    acc.svg += `<rect x="${x}" y="474" width="${w}" height="42" rx="21" fill="none" stroke="${LINE}" stroke-width="1.5"/><text x="${x + w / 2}" y="501" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="500" fill="${ACID}">${label}</text>`;
    acc.x += w + 16;
    return acc;
  }, { svg: "", x: 0 }).svg}

  <!-- meta bas -->
  <text x="${bx + 32}" y="${H - 56}" font-family="Arial,sans-serif" font-size="20" fill="${INK_DIM}" letter-spacing="2">TOURS, FRANCE · À DISTANCE PARTOUT</text>
  <text x="${W - 80}" y="${H - 56}" text-anchor="end" font-family="'Space Grotesk',Arial,sans-serif" font-size="26" font-weight="600" fill="${ACID}">sevalys.com</text>
</svg>`;

const jobs = [
  { svg: iconSvg(192), out: "icon-192.png" },
  { svg: iconSvg(512), out: "icon-512.png" },
  { svg: iconSvg(512, { maskable: true }), out: "icon-maskable.png" },
  { svg: ogSvg, out: "og-image.png" },
];

for (const { svg, out } of jobs) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(resolve(pub, out));
  console.log(`✓ ${out}`);
}
console.log("Assets de marque Sèvalys générés.");
