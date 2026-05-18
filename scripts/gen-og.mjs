import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../public/og-image.png");

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      @font-face { font-family: system-ui; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#0A0B0C"/>

  <!-- Left accent bar -->
  <rect x="56" y="60" width="3" height="${H - 120}" fill="#C4F542" rx="1.5"/>

  <!-- Top rule -->
  <rect x="80" y="60" width="${W - 136}" height="1" fill="#1F1F1F"/>

  <!-- Bottom rule -->
  <rect x="80" y="${H - 61}" width="${W - 136}" height="1" fill="#1F1F1F"/>

  <!-- Monogram AB -->
  <text
    x="80"
    y="148"
    font-family="Arial Black, Arial, sans-serif"
    font-size="64"
    font-weight="900"
    letter-spacing="-2"
    fill="#C4F542"
  >AB</text>

  <!-- Agency name -->
  <text
    x="80"
    y="310"
    font-family="Arial, Helvetica, sans-serif"
    font-size="72"
    font-weight="700"
    letter-spacing="-1"
    fill="#ECEAE3"
  >BRICON ANATHOLY</text>

  <!-- Separator dot -->
  <circle cx="80" cy="355" r="3" fill="#C4F542"/>

  <!-- Tagline -->
  <text
    x="80"
    y="400"
    font-family="Arial, Helvetica, sans-serif"
    font-size="32"
    font-weight="400"
    letter-spacing="0.5"
    fill="#ECEAE3"
    opacity="0.72"
  >Agence digitale · Tours, France</text>

  <!-- Services pills area -->
  <!-- Sites web -->
  <rect x="80" y="440" width="156" height="34" rx="17" fill="#1F1F1F"/>
  <text x="158" y="462" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="500" fill="#C4F542" letter-spacing="0.5">Sites web</text>

  <!-- Outils de gestion -->
  <rect x="248" y="440" width="210" height="34" rx="17" fill="#1F1F1F"/>
  <text x="353" y="462" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="500" fill="#C4F542" letter-spacing="0.5">Outils de gestion</text>

  <!-- Agents IA -->
  <rect x="470" y="440" width="140" height="34" rx="17" fill="#1F1F1F"/>
  <text x="540" y="462" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="500" fill="#C4F542" letter-spacing="0.5">Agents IA</text>

  <!-- Domain — bottom right -->
  <text
    x="${W - 80}"
    y="${H - 80}"
    text-anchor="end"
    font-family="Arial, Helvetica, sans-serif"
    font-size="22"
    font-weight="400"
    letter-spacing="0.3"
    fill="#C4F542"
    opacity="0.85"
  >anatholy-bricon.com</text>

  <!-- Warm accent dot bottom left -->
  <circle cx="80" cy="${H - 80}" r="5" fill="#E07856"/>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log(`✓ og-image.png (${W}×${H}) → ${outPath}`);
