import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

// SVG source for icon — acid #C4F542 on #0A0B0C
function makeSvg(size) {
  const radius = Math.round(size * 0.15);
  const fontSize = Math.round(size * 0.42);
  const y = Math.round(size * 0.68);
  const letterSpacing = Math.round(size * -0.018);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#0A0B0C"/>
  <text
    x="${size / 2}"
    y="${y}"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    letter-spacing="${letterSpacing}"
    fill="#C4F542"
  >AB</text>
</svg>`;
}

// Maskable: more padding (safe zone = center 80%)
function makeMaskableSvg(size) {
  const innerSize = Math.round(size * 0.6);
  const offset = Math.round((size - innerSize) / 2);
  const fontSize = Math.round(innerSize * 0.5);
  const y = offset + Math.round(innerSize * 0.68);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0A0B0C"/>
  <text
    x="${size / 2}"
    y="${y}"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    letter-spacing="-2"
    fill="#C4F542"
  >AB</text>
</svg>`;
}

const icons = [
  { name: "icon-192.png", size: 192, maskable: false },
  { name: "icon-512.png", size: 512, maskable: false },
  { name: "icon-maskable.png", size: 512, maskable: true },
];

for (const { name, size, maskable } of icons) {
  const svg = Buffer.from(maskable ? makeMaskableSvg(size) : makeSvg(size));
  const outPath = `${publicDir}/${name}`;
  await sharp(svg).png().toFile(outPath);
  console.log(`✓ ${name} (${size}×${size})`);
}

console.log("Done — icons saved to public/");
