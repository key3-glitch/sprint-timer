// Simple script to create placeholder icons
// Run with: node create-icons.js

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const createSVG = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a73e8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1557b0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 10}" fill="url(#grad)"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="${size/3}" font-family="Arial" font-weight="bold">⏱️</text>
</svg>
`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'assets', 'icons');

sizes.forEach(size => {
    const svg = createSVG(size);
    const filename = path.join(iconsDir, `icon-${size}.svg`);
    fs.writeFileSync(filename, svg);
    console.log(`Created: icon-${size}.svg`);
});

console.log('All icons created!');
console.log('Note: These are SVG files. For PNG, use generate-icons.html in browser.');
