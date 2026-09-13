import { mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const iconPath =
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png';
const splashDirectory = 'ios/App/App/Assets.xcassets/Splash.imageset';
const splashNames = [
  'splash-2732x2732.png',
  'splash-2732x2732-1.png',
  'splash-2732x2732-2.png',
];

async function renderSquare({ output, size, logoWidth }) {
  await mkdir(path.dirname(output), { recursive: true });
  const logo = await sharp('public/logo.svg')
    .resize({
      width: logoWidth,
      height: Math.round(logoWidth * 0.68),
      fit: 'contain',
    })
    .png()
    .toBuffer();
  const temporary = `${output}.tmp.png`;
  await sharp({
    create: { width: size, height: size, channels: 3, background: '#000000' },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .flatten({ background: '#000000' })
    .removeAlpha()
    .png()
    .toFile(temporary);
  await rename(temporary, output);
}

await renderSquare({ output: iconPath, size: 1024, logoWidth: 860 });
for (const name of splashNames) {
  await renderSquare({
    output: path.join(splashDirectory, name),
    size: 2732,
    logoWidth: 1900,
  });
}

console.log('Generated iOS icon and launch artwork from public/logo.svg.');
