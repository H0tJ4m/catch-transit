/**
 * Generates placeholder app icon + splash screen + adaptive icon PNGs into
 * ./assets so EAS Build has something to work with. Run via:
 *   pnpm run gen:assets
 *
 * Designed to be replaced. The art is intentionally austere — a solid dark
 * background with a teal "catch" disc and four station dots, matching the
 * in-app dark/teal palette. When you have proper artwork, drop the same
 * filenames into ./assets and remove this script.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

type Color = [number, number, number, number];

const BG: Color = [0x0b, 0x12, 0x20, 0xff];
const ACCENT: Color = [0x38, 0xbd, 0xf8, 0xff];
const ACCENT_HALO: Color = [0x38, 0xbd, 0xf8, 0x40];
const STATION: Color = [0xf8, 0xfa, 0xfc, 0xff];

function setPixel(png: PNG, x: number, y: number, c: Color): void {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = c[0];
  png.data[idx + 1] = c[1];
  png.data[idx + 2] = c[2];
  png.data[idx + 3] = c[3];
}

function fill(png: PNG, c: Color): void {
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) setPixel(png, x, y, c);
  }
}

function disc(png: PNG, cx: number, cy: number, r: number, c: Color): void {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(png.width - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(png.height - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPixel(png, x, y, c);
    }
  }
}

function ring(
  png: PNG,
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  c: Color,
): void {
  const ro2 = rOuter * rOuter;
  const ri2 = rInner * rInner;
  const x0 = Math.max(0, Math.floor(cx - rOuter));
  const x1 = Math.min(png.width - 1, Math.ceil(cx + rOuter));
  const y0 = Math.max(0, Math.floor(cy - rOuter));
  const y1 = Math.min(png.height - 1, Math.ceil(cy + rOuter));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= ro2 && d2 >= ri2) setPixel(png, x, y, c);
    }
  }
}

function writeIcon(path: string, size: number, withBackground: boolean): void {
  const png = new PNG({ width: size, height: size });
  if (withBackground) fill(png, BG);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  disc(png, cx, cy, r * 1.25, ACCENT_HALO);
  ring(png, cx, cy, r, r * 0.84, ACCENT);
  // Four station dots at NE/SE/SW/NW.
  const dotR = size * 0.04;
  const ringR = r * 0.92;
  for (const angle of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    disc(png, cx + Math.cos(angle) * ringR, cy + Math.sin(angle) * ringR, dotR, STATION);
  }
  // Center accent.
  disc(png, cx, cy, dotR * 1.2, ACCENT);
  writeFileSync(path, PNG.sync.write(png));
  console.log(`wrote ${path}`);
}

function writeSplash(path: string, w: number, h: number): void {
  const png = new PNG({ width: w, height: h });
  fill(png, BG);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.18;
  disc(png, cx, cy, r * 1.25, ACCENT_HALO);
  ring(png, cx, cy, r, r * 0.84, ACCENT);
  writeFileSync(path, PNG.sync.write(png));
  console.log(`wrote ${path}`);
}

function main(): void {
  const dir = resolve(__dirname, '..', 'assets');
  mkdirSync(dir, { recursive: true });
  writeIcon(resolve(dir, 'icon.png'), 1024, true);
  writeIcon(resolve(dir, 'adaptive-icon.png'), 1024, false);
  writeIcon(resolve(dir, 'favicon.png'), 48, true);
  writeSplash(resolve(dir, 'splash.png'), 1242, 2436);
}

main();
