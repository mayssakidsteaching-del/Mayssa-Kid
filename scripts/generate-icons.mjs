import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public', 'favicon.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Generate regular 192x192
await sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(path.resolve('public', 'pwa-192x192.png'));

// Generate regular 512x512
await sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(path.resolve('public', 'pwa-512x512.png'));

// Generate apple-touch-icon 180x180
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(path.resolve('public', 'apple-touch-icon.png'));

// Generate maskable icon (512x512) with 15% safe margin
// Central content is 512 * 0.75 = 384px, centered on dark background (#0b0d12)
const innerResized = await sharp(svgBuffer)
  .resize(384, 384)
  .toBuffer();

await sharp({
  create: {
    width: 512,
    height: 512,
    channels: 4,
    background: { r: 11, g: 13, b: 18, alpha: 1 }
  }
})
  .composite([{
    input: innerResized,
    top: 64,
    left: 64
  }])
  .png()
  .toFile(path.resolve('public', 'pwa-maskable-512x512.png'));

// Also copy favicon.svg to icon.svg
fs.copyFileSync(svgPath, path.resolve('public', 'icon.svg'));

console.log('PWA icons successfully generated!');
