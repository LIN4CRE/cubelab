/**
 * Reproducible app artwork: rasterizes the SVG sources into the PNG icons
 * (PWA/manifest/Apple) and the social banner. Run: `node scripts/make-assets.mjs`
 */
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = join(root, 'public', 'icons')
const iconSvg = readFileSync(join(iconsDir, 'icon.svg'))

// Standard PWA icons.
await sharp(iconSvg).resize(192, 192).png().toFile(join(iconsDir, 'icon-192.png'))
await sharp(iconSvg).resize(512, 512).png().toFile(join(iconsDir, 'icon-512.png'))
await sharp(iconSvg).resize(180, 180).png().toFile(join(iconsDir, 'apple-180.png'))

// Maskable icon: artwork inside the 80% safe zone on a solid background.
const inner = await sharp(iconSvg).resize(400, 400).png().toBuffer()
await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#0b1120' },
})
  .composite([{ input: inner, left: 56, top: 56 }])
  .png()
  .toFile(join(iconsDir, 'maskable-512.png'))

// Social / README banner.
const bannerSvg = readFileSync(join(root, 'docs', 'banner.svg'))
await sharp(bannerSvg).resize(1280, 640).png().toFile(join(root, 'docs', 'banner.png'))

console.log('assets written: icons (192/512/maskable/apple) + docs/banner.png')
