import sharp from 'sharp';
import { readFileSync } from 'fs';

const svgBuffer = readFileSync('./public/house-icon.svg');

// Generate 192x192 icon
sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile('./public/icon-192.png')
  .then(() => console.log('Generated icon-192.png'))
  .catch(err => console.error('Error generating icon-192.png:', err));

// Generate 512x512 icon
sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile('./public/icon-512.png')
  .then(() => console.log('Generated icon-512.png'))
  .catch(err => console.error('Error generating icon-512.png:', err));