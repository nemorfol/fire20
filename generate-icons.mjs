/**
 * Generate PWA icons.
 * Creates SVG icon and PNG icons (via sharp if available, or minimal solid-color PNGs as fallback).
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const staticDir = join(__dirname, 'static');

function createSvgIcon(size) {
  const fontSize = Math.round(size * 0.15);
  const flameScale = size / 512;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.1)}" fill="#111827"/>
  <g transform="translate(${size/2}, ${size * 0.42}) scale(${flameScale})">
    <path d="M0,-180 C60,-120 100,-60 100,20 C100,80 60,140 0,160 C-60,140 -100,80 -100,20 C-100,-60 -60,-120 0,-180Z" fill="#f59e0b"/>
    <path d="M0,-100 C35,-60 60,-20 60,30 C60,70 35,110 0,120 C-35,110 -60,70 -60,30 C-60,-20 -35,-60 0,-100Z" fill="#ef4444"/>
    <path d="M0,-40 C18,-20 30,5 30,30 C30,55 18,75 0,80 C-18,75 -30,55 -30,30 C-30,5 -18,-20 0,-40Z" fill="#fbbf24"/>
  </g>
  <text x="${size/2}" y="${size * 0.82}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">FIRE</text>
  <text x="${size/2}" y="${size * 0.92}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(fontSize * 0.5)}" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">PLANNER</text>
</svg>`;
}

/**
 * Create a minimal valid PNG file with a solid color.
 * Uses only Node.js built-in modules (zlib).
 */
function createMinimalPng(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function createChunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const combined = Buffer.concat([typeBuffer, data]);
    const crc = crc32(combined);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([length, combined, crcBuffer]);
  }

  // CRC32 calculation
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT chunk - raw pixel data
  // Each row: filter byte (0) + RGB pixels
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    rawData[offset] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 3;
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
    }
  }
  const compressed = deflateSync(rawData);

  // IEND chunk
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', iend)
  ]);
}

// Write SVG icon
writeFileSync(join(staticDir, 'icon.svg'), createSvgIcon(512));
console.log('Created static/icon.svg');

// Try to generate PNGs using sharp if available
async function generatePngs() {
  try {
    const sharp = await import('sharp');
    for (const size of [192, 512]) {
      const svg = createSvgIcon(size);
      await sharp.default(Buffer.from(svg))
        .png()
        .toFile(join(staticDir, `pwa-${size}x${size}.png`));
      console.log(`Created static/pwa-${size}x${size}.png (via sharp - full icon)`);
    }
    return;
  } catch (e) {
    // sharp not available, use fallback
  }

  // Fallback: create solid-color PNG placeholders (dark background matching theme)
  // These are valid PNGs that satisfy the PWA manifest requirements
  console.log('sharp not available, creating solid-color PNG placeholders...');
  console.log('TIP: For full icon PNGs, run: npm install --no-save sharp && npm run generate-icons');

  for (const size of [192, 512]) {
    // Use the background_color #111827 = rgb(17, 24, 39)
    const png = createMinimalPng(size, size, 17, 24, 39);
    writeFileSync(join(staticDir, `pwa-${size}x${size}.png`), png);
    console.log(`Created static/pwa-${size}x${size}.png (${size}x${size} solid placeholder)`);
  }
}

await generatePngs();
console.log('\nDone! Icon files created in static/');
console.log('The SVG icon (icon.svg) is the primary icon with the full flame design.');
console.log('PNG files are placeholders - regenerate with sharp for full design.');
