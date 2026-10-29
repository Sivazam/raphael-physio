/**
 * Asset preparation (re-runnable):
 *  1. Normalizes and web-optimizes photography in public/images (max 1600w).
 *     Logo files (logo*.png) are skipped — they must stay lossless PNG.
 *  2. Renders PWA icons from the clinic's real logo (public/images/logo.png)
 *     on a white background, and transparent favicon PNGs (16/32/48) from
 *     the same real artwork.
 *
 * Run: bun scripts/prepare-assets.ts
 */

import sharp from "sharp";
import { readdir, mkdir, rename, unlink } from "fs/promises";
import path from "path";

const IMG_DIR = path.join(process.cwd(), "public", "images");
const ICON_DIR = path.join(process.cwd(), "public", "icons");

const LOGO_PATH = path.join(IMG_DIR, "logo.png");

const isLogoFile = (f: string) => /^logo/i.test(f);

async function optimizePhotos() {
  await mkdir(IMG_DIR, { recursive: true });
  const files = (await readdir(IMG_DIR)).filter(
    (f) => /\.(jpe?g|png)$/i.test(f) && !isLogoFile(f),
  );
  for (const file of files) {
    const src = path.join(IMG_DIR, file);
    const base = file.replace(/\.(jpe?g|png)$/i, "");
    const tmp = path.join(IMG_DIR, `${base}.tmp.jpg`);
    const dest = path.join(IMG_DIR, `${base}.jpg`);

    const meta = await sharp(src).metadata();
    const width = Math.min(meta.width ?? 1600, 1600);

    await sharp(src)
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true, mozjpeg: true })
      .toFile(tmp);

    await unlink(src).catch(() => {});
    await rename(tmp, dest);
    console.log(`✓ ${file} → ${base}.jpg (${width}w)`);
  }
}

/** White square icon with the real logo centered.
 *  `scale` = fraction of the canvas the logo occupies. */
async function logoIcon(size: number, scale: number, name: string) {
  const logoSize = Math.round(size * scale);
  const logoBuf = await sharp(LOGO_PATH)
    .resize(logoSize, logoSize, { kernel: "lanczos3", fit: "contain" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: "#FFFFFF",
    },
  })
    .composite([{ input: logoBuf, gravity: "center" }])
    .png()
    .toFile(path.join(ICON_DIR, name));
  console.log(`✓ icons/${name} (${size}×${size}, logo ${Math.round(scale * 100)}%)`);
}

/** Transparent favicon PNGs — the REAL logo artwork, exactly as supplied
 *  (no redraw), lanczos-downscaled for crispness at tab sizes. */
async function renderFavicon() {
  await mkdir(ICON_DIR, { recursive: true });
  for (const size of [16, 32, 48]) {
    await sharp(LOGO_PATH)
      .resize(size, size, { kernel: "lanczos3", fit: "contain" })
      .png()
      .toFile(path.join(ICON_DIR, `favicon-${size}.png`));
    console.log(`✓ icons/favicon-${size}.png (real logo, transparent)`);
  }
}

async function renderIcons() {
  await mkdir(ICON_DIR, { recursive: true });
  // Favicon: the real logo, transparent background (browser-tab use).
  await renderFavicon();
  // Regular icons: logo fills most of the canvas (it is a round emblem).
  await logoIcon(192, 0.94, "icon-192.png");
  await logoIcon(512, 0.94, "icon-512.png");
  // Maskable: keep the emblem inside the 80% safe zone.
  await logoIcon(192, 0.72, "maskable-192.png");
  await logoIcon(512, 0.72, "maskable-512.png");
  // Apple touch: iOS rounds corners; white bg + generous margin.
  await logoIcon(180, 0.82, "apple-touch-icon.png");
}

async function main() {
  await optimizePhotos();
  await renderIcons();
  console.log("Assets ready.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
