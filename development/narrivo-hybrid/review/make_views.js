const fs = require('fs');

const base = fs.readFileSync('development/narrivo-hybrid/review/milestone1_prototype.html', 'utf8');

// 1. Face Close-up HTML
const faceHtml = base
  .replace("let currentView = 'full';", "let currentView = 'face';")
  .replace('class="btn active" id="viewFullBtn"', 'class="btn" id="viewFullBtn"')
  .replace('class="btn" id="viewFaceBtn"', 'class="btn active" id="viewFaceBtn"');
fs.writeFileSync('development/narrivo-hybrid/review/milestone1_face.html', faceHtml, 'utf8');

// 2. Exploded Breakdown HTML
const explodedHtml = base
  .replace("let currentView = 'full';", "let currentView = 'exploded';")
  .replace('class="btn active" id="viewFullBtn"', 'class="btn" id="viewFullBtn"')
  .replace('class="btn" id="viewExplodedBtn"', 'class="btn active" id="viewExplodedBtn"');
fs.writeFileSync('development/narrivo-hybrid/review/milestone1_exploded.html', explodedHtml, 'utf8');

console.log('Dedicated view HTMLs generated successfully!');
