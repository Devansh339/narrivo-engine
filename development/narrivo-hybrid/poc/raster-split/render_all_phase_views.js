/**
 * Runs build_phase3_and_4_views.js and captures headless Chrome screenshots of:
 * 1. direct_phase12_gallery.html     -> renders/direct_phase12_gallery.png
 * 2. direct_phase3_validation.html   -> renders/direct_phase3_validation.png
 * 3. direct_phase3_zoom_seams.html   -> renders/direct_phase3_zoom_seams.png
 * 4. direct_phase4_articulation.html -> renders/direct_phase4_articulation.png
 * Also copies the rendered PNGs to the brain artifact directory.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const rendersDir = path.join(rootDir, 'renders');
const artifactDir = 'C:\\Users\\devan\\.gemini\\antigravity\\brain\\01ffa989-5f6c-4f11-b92d-bfb9a28144cf';

require('./build_phase3_and_4_views.js');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const pages = [
  { html: 'direct_phase12_gallery.html', png: 'direct_phase12_gallery.png', size: '1920,1080' },
  { html: 'direct_phase3_validation.html', png: 'direct_phase3_validation.png', size: '1920,920' },
  { html: 'direct_phase3_zoom_seams.html', png: 'direct_phase3_zoom_seams.png', size: '1920,1180' },
  { html: 'direct_phase4_articulation.html', png: 'direct_phase4_articulation.png', size: '1920,1060' }
];

for (const p of pages) {
  const htmlUrl = 'file:///' + path.join(rootDir, p.html).replace(/\\/g, '/');
  const outPng = path.join(rendersDir, p.png);
  execFileSync(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--window-size=${p.size}`,
    '--virtual-time-budget=2500',
    `--screenshot=${outPng}`,
    htmlUrl
  ]);
  const artPng = path.join(artifactDir, p.png);
  fs.copyFileSync(outPng, artPng);
  console.log('Captured & copied:', p.png);
}
