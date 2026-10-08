// Builds src/app/favicon.ico (PNG-in-ICO: 16/32/48/64) and src/app/icon.png (48px, Google-friendly) from src/app/icon.svg
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync("src/app/icon.svg");
const sizes = [16, 32, 48, 64];
const pngs = await Promise.all(
  sizes.map((s) => sharp(svg, { density: 384 }).resize(s, s).png().toBuffer()),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);

let offset = 6 + 16 * sizes.length;
const entries = pngs.map((buf, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 0);
  e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(buf.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += buf.length;
  return e;
});

writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...entries, ...pngs]));
writeFileSync("src/app/icon.png", await sharp(svg, { density: 384 }).resize(48, 48).png().toBuffer());
console.log("favicon.ico + icon.png written");
