import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
const iconsDir = join(publicDir, 'icons');
const splashDir = join(publicDir, 'splash');

// Ensure directories exist
await mkdir(iconsDir, { recursive: true });
await mkdir(splashDir, { recursive: true });

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// iOS splash screen sizes (width x height)
const splashSizes = [
  { width: 640, height: 1136, name: 'splash-640x1136' },   // iPhone SE
  { width: 750, height: 1334, name: 'splash-750x1334' },   // iPhone 8
  { width: 1125, height: 2436, name: 'splash-1125x2436' }, // iPhone X/XS/11 Pro
  { width: 1170, height: 2532, name: 'splash-1170x2532' }, // iPhone 12/13/14
  { width: 1179, height: 2556, name: 'splash-1179x2556' }, // iPhone 14 Pro
  { width: 1290, height: 2796, name: 'splash-1290x2796' }, // iPhone 14/15 Pro Max
];

// Create a simple DeepStack icon using sharp's SVG support
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1613"/>
      <stop offset="100%" style="stop-color:#2d2620"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#d4a574"/>
      <stop offset="100%" style="stop-color:#b8860b"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <g transform="translate(256, 256)">
    <path d="M-120 40 L0 100 L120 40 L0 -20 Z" fill="url(#gold)" opacity="0.5"/>
    <path d="M-120 0 L0 60 L120 0 L0 -60 Z" fill="url(#gold)" opacity="0.75"/>
    <path d="M-120 -40 L0 20 L120 -40 L0 -100 Z" fill="url(#gold)"/>
  </g>
</svg>
`;

// Generate icons
console.log('Generating PWA icons...');
for (const size of iconSizes) {
  const outputPath = join(iconsDir, `icon-${size}x${size}.png`);
  await sharp(Buffer.from(svgIcon))
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`  Created ${size}x${size} icon`);
}

// Create apple-touch-icon (180x180)
const appleTouchPath = join(publicDir, 'apple-touch-icon.png');
await sharp(Buffer.from(svgIcon))
  .resize(180, 180)
  .png()
  .toFile(appleTouchPath);
console.log('  Created apple-touch-icon.png (180x180)');

// Create favicon.ico (32x32)
const faviconPath = join(publicDir, 'favicon.ico');
await sharp(Buffer.from(svgIcon))
  .resize(32, 32)
  .png()
  .toFile(faviconPath);
console.log('  Created favicon.ico (32x32)');

// Generate splash screens
console.log('\nGenerating iOS splash screens...');
for (const { width, height, name } of splashSizes) {
  const iconSize = Math.min(width, height) * 0.3;

  // Create splash screen with centered icon
  const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1613"/>
      <stop offset="100%" style="stop-color:#2d2620"/>
    </linearGradient>
    <linearGradient id="splashGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#d4a574"/>
      <stop offset="100%" style="stop-color:#b8860b"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#splashBg)"/>
  <g transform="translate(${width/2}, ${height/2 - 40})">
    <g transform="scale(${iconSize/512})">
      <path d="M-120 40 L0 100 L120 40 L0 -20 Z" fill="url(#splashGold)" opacity="0.5"/>
      <path d="M-120 0 L0 60 L120 0 L0 -60 Z" fill="url(#splashGold)" opacity="0.75"/>
      <path d="M-120 -40 L0 20 L120 -40 L0 -100 Z" fill="url(#splashGold)"/>
    </g>
  </g>
  <text x="${width/2}" y="${height/2 + iconSize/2 + 60}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${iconSize * 0.2}"
        font-weight="600"
        fill="#b8860b"
        text-anchor="middle">
    DeepStack
  </text>
</svg>
`;

  const outputPath = join(splashDir, `${name}.png`);
  await sharp(Buffer.from(splashSvg))
    .png()
    .toFile(outputPath);
  console.log(`  Created ${name}.png`);
}

console.log('\nDone! All icons and splash screens generated.');
